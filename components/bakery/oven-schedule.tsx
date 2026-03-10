'use client'

import { useState, useTransition } from 'react'
import {
  type BakeryOven,
  type BakeScheduleWithOven,
  type CreateOvenInput,
  type CreateBakeInput,
  type OvenType,
  type BakeStatus,
  createOven,
  updateOven,
  deleteOven,
  createBake,
  updateBake,
  deleteBake,
  startBake,
  completeBake,
} from '@/lib/bakery/oven-actions'

// ---- Status colors ----

const STATUS_COLORS: Record<BakeStatus, { bg: string; label: string }> = {
  scheduled: { bg: 'bg-stone-600', label: 'Scheduled' },
  preheating: { bg: 'bg-orange-600', label: 'Preheating' },
  baking: { bg: 'bg-red-600', label: 'Baking' },
  cooling: { bg: 'bg-blue-600', label: 'Cooling' },
  done: { bg: 'bg-emerald-600', label: 'Done' },
}

const OVEN_TYPES: { value: OvenType; label: string }[] = [
  { value: 'deck', label: 'Deck Oven' },
  { value: 'convection', label: 'Convection' },
  { value: 'combi', label: 'Combi Oven' },
  { value: 'rotary', label: 'Rotary' },
  { value: 'proofer', label: 'Proofer' },
  { value: 'other', label: 'Other' },
]

// ---- Helpers ----

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatEndTime(startIso: string, durationMin: number): string {
  const end = new Date(new Date(startIso).getTime() + durationMin * 60_000)
  return end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---- Props ----

type Props = {
  initialOvens: BakeryOven[]
  initialSchedule: Record<string, BakeScheduleWithOven[]>
  initialUtilization: Record<string, number>
  initialDate: string
}

export default function OvenSchedule({
  initialOvens,
  initialSchedule,
  initialUtilization,
  initialDate,
}: Props) {
  const [ovens, setOvens] = useState(initialOvens)
  const [schedule, setSchedule] = useState(initialSchedule)
  const [utilization, setUtilization] = useState(initialUtilization)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showOvenForm, setShowOvenForm] = useState(false)
  const [showBakeForm, setShowBakeForm] = useState(false)
  const [editingOven, setEditingOven] = useState<BakeryOven | null>(null)
  const [showOvenList, setShowOvenList] = useState(false)

  // Oven form state
  const [ovenName, setOvenName] = useState('')
  const [ovenType, setOvenType] = useState<OvenType>('convection')
  const [ovenMaxTemp, setOvenMaxTemp] = useState('')
  const [ovenCapacity, setOvenCapacity] = useState('')
  const [ovenNotes, setOvenNotes] = useState('')

  // Bake form state
  const [bakeOvenId, setBakeOvenId] = useState('')
  const [bakeProduct, setBakeProduct] = useState('')
  const [bakeStart, setBakeStart] = useState('')
  const [bakeDuration, setBakeDuration] = useState('30')
  const [bakeTemp, setBakeTemp] = useState('350')
  const [bakeTrays, setBakeTrays] = useState('1')
  const [bakeNotes, setBakeNotes] = useState('')

  // ---- Oven CRUD handlers ----

  function resetOvenForm() {
    setOvenName('')
    setOvenType('convection')
    setOvenMaxTemp('')
    setOvenCapacity('')
    setOvenNotes('')
    setEditingOven(null)
  }

  function openEditOven(oven: BakeryOven) {
    setOvenName(oven.name)
    setOvenType(oven.oven_type as OvenType)
    setOvenMaxTemp(oven.max_temp_f?.toString() ?? '')
    setOvenCapacity(oven.capacity_trays?.toString() ?? '')
    setOvenNotes(oven.notes ?? '')
    setEditingOven(oven)
    setShowOvenForm(true)
  }

  function handleSaveOven() {
    setError(null)
    if (!ovenName.trim()) {
      setError('Oven name is required')
      return
    }

    const input: CreateOvenInput = {
      name: ovenName.trim(),
      oven_type: ovenType,
      max_temp_f: ovenMaxTemp ? parseInt(ovenMaxTemp) : null,
      capacity_trays: ovenCapacity ? parseInt(ovenCapacity) : null,
      notes: ovenNotes.trim() || null,
    }

    const prevOvens = ovens
    startTransition(async () => {
      try {
        if (editingOven) {
          const updated = await updateOven(editingOven.id, input)
          setOvens((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
        } else {
          const created = await createOven(input)
          setOvens((prev) => [...prev, created])
        }
        setShowOvenForm(false)
        resetOvenForm()
      } catch (err: unknown) {
        setOvens(prevOvens)
        setError(err instanceof Error ? err.message : 'Failed to save oven')
      }
    })
  }

  function handleDeleteOven(id: string) {
    setError(null)
    const prevOvens = ovens
    setOvens((prev) => prev.filter((o) => o.id !== id))

    startTransition(async () => {
      try {
        await deleteOven(id)
      } catch (err: unknown) {
        setOvens(prevOvens)
        setError(err instanceof Error ? err.message : 'Failed to delete oven')
      }
    })
  }

  // ---- Bake Schedule handlers ----

  function resetBakeForm() {
    setBakeOvenId('')
    setBakeProduct('')
    setBakeStart('')
    setBakeDuration('30')
    setBakeTemp('350')
    setBakeTrays('1')
    setBakeNotes('')
  }

  function handleAddBake() {
    setError(null)
    if (!bakeOvenId) {
      setError('Select an oven')
      return
    }
    if (!bakeProduct.trim()) {
      setError('Product name is required')
      return
    }
    if (!bakeStart) {
      setError('Start time is required')
      return
    }

    const plannedStart = `${selectedDate}T${bakeStart}:00Z`
    const input: CreateBakeInput = {
      oven_id: bakeOvenId,
      product_name: bakeProduct.trim(),
      planned_start: plannedStart,
      duration_minutes: parseInt(bakeDuration) || 30,
      temp_f: parseInt(bakeTemp) || 350,
      trays_used: parseInt(bakeTrays) || 1,
      notes: bakeNotes.trim() || null,
    }

    startTransition(async () => {
      try {
        const created = await createBake(input)
        setSchedule((prev) => {
          const updated = { ...prev }
          if (!updated[created.oven_id]) updated[created.oven_id] = []
          updated[created.oven_id] = [
            ...updated[created.oven_id],
            { ...created, bakery_ovens: null },
          ]
          return updated
        })
        setShowBakeForm(false)
        resetBakeForm()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to schedule bake')
      }
    })
  }

  function handleStartBake(id: string, ovenId: string) {
    setError(null)
    const prevSchedule = schedule
    startTransition(async () => {
      try {
        const updated = await startBake(id)
        setSchedule((prev) => {
          const copy = { ...prev }
          if (copy[ovenId]) {
            copy[ovenId] = copy[ovenId].map((e) => (e.id === id ? { ...e, ...updated } : e))
          }
          return copy
        })
      } catch (err: unknown) {
        setSchedule(prevSchedule)
        setError(err instanceof Error ? err.message : 'Failed to start bake')
      }
    })
  }

  function handleCompleteBake(id: string, ovenId: string) {
    setError(null)
    const prevSchedule = schedule
    startTransition(async () => {
      try {
        const updated = await completeBake(id)
        setSchedule((prev) => {
          const copy = { ...prev }
          if (copy[ovenId]) {
            copy[ovenId] = copy[ovenId].map((e) => (e.id === id ? { ...e, ...updated } : e))
          }
          return copy
        })
      } catch (err: unknown) {
        setSchedule(prevSchedule)
        setError(err instanceof Error ? err.message : 'Failed to complete bake')
      }
    })
  }

  function handleDeleteBake(id: string, ovenId: string) {
    setError(null)
    const prevSchedule = schedule
    setSchedule((prev) => {
      const copy = { ...prev }
      if (copy[ovenId]) {
        copy[ovenId] = copy[ovenId].filter((e) => e.id !== id)
      }
      return copy
    })

    startTransition(async () => {
      try {
        await deleteBake(id)
      } catch (err: unknown) {
        setSchedule(prevSchedule)
        setError(err instanceof Error ? err.message : 'Failed to delete bake')
      }
    })
  }

  // ---- Active ovens for display ----
  const activeOvens = ovens.filter((o) => o.is_active)

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100">
            x
          </button>
        </div>
      )}

      {/* Header row */}
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
        />
        <button
          onClick={() => setSelectedDate(todayStr())}
          className="px-3 py-2 text-sm bg-stone-700 text-stone-200 rounded-lg hover:bg-stone-600"
        >
          Today
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowOvenList(!showOvenList)}
          className="px-4 py-2 text-sm bg-stone-700 text-stone-200 rounded-lg hover:bg-stone-600"
        >
          Manage Ovens ({ovens.length})
        </button>
        <button
          onClick={() => {
            resetBakeForm()
            setShowBakeForm(true)
          }}
          className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-medium"
        >
          + Add Bake
        </button>
      </div>

      {/* Utilization summary */}
      {activeOvens.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {activeOvens.map((oven) => {
            const pct = utilization[oven.id] ?? 0
            return (
              <div
                key={oven.id}
                className="bg-stone-800/50 border border-stone-700 rounded-lg p-3 text-center"
              >
                <p className="text-sm font-medium text-stone-200 truncate">{oven.name}</p>
                <p className="text-xs text-stone-400 capitalize">{oven.oven_type}</p>
                <p
                  className={`text-lg font-bold mt-1 ${pct > 75 ? 'text-red-400' : pct > 40 ? 'text-amber-400' : 'text-emerald-400'}`}
                >
                  {pct}%
                </p>
                <p className="text-xs text-stone-500">utilization</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Timeline: each oven is a row */}
      {activeOvens.length === 0 ? (
        <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-8 text-center">
          <p className="text-stone-400 mb-4">
            No ovens configured yet. Add your first oven to start scheduling.
          </p>
          <button
            onClick={() => {
              resetOvenForm()
              setShowOvenForm(true)
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500"
          >
            + Add Oven
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeOvens.map((oven) => {
            const bakes = schedule[oven.id] ?? []
            const sortedBakes = [...bakes].sort(
              (a, b) => new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime()
            )

            return (
              <div
                key={oven.id}
                className="bg-stone-800/50 border border-stone-700 rounded-lg overflow-hidden"
              >
                {/* Oven header */}
                <div className="flex items-center justify-between px-4 py-3 bg-stone-800 border-b border-stone-700">
                  <div>
                    <span className="font-medium text-stone-100">{oven.name}</span>
                    <span className="ml-2 text-xs text-stone-400 capitalize">{oven.oven_type}</span>
                    {oven.max_temp_f && (
                      <span className="ml-2 text-xs text-stone-500">Max {oven.max_temp_f}F</span>
                    )}
                    {oven.capacity_trays && (
                      <span className="ml-2 text-xs text-stone-500">
                        {oven.capacity_trays} trays
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-500">
                    {sortedBakes.length} bake{sortedBakes.length !== 1 ? 's' : ''} scheduled
                  </span>
                </div>

                {/* Bake entries */}
                {sortedBakes.length === 0 ? (
                  <div className="px-4 py-6 text-center text-stone-500 text-sm">
                    No bakes scheduled for this oven today
                  </div>
                ) : (
                  <div className="divide-y divide-stone-700/50">
                    {sortedBakes.map((bake) => {
                      const statusInfo =
                        STATUS_COLORS[bake.status as BakeStatus] ?? STATUS_COLORS.scheduled
                      return (
                        <div key={bake.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                          {/* Status badge */}
                          <span
                            className={`${statusInfo.bg} text-white text-xs px-2 py-0.5 rounded-full font-medium`}
                          >
                            {statusInfo.label}
                          </span>

                          {/* Time range */}
                          <span className="text-stone-300 text-sm font-mono">
                            {formatTime(bake.planned_start)} -{' '}
                            {formatEndTime(bake.planned_start, bake.duration_minutes)}
                          </span>

                          {/* Product */}
                          <span className="text-stone-100 font-medium">{bake.product_name}</span>

                          {/* Details */}
                          <span className="text-xs text-stone-400">
                            {bake.temp_f}F, {bake.duration_minutes}min, {bake.trays_used} tray
                            {bake.trays_used !== 1 ? 's' : ''}
                          </span>

                          {bake.notes && (
                            <span className="text-xs text-stone-500 italic">{bake.notes}</span>
                          )}

                          {/* Action buttons */}
                          <div className="ml-auto flex items-center gap-2">
                            {bake.status === 'scheduled' && (
                              <button
                                onClick={() => handleStartBake(bake.id, oven.id)}
                                disabled={isPending}
                                className="text-xs px-2 py-1 bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50"
                              >
                                Start Bake
                              </button>
                            )}
                            {(bake.status === 'baking' || bake.status === 'preheating') && (
                              <button
                                onClick={() => handleCompleteBake(bake.id, oven.id)}
                                disabled={isPending}
                                className="text-xs px-2 py-1 bg-emerald-700 text-white rounded hover:bg-emerald-600 disabled:opacity-50"
                              >
                                Done
                              </button>
                            )}
                            {bake.status !== 'done' && (
                              <button
                                onClick={() => handleDeleteBake(bake.id, oven.id)}
                                disabled={isPending}
                                className="text-xs px-2 py-1 text-stone-400 hover:text-red-400 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Oven List Modal */}
      {showOvenList && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-stone-700">
              <h2 className="text-lg font-semibold text-stone-100">Manage Ovens</h2>
              <button
                onClick={() => setShowOvenList(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                x
              </button>
            </div>
            <div className="p-4 space-y-3">
              {ovens.map((oven) => (
                <div
                  key={oven.id}
                  className="flex items-center justify-between bg-stone-800 rounded-lg p-3"
                >
                  <div>
                    <p className="text-stone-100 font-medium">{oven.name}</p>
                    <p className="text-xs text-stone-400 capitalize">
                      {oven.oven_type}
                      {oven.max_temp_f ? ` - Max ${oven.max_temp_f}F` : ''}
                      {oven.capacity_trays ? ` - ${oven.capacity_trays} trays` : ''}
                      {!oven.is_active ? ' (Inactive)' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowOvenList(false)
                        openEditOven(oven)
                      }}
                      className="text-xs px-2 py-1 text-stone-300 hover:text-stone-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteOven(oven.id)}
                      disabled={isPending}
                      className="text-xs px-2 py-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  setShowOvenList(false)
                  resetOvenForm()
                  setShowOvenForm(true)
                }}
                className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-medium"
              >
                + Add Oven
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Oven Form Modal */}
      {showOvenForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-stone-700">
              <h2 className="text-lg font-semibold text-stone-100">
                {editingOven ? 'Edit Oven' : 'Add Oven'}
              </h2>
              <button
                onClick={() => {
                  setShowOvenForm(false)
                  resetOvenForm()
                }}
                className="text-stone-400 hover:text-stone-200"
              >
                x
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-stone-300 mb-1">Name</label>
                <input
                  value={ovenName}
                  onChange={(e) => setOvenName(e.target.value)}
                  placeholder="Deck Oven 1"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">Type</label>
                <select
                  value={ovenType}
                  onChange={(e) => setOvenType(e.target.value as OvenType)}
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                >
                  {OVEN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Max Temp (F)</label>
                  <input
                    type="number"
                    value={ovenMaxTemp}
                    onChange={(e) => setOvenMaxTemp(e.target.value)}
                    placeholder="550"
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Capacity (trays)</label>
                  <input
                    type="number"
                    value={ovenCapacity}
                    onChange={(e) => setOvenCapacity(e.target.value)}
                    placeholder="4"
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">Notes</label>
                <textarea
                  value={ovenNotes}
                  onChange={(e) => setOvenNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowOvenForm(false)
                    resetOvenForm()
                  }}
                  className="px-4 py-2 text-sm text-stone-300 hover:text-stone-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOven}
                  disabled={isPending}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 font-medium"
                >
                  {isPending ? 'Saving...' : editingOven ? 'Update' : 'Add Oven'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Bake Form Modal */}
      {showBakeForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-stone-700">
              <h2 className="text-lg font-semibold text-stone-100">Schedule Bake</h2>
              <button
                onClick={() => {
                  setShowBakeForm(false)
                  resetBakeForm()
                }}
                className="text-stone-400 hover:text-stone-200"
              >
                x
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-stone-300 mb-1">Oven</label>
                <select
                  value={bakeOvenId}
                  onChange={(e) => setBakeOvenId(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                >
                  <option value="">Select oven...</option>
                  {activeOvens.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.oven_type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">Product</label>
                <input
                  value={bakeProduct}
                  onChange={(e) => setBakeProduct(e.target.value)}
                  placeholder="Sourdough Loaves"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={bakeStart}
                    onChange={(e) => setBakeStart(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={bakeDuration}
                    onChange={(e) => setBakeDuration(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Temp (F)</label>
                  <input
                    type="number"
                    value={bakeTemp}
                    onChange={(e) => setBakeTemp(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Trays</label>
                  <input
                    type="number"
                    value={bakeTrays}
                    onChange={(e) => setBakeTrays(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">Notes</label>
                <textarea
                  value={bakeNotes}
                  onChange={(e) => setBakeNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBakeForm(false)
                    resetBakeForm()
                  }}
                  className="px-4 py-2 text-sm text-stone-300 hover:text-stone-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBake}
                  disabled={isPending}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 font-medium"
                >
                  {isPending ? 'Scheduling...' : 'Schedule Bake'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
