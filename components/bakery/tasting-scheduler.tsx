'use client'

import { useState, useTransition, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  createTasting,
  updateTasting,
  cancelTasting,
  recordTastingOutcome,
  type BakeryTasting,
} from '@/lib/bakery/tasting-actions'

const TASTING_TYPE_LABELS: Record<string, string> = {
  cake: 'Cake',
  pastry: 'Pastry',
  bread: 'Bread',
  wedding: 'Wedding',
  general: 'General',
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  scheduled: 'info',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'error',
  no_show: 'warning',
}

export function TastingScheduler({
  initialTastings,
  initialStats,
}: {
  initialTastings: BakeryTasting[]
  initialStats: {
    total: number
    completed: number
    converted: number
    conversionRate: number
    noShows: number
    cancelled: number
  }
}) {
  const [tastings, setTastings] = useState(initialTastings)
  const [stats, setStats] = useState(initialStats)
  const [isPending, startTransition] = useTransition()
  const [showBookForm, setShowBookForm] = useState(false)
  const [showOutcomeFor, setShowOutcomeFor] = useState<string | null>(null)

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0)

  // Book form state
  const [bookForm, setBookForm] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    tasting_date: '',
    tasting_time: '10:00',
    duration_minutes: 60,
    tasting_type: 'general',
    items_to_sample: '',
  })

  // Outcome form state
  const [outcomeForm, setOutcomeForm] = useState({
    outcome_notes: '',
    order_placed: false,
  })

  // Week view data
  const weekDays = useMemo(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7)
    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d.toISOString().split('T')[0])
    }
    return days
  }, [weekOffset])

  const tastingsByDate = useMemo(() => {
    const map: Record<string, BakeryTasting[]> = {}
    for (const t of tastings) {
      if (!map[t.tasting_date]) map[t.tasting_date] = []
      map[t.tasting_date].push(t)
    }
    return map
  }, [tastings])

  function formatDayLabel(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function formatTime(time: string) {
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${m} ${ampm}`
  }

  // ============================================================
  // Handlers
  // ============================================================

  function handleBookTasting() {
    if (!bookForm.client_name.trim()) {
      toast.error('Client name is required')
      return
    }
    if (!bookForm.tasting_date) {
      toast.error('Date is required')
      return
    }

    startTransition(async () => {
      try {
        const tasting = await createTasting({
          client_name: bookForm.client_name,
          client_email: bookForm.client_email || null,
          client_phone: bookForm.client_phone || null,
          tasting_date: bookForm.tasting_date,
          tasting_time: bookForm.tasting_time,
          duration_minutes: bookForm.duration_minutes,
          tasting_type: bookForm.tasting_type,
          items_to_sample: bookForm.items_to_sample
            ? bookForm.items_to_sample.split(',').map((s) => s.trim())
            : undefined,
        })
        setTastings([...tastings, tasting as BakeryTasting])
        setShowBookForm(false)
        setBookForm({
          client_name: '',
          client_email: '',
          client_phone: '',
          tasting_date: '',
          tasting_time: '10:00',
          duration_minutes: 60,
          tasting_type: 'general',
          items_to_sample: '',
        })
        toast.success('Tasting booked')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to book tasting')
      }
    })
  }

  function handleConfirm(id: string) {
    const previous = [...tastings]
    setTastings(tastings.map((t) => (t.id === id ? { ...t, status: 'confirmed' as const } : t)))

    startTransition(async () => {
      try {
        await updateTasting(id, { status: 'confirmed' })
        toast.success('Tasting confirmed')
      } catch (err) {
        setTastings(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to confirm')
      }
    })
  }

  function handleCancel(id: string) {
    if (!confirm('Cancel this tasting appointment?')) return

    const previous = [...tastings]
    setTastings(tastings.map((t) => (t.id === id ? { ...t, status: 'cancelled' as const } : t)))

    startTransition(async () => {
      try {
        await cancelTasting(id)
        toast.success('Tasting cancelled')
      } catch (err) {
        setTastings(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to cancel')
      }
    })
  }

  function handleNoShow(id: string) {
    const previous = [...tastings]
    setTastings(tastings.map((t) => (t.id === id ? { ...t, status: 'no_show' as const } : t)))

    startTransition(async () => {
      try {
        await updateTasting(id, { status: 'no_show' })
        toast.success('Marked as no-show')
      } catch (err) {
        setTastings(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  function handleRecordOutcome(id: string) {
    startTransition(async () => {
      try {
        const result = await recordTastingOutcome(id, {
          outcome_notes: outcomeForm.outcome_notes,
          order_placed: outcomeForm.order_placed,
        })
        setTastings(
          tastings.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'completed' as const,
                  outcome_notes: outcomeForm.outcome_notes,
                  order_placed: outcomeForm.order_placed,
                }
              : t
          )
        )
        // Update stats optimistically
        setStats({
          ...stats,
          completed: stats.completed + 1,
          converted: outcomeForm.order_placed ? stats.converted + 1 : stats.converted,
          conversionRate:
            stats.completed + 1 > 0
              ? Math.round(
                  ((outcomeForm.order_placed ? stats.converted + 1 : stats.converted) /
                    (stats.completed + 1)) *
                    100
                )
              : 0,
        })
        setShowOutcomeFor(null)
        setOutcomeForm({ outcome_notes: '', order_placed: false })
        toast.success('Outcome recorded')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to record outcome')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Conversion Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Tastings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.conversionRate}%</p>
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">
              {stats.converted} / {stats.completed}
            </p>
            <p className="text-sm text-muted-foreground">Converted to Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.noShows}</p>
            <p className="text-sm text-muted-foreground">No-Shows</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button variant="ghost" onClick={() => setWeekOffset(weekOffset - 1)}>
            Previous Week
          </Button>
          <Button variant="ghost" onClick={() => setWeekOffset(0)}>
            This Week
          </Button>
          <Button variant="ghost" onClick={() => setWeekOffset(weekOffset + 1)}>
            Next Week
          </Button>
        </div>
        <Button variant="primary" onClick={() => setShowBookForm(!showBookForm)}>
          {showBookForm ? 'Cancel' : 'Book Tasting'}
        </Button>
      </div>

      {/* Book Tasting Form */}
      {showBookForm && (
        <Card>
          <CardHeader>
            <CardTitle>Book Tasting Appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Name *</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookForm.client_name}
                  onChange={(e) => setBookForm({ ...bookForm, client_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookForm.client_email}
                  onChange={(e) => setBookForm({ ...bookForm, client_email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookForm.client_phone}
                  onChange={(e) => setBookForm({ ...bookForm, client_phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookForm.tasting_date}
                  onChange={(e) => setBookForm({ ...bookForm, tasting_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time *</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookForm.tasting_time}
                  onChange={(e) => setBookForm({ ...bookForm, tasting_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration (min)</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookForm.duration_minutes}
                  onChange={(e) =>
                    setBookForm({ ...bookForm, duration_minutes: Number(e.target.value) })
                  }
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookForm.tasting_type}
                  onChange={(e) => setBookForm({ ...bookForm, tasting_type: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="cake">Cake</option>
                  <option value="pastry">Pastry</option>
                  <option value="bread">Bread</option>
                  <option value="wedding">Wedding</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Items to Sample (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Red velvet, Chocolate ganache, Lemon bars"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookForm.items_to_sample}
                  onChange={(e) => setBookForm({ ...bookForm, items_to_sample: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleBookTasting} disabled={isPending}>
                {isPending ? 'Booking...' : 'Book Tasting'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Week View */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayTastings = tastingsByDate[day] || []
          const isToday = day === new Date().toISOString().split('T')[0]
          return (
            <Card key={day} className={isToday ? 'border-blue-500 border-2' : ''}>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-medium">{formatDayLabel(day)}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {dayTastings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tastings</p>
                ) : (
                  <div className="space-y-2">
                    {dayTastings.map((t) => (
                      <div key={t.id} className="text-xs p-2 rounded bg-muted/50 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{formatTime(t.tasting_time)}</span>
                          <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                        </div>
                        <p className="font-medium truncate">{t.client_name}</p>
                        <p className="text-muted-foreground">
                          {TASTING_TYPE_LABELS[t.tasting_type]} - {t.duration_minutes}min
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Upcoming Tastings List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Upcoming Tastings</h2>
        {tastings.filter((t) => ['scheduled', 'confirmed'].includes(t.status)).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No upcoming tastings. Book one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tastings
              .filter((t) => ['scheduled', 'confirmed'].includes(t.status))
              .map((t) => (
                <Card key={t.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{t.client_name}</h3>
                          <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                          <Badge variant="info">{TASTING_TYPE_LABELS[t.tasting_type]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t.tasting_date} at {formatTime(t.tasting_time)} ({t.duration_minutes}{' '}
                          min)
                        </p>
                        {t.items_to_sample && t.items_to_sample.length > 0 && (
                          <p className="text-sm mt-1">Samples: {t.items_to_sample.join(', ')}</p>
                        )}
                        {t.client_email && (
                          <p className="text-sm text-muted-foreground">{t.client_email}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {t.status === 'scheduled' && (
                          <Button
                            variant="primary"
                            onClick={() => handleConfirm(t.id)}
                            disabled={isPending}
                          >
                            Confirm
                          </Button>
                        )}
                        {['scheduled', 'confirmed'].includes(t.status) && (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setShowOutcomeFor(t.id)
                                setOutcomeForm({ outcome_notes: '', order_placed: false })
                              }}
                            >
                              Log Outcome
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleNoShow(t.id)}
                              disabled={isPending}
                            >
                              No-Show
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => handleCancel(t.id)}
                              disabled={isPending}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Outcome Form */}
                    {showOutcomeFor === t.id && (
                      <div className="mt-4 p-4 border rounded-md space-y-3">
                        <h4 className="font-medium">Record Outcome</h4>
                        <div>
                          <label className="block text-sm font-medium mb-1">Notes</label>
                          <textarea
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            rows={3}
                            placeholder="Client preferences, feedback, decisions made..."
                            value={outcomeForm.outcome_notes}
                            onChange={(e) =>
                              setOutcomeForm({ ...outcomeForm, outcome_notes: e.target.value })
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={outcomeForm.order_placed}
                            onChange={(e) =>
                              setOutcomeForm({ ...outcomeForm, order_placed: e.target.checked })
                            }
                          />
                          <span className="text-sm">Order placed</span>
                        </label>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            onClick={() => handleRecordOutcome(t.id)}
                            disabled={isPending}
                          >
                            {isPending ? 'Saving...' : 'Save Outcome'}
                          </Button>
                          <Button variant="ghost" onClick={() => setShowOutcomeFor(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
