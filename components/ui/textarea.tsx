// Textarea Component
'use client'

import { TextareaHTMLAttributes, forwardRef, useId } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  /** Show live character count when maxLength is set */
  showCount?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, showCount, className = '', ...props }, ref) => {
    const autoId = useId()
    const textareaId = props.id || autoId
    const textareaClasses = `
      block w-full rounded-lg border bg-stone-900 px-3 py-2 text-sm text-stone-100
      placeholder:text-stone-400
      transition-[border-color,box-shadow,background-color] duration-200 ease-out
      focus:outline-none focus:ring-2
      disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500
      ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-500/20' : 'border-stone-600 focus:border-brand-500 focus:ring-brand-500/20'}
      ${className}
    `.trim()

    const errorId = error ? `${textareaId}-error` : undefined
    const helperId = helperText && !error ? `${textareaId}-helper` : undefined
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined
    const ariaInvalid = error ? 'true' : ('false' as const)

    const currentLength = typeof props.value === 'string' ? props.value.length : 0
    const maxLen = props.maxLength
    const showCharCount = showCount && maxLen != null

    return (
      <div className="w-full">
        {(label || showCharCount) && (
          <div className="flex items-center justify-between mb-1.5">
            {label && (
              <label htmlFor={textareaId} className="block text-sm font-medium text-stone-300">
                {label}
                {props.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {showCharCount && (
              <span
                className={`text-xs tabular-nums transition-colors duration-200 ${
                  currentLength > maxLen * 0.9
                    ? currentLength >= maxLen
                      ? 'text-red-400 font-medium'
                      : 'text-amber-400'
                    : 'text-stone-500'
                }`}
              >
                {currentLength}/{maxLen}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          rows={4}
          aria-invalid={ariaInvalid}
          aria-describedby={describedBy}
          suppressHydrationWarning
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600 animate-fade-slide-up" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-sm text-stone-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
