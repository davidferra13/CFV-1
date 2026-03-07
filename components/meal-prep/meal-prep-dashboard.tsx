'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Package,
  Truck,
  Repeat,
  Calendar,
  ChevronRight,
  Pause,
  Play,
  User,
} from '@/components/ui/icons'
import type { MealPrepProgram } from '@/lib/meal-prep/program-actions'
import { pauseMealPrepProgram, resumeMealPrepProgram } from '@/lib/meal-prep/program-actions'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  paused: 'warning',
  ended: 'default',
}

interface MealPrepDashboardProps {
  programs: MealPrepProgram[]
}

export function MealPrepDashboard({ programs: initialPrograms }: MealPrepDashboardProps) {
  const [programs, setPrograms] = useState(initialPrograms)
  const [pending, startTransition] = useTransition()

  // Quick stats
  const activeCount = programs.filter((p) => p.status === 'active').length
  const totalContainersOut = programs.reduce((sum, p) => sum + (p.containers_out ?? 0), 0)

  // Get today's day of week (0=Sun, 6=Sat)
  const today = new Date().getDay()
  const deliveriesToday = programs.filter(
    (p) => p.status === 'active' && p.delivery_day === today
  ).length

  function handleToggleStatus(programId: string, currentStatus: string) {
    const previous = [...programs]
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === programId
          ? ({ ...p, status: currentStatus === 'active' ? 'paused' : 'active' } as MealPrepProgram)
          : p
      )
    )

    startTransition(async () => {
      try {
        const result =
          currentStatus === 'active'
            ? await pauseMealPrepProgram(programId)
            : await resumeMealPrepProgram(programId)

        if ('error' in result) {
          setPrograms(previous)
        }
      } catch {
        setPrograms(previous)
      }
    })
  }

  if (programs.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Package className="w-12 h-12 text-stone-600 mx-auto" />
        <h2 className="text-lg font-semibold text-stone-300">No meal prep programs yet</h2>
        <p className="text-sm text-stone-500 max-w-md mx-auto">
          Create a meal prep program to manage rotating menus, delivery schedules, and container
          tracking for your recurring clients.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950 rounded-lg">
              <Repeat className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-100">{activeCount}</p>
              <p className="text-xs text-stone-500">Active Programs</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-950 rounded-lg">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-100">{totalContainersOut}</p>
              <p className="text-xs text-stone-500">Containers Out</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-950 rounded-lg">
              <Truck className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-100">{deliveriesToday}</p>
              <p className="text-xs text-stone-500">Deliveries Today</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Program list */}
      <div className="space-y-3">
        {programs.map((program) => (
          <Card key={program.id} interactive className="p-0">
            <div className="flex items-center justify-between p-4 gap-4">
              {/* Left: client info + delivery */}
              <Link
                href={`/meal-prep/${program.id}`}
                className="flex-1 min-w-0 flex items-center gap-4"
              >
                <div className="p-2 bg-stone-800 rounded-lg flex-shrink-0">
                  <User className="w-5 h-5 text-stone-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-200 truncate">
                      {program.client?.full_name ?? 'Unknown Client'}
                    </h3>
                    <Badge variant={STATUS_VARIANT[program.status] ?? 'default'}>
                      {program.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {DAY_NAMES[program.delivery_day]}s
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat className="w-3.5 h-3.5" />
                      {program.rotation_weeks}-week rotation
                    </span>
                    {program.containers_out > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Package className="w-3.5 h-3.5" />
                        {program.containers_out} out
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              {/* Right: actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {program.status !== 'ended' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={(e) => {
                      e.preventDefault()
                      handleToggleStatus(program.id, program.status)
                    }}
                    title={program.status === 'active' ? 'Pause program' : 'Resume program'}
                  >
                    {program.status === 'active' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <Link href={`/meal-prep/${program.id}`}>
                  <ChevronRight className="w-5 h-5 text-stone-600" />
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
