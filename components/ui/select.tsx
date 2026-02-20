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

// ─── Compound Select (Radix-style API, native HTML implementation) ──────────

import { createContext, useContext, useState, ReactNode } from 'react'

type SelectContextType = {
  value: string
  onValueChange: (v: string) => void
  open: boolean
  setOpen: (o: boolean) => void
}
const SelectContext = createContext<SelectContextType | null>(null)

export function SelectRoot({
  value = '',
  defaultValue = '',
  onValueChange,
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  children: ReactNode
}) {
  const [internal, setInternal] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const resolved = value !== undefined ? value : internal
  return (
    <SelectContext.Provider
      value={{
        value: resolved,
        onValueChange: (v) => { setInternal(v); onValueChange?.(v) },
        open,
        setOpen,
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ctx = useContext(SelectContext)
  return (
    <button
      type="button"
      onClick={() => ctx?.setOpen(!ctx.open)}
      className={`flex w-full items-center justify-between rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500/20 ${className}`}
    >
      {children}
    </button>
  )
}

export function SelectValue({ placeholder = 'Select...' }: { placeholder?: string }) {
  const ctx = useContext(SelectContext)
  return <span>{ctx?.value || placeholder}</span>
}

export function SelectContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ctx = useContext(SelectContext)
  if (!ctx?.open) return null
  return (
    <div className={`absolute z-50 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg ${className}`}>
      {children}
    </div>
  )
}

export function SelectItem({ value, children, className = '' }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(SelectContext)
  const selected = ctx?.value === value
  return (
    <button
      type="button"
      onClick={() => { ctx?.onValueChange(value); ctx?.setOpen(false) }}
      className={`flex w-full items-center px-3 py-2 text-sm hover:bg-stone-100 ${selected ? 'font-medium text-stone-900' : 'text-stone-700'} ${className}`}
    >
      {children}
    </button>
  )
}
