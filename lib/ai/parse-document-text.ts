// AI Document Text Parser
// Extracts structured document data from pasted text (contracts, templates, policies, notes)
// Privacy: Documents may contain client names, payment terms, and PII — routed through Ollama.

'use server'

import { z } from 'zod'
import type { ParseResult } from './parse'
import { parseWithOllama } from './parse-ollama'

// --- Schema ---

const KeyTermSchema = z.object({
  term: z.string(),
  value: z.string(),
})

const ParsedDocumentSchema = z.object({
  parsed: z.object({
    title: z.string().min(1),
    document_type: z.enum(['contract', 'template', 'policy', 'checklist', 'note', 'general']),
    content_text: z.string(),
    summary: z.string(),
    key_terms: z.array(KeyTermSchema).default([]),
    tags: z.array(z.string()).default([]),
    related_client_name: z.string().nullable().default(null),
    related_event_date: z.string().nullable().default(null),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([]),
})

export type ParsedDocument = z.infer<typeof ParsedDocumentSchema>['parsed']

// --- System Prompt ---

const DOCUMENT_SYSTEM_PROMPT = `You are a document analysis specialist for a private chef business management system.

Analyze the provided text and extract structured document metadata. Your job is to classify the document type, create a summary, and extract key terms.

DOCUMENT TYPES:
- contract: Service agreements, terms of service, booking contracts
- template: Reusable document templates (e.g., welcome letters, menus, proposals)
- policy: Business policies (cancellation, refund, dietary, allergen policies)
- checklist: Lists of items or tasks
- note: General notes, meeting notes, reminders
- general: Anything that doesn't fit the above categories

INSTRUCTIONS:
1. Determine the document title — use an existing title if present, or create a concise one
2. Classify the document type from the list above
3. Preserve the full original text as content_text
4. Write a 1-3 sentence summary of the document
5. Extract key terms/values (dates, amounts, names, deadlines, conditions)
6. Suggest relevant tags for organization
7. If a client name is mentioned, extract it
8. If an event date is mentioned, extract it (YYYY-MM-DD format)

RULES:
- Do NOT invent information not in the text
- Preserve the complete original text — do not truncate or summarize it in content_text
- Keep summary concise but informative
- Tags should be lowercase, single words or short phrases

RESPOND WITH ONLY valid JSON matching this exact structure:
{
  "parsed": {
    "title": "string",
    "document_type": "contract|template|policy|checklist|note|general",
    "content_text": "full original text",
    "summary": "1-3 sentence summary",
    "key_terms": [{"term": "label", "value": "extracted value"}],
    "tags": ["tag1", "tag2"],
    "related_client_name": "string or null",
    "related_event_date": "YYYY-MM-DD or null"
  },
  "confidence": "high|medium|low",
  "warnings": []
}`

/**
 * Parse document text using AI to extract structure and metadata
 */
export async function parseDocumentFromText(text: string): Promise<ParseResult<ParsedDocument>> {
  const result = await parseWithOllama(DOCUMENT_SYSTEM_PROMPT, text, ParsedDocumentSchema, {
    maxTokens: 2048, // Documents can be long — need room for content_text
    timeoutMs: 90_000, // 90s for large documents
  })
  return result as ParseResult<ParsedDocument>
}
