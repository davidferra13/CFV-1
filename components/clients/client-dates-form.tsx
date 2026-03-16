'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateClientDates } from '@/lib/clients/reminder-actions'
import type { ImportantDate } from '@/lib/clients/reminder-actions'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

interface Props {
  clientId: string
  chefId: string
  initialData?: {
    birthday: string | null
    anniversary: string | null
    importantDates: ImportantDate[]
  }
}

export function ClientDatesForm({ clientId, chefId, initialData }: Props) {
  const [birthday, setBirthday] = useState(initialData?.birthday ?? '')
  const [anniversary, setAnniversary] = useState(initialData?.anniversary ?? '')
  const [importantDates, setImportantDates] = useState<ImportantDate[]>(
    initialData?.importantDates ?? []
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultData = useMemo(
    () => ({
      birthday: initialData?.birthday ?? '',
      anniversary: initialData?.anniversary ?? '',
      importantDates: initialData?.importantDates ?? [],
    }),
    [initialData?.birthday, initialData?.anniversary, initialData?.importantDates]
  )

  const currentData = useMemo(
    () => ({
      birthday,
      anniversary,
      importantDates,
    }),
    [birthday, anniversary, importantDates]
  )

  const protection = useProtectedForm({
    surfaceId: 'client-dates',
    recordId: clientId,
    tenantId: chefId,
    defaultData,
    currentData,
  })

  function applyDraftData(data: Record<string, unknown>) {
    if (typeof data.birthday === 'string') setBirthday(data.birthday)
    if (typeof data.anniversary === 'string') setAnniversary(data.anniversary)
    if (Array.isArray(data.importantDates))
      setImportantDates(data.importantDates as ImportantDate[])
  }

  function addDate() {
    setImportantDates([...importantDates, { label: '', date: '' }])
  }

  function removeDate(index: number) {
    setImportantDates(importantDates.filter((_, i) => i !== index))
  }

  function updateDate(index: number, field: 'label' | 'date', value: string) {
    const updated = [...importantDates]
    updated[index] = { ...updated[index], [field]: value }
    setImportantDates(updated)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      // Filter out incomplete entries
      const validDates = importantDates.filter((d) => d.label.trim() && d.date.trim())

      await updateClientDates(clientId, {
        birthday: birthday || null,
        anniversary: anniversary || null,
        importantDates: validDates,
      })

      protection.markCommitted()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save dates')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyDraftData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Important Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Birthday */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Birthday</label>
            <Input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Anniversary */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Anniversary</label>
            <Input
              type="date"
              value={anniversary}
              onChange={(e) => setAnniversary(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Custom Important Dates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-stone-300">
                Other Important Dates
              </label>
              <Button variant="secondary" size="sm" onClick={addDate} type="button">
                + Add Date
              </Button>
            </div>

            {importantDates.length === 0 && (
              <p className="text-xs text-stone-500">
                Add custom dates like kids' birthdays, wedding anniversaries, or other milestones.
              </p>
            )}

            <div className="space-y-2">
              {importantDates.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Label (e.g. Kid's birthday)"
                    value={d.label}
                    onChange={(e) => updateDate(i, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={d.date}
                    onChange={(e) => updateDate(i, 'date', e.target.value)}
                    className="w-40"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDate(i)}
                    type="button"
                    className="text-stone-500 hover:text-red-400 shrink-0"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Dates'}
            </Button>
            {saved && <span className="text-sm text-green-400">Saved</span>}
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </CardContent>
      </Card>
    </FormShield>
  )
}
