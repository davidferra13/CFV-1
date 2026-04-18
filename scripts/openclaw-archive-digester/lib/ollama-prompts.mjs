/**
 * Ollama prompt templates for classification and entity extraction.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || 'gemma4'

export async function classifyDocument(filename, fileType, textContent) {
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

export async function extractEntities(classification, textContent) {
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
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TEXT_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 500 }
      }),
      signal: AbortSignal.timeout(60000)
    })

    if (!res.ok) return null

    const data = await res.json()
    const text = data.response || ''

    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.warn('[ollama] Call failed:', err.message)
    return null
  }
}
