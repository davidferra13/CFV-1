import Link from 'next/link'
import { CalendarDays, ChefHat, Globe, Plug, Sparkles } from '@/components/ui/icons'

type GuideCard = {
  label: string
  description: string
  icon: React.ElementType
  links: Array<{ label: string; href: string }>
}

const guideCards: GuideCard[] = [
  {
    label: 'Daily workflow',
    description: 'How your day runs: preferences, scheduling rules, and availability.',
    icon: CalendarDays,
    links: [
      { label: 'Preferences', href: '/settings#preferences' },
      { label: 'Scheduling rules', href: '/settings/availability' },
    ],
  },
  {
    label: 'Your business',
    description: 'Business mode, modules, and how you present your operation.',
    icon: ChefHat,
    links: [
      { label: 'Business mode', href: '/settings#business-mode' },
      { label: 'Modules and focus', href: '/settings/modules' },
    ],
  },
  {
    label: 'Client-facing',
    description: 'What clients see: your public profile, booking page, and reviews.',
    icon: Globe,
    links: [
      { label: 'Public profile', href: '/settings/credentials' },
      { label: 'Booking page', href: '/settings#booking' },
    ],
  },
  {
    label: 'Integrations',
    description: 'Connect email capture, platforms, business tools, and calendars.',
    icon: Plug,
    links: [
      { label: 'All integrations', href: '/settings/integrations' },
      { label: 'Google and calendar', href: '/settings/integrations' },
    ],
  },
  {
    label: 'AI and system',
    description: 'How AI assistance works and what data it can access.',
    icon: Sparkles,
    links: [
      { label: 'AI privacy settings', href: '/settings/ai-privacy' },
      { label: 'Demo data', href: '/settings#demo' },
    ],
  },
]

export function SettingsGuidedOverview() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
      {guideCards.map((card) => (
        <div key={card.label} className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <card.icon className="h-4 w-4 text-stone-400 shrink-0" />
            <h3 className="text-sm font-semibold text-stone-200">{card.label}</h3>
          </div>
          <p className="text-xs text-stone-500 mb-3">{card.description}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {card.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-stone-400 hover:text-brand-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
