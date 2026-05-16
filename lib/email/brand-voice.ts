export type TonePreset = 'polished' | 'friendly' | 'minimal'

export interface BrandVoiceConfig {
  tone: TonePreset
  chefName: string
}

const TONE_RULES: Record<
  TonePreset,
  {
    greeting: (name: string) => string
    signOff: (chefName: string) => string
    style: 'formal' | 'warm' | 'brief'
  }
> = {
  polished: {
    greeting: (name) => `Dear ${name}`,
    signOff: (chef) => `With warm regards,\n${chef}`,
    style: 'formal',
  },
  friendly: {
    greeting: (name) => `Hi ${name}`,
    signOff: (chef) => `Cheers,\n${chef}`,
    style: 'warm',
  },
  minimal: {
    greeting: (name) => `${name}`,
    signOff: (chef) => `${chef}`,
    style: 'brief',
  },
}

export function getToneRules(tone: TonePreset) {
  return TONE_RULES[tone]
}

export function applyGreeting(tone: TonePreset, clientName: string): string {
  return TONE_RULES[tone].greeting(clientName)
}

export function applySignOff(tone: TonePreset, chefName: string): string {
  return TONE_RULES[tone].signOff(chefName)
}

export const VOICE_PRINCIPLES = {
  maxSentencesPerSection: 4,
  forbiddenPhrases: [
    'Dear Valued Customer',
    'your service provider',
    'do not reply',
    'Dear Sir or Madam',
    'we hope this email finds you well',
  ],
  requiredPersonalization: ['chefName', 'clientName'],
} as const

/** Default tone when chef has no explicit preference stored. */
export const DEFAULT_TONE: TonePreset = 'friendly'

/**
 * Resolve the chef's configured tone preset.
 * Reads from cadence_chef_settings custom_messages._tone if present,
 * otherwise returns the default.
 */
export async function getChefTonePreset(tenantId: string): Promise<TonePreset> {
  try {
    const { createServerClient } = await import('@/lib/db/server')
    const db = createServerClient()
    const { data } = await db
      .from('cadence_chef_settings')
      .select('custom_messages')
      .eq('chef_id', tenantId)
      .single()

    if (data?.custom_messages) {
      const messages = data.custom_messages as Record<string, unknown>
      const tone = messages['_tone']
      if (tone === 'polished' || tone === 'friendly' || tone === 'minimal') {
        return tone
      }
    }
  } catch {
    // Non-fatal: use default
  }
  return DEFAULT_TONE
}

/**
 * Check message body against forbidden phrases.
 * Returns list of violations found (empty = clean).
 */
export function lintForbiddenPhrases(text: string): string[] {
  return VOICE_PRINCIPLES.forbiddenPhrases.filter((phrase) =>
    text.toLowerCase().includes(phrase.toLowerCase())
  )
}
