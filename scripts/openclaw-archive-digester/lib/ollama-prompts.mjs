/**
 * Ollama prompt templates for classification and entity extraction.
 */

import { verifyDerivedText, localModelRequest } from './media-privacy.mjs'
const TEXT_MODEL = process.env.OPENCLAW_LOCAL_MODEL || process.env.OLLAMA_TEXT_MODEL || process.env.OLLAMA_MODEL || 'qwen3.5:4b'
const KEEP_ALIVE = process.env.OPENCLAW_OLLAMA_KEEP_ALIVE || '30m'

export async function classifyDocument(filename, fileType, textContent, sourcePath, receipt) {
  verifyDerivedText(sourcePath, textContent || '', receipt)
  const truncated = (textContent || '').substring(0, 2000)

  const prompt = `You are classifying a business document for a private chef.
File name: ${filename}
File type: ${fileType}
Text content (first 2000 chars):
${truncated}

Classify this document as exactly ONE of:
receipt, invoice, menu, recipe, email_thread, text_message, form_submission,
photo_dish, photo_event, client_notes, financial_record, contract, unknown

Respond with JSON only: { "classification": "...", "confidence": 0.0-1.0, "reasoning": "..." }`

  return callOllama(prompt)
}

export async function extractEntities(classification, textContent, sourcePath, receipt) {
  verifyDerivedText(sourcePath, textContent || '', receipt)
  const prompt = `You are extracting business entities from a private chef's ${classification}.
Text content:
${(textContent || '').substring(0, 3000)}

Extract all entities you can find. Respond with JSON only:
{
  "client_names": [],
  "dates": [],
  "dollar_amounts": [{ "amount": 0.00, "context": "..." }],
  "locations": [],
  "food_items": [],
  "guest_count": null,
  "occasion": null,
  "contact_info": { "email": null, "phone": null },
  "payment_method": null,
  "notes": "any other relevant details"
}

Only include entities you are confident about. Do not guess.`

  return callOllama(prompt)
}

async function callOllama(prompt) {
  try {
    const res = await localModelRequest(TEXT_MODEL, {
      prompt, stream: false, keep_alive: KEEP_ALIVE,
      options: { temperature: 0.1, num_predict: 500 },
    })

    if (!res.ok) return null

    const data = await res.json()
    const text = data.response || ''

    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.warn('[local-ai] Request unavailable')
    return null
  }
}
