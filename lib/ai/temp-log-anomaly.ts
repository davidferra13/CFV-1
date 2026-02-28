// @ts-nocheck
'use server'

// Temperature Log Anomaly Detection
// Analyzes food temperature log entries and flags food-safety violations.
// Routed to Ollama (internal operational data — not external PII but sensitive).
// Output is INSIGHT ONLY — flags for chef review, never modifies temp log records.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { withAiFallback } from './with-ai-fallback'
import { analyzeTempLogFormula } from '@/lib/formulas/temp-anomaly'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const ViolationSchema = z.object({
  item: z.string(),
  loggedAt: z.string(),
  tempF: z.number(),
  issue: z.string(), // description of violation
  regulatoryRef: z.string(), // e.g. "FDA Food Code: danger zone 40°F–140°F"
  severity: z.enum(['critical', 'warning', 'info']),
  recommendation: z.string(),
})

const TempLogAnomalyResultSchema = z.object({
  violations: z.array(ViolationSchema),
  overallStatus: z.enum(['clear', 'warnings', 'critical']),
  summary: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type TempLogAnomalyResult = z.infer<typeof TempLogAnomalyResultSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function analyzeTempLog(eventId: string): Promise<TempLogAnomalyResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: tempLog } = await supabase
    .from('temp_logs' as any)
    .select('food_item, temp_f, logged_at, stage, notes')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('logged_at', { ascending: true })

  if (!tempLog || tempLog.length === 0) {
    return {
      violations: [],
      overallStatus: 'clear',
      summary: 'No temperature log entries found for this event.',
      confidence: 'low',
    }
  }

  const systemPrompt = `You are a food safety compliance officer analyzing temperature logs.
FDA Food Code standards:
  - Danger zone: 40°F to 140°F
  - Hot holding: must stay at or above 140°F
  - Cold holding: must stay at or below 40°F
  - Cooking temps: poultry 165°F, ground meat 155°F, whole muscle 145°F, fish 145°F, pork 145°F
  - Time in danger zone: food held >2 hours in danger zone must be discarded

Flag violations as:
  critical: immediate food safety risk, item should likely be discarded
  warning: potential risk, requires monitoring or corrective action
  info: noteworthy but within acceptable range

Return valid JSON only.`

  const userContent = `Temperature log for event (${tempLog.length} entries):
${tempLog.map((t) => `- [${t.logged_at?.split('T')[1]?.slice(0, 5) ?? t.logged_at?.split('T')[0] ?? 'Time?'}] ${t.food_item}: ${t.temp_f}°F | stage: ${t.stage ?? 'unknown'}${t.notes ? ' | notes: ' + t.notes : ''}`).join('\n')}

Return JSON: {
  "violations": [{ "item": "...", "loggedAt": "...", "tempF": number, "issue": "...", "regulatoryRef": "...", "severity": "critical|warning|info", "recommendation": "..." }],
  "overallStatus": "clear|warnings|critical",
  "summary": "...",
  "confidence": "high|medium|low"
}`

  const { result } = await withAiFallback(
    // Formula: deterministic FDA rules — always correct, always available
    () => analyzeTempLogFormula(tempLog),
    // AI: enhanced analysis with contextual nuance (when Ollama is online)
    () =>
      parseWithOllama(systemPrompt, userContent, TempLogAnomalyResultSchema, {
        modelTier: 'fast',
      })
  )

  return result
}
