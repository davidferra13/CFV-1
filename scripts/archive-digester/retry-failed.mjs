/**
 * Retry Failed Extractions
 *
 * Re-runs entity extraction on threads that failed in the initial pass.
 * Uses a simpler, more constrained prompt to force JSON output.
 *
 * Usage: node scripts/archive-digester/retry-failed.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const EXTRACTED_PATH = path.join(__dirname, 'extracted-threads.json')
const PARSED_PATH = path.join(__dirname, 'parsed-emails.json')
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = 'llama3.2:latest'

async function extractEntitiesStrict(threadEmails) {
  const threadText = threadEmails
    .slice(0, 8)
    .map((e) => {
      const dir = e.isFromChef ? '[CHEF]' : '[CLIENT]'
      const date = e.date ? e.date.slice(0, 10) : '?'
      const body = (e.body || '').slice(0, 400)
      return `${dir} ${date} From: ${e.from.email}\n${body}`
    })
    .join('\n---\n')

  // Simpler, more direct prompt that forces JSON with no preamble
  const prompt = `Extract structured data from this email thread. Reply with ONLY a JSON object, no other text.

THREAD:
${threadText}

JSON (fill what you can, use null for unknown):
{"client_name":null,"client_email":null,"client_phone":null,"event_date":null,"location":null,"guest_count":null,"occasion":null,"budget_usd":null,"dietary_restrictions":[],"menu_items":[],"status":"inquiry","thread_summary":"brief summary"}`

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.0, num_predict: 1200 },
      }),
    })

    if (!res.ok) throw new Error(`Ollama ${res.status}`)
    const data = await res.json()
    let text = (data.response || '').trim()

    // Strip thinking tags, markdown fences
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    text = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()

    // Try to find JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Last resort: the model might have returned just the object without braces
      // Try wrapping the first line that looks like JSON properties
      throw new Error(`No JSON found. Response: ${text.slice(0, 200)}`)
    }

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    return { error: err.message, thread_summary: 'retry failed' }
  }
}

// Load existing results and parsed emails
const results = JSON.parse(fs.readFileSync(EXTRACTED_PATH, 'utf8'))
const { threads } = JSON.parse(fs.readFileSync(PARSED_PATH, 'utf8'))

const failed = results.filter((r) => r.extracted.error)
console.log(`Retrying ${failed.length} failed threads...`)

let fixed = 0
let stillFailed = 0

for (const record of failed) {
  const threadEmails = threads[record.threadKey]
  if (!threadEmails) {
    console.log(`  [skip] Thread not found in parsed data: ${record.threadKey.slice(0, 50)}`)
    stillFailed++
    continue
  }

  process.stdout.write(`  ${record.threadKey.slice(0, 55)}... `)

  const extracted = await extractEntitiesStrict(threadEmails)

  // Update the record in-place
  const idx = results.findIndex((r) => r.threadKey === record.threadKey)
  if (idx >= 0) results[idx].extracted = extracted

  if (extracted.error) {
    console.log(`FAILED: ${extracted.error.slice(0, 80)}`)
    stillFailed++
  } else {
    console.log(`OK -> ${extracted.client_name || extracted.client_email || 'unknown'} | ${extracted.status}`)
    fixed++
  }

  await new Promise((r) => setTimeout(r, 300))
}

// Save updated results
fs.writeFileSync(EXTRACTED_PATH, JSON.stringify(results, null, 2))

console.log(`\nDone. Fixed: ${fixed}, Still failed: ${stillFailed}`)
console.log(`Updated ${EXTRACTED_PATH}`)
