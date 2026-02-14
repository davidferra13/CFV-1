// Input Component - Form inputs with consistent styling
'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', type = 'text', ...props }, ref) => {
    const inputClasses = `
      block w-full rounded-md border-gray-300 shadow-sm
      focus:border-blue-500 focus:ring-blue-500 sm:text-sm
      disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
      ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
      ${className}
    `.trim()

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={inputClasses}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
