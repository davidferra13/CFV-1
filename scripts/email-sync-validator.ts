// @ts-nocheck — standalone script, Supabase client type mismatch with generated types
// Email Sync Validator
// Resets email sync data, triggers a fresh sync, cross-validates against
// the "Dinner Email Export" Gmail label, and produces a detailed report.
//
// Usage: npx tsx scripts/email-sync-validator.ts [--skip-reset] [--skip-sync] [--label-only]
//
// Flags:
//   --skip-reset   Don't reset sync data (useful for re-running report only)
//   --skip-sync    Don't trigger sync (useful for inspecting existing data)
//   --label-only   Only run the label cross-validation (skip sync entirely)
//   --limit N      Limit historical scan batches (default: unlimited until done)

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ─── Config ───────────────────────────────────────────────────────────────────

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

const flags = {
  skipReset: process.argv.includes('--skip-reset'),
  skipSync: process.argv.includes('--skip-sync'),
  labelOnly: process.argv.includes('--label-only'),
  limit: (() => {
    const idx = process.argv.indexOf('--limit')
    return idx >= 0 ? parseInt(process.argv[idx + 1], 10) : Infinity
  })(),
}

// ─── Supabase Admin Client ────────────────────────────────────────────────────

function getAdminClient() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// ─── Developer Identity ───────────────────────────────────────────────────────

interface DevIdentity {
  email: string
  password: string
  authUserId?: string
  chefId?: string
  tenantId?: string
}

function loadDevIdentity(): DevIdentity {
  try {
    return JSON.parse(readFileSync('.auth/developer.json', 'utf-8'))
  } catch {
    throw new Error('.auth/developer.json not found')
  }
}

async function resolveDevIds(admin: ReturnType<typeof createClient>, dev: DevIdentity) {
  if (dev.chefId && dev.tenantId) return dev

  // Find auth user
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authUser = listed?.users.find((u) => u.email?.toLowerCase() === dev.email.toLowerCase())
  if (!authUser) throw new Error(`No auth user found for ${dev.email}`)
  dev.authUserId = authUser.id

  // Find chef
  const { data: chef } = await admin
    .from('chefs')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()
  if (!chef?.id) throw new Error(`No chef record for ${dev.email}`)
  dev.chefId = chef.id
  dev.tenantId = chef.id // tenant_id === chef_id in this schema
  return dev
}

// ─── Gmail Access Token ───────────────────────────────────────────────────────

async function getAccessToken(
  admin: ReturnType<typeof createClient>,
  chefId: string
): Promise<string> {
  const { data: conn } = await admin
    .from('google_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('chef_id', chefId)
    .single()

  if (!conn?.refresh_token)
    throw new Error('No Google connection — connect Gmail in Settings first')

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : new Date(0)
  if (conn.access_token && expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return conn.access_token
  }

  // Refresh
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!resp.ok) throw new Error(`Token refresh failed: ${await resp.text()}`)
  const tokens = await resp.json()

  await admin
    .from('google_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('chef_id', chefId)

  return tokens.access_token
}

// ─── Phase 1: Reset ──────────────────────────────────────────────────────────

async function resetSyncData(admin: ReturnType<typeof createClient>, tenantId: string) {
  console.log('\n═══ PHASE 1: RESET ═══\n')

  // Clear gmail_sync_log
  const { data: syncLogData } = await admin
    .from('gmail_sync_log')
    .delete()
    .eq('tenant_id', tenantId)
    .select('id')
  console.log(`  gmail_sync_log: ${syncLogData?.length ?? 0} rows deleted`)

  // Clear gmail_historical_findings
  const { data: findingsData } = await admin
    .from('gmail_historical_findings')
    .delete()
    .eq('tenant_id', tenantId)
    .select('id')
  console.log(`  gmail_historical_findings: ${findingsData?.length ?? 0} rows deleted`)

  // Clear email messages
  const { data: messagesData } = await admin
    .from('messages')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('channel', 'email')
    .select('id')
  console.log(`  messages (email): ${messagesData?.length ?? 0} rows deleted`)

  // Clear email inquiries (email + platform channels)
  const emailChannels = [
    'email',
    'take_a_chef',
    'yhangry',
    'thumbtack',
    'theknot',
    'bark',
    'cozymeal',
    'gigsalad',
    'google_business',
  ]
  let totalInquiries = 0
  for (const channel of emailChannels) {
    const { data } = await admin
      .from('inquiries')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .select('id')
    totalInquiries += data?.length ?? 0
  }
  console.log(`  inquiries (email/platform): ${totalInquiries} rows deleted`)

  // Reset google_connections sync state (preserve OAuth tokens!)
  const { error: connErr } = await admin
    .from('google_connections')
    .update({
      gmail_history_id: null,
      gmail_last_sync_at: null,
      gmail_sync_errors: 0,
      historical_scan_page_token: null,
      historical_scan_total_processed: 0,
      historical_scan_status: 'idle',
      historical_scan_started_at: null,
      historical_scan_completed_at: null,
      historical_scan_last_run_at: null,
    })
    .eq('chef_id', tenantId)

  if (connErr) {
    console.error(`  google_connections reset failed: ${connErr.message}`)
  } else {
    console.log(`  google_connections: sync state reset (OAuth preserved)`)
  }

  console.log('\n  Reset complete. Ready for fresh sync.\n')
}

// ─── Phase 2: Live Sync ──────────────────────────────────────────────────────

async function runLiveSync(devServerUrl: string): Promise<any> {
  console.log('\n═══ PHASE 2: LIVE SYNC ═══\n')

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.log('  CRON_SECRET not set — calling sync via server action instead')
    // Fall back to direct function import (requires Next.js context)
    throw new Error('CRON_SECRET required for standalone sync. Set it in .env.local')
  }

  console.log(`  Triggering sync via ${devServerUrl}/api/gmail/sync ...`)
  const startTime = Date.now()

  const resp = await fetch(`${devServerUrl}/api/gmail/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}` },
  })

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Sync API returned ${resp.status}: ${err}`)
  }

  const result = await resp.json()
  console.log(`  Sync completed in ${elapsed}s`)
  console.log(`  Accounts synced: ${result.synced}, failed: ${result.failed}`)

  if (result.results) {
    for (const r of result.results) {
      if (r.success && r.result) {
        const sr = r.result
        console.log(`\n  === ${r.email} ===`)
        console.log(`    Processed: ${sr.processed}`)
        console.log(`    Inquiries created: ${sr.inquiriesCreated}`)
        console.log(`    Messages logged: ${sr.messagesLogged}`)
        console.log(`    Skipped: ${sr.skipped}`)
        if (sr.errors?.length > 0) {
          console.log(`    Errors (${sr.errors.length}):`)
          for (const e of sr.errors) {
            console.log(`      - ${e}`)
          }
        }
      } else if (!r.success) {
        console.log(`\n  === ${r.email} === FAILED: ${r.error}`)
      }
    }
  }

  return result
}

// ─── Phase 3: Label Cross-Validation ─────────────────────────────────────────

interface GmailLabel {
  id: string
  name: string
  messagesTotal: number
  messagesUnread: number
}

async function listGmailLabels(accessToken: string): Promise<GmailLabel[]> {
  const resp = await fetch(`${GMAIL_API}/labels`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!resp.ok) throw new Error(`List labels failed: ${await resp.text()}`)
  const data = await resp.json()
  return data.labels || []
}

async function getGmailLabel(accessToken: string, labelId: string): Promise<GmailLabel> {
  const resp = await fetch(`${GMAIL_API}/labels/${labelId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!resp.ok) throw new Error(`Get label failed: ${await resp.text()}`)
  return resp.json()
}

interface GmailMessageRef {
  id: string
  threadId: string
}

async function listMessagesByLabel(
  accessToken: string,
  labelId: string,
  pageToken?: string
): Promise<{ messages: GmailMessageRef[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    labelIds: labelId,
    maxResults: '100',
  })
  if (pageToken) params.set('pageToken', pageToken)

  const resp = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!resp.ok) throw new Error(`List messages by label failed: ${await resp.text()}`)
  const data = await resp.json()
  return {
    messages: data.messages || [],
    nextPageToken: data.nextPageToken,
  }
}

async function getMessageMetadata(
  accessToken: string,
  messageId: string
): Promise<{ from: string; subject: string; date: string; labelIds: string[] }> {
  const resp = await fetch(
    `${GMAIL_API}/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!resp.ok) throw new Error(`Get message metadata failed: ${await resp.text()}`)
  const data = await resp.json()
  const headers = data.payload?.headers || []
  const getHeader = (name: string): string =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  return {
    from: getHeader('From'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    labelIds: data.labelIds || [],
  }
}

interface CrossValidationResult {
  totalLabeledEmails: number
  foundInSyncLog: number
  missingFromSyncLog: number
  classifiedAsInquiry: number
  classifiedAsOther: number
  agreements: Array<{ messageId: string; from: string; subject: string; classification: string }>
  disagreements: Array<{
    messageId: string
    from: string
    subject: string
    classification: string
    confidence: string
    reasoning?: string
  }>
  missingEmails: Array<{ messageId: string; from: string; subject: string; date: string }>
}

async function crossValidateLabel(
  admin: ReturnType<typeof createClient>,
  accessToken: string,
  tenantId: string,
  labelName: string
): Promise<CrossValidationResult> {
  console.log(`\n═══ PHASE 3: CROSS-VALIDATION vs "${labelName}" ═══\n`)

  // Find the label
  const allLabels = await listGmailLabels(accessToken)
  const targetLabel = allLabels.find((l) => l.name.toLowerCase() === labelName.toLowerCase())

  if (!targetLabel) {
    const userLabels = allLabels
      .filter((l) => l.type === 'user' || !l.type)
      .map((l) => l.name)
      .sort()
    console.log(`  Label "${labelName}" not found.`)
    console.log(`  Available user labels: ${userLabels.join(', ')}`)
    throw new Error(`Gmail label "${labelName}" not found`)
  }

  // Get label stats
  const labelDetail = await getGmailLabel(accessToken, targetLabel.id)
  console.log(`  Found label: "${targetLabel.name}" (ID: ${targetLabel.id})`)
  console.log(`  Total messages: ${labelDetail.messagesTotal ?? 'unknown'}`)
  console.log(`  Unread: ${labelDetail.messagesUnread ?? 0}`)

  // Fetch all message IDs with this label
  const allMessageIds: GmailMessageRef[] = []
  let pageToken: string | undefined
  let pageCount = 0

  do {
    const page = await listMessagesByLabel(accessToken, targetLabel.id, pageToken)
    allMessageIds.push(...page.messages)
    pageToken = page.nextPageToken
    pageCount++
    process.stdout.write(
      `  Fetching message IDs... page ${pageCount} (${allMessageIds.length} so far)\r`
    )
  } while (pageToken)

  console.log(`  Fetched ${allMessageIds.length} message IDs from label                    `)

  // Cross-reference with gmail_sync_log
  const result: CrossValidationResult = {
    totalLabeledEmails: allMessageIds.length,
    foundInSyncLog: 0,
    missingFromSyncLog: 0,
    classifiedAsInquiry: 0,
    classifiedAsOther: 0,
    agreements: [],
    disagreements: [],
    missingEmails: [],
  }

  // Process in batches of 20 to avoid hammering the API
  const BATCH_SIZE = 20
  for (let i = 0; i < allMessageIds.length; i += BATCH_SIZE) {
    const batch = allMessageIds.slice(i, i + BATCH_SIZE)
    const progress = Math.min(i + BATCH_SIZE, allMessageIds.length)
    process.stdout.write(`  Cross-validating... ${progress}/${allMessageIds.length}\r`)

    await Promise.all(
      batch.map(async (msgRef) => {
        // Check if this message exists in our sync log
        const { data: syncEntry } = await admin
          .from('gmail_sync_log')
          .select('classification, confidence, action_taken')
          .eq('tenant_id', tenantId)
          .eq('gmail_message_id', msgRef.id)
          .maybeSingle()

        if (!syncEntry) {
          // Not in sync log — we missed this email
          result.missingFromSyncLog++
          try {
            const meta = await getMessageMetadata(accessToken, msgRef.id)
            result.missingEmails.push({
              messageId: msgRef.id,
              from: meta.from,
              subject: meta.subject,
              date: meta.date,
            })
          } catch {
            result.missingEmails.push({
              messageId: msgRef.id,
              from: '(failed to fetch)',
              subject: '(failed to fetch)',
              date: '',
            })
          }
          return
        }

        result.foundInSyncLog++

        // The label says "dinner" — so we expect classification = inquiry
        const isInquiry =
          syncEntry.classification === 'inquiry' ||
          syncEntry.action_taken === 'created_inquiry' ||
          syncEntry.action_taken?.includes('inquiry')

        if (isInquiry) {
          result.classifiedAsInquiry++
          result.agreements.push({
            messageId: msgRef.id,
            from: '(in sync log)',
            subject: '(in sync log)',
            classification: syncEntry.classification,
          })
        } else {
          result.classifiedAsOther++
          // This is a disagreement — label says dinner, AI says something else
          try {
            const meta = await getMessageMetadata(accessToken, msgRef.id)
            result.disagreements.push({
              messageId: msgRef.id,
              from: meta.from,
              subject: meta.subject,
              classification: syncEntry.classification,
              confidence: syncEntry.confidence,
            })
          } catch {
            result.disagreements.push({
              messageId: msgRef.id,
              from: '(failed to fetch)',
              subject: '(failed to fetch)',
              classification: syncEntry.classification,
              confidence: syncEntry.confidence,
            })
          }
        }
      })
    )

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < allMessageIds.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  console.log(`  Cross-validation complete                                    `)
  return result
}

// ─── Phase 4: Sync Log Analysis ──────────────────────────────────────────────

interface SyncAnalysis {
  total: number
  byClassification: Record<string, number>
  byAction: Record<string, number>
  byConfidence: Record<string, number>
  platformEmails: Array<{ from: string; subject: string; classification: string; action: string }>
  errors: Array<{ from: string; subject: string; error: string }>
  lowConfidence: Array<{
    from: string
    subject: string
    classification: string
    confidence: string
  }>
}

async function analyzeSyncLog(
  admin: ReturnType<typeof createClient>,
  tenantId: string
): Promise<SyncAnalysis> {
  const { data: entries } = await admin
    .from('gmail_sync_log')
    .select('from_address, subject, classification, confidence, action_taken, error')
    .eq('tenant_id', tenantId)
    .order('synced_at', { ascending: false })
    .limit(5000)

  const analysis: SyncAnalysis = {
    total: entries?.length ?? 0,
    byClassification: {},
    byAction: {},
    byConfidence: {},
    platformEmails: [],
    errors: [],
    lowConfidence: [],
  }

  for (const entry of entries || []) {
    // Count by classification
    const cls = entry.classification || 'unknown'
    analysis.byClassification[cls] = (analysis.byClassification[cls] || 0) + 1

    // Count by action
    const act = entry.action_taken || 'unknown'
    analysis.byAction[act] = (analysis.byAction[act] || 0) + 1

    // Count by confidence
    const conf = entry.confidence || 'unknown'
    analysis.byConfidence[conf] = (analysis.byConfidence[conf] || 0) + 1

    // Track platform emails
    const from = (entry.from_address || '').toLowerCase()
    const platformDomains = [
      'privatechefmanager.com',
      'takeachef.com',
      'yhangry.com',
      'thumbtack.com',
      'theknot.com',
      'weddingwire.com',
      'bark.com',
      'cozymeal.com',
      'gigsalad.com',
    ]
    if (platformDomains.some((d) => from.includes(d))) {
      analysis.platformEmails.push({
        from: entry.from_address || '',
        subject: entry.subject || '',
        classification: cls,
        action: act,
      })
    }

    // Track errors
    if (entry.error) {
      analysis.errors.push({
        from: entry.from_address || '',
        subject: entry.subject || '',
        error: entry.error,
      })
    }

    // Track low confidence
    if (entry.confidence === 'low') {
      analysis.lowConfidence.push({
        from: entry.from_address || '',
        subject: entry.subject || '',
        classification: cls,
        confidence: 'low',
      })
    }
  }

  return analysis
}

// ─── Phase 5: Report ─────────────────────────────────────────────────────────

function printReport(
  syncAnalysis: SyncAnalysis,
  crossVal: CrossValidationResult | null,
  syncResult: any
) {
  console.log('\n')
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║          EMAIL SYNC VALIDATION REPORT                       ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  // Sync summary
  console.log('\n── Sync Log Summary ──')
  console.log(`  Total emails processed: ${syncAnalysis.total}`)
  console.log('')
  console.log('  Classification distribution:')
  for (const [cls, count] of Object.entries(syncAnalysis.byClassification).sort(
    (a, b) => b[1] - a[1]
  )) {
    const pct = ((count / syncAnalysis.total) * 100).toFixed(1)
    const bar = '█'.repeat(Math.round((count / syncAnalysis.total) * 30))
    console.log(`    ${cls.padEnd(18)} ${String(count).padStart(4)} (${pct.padStart(5)}%) ${bar}`)
  }

  console.log('')
  console.log('  Action distribution:')
  for (const [act, count] of Object.entries(syncAnalysis.byAction).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${act.padEnd(25)} ${count}`)
  }

  console.log('')
  console.log('  Confidence distribution:')
  for (const [conf, count] of Object.entries(syncAnalysis.byConfidence).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`    ${conf.padEnd(10)} ${count}`)
  }

  // Platform emails
  if (syncAnalysis.platformEmails.length > 0) {
    console.log(`\n── Platform Emails (${syncAnalysis.platformEmails.length}) ──`)
    for (const pe of syncAnalysis.platformEmails.slice(0, 20)) {
      console.log(`  [${pe.classification}] ${pe.from} — ${pe.subject?.slice(0, 60)}`)
    }
    if (syncAnalysis.platformEmails.length > 20) {
      console.log(`  ... and ${syncAnalysis.platformEmails.length - 20} more`)
    }
  }

  // Errors
  if (syncAnalysis.errors.length > 0) {
    console.log(`\n── Errors (${syncAnalysis.errors.length}) ──`)
    for (const e of syncAnalysis.errors) {
      console.log(`  ${e.from} — ${e.error}`)
    }
  }

  // Low confidence
  if (syncAnalysis.lowConfidence.length > 0) {
    console.log(
      `\n── Low Confidence (${syncAnalysis.lowConfidence.length}) — potential misclassifications ──`
    )
    for (const lc of syncAnalysis.lowConfidence) {
      console.log(`  [${lc.classification}] ${lc.from} — ${lc.subject?.slice(0, 60)}`)
    }
  }

  // Cross-validation
  if (crossVal) {
    console.log('\n── Cross-Validation: "Dinner Email Export" Label ──')
    console.log(`  Emails in label:          ${crossVal.totalLabeledEmails}`)
    console.log(`  Found in sync log:        ${crossVal.foundInSyncLog}`)
    console.log(`  Missing from sync log:    ${crossVal.missingFromSyncLog}`)
    console.log(`  Classified as inquiry:    ${crossVal.classifiedAsInquiry}`)
    console.log(`  Classified as other:      ${crossVal.classifiedAsOther}`)

    if (crossVal.totalLabeledEmails > 0) {
      const accuracy = ((crossVal.classifiedAsInquiry / crossVal.foundInSyncLog) * 100).toFixed(1)
      console.log(`\n  ACCURACY (label agreement): ${accuracy}%`)
      if (parseFloat(accuracy) === 100) {
        console.log('  Every labeled email was correctly classified as inquiry.')
      }
    }

    if (crossVal.disagreements.length > 0) {
      console.log(
        `\n  DISAGREEMENTS (${crossVal.disagreements.length}) — label says dinner, AI says:`
      )
      for (const d of crossVal.disagreements) {
        console.log(
          `    [${d.classification}/${d.confidence}] ${d.from} — ${d.subject?.slice(0, 50)}`
        )
      }
    }

    if (crossVal.missingEmails.length > 0) {
      console.log(`\n  MISSING (${crossVal.missingEmails.length}) — in label but never synced:`)
      for (const m of crossVal.missingEmails.slice(0, 20)) {
        console.log(`    ${m.from} — ${m.subject?.slice(0, 50)} (${m.date})`)
      }
      if (crossVal.missingEmails.length > 20) {
        console.log(`    ... and ${crossVal.missingEmails.length - 20} more`)
      }
    }
  }

  // Invariant checks
  console.log('\n── Invariant Checks ──')
  const checks: Array<{ name: string; pass: boolean; detail: string }> = []

  checks.push({
    name: 'Zero sync errors',
    pass: syncAnalysis.errors.length === 0,
    detail: `${syncAnalysis.errors.length} errors`,
  })

  if (crossVal) {
    checks.push({
      name: 'All labeled emails found in sync log',
      pass: crossVal.missingFromSyncLog === 0,
      detail: `${crossVal.missingFromSyncLog} missing`,
    })

    checks.push({
      name: 'All labeled emails classified as inquiry',
      pass: crossVal.classifiedAsOther === 0,
      detail: `${crossVal.classifiedAsOther} disagreements`,
    })
  }

  checks.push({
    name: 'No low-confidence classifications',
    pass: syncAnalysis.lowConfidence.length === 0,
    detail: `${syncAnalysis.lowConfidence.length} low confidence`,
  })

  const platformMisclass = syncAnalysis.platformEmails.filter(
    (pe) => pe.classification !== 'inquiry' && pe.action !== 'administrative_skipped'
  )
  checks.push({
    name: 'All platform emails classified as inquiry (excl admin)',
    pass: platformMisclass.length === 0,
    detail: `${platformMisclass.length} misclassified`,
  })

  for (const check of checks) {
    const icon = check.pass ? 'PASS' : 'FAIL'
    console.log(`  [${icon}] ${check.name} — ${check.detail}`)
  }

  const allPassed = checks.every((c) => c.pass)
  console.log(`\n  Overall: ${allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`)
  console.log('')
}

function saveSnapshot(
  syncAnalysis: SyncAnalysis,
  crossVal: CrossValidationResult | null,
  syncResult: any
) {
  mkdirSync('scripts/email-sync-reports', { recursive: true })
  const timestamp = Date.now()
  const snapshot = {
    timestamp,
    date: new Date().toISOString(),
    syncAnalysis,
    crossValidation: crossVal,
    syncResult,
  }
  const path = `scripts/email-sync-reports/report-${timestamp}.json`
  writeFileSync(path, JSON.stringify(snapshot, null, 2))
  console.log(`  Snapshot saved: ${path}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║          EMAIL SYNC VALIDATOR                               ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  const admin = getAdminClient()
  const dev = await resolveDevIds(admin, loadDevIdentity())
  const chefId = dev.chefId!
  const tenantId = dev.tenantId!

  console.log(`\n  Developer: ${dev.email}`)
  console.log(`  Chef ID:   ${chefId}`)
  console.log(`  Tenant ID: ${tenantId}`)

  // Get access token (needed for label cross-validation)
  const accessToken = await getAccessToken(admin, chefId)
  console.log('  Gmail token: valid')

  // Phase 1: Reset
  if (!flags.skipReset && !flags.labelOnly) {
    await resetSyncData(admin, tenantId)
  } else {
    console.log('\n  Skipping reset (--skip-reset or --label-only)')
  }

  // Phase 2: Live Sync
  let syncResult = null
  if (!flags.skipSync && !flags.labelOnly) {
    const devServerUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100'
    try {
      syncResult = await runLiveSync(devServerUrl)
    } catch (err) {
      console.error(`\n  Sync failed: ${(err as Error).message}`)
      console.log('  Continuing with existing data...')
    }
  } else {
    console.log('\n  Skipping sync (--skip-sync or --label-only)')
  }

  // Phase 3: Label Cross-Validation
  let crossVal: CrossValidationResult | null = null
  try {
    crossVal = await crossValidateLabel(admin, accessToken, tenantId, 'Dinner Email Export')
  } catch (err) {
    console.error(`\n  Cross-validation failed: ${(err as Error).message}`)
  }

  // Phase 4: Analyze sync log
  console.log('\n═══ PHASE 4: ANALYSIS ═══')
  const syncAnalysis = await analyzeSyncLog(admin, tenantId)

  // Phase 5: Report
  printReport(syncAnalysis, crossVal, syncResult)
  saveSnapshot(syncAnalysis, crossVal, syncResult)
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
