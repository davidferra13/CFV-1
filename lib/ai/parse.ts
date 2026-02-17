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
    throw new Error('GEMINI_API_KEY is not configured. Set it in your .env.local file to enable AI import.')
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userContent,
    config: { systemInstruction: systemPrompt },
  })
  const rawText = response.text

  if (!rawText) {
    throw new Error('AI returned no text response')
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = rawText
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error(`AI response was not valid JSON. Raw response: ${rawText.slice(0, 200)}...`)
  }

  // Validate with Zod
  const zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const issues = zodResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
    throw new Error(`AI response did not match expected schema: ${issues}`)
  }

  return zodResult.data
}
