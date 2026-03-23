// Operations Hub Page
// Landing page for /operations - nav tiles to all ops sub-sections.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Operations | ChefFlow' }

const sections = [
  {
    heading: 'Day-to-Day',
    items: [
      {
        href: '/stations/daily-ops',
        label: 'Daily Ops',
        description: 'Station assignments, prep checklists, and shift overview',
        icon: '📋',
      },
      {
        href: '/kitchen',
        label: 'Kitchen Mode',
        description: 'Full-screen mode for live service and prep',
        icon: '🔥',
      },
      {
        href: '/queue',
        label: 'Priority Queue',
        description: 'Your next actions sorted by urgency',
        icon: '⚡',
      },
      {
        href: '/meal-prep',
        label: 'Meal Prep',
        description: 'Recurring meal prep schedules and batches',
        icon: '🥘',
      },
    ],
  },
  {
    heading: 'Staff',
    items: [
      {
        href: '/staff',
        label: 'Staff',
        description: 'Roster, availability, scheduling, and performance',
        icon: '👥',
      },
      {
        href: '/staff/schedule',
        label: 'Staff Schedule',
        description: 'Weekly schedule and shift assignments',
        icon: '📅',
      },
      {
        href: '/staff/clock',
        label: 'Clock In / Out',
        description: 'Track hours and live activity',
        icon: '⏱️',
      },
      {
        href: '/staff/labor',
        label: 'Labor Dashboard',
        description: 'Labor costs and hours by event',
        icon: '💼',
      },
    ],
  },
  {
    heading: 'Stations and Tasks',
    items: [
      {
        href: '/stations',
        label: 'Station Clipboards',
        description: 'Ops log, order sheets, and waste log by station',
        icon: '🗒️',
      },
      {
        href: '/tasks',
        label: 'Tasks',
        description: 'Action items, templates, and VA task delegation',
        icon: '✅',
      },
    ],
  },
  {
    heading: 'Equipment and Space',
    items: [
      {
        href: '/operations/equipment',
        label: 'Equipment Inventory',
        description: 'Track owned kit, maintenance schedules, and rental costs',
        icon: '🔧',
      },
      {
        href: '/operations/kitchen-rentals',
        label: 'Kitchen Rentals',
        description: 'Commercial kitchen bookings - hours, costs, and event links',
        icon: '🏠',
      },
    ],
  },
]

export default async function OperationsHubPage() {
  await requireChef()

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Operations</h1>
        <p className="text-stone-500 mt-1">
          Daily ops, staff, stations, tasks, equipment, and space
        </p>
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
