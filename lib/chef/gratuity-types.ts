export type GratuityMode = 'discretionary' | 'auto_service_fee' | 'included_in_rate' | 'none'

export type GratuitySettings = {
  gratuity_mode: GratuityMode
  gratuity_service_fee_pct: number | null
  gratuity_display_label: string | null
}

export type PercentValidationResult =
  | { valid: true; value: number }
  | { valid: false; error: string }

export function defaultGratuityDisplayLabel(mode: GratuityMode, pct?: string | number | null) {
  if (mode === 'discretionary') {
    return 'Gratuity'
  }

  if (mode === 'auto_service_fee') {
    const pctText = pct != null && String(pct).trim() ? `${String(pct).trim()}% ` : ''
    return `${pctText}service charge`
  }

  if (mode === 'included_in_rate') {
    return 'Service included'
  }

  return ''
}

export function validateClientEnteredGratuityPercent(value: string): PercentValidationResult {
  const trimmed = value.trim()

  if (!trimmed) {
    return { valid: false, error: 'Enter a gratuity percentage.' }
  }

  const parsed = Number(trimmed)

  if (!Number.isFinite(parsed)) {
    return { valid: false, error: 'Enter a valid gratuity percentage.' }
  }

  if (parsed < 0 || parsed > 100) {
    return { valid: false, error: 'Gratuity percentage must be between 0 and 100.' }
  }

  return { valid: true, value: parsed }
}
