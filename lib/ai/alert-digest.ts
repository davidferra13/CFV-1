// AI Alert Digest
// Takes a batch of proactive alerts and generates a concise executive summary.
// Non-blocking: dashboard works fine without this.

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

const DigestSchema = z.object({
  digest: z.string(),
})

type AlertSummary = {
  alert_type: string
  title: string
  body: string
  priority: string
}

export async function generateAlertDigest(alerts: AlertSummary[]): Promise<string | null> {
  if (alerts.length === 0) return null
  if (alerts.length === 1) return null // single alert needs no digest

  try {
    const urgentCount = alerts.filter(
      (a) => a.priority === 'urgent' || a.priority === 'high'
    ).length
    const alertLines = alerts
      .slice(0, 8) // cap input size
      .map((a) => `[${a.priority}] ${a.title}: ${a.body}`)
      .join('\n')

    const prompt = [
      `Total alerts: ${alerts.length} (${urgentCount} urgent/high)`,
      '',
      alertLines,
    ].join('\n')

    const result = await parseWithOllama(
      `You are a private chef's operations assistant. Summarize these business alerts into one concise sentence (max 40 words). Prioritize urgent items. Focus on what needs attention first. Never use em dashes. Return JSON: {"digest": "..."}`,
      prompt,
      DigestSchema,
      { modelTier: 'fast', maxTokens: 100, timeoutMs: 6000 }
    )

    return result.digest
  } catch {
    return null
  }
}
