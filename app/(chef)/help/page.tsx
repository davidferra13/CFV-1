// Help Center - index page
// Displays category cards and a search box.
// All content is static; no DB queries beyond auth.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'
import { HelpSearch } from '@/components/help/help-search'
import { BookOpen, Calendar, DollarSign, Users, Settings, ChefHat } from '@/components/ui/icons'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Help Center' }

const HELP_CATEGORIES = [
  {
    icon: Calendar,
    label: 'Events & Scheduling',
    slug: 'events',
    desc: 'Creating events, DOP, transitions',
  },
  {
    icon: Users,
    label: 'Clients & CRM',
    slug: 'clients',
    desc: 'Managing clients, follow-ups, segments',
  },
  {
    icon: DollarSign,
    label: 'Finance & Payments',
    slug: 'finance',
    desc: 'Ledger, invoices, expenses, taxes',
  },
  {
    icon: ChefHat,
    label: 'Menus & Recipes',
    slug: 'culinary',
    desc: 'Recipe library, menu building, costing',
  },
  {
    icon: Settings,
    label: 'Settings & Integrations',
    slug: 'settings',
    desc: 'Automations, integrations, notifications',
  },
  {
    icon: BookOpen,
    label: 'Getting Started',
    slug: 'onboarding',
    desc: 'First steps, setup guide',
  },
]

export default async function HelpPage() {
  await requireChef()

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-stone-100">Help Center</h1>
        <p className="text-stone-400 mt-2">Find answers, guides, and tips for using ChefFlow</p>
      </div>

      <HelpSearch />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HELP_CATEGORIES.map((cat) => (
          <Link key={cat.slug} href={`/help/${cat.slug}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="p-2 bg-stone-800 rounded-lg flex-shrink-0">
                  <cat.icon className="h-5 w-5 text-stone-300" />
                </div>
                <div>
                  <p className="font-semibold text-stone-100">{cat.label}</p>
                  <p className="text-sm text-stone-500">{cat.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-stone-400 mb-3">Can't find what you're looking for?</p>
          <a
            href="mailto:support@cheflowhq.com"
            className="text-stone-100 font-medium hover:underline"
          >
            Contact Support →
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
