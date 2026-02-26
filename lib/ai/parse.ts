// Core AI Parsing Utility
// Server-only: sends text to Google Gemini API, returns structured data
// All import features gracefully degrade if GEMINI_API_KEY is not set

'use server'

import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

const MODEL = 'gemini-2.5-flash'

export type Confidence = 'high' | 'medium' | 'low'

export type ParseResult<T> = {
  parsed: T
  confidence: Confidence
  warnings: string[]
}

function getResponseText(response: { text?: string | (() => string) }): string {
  if (typeof response.text === 'function') {
    return response.text()
  }
  return response.text || ''
}

function extractJsonPayload(rawText: string): string {
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  return jsonMatch ? jsonMatch[1].trim() : rawText.trim()
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
}

/**
 * Check if AI import is configured
 */
export async function isAIConfigured(): Promise<boolean> {
  return !!process.env.GEMINI_API_KEY
}

/**
 * Generic AI parsing function
 * Sends system prompt + user content to Gemini, validates response with Zod
 * The schema should define the full response shape including parsed/confidence/warnings
 * Returns the validated data as-is (the schema defines the shape)
 */
export async function parseWithAI<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Set it in your .env.local file to enable smart import.'
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userContent,
    config: { systemInstruction: systemPrompt },
  })
  const rawText = getResponseText(response)

  if (!rawText) {
    throw new Error('Parser returned no text response')
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = extractJsonPayload(rawText)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error(`Parser response was not valid JSON. Raw response: ${rawText.slice(0, 200)}...`)
  }

  // Validate with Zod
  let zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const firstPassIssues = formatZodIssues(zodResult.error)

    // Single repair pass: ask model to output corrected JSON using the same schema contract.
    const repairResponse = await ai.models.generateContent({
      model: MODEL,
      contents: [
        'Your previous response did not satisfy the required JSON schema.',
        `Validation errors: ${firstPassIssues}`,
        'Return ONLY corrected JSON (no markdown, no prose).',
        'Keep the same structure and preserve as much extracted data as possible.',
        '--- Previous JSON ---',
        jsonStr,
      ].join('\n'),
      config: { systemInstruction: systemPrompt },
    })

    const repairedText = getResponseText(repairResponse)
    if (!repairedText) {
      throw new Error(`Parser response did not match expected schema: ${firstPassIssues}`)
    }

    const repairedJsonStr = extractJsonPayload(repairedText)
    try {
      parsed = JSON.parse(repairedJsonStr)
    } catch {
      throw new Error(`Parser response did not match expected schema: ${firstPassIssues}`)
    }

    zodResult = schema.safeParse(parsed)
    if (!zodResult.success) {
      const secondPassIssues = formatZodIssues(zodResult.error)
      throw new Error(`Parser response did not match expected schema: ${secondPassIssues}`)
    }
  }

  return zodResult.data
}
