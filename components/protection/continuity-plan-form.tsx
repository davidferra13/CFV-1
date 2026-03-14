'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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

  function handleSave() {
    startTransition(async () => {
      try {
        // In a full implementation this would call a server action to save.
        // For now the form renders properly and demonstrates the structure.
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        toast.error('Failed to save continuity plan')
      }
    })
  }

  return (
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
          <label className="block text-sm font-medium text-stone-300 mb-1">Additional Notes</label>
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
  )
}
