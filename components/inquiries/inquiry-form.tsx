// Inquiry Quick Capture Form
// Designed for speed: only channel + client name required
// Everything else optional — the chef is logging between tasks
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { createInquiry, type CreateInquiryInput } from '@/lib/inquiries/actions'
import { parseCurrencyToCents, formatCentsToDisplay } from '@/lib/utils/currency'
import { AddressAutocomplete, type AddressData } from '@/components/ui/address-autocomplete'
import { SmartFillModal } from '@/components/import/smart-fill-modal'
import { parseInquiryFromText, type ParsedInquiry } from '@/lib/ai/parse-inquiry'
import { isAIConfigured } from '@/lib/ai/parse'

type Client = {
  id: string
  full_name: string
  email: string
  phone: string | null
}

type Partner = {
  id: string
  name: string
  partner_type: string
}

type PartnerLocation = {
  id: string
  name: string
  city: string | null
  state: string | null
}

export function InquiryForm({
  clients,
  partners = [],
  partnerLocations = {},
}: {
  clients: Client[]
  partners?: Partner[]
  partnerLocations?: Record<string, PartnerLocation[]>
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Smart Fill state
  const [smartFillOpen, setSmartFillOpen] = useState(false)
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)

  // Check AI availability on first open
  const handleSmartFillOpen = async () => {
    if (aiAvailable === null) {
      const available = await isAIConfigured()
      setAiAvailable(available)
      if (!available) {
        setError('Smart import is temporarily unavailable. Please enter details manually.')
        return
      }
    } else if (!aiAvailable) {
      setError('Smart import is temporarily unavailable. Please enter details manually.')
      return
    }
    setSmartFillOpen(true)
  }

  const handleSmartFill = (data: ParsedInquiry) => {
    if (data.client_name) setClientName(data.client_name)
    if (data.client_email) setClientEmail(data.client_email)
    if (data.client_phone) setClientPhone(data.client_phone)
    if (data.channel) setChannel(data.channel)
    if (data.confirmed_date) setConfirmedDate(data.confirmed_date)
    if (data.confirmed_guest_count) setGuestCount(String(data.confirmed_guest_count))
    if (data.confirmed_location) setLocation(data.confirmed_location)
    if (data.confirmed_occasion) setOccasion(data.confirmed_occasion)
    if (data.confirmed_budget_cents)
      setBudgetAmount(formatCentsToDisplay(data.confirmed_budget_cents))
    if (data.confirmed_dietary_restrictions.length > 0)
      setDietaryRestrictions(data.confirmed_dietary_restrictions.join(', '))
    if (data.confirmed_service_expectations)
      setServiceExpectations(data.confirmed_service_expectations)
    if (data.confirmed_cannabis_preference)
      setCannabisPreference(data.confirmed_cannabis_preference)
    if (data.source_message) setSourceMessage(data.source_message)
    if (data.notes) setNotes(data.notes)
    if (data.referral_source) setReferralSource(data.referral_source)
  }

  // Required fields
  const [channel, setChannel] = useState('')
  const [clientName, setClientName] = useState('')

  // Client linking
  const [selectedClientId, setSelectedClientId] = useState('')

  // Optional contact info (for unlinked leads)
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  // Optional confirmed facts
  const [confirmedDate, setConfirmedDate] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [location, setLocation] = useState('')
  const [occasion, setOccasion] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState('')
  const [serviceExpectations, setServiceExpectations] = useState('')
  const [cannabisPreference, setCannabisPreference] = useState('')

  // Partner linking
  const [selectedPartnerId, setSelectedPartnerId] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')

  // Extra context
  const [sourceMessage, setSourceMessage] = useState('')
  const [notes, setNotes] = useState('')
  const [referralSource, setReferralSource] = useState('')

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId)
    if (clientId) {
      const client = clients.find((c) => c.id === clientId)
      if (client) {
        setClientName(client.full_name)
        setClientEmail(client.email)
        setClientPhone(client.phone || '')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!channel) throw new Error('Channel is required')
      if (!clientName.trim()) throw new Error('Client name is required')

      const guestCountNum = guestCount ? parseInt(guestCount) : null
      if (guestCount && (isNaN(guestCountNum!) || guestCountNum! <= 0)) {
        throw new Error('Guest count must be a positive number')
      }

      const budgetCents = budgetAmount ? parseCurrencyToCents(budgetAmount) : null

      const input: CreateInquiryInput = {
        channel: channel as CreateInquiryInput['channel'],
        client_id: selectedClientId || null,
        client_name: clientName.trim(),
        client_email: clientEmail || undefined,
        client_phone: clientPhone || undefined,
        referral_partner_id: selectedPartnerId || null,
        partner_location_id: selectedLocationId || null,
        confirmed_date: confirmedDate || undefined,
        confirmed_guest_count: guestCountNum,
        confirmed_location: location || undefined,
        confirmed_occasion: occasion || undefined,
        confirmed_budget_cents: budgetCents,
        confirmed_dietary_restrictions: dietaryRestrictions
          ? dietaryRestrictions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        confirmed_service_expectations: serviceExpectations || undefined,
        confirmed_cannabis_preference: cannabisPreference || undefined,
        source_message: sourceMessage || undefined,
        notes: notes || undefined,
        referral_source: referralSource || undefined,
      }

      const result = await createInquiry(input)

      if (result.success && result.inquiry) {
        router.push(`/inquiries/${result.inquiry.id}`)
      } else {
        throw new Error('Failed to create inquiry')
      }
    } catch (err) {
      console.error('Inquiry form error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const channelOptions = [
    { value: 'text', label: 'Text Message' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Call' },
    { value: 'referral', label: 'Referral' },
    { value: 'walk_in', label: 'Walk-In / Networking' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'take_a_chef', label: 'Take a Chef' },
    { value: 'website', label: 'Website' },
    { value: 'other', label: 'Other' },
  ]

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.full_name} (${c.email})`,
  }))

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* === SMART FILL === */}
        <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
          <button
            type="button"
            onClick={handleSmartFillOpen}
            className="text-sm text-brand-600 hover:text-brand-300 underline underline-offset-2"
          >
            Paste from text
          </button>
          <span className="text-xs text-stone-400">
            Quick form fill from messages, emails, or notes
          </span>
        </div>

        <SmartFillModal
          open={smartFillOpen}
          onClose={() => setSmartFillOpen(false)}
          onFill={handleSmartFill}
          parseFn={parseInquiryFromText}
          title="Smart Fill - Paste Text"
          placeholder={
            'Paste a text thread, email, DM, or notes about this inquiry...\n\nExample:\n"Hi! I\'m Sarah, looking for a private chef for our anniversary dinner on March 15th. We\'ll be 8 people at our home. Budget around $200/person. My husband has a shellfish allergy. Found you on Instagram!"'
          }
        />

        {/* === REQUIRED SECTION === */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-stone-100 uppercase tracking-wider">
            Required
          </h3>

          <Select
            label="Channel"
            required
            options={channelOptions}
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            helperText="How did this inquiry come in?"
          />

          <Select
            label="Link to Existing Client"
            options={clientOptions}
            value={selectedClientId}
            onChange={(e) => handleClientSelect(e.target.value)}
            helperText="Optional - select if this is a known client"
          />

          <Input
            label="Client Name"
            required
            placeholder="e.g., Sarah & Mark Johnson"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>

        {/* === REFERRAL PARTNER (optional) === */}
        {partners.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
              Referral Source
            </h3>

            <Select
              label="Referral Partner"
              options={partners.map((p) => ({
                value: p.id,
                label: `${p.name} (${
                  p.partner_type === 'airbnb_host'
                    ? 'Airbnb'
                    : p.partner_type === 'business'
                      ? 'Business'
                      : p.partner_type === 'platform'
                        ? 'Platform'
                        : p.partner_type === 'venue'
                          ? 'Venue'
                          : p.partner_type === 'individual'
                            ? 'Individual'
                            : 'Other'
                })`,
              }))}
              value={selectedPartnerId}
              onChange={(e) => {
                setSelectedPartnerId(e.target.value)
                setSelectedLocationId('')
              }}
              helperText="Who referred this inquiry?"
            />

            {selectedPartnerId && (partnerLocations[selectedPartnerId] || []).length > 0 && (
              <Select
                label="Partner Location"
                options={(partnerLocations[selectedPartnerId] || []).map((loc) => ({
                  value: loc.id,
                  label: `${loc.name}${loc.city ? ` — ${loc.city}${loc.state ? `, ${loc.state}` : ''}` : ''}`,
                }))}
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                helperText="Which specific location?"
              />
            )}
          </div>
        )}

        {/* === CONTACT INFO (for unlinked leads) === */}
        {!selectedClientId && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
              Contact Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                placeholder="client@email.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
              <Input
                label="Phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* === EVENT DETAILS (all optional) === */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
            Event Details (if known)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Event Date"
              type="date"
              value={confirmedDate}
              onChange={(e) => setConfirmedDate(e.target.value)}
            />
            <Input
              label="Guest Count"
              type="number"
              min="1"
              placeholder="e.g., 12"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
            />
          </div>

          <Input
            label="Occasion"
            placeholder="e.g., Anniversary Dinner, Corporate Event"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
          />

          <AddressAutocomplete
            label="Location"
            placeholder="e.g., 123 Main St, Denver CO 80202"
            value={location}
            onChange={(val) => setLocation(val)}
            onPlaceSelect={(data: AddressData) => setLocation(data.formattedAddress)}
            helperText="Start typing for Google address suggestions"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Budget ($)"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 2500.00"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
            />
            <Input
              label="Referral Source"
              placeholder="e.g., Google, friend referral"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            />
          </div>

          <Input
            label="Dietary Restrictions / Allergies"
            placeholder="e.g., gluten-free, nut allergy, vegan"
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
            helperText="Comma-separated"
          />

          <Input
            label="Service Expectations"
            placeholder="e.g., plated dinner, family style, cocktail party"
            value={serviceExpectations}
            onChange={(e) => setServiceExpectations(e.target.value)}
          />

          <Input
            label="Cannabis Preference"
            placeholder="e.g., yes, no, open to it"
            value={cannabisPreference}
            onChange={(e) => setCannabisPreference(e.target.value)}
          />
        </div>

        {/* === CONTEXT === */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Context</h3>

          <Textarea
            label="Original Message"
            placeholder="Paste the original message verbatim (text, email, DM...)"
            value={sourceMessage}
            onChange={(e) => setSourceMessage(e.target.value)}
            rows={4}
          />

          <Textarea
            label="Internal Notes"
            placeholder="Your notes about this lead..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* === SUBMIT === */}
        <div className="flex gap-3 pt-4 border-t">
          <Button type="submit" loading={loading} disabled={loading}>
            Log Inquiry
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
