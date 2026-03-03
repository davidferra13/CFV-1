// Textarea Component
'use client'

import { TextareaHTMLAttributes, forwardRef, useId } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const autoId = useId()
    const textareaId = props.id || autoId
    const textareaClasses = `
      block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100
      placeholder:text-stone-400
      focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20
      disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500
      ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}
      ${className}
    `.trim()

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-stone-300 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea ref={ref} id={textareaId} className={textareaClasses} rows={4} {...props} />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-stone-500">{helperText}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
