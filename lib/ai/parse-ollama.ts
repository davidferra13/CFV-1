// Ollama-backed AI Parser
// Privacy-first drop-in replacement for parseWithAI (Gemini)
// Routes sensitive operations (client PII, inquiries, notes) to local Ollama
// Falls back to Gemini if Ollama is unreachable or returns invalid output

'use server'

import { Ollama } from 'ollama'
import { z } from 'zod'
import { isOllamaEnabled, getOllamaConfig } from './providers'
import { parseWithAI } from './parse'

function extractJsonPayload(rawText: string): string {
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  return jsonMatch ? jsonMatch[1].trim() : rawText.trim()
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
}

/**
 * Privacy-first parsing using local Ollama model.
 * Mirrors parseWithAI signature exactly — drop-in for sensitive operations.
 *
 * Routing:
 *   OLLAMA_BASE_URL set + reachable → Ollama (data stays local)
 *   OLLAMA_BASE_URL not set         → Gemini (no change from previous behavior)
 *   Ollama unreachable at runtime   → Gemini fallback + console.warn
 *   Ollama returns invalid JSON     → Gemini fallback + console.warn
 */
export async function parseWithOllama<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>
): Promise<T> {
  if (!isOllamaEnabled()) {
    return parseWithAI(systemPrompt, userContent, schema)
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
    console.warn(
      '[ollama] Ollama unreachable, falling back to Gemini:',
      err instanceof Error ? err.message : String(err)
    )
    return parseWithAI(systemPrompt, userContent, schema)
  }

  if (!rawText) {
    console.warn('[ollama] Empty response from Ollama, falling back to Gemini')
    return parseWithAI(systemPrompt, userContent, schema)
  }

  let jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.warn(
      '[ollama] Response was not valid JSON, falling back to Gemini. Raw:',
      rawText.slice(0, 200)
    )
    return parseWithAI(systemPrompt, userContent, schema)
  }

  let zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const firstPassIssues = formatZodIssues(zodResult.error)
    console.warn('[ollama] Zod validation failed, attempting repair pass. Issues:', firstPassIssues)

    // Single repair pass via Ollama
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
    } catch {
      // Repair pass itself failed — fall through to Gemini fallback
    }

    console.warn('[ollama] Repair pass failed, falling back to Gemini')
    return parseWithAI(systemPrompt, userContent, schema)
  }

  console.log(`[ollama] Parsed successfully with ${config.model}`)
  return zodResult.data
}
