'use client'

import { useState, useMemo } from 'react'
import { updateClient } from '@/lib/clients/actions'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

type Props = {
  clientId: string
  chefId: string
  occupation: string | null
  companyName: string | null
  birthday: string | null
  anniversary: string | null
  instagramHandle: string | null
  preferredContactMethod: string | null
  referralSource: string | null
  referralSourceDetail: string | null
  formality: string | null
}

export function DemographicsEditor({ clientId, chefId, ...initial }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [occupation, setOccupation] = useState(initial.occupation || '')
  const [companyName, setCompanyName] = useState(initial.companyName || '')
  const [birthday, setBirthday] = useState(initial.birthday || '')
  const [anniversary, setAnniversary] = useState(initial.anniversary || '')
  const [instagram, setInstagram] = useState(initial.instagramHandle || '')
  const [preferredContact, setPreferredContact] = useState(initial.preferredContactMethod || '')
  const [referralSource, setReferralSource] = useState(initial.referralSource || '')
  const [referralDetail, setReferralDetail] = useState(initial.referralSourceDetail || '')
  const [formality, setFormality] = useState(initial.formality || '')

  const defaultData = useMemo(
    () => ({
      occupation: initial.occupation || '',
      companyName: initial.companyName || '',
      birthday: initial.birthday || '',
      anniversary: initial.anniversary || '',
      instagram: initial.instagramHandle || '',
      preferredContact: initial.preferredContactMethod || '',
      referralSource: initial.referralSource || '',
      referralDetail: initial.referralSourceDetail || '',
      formality: initial.formality || '',
    }),
    [
      initial.occupation,
      initial.companyName,
      initial.birthday,
      initial.anniversary,
      initial.instagramHandle,
      initial.preferredContactMethod,
      initial.referralSource,
      initial.referralSourceDetail,
      initial.formality,
    ]
  )

  const currentData = useMemo(
    () => ({
      occupation,
      companyName,
      birthday,
      anniversary,
      instagram,
      preferredContact,
      referralSource,
      referralDetail,
      formality,
    }),
    [
      occupation,
      companyName,
      birthday,
      anniversary,
      instagram,
      preferredContact,
      referralSource,
      referralDetail,
      formality,
    ]
  )

  const protection = useProtectedForm({
    surfaceId: 'client-demographics',
    recordId: clientId,
    tenantId: chefId,
    defaultData,
    currentData,
  })

  function applyDraftData(data: Record<string, unknown>) {
    if (typeof data.occupation === 'string') setOccupation(data.occupation)
    if (typeof data.companyName === 'string') setCompanyName(data.companyName)
    if (typeof data.birthday === 'string') setBirthday(data.birthday)
    if (typeof data.anniversary === 'string') setAnniversary(data.anniversary)
    if (typeof data.instagram === 'string') setInstagram(data.instagram)
    if (typeof data.preferredContact === 'string') setPreferredContact(data.preferredContact)
    if (typeof data.referralSource === 'string') setReferralSource(data.referralSource)
    if (typeof data.referralDetail === 'string') setReferralDetail(data.referralDetail)
    if (typeof data.formality === 'string') setFormality(data.formality)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateClient(clientId, {
        occupation: occupation || undefined,
        company_name: companyName || undefined,
        birthday: birthday || null,
        anniversary: anniversary || null,
        instagram_handle: instagram.replace(/^@/, '') || undefined,
        preferred_contact_method: (preferredContact || undefined) as any,
        referral_source: (referralSource || undefined) as any,
        referral_source_detail: referralDetail || undefined,
        formality_level: (formality || null) as any,
      })
      protection.markCommitted()
      setEditing(false)
    } catch (err) {
      console.error('Failed to update demographics:', err)
    } finally {
      setSaving(false)
    }
  }

  function formatDate(d: string | null) {
    if (!d) return '-'
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!editing) {
    const hasData = occupation || companyName || birthday || anniversary || instagram || formality
    return (
      <div className="rounded-lg border border-stone-700 overflow-hidden">
        <div className="px-4 py-3 bg-stone-800 border-b border-stone-700 flex items-center justify-between">
          <h3 className="font-medium text-stone-200">Demographics & Identity</h3>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-brand-500 hover:text-brand-600"
          >
            Edit
          </button>
        </div>
        {hasData ? (
          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {occupation && (
              <>
                <span className="text-stone-500">Occupation</span>
                <span className="text-stone-200">{occupation}</span>
              </>
            )}
            {companyName && (
              <>
                <span className="text-stone-500">Company</span>
                <span className="text-stone-200">{companyName}</span>
              </>
            )}
            {birthday && (
              <>
                <span className="text-stone-500">Birthday</span>
                <span className="text-stone-200">{formatDate(birthday)}</span>
              </>
            )}
            {anniversary && (
              <>
                <span className="text-stone-500">Anniversary</span>
                <span className="text-stone-200">{formatDate(anniversary)}</span>
              </>
            )}
            {instagram && (
              <>
                <span className="text-stone-500">Instagram</span>
                <span className="text-stone-200">@{instagram.replace(/^@/, '')}</span>
              </>
            )}
            {preferredContact && (
              <>
                <span className="text-stone-500">Preferred Contact</span>
                <span className="text-stone-200 capitalize">{preferredContact}</span>
              </>
            )}
            {referralSource && (
              <>
                <span className="text-stone-500">Referral Source</span>
                <span className="text-stone-200 capitalize">
                  {referralSource.replace(/_/g, ' ')}
                  {referralDetail ? ` - ${referralDetail}` : ''}
                </span>
              </>
            )}
            {formality && (
              <>
                <span className="text-stone-500">Formality</span>
                <span className="text-stone-200 capitalize">{formality.replace(/_/g, ' ')}</span>
              </>
            )}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-stone-400 text-sm">
            No demographics filled in yet. Click Edit to add details.
          </div>
        )}
      </div>
    )
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
      <div className="rounded-lg border border-brand-700 overflow-hidden">
        <div className="px-4 py-3 bg-brand-950 border-b border-brand-700">
          <h3 className="font-medium text-stone-200">Demographics & Identity</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Occupation"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Attorney, Doctor, CEO"
            />
            <Input
              label="Company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Where they work"
            />
            <Input
              label="Birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
            <Input
              label="Anniversary"
              type="date"
              value={anniversary}
              onChange={(e) => setAnniversary(e.target.value)}
            />
            <Input
              label="Instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@handle"
            />
            <Select
              label="Preferred Contact"
              value={preferredContact}
              onChange={(e) => setPreferredContact(e.target.value)}
            >
              <option value="">Select...</option>
              <option value="phone">Phone</option>
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="instagram">Instagram DM</option>
            </Select>
            <Select
              label="Referral Source"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            >
              <option value="">Select...</option>
              <option value="referral">Referral</option>
              <option value="instagram">Instagram</option>
              <option value="website">Website</option>
              <option value="take_a_chef">Take a Chef</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="other">Other</option>
            </Select>
            <Input
              label="Referral Detail"
              value={referralDetail}
              onChange={(e) => setReferralDetail(e.target.value)}
              placeholder="Who referred them?"
            />
            <Select
              label="Formality Level"
              value={formality}
              onChange={(e) => setFormality(e.target.value)}
            >
              <option value="">Select...</option>
              <option value="casual">Casual</option>
              <option value="semi_formal">Semi-Formal</option>
              <option value="formal">Formal</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </FormShield>
  )
}
