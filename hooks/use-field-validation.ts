'use client'

import { useState, useCallback } from 'react'
import {
  validateField,
  validateAll as validateAllFields,
  type FieldRules,
} from '@/lib/validation/form-rules'

/**
 * Hook for inline form validation on blur.
 *
 * Usage:
 *   const { errors, validate, validateAll, clearError } = useFieldValidation(rules)
 *   <Input error={errors.name} onBlur={() => validate('name', nameValue)} />
 */
export function useFieldValidation(rules: FieldRules) {
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  /** Validate a single field. Returns the error message or null. */
  const validate = useCallback(
    (fieldName: string, value: string): string | null => {
      const rule = rules[fieldName]
      if (!rule) return null
      const error = validateField(value, rule)
      setErrors((prev) => ({ ...prev, [fieldName]: error }))
      return error
    },
    [rules]
  )

  /** Validate all fields at once. Returns true if all valid. */
  const validateAll = useCallback(
    (data: Record<string, string>): boolean => {
      const allErrors = validateAllFields(data, rules)
      setErrors(allErrors)
      return Object.values(allErrors).every((e) => e === null)
    },
    [rules]
  )

  /** Clear error for a specific field (e.g., on focus or onChange). */
  const clearError = useCallback((fieldName: string) => {
    setErrors((prev) => ({ ...prev, [fieldName]: null }))
  }, [])

  /** Clear all errors. */
  const clearAll = useCallback(() => {
    setErrors({})
  }, [])

  return { errors, validate, validateAll, clearError, clearAll }
}
