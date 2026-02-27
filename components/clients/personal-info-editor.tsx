'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateClientPersonalInfo } from '@/lib/clients/milestones'
import { trackAction } from '@/lib/ai/remy-activity-tracker'

export function PersonalInfoEditor({
  clientId,
  initialData,
}: {
  clientId: string
  initialData: {
    preferred_name: string | null
    partner_name: string | null
    partner_preferred_name: string | null
    family_notes: string | null
  }
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preferredName, setPreferredName] = useState(initialData.preferred_name ?? '')
  const [partnerPreferredName, setPartnerPreferredName] = useState(
    initialData.partner_preferred_name ?? ''
  )
  const [familyNotes, setFamilyNotes] = useState(initialData.family_notes ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      await updateClientPersonalInfo(clientId, {
        preferred_name: preferredName || null,
        partner_preferred_name: partnerPreferredName || null,
        family_notes: familyNotes || null,
      })
      trackAction('Updated client details', preferredName || 'client')
      setEditing(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    const hasData = preferredName || partnerPreferredName || familyNotes
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Personal Details</CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {hasData ? 'Edit' : 'Add Details'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <p className="text-sm text-stone-500">
              Add nicknames, partner info, and family notes for personalized service.
            </p>
          ) : (
            <dl className="space-y-2">
              {preferredName && (
                <div>
                  <dt className="text-xs font-medium text-stone-500">Preferred Name / Nickname</dt>
                  <dd className="text-sm text-stone-100">{preferredName}</dd>
                </div>
              )}
              {initialData.partner_name && (
                <div>
                  <dt className="text-xs font-medium text-stone-500">Partner</dt>
                  <dd className="text-sm text-stone-100">
                    {initialData.partner_name}
                    {partnerPreferredName && ` (goes by "${partnerPreferredName}")`}
                  </dd>
                </div>
              )}
              {familyNotes && (
                <div>
                  <dt className="text-xs font-medium text-stone-500">Family Notes</dt>
                  <dd className="text-sm text-stone-100 whitespace-pre-wrap">{familyNotes}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Personal Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-400">Preferred Name / Nickname</label>
            <Input
              placeholder='e.g., "Murr" instead of Mary'
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-400">Partner Preferred Name</label>
            <Input
              placeholder='e.g., "Mike" instead of Michael'
              value={partnerPreferredName}
              onChange={(e) => setPartnerPreferredName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-400">Family Notes</label>
            <Textarea
              placeholder="Children, babysitter situations, extended family connections..."
              value={familyNotes}
              onChange={(e) => setFamilyNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
