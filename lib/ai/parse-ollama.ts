// Ollama-backed AI Parser — PRIVATE DATA ONLY
// Hard rule: private data (client PII, financials, allergies, messages) stays local.
// No Gemini fallback. If Ollama is offline, OllamaOfflineError is thrown.
// The UI layer catches OllamaOfflineError and shows a clear "start Ollama" message.

'use server'

import { Ollama } from 'ollama'
import { z } from 'zod'
import { isOllamaEnabled, getOllamaConfig } from './providers'
import { OllamaOfflineError } from './ollama-errors'

function extractJsonPayload(rawText: string): string {
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  return jsonMatch ? jsonMatch[1].trim() : rawText.trim()
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
}

/**
 * Privacy-first parsing using local Ollama model.
 * Mirrors parseWithAI signature — drop-in for sensitive operations.
 *
 * Routing:
 *   OLLAMA_BASE_URL set + reachable → Ollama (data stays local) ✓
 *   OLLAMA_BASE_URL not set         → OllamaOfflineError (never Gemini)
 *   Ollama unreachable at runtime   → OllamaOfflineError (never Gemini)
 *   Ollama returns invalid output   → OllamaOfflineError (never Gemini)
 */
export async function parseWithOllama<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>
): Promise<T> {
  if (!isOllamaEnabled()) {
    throw new OllamaOfflineError('OLLAMA_BASE_URL is not set in environment')
  }

  const config = getOllamaConfig()
  const ollama = new Ollama({ host: config.baseUrl })

  let rawText: string
  try {
    const response = await ollama.chat({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      format: 'json',
    })
    rawText = response.message.content
  } catch (err) {
    throw new OllamaOfflineError(
      `Ollama unreachable at ${config.baseUrl}: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  if (!rawText) {
    throw new OllamaOfflineError('Ollama returned an empty response')
  }

  let jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new OllamaOfflineError(
      `Ollama response was not valid JSON. Raw: ${rawText.slice(0, 200)}`
    )
  }

  let zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const firstPassIssues = formatZodIssues(zodResult.error)
    console.warn('[ollama] Zod validation failed, attempting repair pass. Issues:', firstPassIssues)

    // Single repair pass via Ollama (still local — no privacy risk)
    try {
      const repairResponse = await ollama.chat({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              'Your previous response did not satisfy the required JSON schema.',
              `Validation errors: ${firstPassIssues}`,
              'Return ONLY corrected JSON (no markdown, no prose).',
              'Keep the same structure and preserve as much extracted data as possible.',
              '--- Previous JSON ---',
              jsonStr,
            ].join('\n'),
          },
        ],
        format: 'json',
      })

      const repairedText = repairResponse.message.content
      const repairedJsonStr = extractJsonPayload(repairedText || '')
      const repairedParsed = JSON.parse(repairedJsonStr)
      const repairedResult = schema.safeParse(repairedParsed)

      if (repairedResult.success) {
        console.log(`[ollama] Repair pass succeeded with ${config.model}`)
        return repairedResult.data
      }

      const repairIssues = formatZodIssues(repairedResult.error)
      throw new OllamaOfflineError(
        `Ollama repair pass failed schema validation: ${repairIssues}`
      )
    } catch (err) {
      if (err instanceof OllamaOfflineError) throw err
      throw new OllamaOfflineError(
        `Ollama repair pass error: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  console.log(`[ollama] Parsed successfully with ${config.model}`)
  return zodResult.data
}
