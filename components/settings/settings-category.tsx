'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Building2,
  Palette,
  CalendarClock,
  CalendarCheck,
  Settings2,
  CreditCard,
  MessageSquare,
  Bell,
  Plug,
  Brain,
  Star,
  Sun,
  TrendingUp,
  Users,
  ShieldCheck,
  Database,
  Code,
  Monitor,
  MessageCircle,
  Lock,
  Printer,
  ChevronDown,
  type LucideIcon,
} from '@/components/ui/icons'
import { SETTINGS_TONE_STYLES, type SettingsTone } from '@/components/settings/settings-tone'

const iconMap: Record<string, LucideIcon> = {
  Building2,
  Palette,
  CalendarClock,
  CalendarCheck,
  Settings2,
  CreditCard,
  MessageSquare,
  Bell,
  Plug,
  Brain,
  Star,
  Sun,
  TrendingUp,
  Users,
  ShieldCheck,
  Database,
  Code,
  Monitor,
  MessageCircle,
  Lock,
  Printer,
}

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[&/]+/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function SettingsCategory({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
  primary = false,
  tone = 'slate',
  summary,
}: {
  title: string
  description: string
  icon: string
  children: ReactNode
  defaultOpen?: boolean
  primary?: boolean
  tone?: SettingsTone
  summary?: string[]
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const Icon = iconMap[icon]
  const toneStyles = SETTINGS_TONE_STYLES[tone]
  const sectionId = useMemo(() => slugifyTitle(title), [title])

  useEffect(() => {
    const revealFromHash = () => {
      if (window.location.hash === `#${sectionId}`) {
        setIsOpen(true)
      }
    }

    revealFromHash()
    window.addEventListener('hashchange', revealFromHash)
    return () => window.removeEventListener('hashchange', revealFromHash)
  }, [sectionId])

  return (
    <section
      id={sectionId}
      className={`group relative scroll-mt-24 overflow-hidden rounded-[22px] border bg-[image:var(--card-gradient)] transition-all duration-200 ${
        toneStyles.panel
      } ${
        isOpen
          ? 'shadow-[var(--shadow-card-hover)]'
          : 'shadow-[var(--shadow-card)] hover:-translate-y-[1px] hover:shadow-[var(--shadow-card-hover)]'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${toneStyles.accentBar}`} />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`${sectionId}-content`}
        className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors sm:px-5 sm:py-5"
      >
        {Icon && (
          <span
            className={`mt-0.5 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm ${toneStyles.iconWrap}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-50">{title}</h2>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneStyles.pill}`}
            >
              {primary ? 'Core' : 'Advanced'}
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-stone-300">{description}</p>
          {!isOpen && summary?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneStyles.summaryChip}`}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-col items-end gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-300">
            {isOpen ? 'Open' : 'Closed'}
          </span>
          <ChevronDown
            className={`h-5 w-5 flex-shrink-0 text-stone-300 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>
      </button>
      <div
        id={`${sectionId}-content`}
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`border-t p-4 sm:p-5 ${toneStyles.divider}`}>{children}</div>
      </div>
    </section>
  )
}
