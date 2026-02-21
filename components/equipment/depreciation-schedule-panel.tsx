'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  setDepreciationMethod,
  markDepreciationClaimed,
  type EquipmentWithDepreciation,
} from '@/lib/equipment/depreciation-actions'
import {
  IRS_USEFUL_LIFE_DEFAULTS,
  DEPRECIATION_METHOD_LABELS,
} from '@/lib/equipment/depreciation-constants'
import { CheckCircle, Settings, Wrench } from 'lucide-react'

type Props = {
  equipment: EquipmentWithDepreciation[]
  taxYear: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function DepreciationSchedulePanel({ equipment, taxYear }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set())

  const [editForm, setEditForm] = useState({
    depreciationMethod: 'straight_line' as 'section_179' | 'straight_line',
    usefulLifeYears: 5,
    salvageValueCents: 0,
    taxYearPlacedInService: taxYear,
  })

  function openEdit(item: EquipmentWithDepreciation) {
    setEditingId(item.id)
    const defaultLife = IRS_USEFUL_LIFE_DEFAULTS[item.category] ?? 5
    setEditForm({
      depreciationMethod: item.depreciationMethod ?? 'straight_line',
      usefulLifeYears: item.usefulLifeYears ?? defaultLife,
      salvageValueCents: item.salvageValueCents ?? 0,
      taxYearPlacedInService:
        item.taxYearPlacedInService ??
        (item.purchaseDate ? parseInt(item.purchaseDate.substring(0, 4), 10) : taxYear),
    })
  }

  function handleSaveMethod() {
    if (!editingId) return
    startTransition(async () => {
      await setDepreciationMethod({
        equipmentItemId: editingId,
        depreciationMethod: editForm.depreciationMethod,
        usefulLifeYears:
          editForm.depreciationMethod === 'straight_line' ? editForm.usefulLifeYears : null,
        salvageValueCents: editForm.salvageValueCents,
        taxYearPlacedInService: editForm.taxYearPlacedInService,
      })
      setEditingId(null)
    })
  }

  function handleMarkClaimed(scheduleId: string) {
    startTransition(async () => {
      await markDepreciationClaimed(scheduleId)
      setClaimedIds((prev) => new Set([...prev, scheduleId]))
    })
  }

  const itemsWithDeduction = equipment.filter((e) => e.currentYearSchedule)
  const totalDeduction = itemsWithDeduction.reduce(
    (s, e) => s + (e.currentYearSchedule?.annualDepreciationCents ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      {totalDeduction > 0 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  {taxYear} Depreciation Deduction
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">Schedule C, Line 13 / Form 4562</p>
              </div>
              <p className="text-2xl font-bold text-emerald-800">{formatCents(totalDeduction)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-3">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Section 179 and depreciation deductions require IRS Form 4562.
            Consult your accountant before claiming. Section 179 has annual limits and phase-out
            rules.
          </p>
        </CardContent>
      </Card>

      {/* Equipment List */}
      <div className="space-y-4">
        {equipment.map((item) => {
          const schedule = item.currentYearSchedule
          const isClaimed = schedule ? claimedIds.has(schedule.id) || schedule.claimed : false
          const isEditing = editingId === item.id

          return (
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-stone-900">{item.name}</p>
                      <Badge variant="default">{item.category}</Badge>
                      {item.depreciationMethod && (
                        <Badge variant="info">
                          {item.depreciationMethod === 'section_179'
                            ? 'Section 179'
                            : 'Straight-Line'}
                        </Badge>
                      )}
                    </div>

                    {item.purchasePriceCents && (
                      <p className="text-xs text-stone-500 mt-1">
                        Purchase: {formatCents(item.purchasePriceCents)}
                        {item.purchaseDate && ` on ${item.purchaseDate}`}
                      </p>
                    )}

                    {/* Current year deduction */}
                    {schedule && (
                      <div className="mt-3 p-3 bg-stone-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-stone-900">
                              {taxYear} Deduction: {formatCents(schedule.annualDepreciationCents)}
                            </p>
                            <p className="text-xs text-stone-500">
                              Cumulative: {formatCents(schedule.cumulativeDepreciationCents)} of{' '}
                              {formatCents(schedule.depreciableBasisCents)}
                            </p>
                          </div>
                          {isClaimed ? (
                            <div className="flex items-center gap-1 text-emerald-600 text-xs">
                              <CheckCircle className="h-4 w-4" />
                              Claimed
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleMarkClaimed(schedule.id)}
                              loading={isPending}
                            >
                              Mark Claimed
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {!item.depreciationMethod && !isEditing && item.purchasePriceCents && (
                      <p className="text-xs text-stone-400 mt-2">No depreciation method set.</p>
                    )}
                  </div>

                  {!isEditing && (
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                      <Settings className="h-4 w-4" />
                      {item.depreciationMethod ? 'Edit' : 'Set Up'}
                    </Button>
                  )}
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div className="mt-4 border-t border-stone-100 pt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">
                        Depreciation Method
                      </label>
                      <select
                        value={editForm.depreciationMethod}
                        onChange={(e) =>
                          setEditForm({ ...editForm, depreciationMethod: e.target.value as any })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      >
                        <option value="straight_line">
                          Straight-Line (spread over useful life)
                        </option>
                        <option value="section_179">Section 179 (full deduction this year)</option>
                      </select>
                    </div>

                    {editForm.depreciationMethod === 'straight_line' && (
                      <Input
                        label="Useful Life (years)"
                        type="number"
                        min="1"
                        max="40"
                        value={editForm.usefulLifeYears.toString()}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            usefulLifeYears: parseInt(e.target.value || '5', 10),
                          })
                        }
                      />
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Salvage Value ($)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={(editForm.salvageValueCents / 100).toString()}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            salvageValueCents: Math.round(parseFloat(e.target.value || '0') * 100),
                          })
                        }
                      />
                      <Input
                        label="Year Placed In Service"
                        type="number"
                        min="2010"
                        max="2035"
                        value={editForm.taxYearPlacedInService.toString()}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            taxYearPlacedInService: parseInt(e.target.value || String(taxYear), 10),
                          })
                        }
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveMethod} loading={isPending}>
                        Save & Generate Schedule
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {equipment.length === 0 && (
          <div className="text-center py-8 text-stone-400 text-sm">
            No owned equipment found. Add equipment in{' '}
            <a href="/operations/equipment" className="text-brand-600 hover:underline">
              Operations → Equipment
            </a>
            .
          </div>
        )}
      </div>
    </div>
  )
}
