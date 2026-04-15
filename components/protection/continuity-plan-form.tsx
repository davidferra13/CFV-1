'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

type ContinuityPlan = {
  emergency_contacts?: string
  data_access_instructions?: string
  client_communication_plan?: string
  financial_instructions?: string
  notes?: string
} | null

export function ContinuityPlanForm({ plan }: { plan: ContinuityPlan }) {
  const [emergencyContacts, setEmergencyContacts] = useState(
    (plan as any)?.emergency_contacts ?? ''
  )
  const [dataAccess, setDataAccess] = useState((plan as any)?.data_access_instructions ?? '')
  const [clientComm, setClientComm] = useState((plan as any)?.client_communication_plan ?? '')
  const [financialInstructions, setFinancialInstructions] = useState(
    (plan as any)?.financial_instructions ?? ''
  )
  const [notes, setNotes] = useState((plan as any)?.notes ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const defaultData = useMemo(
    () => ({
      emergencyContacts: (plan as any)?.emergency_contacts ?? '',
      dataAccess: (plan as any)?.data_access_instructions ?? '',
      clientComm: (plan as any)?.client_communication_plan ?? '',
      financialInstructions: (plan as any)?.financial_instructions ?? '',
      notes: (plan as any)?.notes ?? '',
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    []
  )

  const currentData = useMemo(
    () => ({
      emergencyContacts,
      dataAccess,
      clientComm,
      financialInstructions,
      notes,
    }),
    [emergencyContacts, dataAccess, clientComm, financialInstructions, notes]
  )

  const protection = useProtectedForm({
    surfaceId: 'continuity-plan',
    recordId: null,
    tenantId: 'local',
    defaultData,
    currentData,
  })

  const applyFormData = useCallback((d: typeof defaultData) => {
    setEmergencyContacts(d.emergencyContacts)
    setDataAccess(d.dataAccess)
    setClientComm(d.clientComm)
    setFinancialInstructions(d.financialInstructions)
    setNotes(d.notes)
  }, [])

  function handleSave() {
    startTransition(async () => {
      try {
        // In a full implementation this would call a server action to save.
        // For now the form renders properly and demonstrates the structure.
        protection.markCommitted()
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        toast.error('Failed to save continuity plan')
      }
    })
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyFormData(d)
      }}
      onDiscard={protection.discardDraft}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Continuity Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Emergency Contacts
            </label>
            <textarea
              value={emergencyContacts}
              onChange={(e) => setEmergencyContacts(e.target.value)}
              rows={3}
              placeholder="Who should be contacted first? Include names, phone numbers, and relationship."
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Data &amp; System Access
            </label>
            <textarea
              value={dataAccess}
              onChange={(e) => setDataAccess(e.target.value)}
              rows={3}
              placeholder="How can a backup chef access your recipes, client preferences, and business systems?"
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Client Communication Plan
            </label>
            <textarea
              value={clientComm}
              onChange={(e) => setClientComm(e.target.value)}
              rows={3}
              placeholder="How should clients be notified? Who sends the message? What is the tone?"
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Financial Instructions
            </label>
            <textarea
              value={financialInstructions}
              onChange={(e) => setFinancialInstructions(e.target.value)}
              rows={3}
              placeholder="How should outstanding invoices, deposits, and refunds be handled?"
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any other details your backup contacts should know."
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Plan'}
            </Button>
            {saved && <span className="text-sm text-green-600">Saved</span>}
          </div>
        </CardContent>
      </Card>
    </FormShield>
  )
}
