import { createHash } from 'node:crypto'

const clone = value => structuredClone(value)
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const iso = value => {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) throw Error('Invalid source timestamp')
  return new Date(time).toISOString()
}

export function freshText(text) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n')
  const boundary = lines.findIndex(line => /^\s*(?:>\s*)?On .+wrote:\s*$/.test(line) || /^\s*_{8,}\s*$/.test(line) || /^\s*From:\s/.test(line))
  return (boundary < 0 ? lines : lines.slice(0, boundary)).filter(line => !/^\s*>/.test(line)).join('\n').trim()
}

export function scrub(text, redactions = []) {
  let result = String(text)
  for (const entry of [...redactions].sort((a, b) => b.length - a.length)) {
    if (entry) result = result.replaceAll(entry, '[identity withheld]')
  }
  return result
    .replace(/https?:\/\/[^\s<>]+/gi, '[historical link withheld]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contact withheld]')
    .replace(/\+?1?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[contact withheld]')
    .replace(/\b\d+\s+(?:[A-Za-z]+\s+){1,5}(?:Road|Rd|Street|St|Avenue|Ave|Lane|Ln|Drive|Dr|Court|Ct)\b/gi, '[street address supplied]')
    .replace(/((?:gate|door|access|alarm)\s*(?:code|pin)\s*(?:is|:|=)?\s*)[^\n,;.]+/gi, '$1[access credential withheld]')
}

export function compileHistory(input) {
  if (!input?.id || !input.engagement || !Array.isArray(input.messages)) throw Error('Case id, engagement and messages required')
  const unique = new Map(), exclusions = { drafts: 0, duplicates: 0 }
  for (const message of input.messages) {
    if (!message.id) throw Error('Source message ID required')
    if (message.draft) { exclusions.drafts++; continue }
    if (!['client', 'chef', 'intake_relay', 'counterparty'].includes(message.role)) throw Error('Source role required')
    const original = { ...message, at: iso(message.at) }
    if (unique.has(message.id)) {
      if (hash(unique.get(message.id)) !== hash(original)) throw Error('conflicting duplicate source: ' + message.id)
      exclusions.duplicates++
      continue
    }
    unique.set(message.id, original)
  }
  const events = [...unique.values()].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)).map((message, index) => {
    const text = scrub(freshText(message.text), input.redactions)
    return { index, type: 'historical_message', sourceId: message.id, at: message.at,
      role: message.role, actor: message.actor ?? message.role, channel: message.channel ?? 'unknown',
      text, bodyStatus: text ? 'available' : 'unavailable', evidenceKind: 'observed',
      attachmentCount: message.attachmentCount ?? 0,
      source: { provider: message.provider ?? 'export', threadId: message.threadId ?? null,
        contentHash: hash(message.text ?? ''), transformation: 'quoted_history_removed_and_contacts_redacted' } }
  })
  if (!events.length) throw Error('No sent records available for replay')
  return { schema: 'simulation-forge.client-history/v1', id: input.id, engagement: input.engagement,
    provenance: { kind: 'observed', sourceIds: events.map(e => e.sourceId),
      note: 'Messages establish statements and actions; private thoughts, causality, payments and satisfaction require separate evidence.' },
    coverage: { email: 'unknown', sms: 'not_imported', calls: 'not_imported', attachments: 'not_reviewed', ...clone(input.coverage ?? {}) },
    exclusions, events }
}

function htmlText(html) {
  return String(html)
    .split(/<blockquote\b|<div\b[^>]*class=["'][^"']*gmail_quote|<div\b[^>]*id=["']divRplyFwdMsg/i)[0]
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(?:p|div|br|tr|li|hr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;/g, "'")
}

function mimeContent(payload) {
  const leaves = []
  const visit = part => {
    if (!part) return
    if (part.filename) { leaves.push({ attachment: true }); return }
    let text = part.body?.content
    if (!text && part.body?.base64_url_content) text = Buffer.from(part.body.base64_url_content, 'base64url').toString('utf8')
    if (text) leaves.push({ type: part.mime_type, text })
    for (const child of part.parts ?? []) visit(child)
  }
  visit(payload)
  const plain = leaves.filter(p => p.type === 'text/plain').map(p => p.text).join('\n')
  return { text: plain || leaves.filter(p => p.type === 'text/html').map(p => htmlText(p.text)).join('\n'),
    attachmentCount: leaves.filter(p => p.attachment).length }
}

export function importGmailThreads(threads, { id, engagement, ownerEmail, formThreadIds = [], redactions = [], coverage = {} }) {
  const aliases = new Map()
  const messages = threads.flatMap(thread => (thread.messages ?? []).map(message => {
    const headers = Object.fromEntries((message.payload?.headers ?? []).map(h => [h.name.toLowerCase(), h.value]))
    const email = headers.from?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase()
    const role = formThreadIds.includes(thread.id) ? 'intake_relay' : email === ownerEmail.toLowerCase() ? 'chef' : 'client'
    if (email && role === 'client' && !aliases.has(email)) aliases.set(email, 'participant-' + (aliases.size + 1))
    const content = mimeContent(message.payload)
    // Owner notification telemetry is not a statement of the client's mental state.
    const text = role === 'intake_relay' ? content.text.split(/\r?\nPre-inquiry journey\r?\n/)[0] : content.text
    return { id: 'gmail:' + message.id, threadId: thread.id, provider: 'gmail',
      at: new Date(Number(message.internal_date)).toISOString(), role,
      actor: role === 'client' ? aliases.get(email) ?? 'unresolved-participant' : role,
      channel: role === 'intake_relay' ? 'website_form_relay' : 'email',
      draft: (message.label_ids ?? []).includes('DRAFT'), text, attachmentCount: content.attachmentCount }
  }))
  return compileHistory({ id, engagement, messages, redactions,
    coverage: { email: 'selected_threads', ...coverage } })
}

function validateCase(c) {
  if (c?.schema !== 'simulation-forge.client-history/v1' || !c.id || !Array.isArray(c.events) || !c.events.length) throw Error('Invalid compiled history')
  let last = -Infinity
  const ids = new Set()
  for (const event of c.events) {
    const time = Date.parse(event.at)
    if (!Number.isFinite(time) || time < last) throw Error('Invalid chronological event timestamp')
    if (ids.has(event.sourceId)) throw Error('Duplicate event ID')
    ids.add(event.sourceId); last = time
  }
}

export function historyFindings(events) {
  const findings = []
  const patterns = [
    ['link_failure_reported', /links?.{0,70}(?:do not|don't|does not|doesn't).{0,30}work|redirect notice/is],
    ['confirmation_artifact_still_awaited', /(?:lookout|look for|not.{0,20}seen).{0,80}confirmation link|confirmation link.{0,60}(?:lookout|waiting)/is],
    ['payment_difficulty_reported', /(?:Venmo|payment).{0,160}(?:prevent|limit|first experience|never used|too old)|(?:prevent|limit).{0,80}(?:Venmo|payment)/is],
    ['payment_installment_reported', /(?:sent|send).{0,80}(?:\$20|\$500|remainder).{0,100}(?:payment|deposit|Venmo|funds)|(?:test payment)/is],
    ['restriction_statement', /gluten|celiac|allerg(?:y|ic|ies)/i],
    ['schedule_mismatch_reported', /(?:schedule.{0,60}(?:won't|will not|doesn't) work)|(?:check out.{0,100}(?:schedule|won't|will not))/is],
    ['explicit_positive_statement', /sounds fabulous|so looking forward|we.re just excited/i]
  ]
  for (const event of events) {
    if (!['client', 'intake_relay', 'counterparty'].includes(event.role)) continue
    for (const [kind, pattern] of patterns) if (pattern.test(event.text)) {
      findings.push({ kind, authority: 'statement_in_source', sourceIds: [event.sourceId], at: event.at,
        interpretation: kind === 'explicit_positive_statement' ? 'Positive statement at this point, not proof of service satisfaction.' : 'Source statement; its cause and later resolution remain unverified.' })
    }
  }
  return findings
}

export async function replayHistory(c, adapter = null, { maxEvents = 5000, maxMs = 30000 } = {}) {
  validateCase(c)
  if (c.events.length > maxEvents || !Number.isFinite(maxMs) || maxMs <= 0) throw Error('History replay budget exceeded')
  const started = performance.now(), history = [], steps = []
  for (const event of c.events) {
    if (performance.now() - started >= maxMs) throw Error('History replay time budget exceeded')
    history.push(clone(event))
    // The participant receives only the prefix. Coverage, final outcome and evaluator findings are withheld.
    const view = { caseId: c.id, at: event.at, event: clone(event), history: clone(history) }
    let output = null
    if (adapter) {
      let timer
      try { output = await Promise.race([adapter.step(view), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('History adapter time budget exceeded')), Math.max(1, maxMs - (performance.now() - started))) })]) }
      finally { clearTimeout(timer) }
    }
    steps.push({ sourceId: event.sourceId, at: event.at, knownRecords: history.length, output })
  }
  return { schema: 'simulation-forge.history-replay/v1', caseId: c.id,
    runId: hash([c, adapter?.version ?? 'record-replay-v1']), mode: 'historical_record_replay',
    steps, findings: historyFindings(history), coverage: clone(c.coverage), exclusions: clone(c.exclusions),
    bodyGaps: history.filter(e => e.bodyStatus === 'unavailable').map(e => e.sourceId),
    measuredMs: Number((performance.now() - started).toFixed(3)),
    productBehaviorVerified: false, financialVerification: 'not_performed', modelTrainingPerformed: false }
}

export function branchHistory(c, sourceId, replacements) {
  validateCase(c)
  const index = c.events.findIndex(e => e.sourceId === sourceId)
  if (index < 0 || !Array.isArray(replacements) || !replacements.length) throw Error('Branch point and replacements required')
  const generated = compileHistory({ id: c.id + ':branch', engagement: c.engagement, messages: replacements })
  if (generated.events.some(e => e.at <= c.events[index].at)) throw Error('Invalid branch timestamp: changes must follow the branch point')
  const out = clone(c)
  out.id += ':branch:' + hash(replacements).slice(0,12)
  out.provenance = { kind: 'inferred', from: c.id, branchAt: sourceId, note: 'Hypothetical branch. Historical future messages are discarded.' }
  out.events = [...clone(c.events.slice(0,index + 1)), ...generated.events.map(e => ({ ...e, evidenceKind: 'counterfactual' }))].map((e,i) => ({ ...e, index:i }))
  return out
}

export function historyScenario(c) {
  validateCase(c)
  return { id: c.id, product: { id: 'chefflow-client-history', version: 'history-input-v1' },
    actors: [{ id: 'historical-participants', role: 'recorded-participants' }],
    environment: { at: c.events[0].at, clock: 'source-timestamps', mode: 'offline_historical_record_replay' },
    initialState: { at: c.events[0].at, records: [] }, events: clone(c.events),
    expectedInvariants: ['chronological_record_order', 'no_unseen_future_records'],
    provenance: clone(c.provenance) }
}

export function historyAdapter() {
  return { version: 'historical-record-adapter-v1', evaluatorVersion: 'historical-record-evaluator-v1',
    async step(state, event) {
      if (state.records.length && Date.parse(event.at) < Date.parse(state.at)) throw Error('Record clock regressed')
      state.at = event.at
      state.records.push(clone(event))
      return { state, decisions: [{ kind: 'reveal_record', sourceId: event.sourceId, knownRecords: state.records.length, historicalAt: event.at }] }
    },
    evaluate(state, s) {
      return { observations: historyFindings(state.records),
        scores: { recordsReplayed: state.records.length, chronologicalReplay: Number(state.records.every((e,i,a) => !i || e.at >= a[i-1].at)), productBehaviorVerified: 0 },
        violations: state.records.length === s.events.length ? [] : [{ invariant: 'record_coverage', detail: 'Not all selected records were replayed' }] }
    } }
}
