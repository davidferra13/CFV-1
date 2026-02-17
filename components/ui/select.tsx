// Select Component
'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'

export type SelectOptionGroup = {
  label: string
  options: { value: string; label: string }[]
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options?: { value: string; label: string }[]
  groups?: SelectOptionGroup[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, groups, className = '', ...props }, ref) => {
    const selectClasses = `
      block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900
      focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20
      disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500
      ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}
      ${className}
    `.trim()

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={selectClasses}
          {...props}
        >
          <option value="">Select...</option>
          {groups ? (
            groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))
          ) : (
            options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-stone-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
