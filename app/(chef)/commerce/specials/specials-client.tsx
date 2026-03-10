'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from '@/components/ui/icons'

interface SpecialsWeekNavProps {
  currentWeek: string // Monday ISO date
}

export function SpecialsWeekNav({ currentWeek }: SpecialsWeekNavProps) {
  const router = useRouter()

  const monday = new Date(currentWeek + 'T12:00:00Z')
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  function navigate(offset: number) {
    const d = new Date(currentWeek + 'T12:00:00Z')
    d.setDate(d.getDate() + offset * 7)
    router.push(`/commerce/specials?week=${d.toISOString().substring(0, 10)}`)
  }

  function goToday() {
    router.push('/commerce/specials')
  }

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <span className="text-stone-200 font-medium">
        {fmt(monday)} - {fmt(sunday)}
      </span>
      <Button variant="ghost" onClick={() => navigate(1)}>
        <ArrowRight className="w-4 h-4" />
      </Button>
      <Button variant="secondary" onClick={goToday}>
        This Week
      </Button>
    </div>
  )
}
