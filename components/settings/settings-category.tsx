'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

export function SettingsCategory({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = false,
  primary = false,
}: {
  title: string
  description: string
  icon: LucideIcon
  children: ReactNode
  defaultOpen?: boolean
  primary?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div
      className={`rounded-xl border bg-stone-900 ${
        primary ? 'border-stone-700 border-l-2 border-l-brand-500' : 'border-stone-700'
      }`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left cursor-pointer"
      >
        <Icon
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
            primary ? 'text-brand-500' : 'text-stone-500'
          }`}
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-stone-100">{title}</h2>
          <p className="mt-1 text-sm text-stone-400">{description}</p>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 flex-shrink-0 text-stone-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-stone-700 p-4 sm:p-5">{children}</div>
      </div>
    </div>
  )
}
