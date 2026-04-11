import Link from 'next/link'
import type { ElementType } from 'react'
import { ArrowRight, CalendarDays, ChefHat, Globe, Plug, Sparkles } from '@/components/ui/icons'
import { SETTINGS_TONE_STYLES, type SettingsTone } from '@/components/settings/settings-tone'

type GuideCard = {
  label: string
  description: string
  eyebrow: string
  cta: string
  href: string
  icon: ElementType
  tone: SettingsTone
  highlights: string[]
}

const guideCards: GuideCard[] = [
  {
    label: 'Daily workflow',
    description:
      'Jump straight to the defaults that affect scheduling, capacity, and booking flow.',
    eyebrow: 'Most touched',
    cta: 'Open workflow controls',
    href: '/settings#availability-rules',
    icon: CalendarDays,
    tone: 'sky',
    highlights: ['Business defaults', 'Availability rules', 'Booking page'],
  },
  {
    label: 'Your business',
    description: 'Core operating setup for how your business runs, presents itself, and gets paid.',
    eyebrow: 'Operations',
    cta: 'Open business settings',
    href: '/settings#business-defaults',
    icon: ChefHat,
    tone: 'brand',
    highlights: ['Business defaults', 'My services', 'Payments & billing'],
  },
  {
    label: 'Client-facing',
    description:
      'Everything a client can feel: profile, brand surface, booking intake, and reviews.',
    eyebrow: 'Public surface',
    cta: 'Open client-facing settings',
    href: '/settings#profile-branding',
    icon: Globe,
    tone: 'rose',
    highlights: ['Profile & branding', 'Booking page', 'Client reviews'],
  },
  {
    label: 'Integrations',
    description:
      'Connect inbox, calendars, web channels, and automation hooks without hunting around.',
    eyebrow: 'Connections',
    cta: 'Open integrations',
    href: '/settings#connected-accounts-integrations',
    icon: Plug,
    tone: 'emerald',
    highlights: ['Connected accounts', 'Calendar sync', 'Business tools'],
  },
  {
    label: 'AI and system',
    description: 'Remy controls, privacy expectations, health checks, and account-level controls.',
    eyebrow: 'Control plane',
    cta: 'Open AI + system settings',
    href: '/settings#ai-privacy',
    icon: Sparkles,
    tone: 'slate',
    highlights: ['AI & privacy', 'Account & security', 'System health'],
  },
]

export function SettingsGuidedOverview() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {guideCards.map((card) => {
        const toneStyles = SETTINGS_TONE_STYLES[card.tone]

        return (
          <Link
            key={card.label}
            href={card.href}
            className={`group relative overflow-hidden rounded-[22px] border bg-[image:var(--card-gradient)] p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[var(--shadow-card-hover)] ${toneStyles.panel}`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneStyles.accentBar}`}
            />
            <div className="flex items-start justify-between gap-4">
              <span
                className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm ${toneStyles.iconWrap}`}
              >
                <card.icon className="h-5 w-5" />
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneStyles.pill}`}
              >
                {card.eyebrow}
              </span>
            </div>

            <div className="mt-5">
              <h3 className="text-lg font-semibold text-stone-50">{card.label}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-300">{card.description}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {card.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneStyles.summaryChip}`}
                >
                  {highlight}
                </span>
              ))}
            </div>

            <div
              className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${toneStyles.cta}`}
            >
              <span>{card.cta}</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
