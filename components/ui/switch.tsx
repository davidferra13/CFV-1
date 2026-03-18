'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, onChange, className = '', ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange?.(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation before:absolute before:-inset-2 before:content-[''] ${checked ? 'bg-brand-600' : 'bg-stone-700'} ${className}`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-stone-900 shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
          {...props}
        />
      </button>
    )
  }
)

Switch.displayName = 'Switch'
