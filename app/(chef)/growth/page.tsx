// Growth Hub Page
// Landing page for /growth - marketing, analytics, social, goals, and portfolio.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Growth | ChefFlow' }

const sections = [
  {
    heading: 'Marketing',
    items: [
      {
        href: '/marketing',
        label: 'Email Campaigns',
        description: 'Sequences, push dinners, and broadcast emails to your client list',
        icon: '📧',
      },
      {
        href: '/social/planner',
        label: 'Content Planner',
        description: 'Schedule posts, manage your media vault, and connect social platforms',
        icon: '📅',
      },
      {
        href: '/content',
        label: 'Content Pipeline',
        description: 'Track content ideas from draft to published',
        icon: '🗂️',
      },
      {
        href: '/reputation/mentions',
        label: 'Brand Mentions',
        description: 'Monitor what people are saying about you online',
        icon: '🔔',
      },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      {
        href: '/analytics/benchmarks',
        label: 'Business Analytics',
        description: 'Client value, demand heatmap, pipeline forecast, referral sources',
        icon: '📈',
      },
      {
        href: '/insights',
        label: 'Insights',
        description: 'Daily reports, custom reports, time analysis, and source analytics',
        icon: '💡',
      },
      {
        href: '/intelligence',
        label: 'Intelligence Hub',
        description: 'Full business intelligence dashboard',
        icon: '🧠',
      },
    ],
  },
  {
    heading: 'Goals and Portfolio',
    items: [
      {
        href: '/goals',
        label: 'Goals',
        description: 'Set revenue, event, and growth targets and track progress',
        icon: '🎯',
      },
      {
        href: '/portfolio',
        label: 'Portfolio',
        description: 'Curated photo gallery for your public profile',
        icon: '🖼️',
      },
      {
        href: '/testimonials',
        label: 'Testimonials',
        description: 'Client reviews and feedback you can showcase publicly',
        icon: '⭐',
      },
    ],
  },
  {
    heading: 'Network and Community',
    items: [
      {
        href: '/network',
        label: 'Chef Network',
        description: 'Connect with other chefs, share knowledge, grow your circle',
        icon: '🤝',
      },
      {
        href: '/circles',
        label: 'Circles',
        description: 'Private group channels with peers and collaborators',
        icon: '💬',
      },
      {
        href: '/partners',
        label: 'Partners and Referrals',
        description: 'Track referral partners and the events they generate',
        icon: '🔗',
      },
    ],
  },
]

export default async function GrowthHubPage() {
  await requireChef()

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Growth</h1>
        <p className="text-stone-500 mt-1">Marketing, analytics, goals, portfolio, and community</p>
      </div>

      {sections.map((section) => (
        <div key={section.heading}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
            {section.heading}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.items.map((tile) => (
              <Link key={tile.href} href={tile.href} className="group block">
                <Card className="h-full transition-colors group-hover:border-brand-700/60 group-hover:bg-stone-800/60">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none mt-0.5 flex-shrink-0">
                        {tile.icon}
                      </span>
                      <div>
                        <p className="font-semibold text-stone-100 group-hover:text-brand-400 transition-colors">
                          {tile.label}
                        </p>
                        <p className="text-sm text-stone-500 mt-0.5">{tile.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
