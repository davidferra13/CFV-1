import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { getSchedulingRules } from '@/lib/calendar/buffer-rules'
import { SchedulingRulesForm } from '@/components/calendar/scheduling-rules-form'

export const metadata: Metadata = { title: 'Scheduling Rules - ChefFlow' }

export default async function SchedulingRulesPage() {
  await requireChef()
  const rules = await getSchedulingRules()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Scheduling Rules</h1>
        <p className="text-stone-400 mt-1">
          Control buffer times, booking caps, blocked days, and lead time requirements. These rules
          apply to both the public booking page and internal event creation.
        </p>
      </div>

      <SchedulingRulesForm initialRules={rules} />
    </div>
  )
}
