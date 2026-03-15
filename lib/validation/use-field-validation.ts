'use client'

// useFieldValidation - Real-time inline form validation hook.
// Bridges form-rules.ts (validation logic) with UI components (error display).
//
// Validates onChange (after first blur) so users see errors as they type,
// but only AFTER they've interacted with the field (no errors on fresh load).
//
// Usage:
//   const v = useFieldValidation({
//     name: RULES.required,
//     email: RULES.email,
//     phone: RULES.phone,
//   })
//
//   <Input
//     value={v.values.name}
//     onChange={v.onChange('name')}
//     onBlur={v.onBlur('name')}
//     error={v.errors.name}
//   />
//
//   <Button disabled={!v.isValid} onClick={() => submit(v.values)}>Save</Button>

import { useState, useCallback, useRef } from 'react'
import { validateField, type ValidationRule, type FieldRules } from './form-rules'

interface UseFieldValidationOptions {
  /** Initial field values (optional, defaults to empty strings) */
  initialValues?: Record<string, string>
}

interface UseFieldValidationReturn {
  /** Current field values */
  values: Record<string, string>
  /** Current field errors (null = no error) */
  errors: Record<string, string | null>
  /** Whether all fields are currently valid */
  isValid: boolean
  /** Whether any field has been touched */
  isDirty: boolean
  /** onChange handler factory - returns a handler for the given field */
  onChange: (
    field: string
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  /** onBlur handler factory - marks field as touched, triggers validation */
  onBlur: (field: string) => () => void
  /** Set a field value programmatically (triggers validation if touched) */
  setValue: (field: string, value: string) => void
  /** Set an error manually (e.g., from server response) */
  setError: (field: string, error: string | null) => void
  /** Validate all fields at once (e.g., before submit). Returns true if all valid. */
  validateAll: () => boolean
  /** Reset all fields to initial values, clear errors and touched state */
  reset: () => void
  /** Get the error string for a field (undefined if no error, for direct prop passing) */
  errorFor: (field: string) => string | undefined
}

export function useFieldValidation(
  rules: FieldRules,
  options: UseFieldValidationOptions = {}
): UseFieldValidationReturn {
  const { initialValues = {} } = options

  // Build initial state from rules keys
  const fieldNames = Object.keys(rules)
  const buildInitial = () => Object.fromEntries(fieldNames.map((f) => [f, initialValues[f] ?? '']))

  const [values, setValues] = useState<Record<string, string>>(buildInitial)
  const [errors, setErrors] = useState<Record<string, string | null>>(
    Object.fromEntries(fieldNames.map((f) => [f, null]))
  )
  const touched = useRef<Set<string>>(new Set())

  // Validate a single field and update errors
  const validateOne = useCallback(
    (field: string, value: string) => {
      const rule = rules[field]
      if (!rule) return
      const error = validateField(value, rule)
      setErrors((prev) => ({ ...prev, [field]: error }))
    },
    [rules]
  )

  const onChange = useCallback(
    (field: string) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.value
        setValues((prev) => ({ ...prev, [field]: value }))
        // Only validate on change if field has been touched (blur-first strategy)
        if (touched.current.has(field)) {
          validateOne(field, value)
        }
      },
    [validateOne]
  )

  const onBlur = useCallback(
    (field: string) => () => {
      touched.current.add(field)
      validateOne(field, values[field] ?? '')
    },
    [validateOne, values]
  )

  const setValue = useCallback(
    (field: string, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }))
      if (touched.current.has(field)) {
        validateOne(field, value)
      }
    },
    [validateOne]
  )

  const setError = useCallback((field: string, error: string | null) => {
    setErrors((prev) => ({ ...prev, [field]: error }))
  }, [])

  const validateAllFields = useCallback(() => {
    let allValid = true
    const newErrors: Record<string, string | null> = {}

    for (const field of fieldNames) {
      const rule = rules[field]
      if (!rule) continue
      touched.current.add(field)
      const error = validateField(values[field] ?? '', rule)
      newErrors[field] = error
      if (error) allValid = false
    }

    setErrors(newErrors)
    return allValid
  }, [fieldNames, rules, values])

  const reset = useCallback(() => {
    setValues(buildInitial())
    setErrors(Object.fromEntries(fieldNames.map((f) => [f, null])))
    touched.current.clear()
  }, [fieldNames]) // eslint-disable-line react-hooks/exhaustive-deps

  const isValid = fieldNames.every((f) => !errors[f])
  const isDirty = touched.current.size > 0

  const errorFor = useCallback(
    (field: string): string | undefined => errors[field] ?? undefined,
    [errors]
  )

  return {
    values,
    errors,
    isValid,
    isDirty,
    onChange,
    onBlur,
    setValue,
    setError,
    validateAll: validateAllFields,
    reset,
    errorFor,
  }
}
