// Form validation rules - lightweight, no external dependencies.
// Used by useFieldValidation hook for real-time inline validation.

export type ValidationRule = {
  required?: boolean
  requiredMessage?: string
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  patternMessage?: string
  custom?: (value: string) => string | null
}

export type FieldRules = Record<string, ValidationRule>

/**
 * Validate a single field value against its rule.
 * Returns an error message string, or null if valid.
 */
export function validateField(value: string, rule: ValidationRule): string | null {
  const trimmed = value.trim()

  if (rule.required && !trimmed) {
    return rule.requiredMessage ?? 'This field is required'
  }

  if (trimmed && rule.minLength && trimmed.length < rule.minLength) {
    return `Must be at least ${rule.minLength} characters`
  }

  if (trimmed && rule.maxLength && trimmed.length > rule.maxLength) {
    return `Must be at most ${rule.maxLength} characters`
  }

  if (trimmed && rule.pattern && !rule.pattern.test(trimmed)) {
    return rule.patternMessage ?? 'Invalid format'
  }

  if (trimmed && rule.custom) {
    return rule.custom(trimmed)
  }

  return null
}

/**
 * Validate all fields in a data object against their rules.
 * Returns a record of field → error message (only for failing fields).
 */
export function validateAll(
  data: Record<string, string>,
  rules: FieldRules
): Record<string, string | null> {
  const errors: Record<string, string | null> = {}
  for (const [field, rule] of Object.entries(rules)) {
    errors[field] = validateField(data[field] ?? '', rule)
  }
  return errors
}

// ─── Common rule presets ───────────────────────────────────────

export const RULES = {
  required: { required: true } as ValidationRule,
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Enter a valid email address',
  } as ValidationRule,
  phone: {
    pattern: /^[+]?[\d\s\-().]{7,20}$/,
    patternMessage: 'Enter a valid phone number',
  } as ValidationRule,
  positiveNumber: {
    required: true,
    custom: (v: string) => {
      const n = Number(v)
      return Number.isNaN(n) || n <= 0 ? 'Must be a positive number' : null
    },
  } as ValidationRule,
  date: {
    required: true,
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    patternMessage: 'Enter a valid date (YYYY-MM-DD)',
  } as ValidationRule,
} as const
