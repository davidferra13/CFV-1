import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getExpenses } from '@/lib/expenses/actions'
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Expenses - ChefFlow' }

const SECTIONS = [
  {
    href: '/finance/expenses/food-ingredients',
    label: 'Food & Ingredients',
    categories: ['groceries', 'alcohol', 'specialty_items'],
    icon: '🥩',
    description: 'Groceries, alcohol, and specialty items',
  },
  {
    href: '/finance/expenses/labor',
    label: 'Labor',
    categories: ['labor'],
    icon: '👥',
    description: 'Staff and labor costs',
  },
  {
    href: '/finance/expenses/rentals-equipment',
    label: 'Rentals & Equipment',
    categories: ['equipment', 'supplies', 'venue_rental', 'uniforms'],
    icon: '🏗️',
    description: 'Equipment, supplies, venue rentals, and uniforms',
  },
  {
    href: '/finance/expenses/travel',
    label: 'Travel',
    categories: ['gas_mileage', 'vehicle'],
    icon: '🚗',
    description: 'Gas, mileage, and vehicle costs',
  },
  {
    href: '/finance/expenses/marketing',
    label: 'Marketing',
    categories: ['marketing'],
    icon: '📣',
    description: 'Advertising and marketing spend',
  },
  {
    href: '/finance/expenses/software',
    label: 'Software',
    categories: ['subscriptions'],
    icon: '💻',
    description: 'SaaS subscriptions and tools',
  },
  {
    href: '/finance/expenses/miscellaneous',
    label: 'Miscellaneous',
    categories: ['insurance_licenses', 'professional_services', 'education', 'utilities', 'other'],
    icon: '📦',
    description: 'Insurance, professional services, education, utilities, and other',
  },
]

export default async function ExpensesPage() {
  await requireChef()
  const expenses = await getExpenses()

  const totalSpend = expenses.reduce((s, e) => s + e.amount_cents, 0)
  const businessExpenses = expenses.filter((e) => e.is_business)
  const totalBusiness = businessExpenses.reduce((s, e) => s + e.amount_cents, 0)

  // Compute totals per section
  const sectionTotals = SECTIONS.map((section) => {
    const matching = expenses.filter((e) => section.categories.includes(e.category))
    return {
      ...section,
      count: matching.length,
      total: matching.reduce((s, e) => s + e.amount_cents, 0),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-700">
          ← Finance
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Expenses</h1>
          <Link href="/expenses/new">
            <Button size="sm">+ Add Expense</Button>
          </Link>
        </div>
        <p className="text-stone-500 mt-1">
          All business and event-related expenses, organized by category
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-900">{expenses.length}</p>
          <p className="text-sm text-stone-500 mt-1">Total expenses</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpend)}</p>
          <p className="text-sm text-stone-500 mt-1">Total spend</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalBusiness)}</p>
          <p className="text-sm text-stone-500 mt-1">Business expenses</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sectionTotals.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{section.icon}</span>
                  <h2 className="font-semibold text-stone-900">{section.label}</h2>
                </div>
                <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                  {section.count}
                </span>
              </div>
              <p className="text-sm text-stone-500 mb-2">{section.description}</p>
              <p className="text-sm font-semibold text-red-600">{formatCurrency(section.total)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
