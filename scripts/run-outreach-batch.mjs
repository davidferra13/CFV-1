#!/usr/bin/env node

/**
 * Directory Outreach Batch Runner
 *
 * Sends invitation emails to discovered food operators in small batches.
 * Reads from the local database, sends via Resend with neutral sender identity.
 *
 * Usage:
 *   node scripts/run-outreach-batch.mjs                    # Send batch (default 25)
 *   node scripts/run-outreach-batch.mjs --dry-run           # Preview without sending
 *   node scripts/run-outreach-batch.mjs --batch-size 10     # Custom batch size
 *   node scripts/run-outreach-batch.mjs --min-score 70      # Only high-quality leads
 *
 * Environment variables:
 *   DIRECTORY_OUTREACH_FROM_EMAIL - Required. Sender email (separate domain).
 *   OUTREACH_PHYSICAL_ADDRESS     - Required. CAN-SPAM physical address.
 *   OUTREACH_HASH_SECRET          - Optional. Falls back to AUTH_SECRET.
 *   RESEND_API_KEY                - Required for actual sends.
 *   MAX_DAILY_OUTREACH            - Optional. Hard cap (default 50).
 */

import postgres from 'postgres'
import { Resend } from 'resend'
import crypto from 'crypto'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const batchSizeIdx = args.indexOf('--batch-size')
const batchSize = batchSizeIdx >= 0 ? parseInt(args[batchSizeIdx + 1], 10) : 25
const minScoreIdx = args.indexOf('--min-score')
const minScore = minScoreIdx >= 0 ? parseInt(args[minScoreIdx + 1], 10) : 0
const maxDaily = parseInt(process.env.MAX_DAILY_OUTREACH || '50', 10)

const effectiveBatchSize = Math.min(batchSize, maxDaily)

const OUTREACH_FROM = process.env.DIRECTORY_OUTREACH_FROM_EMAIL || ''
const PHYSICAL_ADDRESS = process.env.OUTREACH_PHYSICAL_ADDRESS || ''
const HASH_SECRET = process.env.OUTREACH_HASH_SECRET || process.env.AUTH_SECRET || ''
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)

function encryptRef(listingId) {
  const keyMaterial = crypto.createHash('sha256').update(HASH_SECRET).digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', keyMaterial, iv)
  let encrypted = cipher.update(listingId, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return Buffer.concat([iv, encrypted]).toString('base64url')
}

async function main() {
  // Preflight checks
  if (!dryRun) {
    if (!OUTREACH_FROM) {
      log('ERROR: DIRECTORY_OUTREACH_FROM_EMAIL not set. Cannot send.')
      process.exit(1)
    }
    if (!PHYSICAL_ADDRESS) {
      log('ERROR: OUTREACH_PHYSICAL_ADDRESS not set (CAN-SPAM requirement). Cannot send.')
      process.exit(1)
    }
    if (!process.env.RESEND_API_KEY) {
      log('ERROR: RESEND_API_KEY not set. Cannot send.')
      process.exit(1)
    }
    if (!HASH_SECRET) {
      log('ERROR: No OUTREACH_HASH_SECRET or AUTH_SECRET set. Cannot encrypt refs.')
      process.exit(1)
    }
  }

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres'
  const sql = postgres(connectionString)

  log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE SEND'}`)
  log(`Batch size: ${effectiveBatchSize}, Min score: ${minScore}`)

  // Select queue: discovered listings with email, not yet contacted, not opted out
  const queue = await sql`
    SELECT DISTINCT ON (LOWER(email))
      id, name, email, city, state, business_type, cuisine_types, lead_score, website_url
    FROM directory_listings
    WHERE status = 'discovered'
      AND email IS NOT NULL
      AND email != ''
      AND outreach_status = 'not_contacted'
      AND (lead_score >= ${minScore} OR lead_score IS NULL)
      AND LOWER(email) NOT IN (
        SELECT LOWER(email) FROM directory_email_preferences WHERE opted_out = true
      )
      AND LOWER(email) NOT IN (
        SELECT LOWER(recipient_email) FROM directory_outreach_log WHERE email_type = 'invitation'
      )
    ORDER BY LOWER(email), lead_score DESC NULLS LAST, created_at ASC
    LIMIT ${effectiveBatchSize}
  `

  log(`Queue: ${queue.length} listings selected`)

  if (queue.length === 0) {
    log('No listings to contact. Done.')
    await sql.end()
    return
  }

  if (dryRun) {
    for (const listing of queue) {
      log(`Would send to: ${listing.name} (${listing.email}) in ${listing.city}, ${listing.state} - lead score: ${listing.lead_score ?? 'null'}`)
    }
    log(`Dry run complete. ${queue.length} emails would be sent.`)
    await sql.end()
    return
  }

  // Create batch record
  const [batch] = await sql`
    INSERT INTO outreach_batches (target_count, filters_used)
    VALUES (${queue.length}, ${JSON.stringify({ minScore, batchSize: effectiveBatchSize })})
    RETURNING id
  `
  const batchId = batch.id

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sentCount = 0
  let errorCount = 0

  for (const listing of queue) {
    const ref = encryptRef(listing.id)
    const joinUrl = `${SITE_URL}/discover/join?ref=${ref}`
    const optOutUrl = `${SITE_URL}/discover/unsubscribe?t=${Buffer.from(listing.email.toLowerCase()).toString('base64url')}`

    const typeLabel = listing.business_type === 'restaurant' ? 'restaurant' :
      listing.business_type === 'bakery' ? 'bakery' :
      listing.business_type === 'food_truck' ? 'food truck' :
      listing.business_type === 'caterer' ? 'catering business' :
      listing.business_type === 'cafe' ? 'cafe' : 'business'

    const subject = `Want to be featured in ${listing.city}'s food directory?`

    try {
      const { error } = await resend.emails.send({
        from: OUTREACH_FROM,
        to: listing.email,
        subject,
        html: buildEmailHtml({
          businessName: listing.name,
          typeLabel,
          city: listing.city,
          joinUrl,
          optOutUrl,
          physicalAddress: PHYSICAL_ADDRESS,
        }),
      })

      if (error) {
        log(`  ERROR sending to ${listing.name}: ${error.message}`)
        errorCount++
        await sql`INSERT INTO directory_outreach_log (listing_id, email_type, recipient_email, subject, error) VALUES (${listing.id}, 'invitation', ${listing.email}, ${subject}, ${error.message})`
      } else {
        sentCount++
        // Mark contacted
        await sql`UPDATE directory_listings SET outreach_status = 'contacted', outreach_contacted_at = now(), outreach_batch_id = ${batchId} WHERE id = ${listing.id}`
        await sql`INSERT INTO directory_outreach_log (listing_id, email_type, recipient_email, subject) VALUES (${listing.id}, 'invitation', ${listing.email}, ${subject})`
        log(`  Sent to: ${listing.name} (${listing.city}, ${listing.state})`)
      }
    } catch (err) {
      log(`  EXCEPTION sending to ${listing.name}: ${err.message}`)
      errorCount++
    }

    // Rate limiting: 2 second delay between sends
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Complete batch
  await sql`UPDATE outreach_batches SET sent_count = ${sentCount}, bounced_count = ${errorCount}, completed_at = now() WHERE id = ${batchId}`

  log(`Done. Sent: ${sentCount}, Errors: ${errorCount}`)
  await sql.end()
}

function buildEmailHtml({ businessName, typeLabel, city, joinUrl, optOutUrl, physicalAddress }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; margin: 0; padding: 0;">
<div style="max-width: 560px; margin: 0 auto; padding: 32px 24px;">
  <h1 style="font-size: 22px; font-weight: 600; color: #18181b; margin: 0 0 20px;">Be featured in ${city}</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 16px;">Hi ${businessName},</p>
  <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 16px;">We're putting together a directory of the best food in ${city}. Your ${typeLabel} came up in our research, and we'd love to feature you.</p>
  <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 16px;">It's free. Takes about 2 minutes. You add your menu, photos, and hours. People in ${city} find you directly - no middleman, no commission.</p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="${joinUrl}" style="background-color: #2563eb; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 15px; font-weight: 600; padding: 12px 32px; text-decoration: none;">Get Featured</a>
  </div>
  <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 16px;">If this isn't for you, no worries. Just ignore this email and you won't hear from us again.</p>
  <p style="font-size: 14px; color: #374151; margin: 24px 0 0;">Best,<br>The Food Directory Team</p>
  <p style="font-size: 11px; color: #9ca3af; margin: 16px 0 0; text-align: center;">${physicalAddress}</p>
  <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0; text-align: center;"><a href="${optOutUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a></p>
</div>
</body>
</html>`
}

main().catch((err) => {
  console.error('[outreach-batch] Fatal:', err.message)
  process.exit(1)
})
