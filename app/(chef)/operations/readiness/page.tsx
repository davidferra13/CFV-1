import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  Wrench,
} from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Operations Readiness' }

const readinessAreas = [
  {
    href: '/events',
    label: 'Event Pipeline',
    description: 'Review booked work before service decisions move downstream.',
    icon: CalendarDays,
  },
  {
    href: '/tasks',
    label: 'Open Tasks',
    description: 'Close delegated prep, admin, and service follow-ups.',
    icon: ClipboardCheck,
  },
  {
    href: '/operations/equipment',
    label: 'Equipment',
    description: 'Check kit availability, maintenance, and rental needs.',
    icon: Wrench,
  },
  {
    href: '/operations/kitchen-rentals',
    label: 'Kitchen Rentals',
    description: 'Confirm commercial kitchen bookings and cost coverage.',
    icon: CheckCircle2,
  },
  {
    href: '/safety/incidents',
    label: 'Safety Incidents',
    description: 'Review open incidents before they become service risk.',
    icon: AlertTriangle,
  },
  {
    href: '/settings/protection/insurance',
    label: 'Insurance',
    description: 'Keep protection records current for venues and clients.',
    icon: ShieldCheck,
  },
]

export default async function OperationsReadinessPage() {
  await requireChef()

  return (
    <div className="space-y-8">
      <div>
        <Link href="/operations" className="text-sm text-stone-500 hover:text-stone-300">
          Back to Operations
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-100">Operations Readiness</h1>
        <p className="mt-1 text-stone-500">
          Event, task, equipment, kitchen, safety, and insurance checkpoints in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {readinessAreas.map((area) => {
          const Icon = area.icon

          return (
            <Link key={area.href} href={area.href} className="group block">
              <Card className="h-full transition-colors group-hover:border-brand-700/60 group-hover:bg-stone-800/60">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <span className="rounded-md border border-stone-700 bg-stone-900 p-2 text-stone-300 group-hover:text-brand-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-stone-100 group-hover:text-brand-400">
                        {area.label}
                      </p>
                      <p className="mt-1 text-sm text-stone-500">{area.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
