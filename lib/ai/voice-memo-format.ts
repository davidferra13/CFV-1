import type { AffectiveAnalysis } from '@/lib/affective/voice-affect'

export interface VoiceMemoData {
  transcription: string
  actionItems: string[]
  clients: string[]
  events: string[]
  notes: string[]
  affectiveAnalysis?: AffectiveAnalysis
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Format voice memo data as a Remy response for chef review.
 */
export function formatVoiceMemoResponse(data: VoiceMemoData): string {
  const lines: string[] = ['**Voice memo processed:**\n']

  if (data.transcription) {
    lines.push(`> ${data.transcription}\n`)
  }

  if (data.actionItems.length > 0) {
    lines.push('**Action items:**')
    for (const item of data.actionItems) {
      lines.push(`- [ ] ${item}`)
    }
    lines.push('')
  }

  if (data.clients.length > 0) {
    lines.push(`**Clients mentioned:** ${data.clients.join(', ')}`)
  }

  if (data.events.length > 0) {
    lines.push(`**Events referenced:** ${data.events.join(', ')}`)
  }

  if (data.notes.length > 0) {
    lines.push('\n**Notes:**')
    for (const note of data.notes) {
      lines.push(`- ${note}`)
    }
  }

  if (data.affectiveAnalysis && data.affectiveAnalysis.signals.length > 0) {
    lines.push('\n**Voice signal:**')
    lines.push(`- ${data.affectiveAnalysis.summary}`)
    lines.push(`- Recommended next step: ${data.affectiveAnalysis.recommended_action}`)
  }

  lines.push(
    '\nWant me to create tasks from the action items, or log these notes to a client or event?'
  )

  return lines.join('\n')
}
