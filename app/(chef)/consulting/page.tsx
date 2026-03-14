import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Calculator,
  ClipboardList,
  DollarSign,
  MessageCircle,
  Target,
  TrendingUp,
} from 'lucide-react'
import { requireChef } from '@/lib/auth/get-user'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PricingCalculator } from './pricing-calculator'

export const metadata: Metadata = { title: 'Consulting - ChefFlow' }

const PRICING_PILLARS = [
  {
    title: 'Hard Costs',
    detail: 'Ingredients, rentals, travel, assistants, and any direct event expense.',
  },
  {
    title: 'Labor Value',
    detail: 'Your prep, shopping, cooking, service, cleanup, and planning time.',
  },
  {
    title: 'Overhead',
    detail: 'Software, insurance, vehicle, phone, and non-event admin hours.',
  },
  {
    title: 'Profit Target',
    detail: 'What you keep after all costs, not just what passes through your account.',
  },
]

const PACKAGE_FRAMEWORK = [
  {
    name: 'Essential',
    scope: 'One-time service, limited customization, clear boundaries.',
    pricingCue: 'Best for price-sensitive leads that still need quality.',
  },
  {
    name: 'Signature',
    scope: 'Most common offer: customized menu, planning, and premium service.',
    pricingCue: 'Anchor package. Make this your most obvious value pick.',
  },
  {
    name: 'Concierge',
    scope: 'High-touch service, expanded planning support, and premium response times.',
    pricingCue: 'Highest margin tier for clients buying certainty and convenience.',
  },
]

const DISCOVERY_FLOW = [
  'What is the occasion and what result do you want guests to remember?',
  'How many guests, what dietary requirements, and what kitchen setup?',
  'What is your ideal per-person budget range before tax and gratuity?',
  'What matters most: food complexity, service style, or full hospitality experience?',
  'What date flexibility do you have and how quickly do you need confirmation?',
]

const VALUE_SCRIPT = [
  'I price to fully cover ingredients, labor, and planning so service quality stays consistent.',
  'I can offer multiple service levels so you can choose what matters most for your event.',
  'If we adjust guest count, menu complexity, or staffing, I can tune the total quickly.',
]

const NEXT_ACTIONS = [
  {
    href: '/culinary/costing',
    title: 'Build your cost floor',
    detail: 'Use costing tools to lock your minimum profitable pricing baseline.',
  },
  {
    href: '/quotes/new',
    title: 'Turn this into a quote',
    detail: 'Draft a client-ready quote with clear package boundaries and add-ons.',
  },
  {
    href: '/finance/goals',
    title: 'Set your revenue target',
    detail: 'Back into your monthly pricing and booking targets from annual goals.',
  },
]

export default async function ConsultingPage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border border-stone-700/60 bg-[var(--surface-2)] p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">Consulting</Badge>
          <Badge variant="success">Open Access</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-stone-100">Know Your Worth and Price It</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-400">
          This page is built to help private chefs price confidently, explain value clearly, and
          stop undercharging. Use it as your practical playbook when building offers and quotes.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PRICING_PILLARS.map((pillar) => (
          <Card key={pillar.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-brand-600" />
                {pillar.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-stone-400">{pillar.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-brand-600" />
              Pricing Formula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-300">
              Minimum Price = Hard Costs + Labor Value + Overhead + Profit Target
            </p>
            <p className="text-sm text-stone-500">
              Use this floor before adding premium positioning, urgency, travel complexity, or
              custom service multipliers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-brand-600" />
              Package Ladder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PACKAGE_FRAMEWORK.map((pkg) => (
              <div key={pkg.name} className="rounded-lg border border-stone-700/60 p-3">
                <p className="text-sm font-semibold text-stone-100">{pkg.name}</p>
                <p className="text-sm text-stone-400">{pkg.scope}</p>
                <p className="mt-1 text-xs text-stone-500">{pkg.pricingCue}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <PricingCalculator />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand-600" />
              Discovery Call Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-stone-300">
              {DISCOVERY_FLOW.map((item, index) => (
                <li key={item} className="flex gap-2">
                  <span className="text-brand-500">{index + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-brand-600" />
              Value Language You Can Reuse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {VALUE_SCRIPT.map((line) => (
              <p
                key={line}
                className="rounded-lg border border-stone-700/60 p-3 text-sm text-stone-300"
              >
                {line}
              </p>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-600" />
              Next Best Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {NEXT_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-lg border border-stone-700/60 p-4 transition-colors hover:border-brand-700 hover:bg-stone-800/60"
              >
                <p className="text-sm font-semibold text-stone-100">{action.title}</p>
                <p className="mt-1 text-sm text-stone-400">{action.detail}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500">
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
