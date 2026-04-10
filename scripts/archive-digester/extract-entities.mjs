/**
 * Entity Extractor
 *
 * Reads parsed-emails.json and for each thread calls Ollama to extract:
 * - Client name, email, phone
 * - Event date, location, guest count, occasion, budget
 * - Dietary restrictions / allergies
 * - Status (inquiry / booked / declined / ghost)
 * - Key notes
 *
 * Uses Ollama (local) because emails contain client PII.
 * Output: scripts/archive-digester/extracted-threads.json
 *
 * Usage: node scripts/archive-digester/extract-entities.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../../.env.local') })

const PARSED_PATH = path.join(__dirname, 'parsed-emails.json')
const OUT_PATH = path.join(__dirname, 'extracted-threads.json')

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
// Use llama3.2 - qwen3's thinking mode makes JSON extraction unreliable at low num_predict
const OLLAMA_MODEL = 'llama3.2:latest'

async function extractEntities(threadEmails) {
  // Build a compact representation of the thread for the prompt
  const threadText = threadEmails
    .slice(0, 10) // cap at 10 emails per thread to stay within context
    .map((e) => {
      const dir = e.isFromChef ? '[CHEF]' : '[CLIENT]'
      const date = e.date ? e.date.slice(0, 10) : 'unknown date'
      const bodySnippet = (e.body || '').slice(0, 600)
      return `${dir} ${date} | From: ${e.from.email} | Subject: ${e.subject}\n${bodySnippet}`
    })
    .join('\n\n---\n\n')

  const prompt = `You are extracting structured data from a private chef's email thread.

EMAIL THREAD:
${threadText}

Extract the following in JSON format. Use null for unknown fields. Do not guess - only extract what is clearly stated.

{
  "client_name": "full name of the client (not the chef)",
  "client_email": "client email address",
  "client_phone": "phone number if mentioned",
  "event_date": "YYYY-MM-DD if a specific date is mentioned, or null",
  "event_date_raw": "the date as written if unclear format",
  "location": "address or city/town of the dinner, or null",
  "guest_count": number or null,
  "occasion": "birthday/anniversary/corporate/dinner party/other/null",
  "budget_usd": number or null,
  "dietary_restrictions": ["list of any dietary needs, allergies, preferences"],
  "menu_items": ["specific dishes or foods mentioned"],
  "status": "inquiry|booked|declined|ghosted|completed",
  "status_notes": "brief reason for the status",
  "thread_summary": "1-2 sentence summary of what this thread is about"
}

Return only valid JSON. No explanation text before or after.`

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 800 },
      }),
    })

    if (!res.ok) throw new Error(`Ollama ${res.status}`)
    const data = await res.json()
    let text = data.response?.trim() || ''

    // Strip qwen3 thinking tags
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    // Strip markdown code fences
    text = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    return { error: err.message, thread_summary: 'extraction failed' }
  }
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------

const { emails, threads } = JSON.parse(fs.readFileSync(PARSED_PATH, 'utf8'))

console.log(`Processing ${Object.keys(threads).length} threads...`)

const results = []
let i = 0

for (const [threadKey, threadEmails] of Object.entries(threads)) {
  i++
  const firstClientEmail = threadEmails.find((e) => !e.isFromChef)
  if (!firstClientEmail) {
    // Thread is all chef-side - internal/outbound, skip
    continue
  }

  process.stdout.write(`[${i}/${Object.keys(threads).length}] ${threadKey.slice(0, 50)}...`)

  const extracted = await extractEntities(threadEmails)
  results.push({
    threadKey,
    emailCount: threadEmails.length,
    dateRange: {
      first: threadEmails[0]?.date?.slice(0, 10),
      last: threadEmails[threadEmails.length - 1]?.date?.slice(0, 10),
    },
    rawEmails: threadEmails.map((e) => ({
      messageId: e.messageId,
      date: e.date,
      from: e.from,
      isFromChef: e.isFromChef,
      subject: e.subject,
    })),
    extracted,
  })

  if (extracted.error) {
    console.log(` ERROR: ${extracted.error}`)
  } else {
    console.log(` -> ${extracted.client_name || extracted.client_email} | ${extracted.status}`)
  }

  // Small delay to avoid overwhelming Ollama
  await new Promise((r) => setTimeout(r, 200))
}

fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2))
console.log(`\nExtracted ${results.length} client threads -> ${OUT_PATH}`)
