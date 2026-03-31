// Input Component - Form inputs with consistent styling
'use client'

import { InputHTMLAttributes, forwardRef, useId, useState } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', type = 'text', ...props }, ref) => {
    const autoId = useId()
    const inputId = props.id || autoId
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'

    const inputClasses = `
      block w-full rounded-lg border bg-stone-900 px-3 py-2 text-sm text-stone-100
      placeholder:text-stone-400
      transition-[border-color,box-shadow,background-color] duration-200 ease-out
      focus:outline-none focus:ring-2
      disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500
      ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-500/20' : 'border-stone-600 focus:border-brand-500 focus:ring-brand-500/20'}
      ${isPassword ? 'pr-10' : ''}
      ${className}
    `.trim()

    const errorId = error ? `${inputId}-error` : undefined
    const helperId = helperText && !error ? `${inputId}-helper` : undefined
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined
    const ariaInvalid = error ? 'true' : ('false' as const)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-stone-300 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            className={inputClasses}
            aria-invalid={ariaInvalid}
            aria-describedby={describedBy}
            suppressHydrationWarning
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault()
                setShowPassword(!showPassword)
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-400"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600 animate-fade-slide-up" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-stone-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
