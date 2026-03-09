'use client'

// Push Dinner Builder — 5-step wizard
// Step 1: The Dinner (concept + AI pitch)
// Step 2: The Menu  (optional menu template attachment)
// Step 3: Who to Invite (segment picker + open slots)
// Step 4: Review Drafts (Ollama-generated, chef approves each)
// Step 5: Launch (delivery mode choice + share link)

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Mail,
  Bell,
  Link2,
  Calendar,
  Users,
  DollarSign,
  Utensils,
  AlertCircle,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DraftReviewCard } from './draft-review-card'
import {
  createPushDinner,
  updatePushDinner,
  addRecipientsToCampaign,
  approveAllDrafts,
  getCampaignRecipients,
  launchCampaign,
} from '@/lib/campaigns/push-dinner-actions'
import {
  getClientsByOccasion,
  getDormantClients,
  getVIPClients,
  getAllClients,
  getSeasonalClients,
  searchClientsForCampaign,
  getOpenDateSuggestions,
  type TargetClient,
  type OpenDateSlot,
} from '@/lib/campaigns/targeting-actions'
import {
  draftCampaignConcept,
  generateAllDrafts,
  type CampaignConceptDraft,
} from '@/lib/ai/campaign-outreach'
import type { PushDinnerRecipient } from '@/lib/campaigns/push-dinner-actions'

// Occasions (matches holiday system + common private chef occasions)
const OCCASIONS = [
  'Halloween',
  "Valentine's Day",
  'Thanksgiving',
  'Christmas Eve',
  'Christmas',
  "New Year's Eve",
  "New Year's Day",
  "Mother's Day",
  "Father's Day",
  'Easter',
  'Passover',
  'Birthday',
  'Anniversary',
  'Date Night',
  'Engagement',
  'Baby Shower',
  'Graduation',
  'Corporate Dinner',
  'Wine Pairing',
  'Tasting Menu',
  'Weekend Brunch',
  'Custom',
]

const STEPS = [
  { num: 1, label: 'The Dinner' },
  { num: 2, label: 'Menu' },
  { num: 3, label: 'Who to Invite' },
  { num: 4, label: 'Drafts' },
  { num: 5, label: 'Launch' },
]

// ============================================================
// MAIN COMPONENT
// ============================================================

export function PushDinnerBuilder() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // Step 1 state
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('')
  const [customOccasion, setCustomOccasion] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState('')
  const [pricePerPerson, setPricePerPerson] = useState('')
  const [guestMin, setGuestMin] = useState(4)
  const [guestMax, setGuestMax] = useState(12)
  const [conceptDraft, setConceptDraft] = useState<CampaignConceptDraft | null>(null)
  const [editableConcept, setEditableConcept] = useState('')
  const [conceptLoading, setConceptLoading] = useState(false)

  // Step 2 state
  const [menuId, setMenuId] = useState<string | null>(null)

  // Step 3 state
  const [segment, setSegment] = useState<string>('')
  const [selectedClients, setSelectedClients] = useState<TargetClient[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [handpickSearch, setHandpickSearch] = useState('')
  const [searchResults, setSearchResults] = useState<TargetClient[]>([])
  const [openSlots, setOpenSlots] = useState<OpenDateSlot[]>([])
  const [slotsLoaded, setSlotsLoaded] = useState(false)

  // Step 4 state
  const [recipients, setRecipients] = useState<
    (PushDinnerRecipient & { client_full_name?: string })[]
  >([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [ollamaOffline, setOllamaOffline] = useState(false)
  const [approvedCount, setApprovedCount] = useState(0)

  // Step 5 state
  const [deliveryModes, setDeliveryModes] = useState<string[]>(['email'])
  const [launching, setLaunching] = useState(false)
  const [launched, setLaunched] = useState(false)
  const [launchResult, setLaunchResult] = useState<{
    sent: number
    failed: number
    skipped: number
  } | null>(null)

  const [saving, setSaving] = useState(false)

  const effectiveOccasion = occasion === 'Custom' ? customOccasion : occasion

  // Auto-name based on occasion + year
  const autoName = effectiveOccasion
    ? `${effectiveOccasion} Dinner ${new Date(proposedDate || Date.now()).getFullYear()}`
    : ''

  // ============================================================
  // STEP 1 HANDLERS
  // ============================================================

  async function handleAIDraftConcept() {
    if (!effectiveOccasion) return
    setConceptLoading(true)
    try {
      const draft = await draftCampaignConcept({
        occasion: effectiveOccasion,
        proposed_date: proposedDate || undefined,
        price_per_person_cents: pricePerPerson
          ? Math.round(parseFloat(pricePerPerson) * 100)
          : undefined,
        guest_count_max: guestMax,
        chef_name: 'Chef', // will be filled server-side from chef profile
      })
      setConceptDraft(draft)
      setEditableConcept([draft.hook, draft.description, draft.callToAction].join('\n\n'))
    } catch (err) {
      console.error(err)
    } finally {
      setConceptLoading(false)
    }
  }

  async function handleStep1Next() {
    if (!effectiveOccasion || !proposedDate) return
    setSaving(true)
    try {
      const finalName = name || autoName
      const priceCents = pricePerPerson ? Math.round(parseFloat(pricePerPerson) * 100) : undefined

      if (!campaignId) {
        const id = await createPushDinner({
          name: finalName,
          occasion: effectiveOccasion,
          proposed_date: proposedDate,
          proposed_time: proposedTime || undefined,
          price_per_person_cents: priceCents,
          guest_count_min: guestMin,
          guest_count_max: guestMax,
          seats_available: guestMax,
          concept_description: editableConcept || undefined,
        })
        setCampaignId(id)
      } else {
        await updatePushDinner(campaignId, {
          name: finalName,
          occasion: effectiveOccasion,
          proposed_date: proposedDate,
          proposed_time: proposedTime || undefined,
          price_per_person_cents: priceCents,
          guest_count_min: guestMin,
          guest_count_max: guestMax,
          seats_available: guestMax,
          concept_description: editableConcept || undefined,
        })
      }
      setStep(2)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // STEP 2 HANDLERS
  // ============================================================

  async function handleStep2Next() {
    if (campaignId && menuId) {
      await updatePushDinner(campaignId, { menu_id: menuId })
    }
    setStep(3)
  }

  // ============================================================
  // STEP 3 HANDLERS
  // ============================================================

  async function loadSegment(seg: string) {
    setSegment(seg)
    setClientsLoading(true)
    setSelectedClients([])
    try {
      let clients: TargetClient[] = []
      switch (seg) {
        case 'occasion':
          clients = await getClientsByOccasion(effectiveOccasion)
          break
        case 'dormant':
          clients = await getDormantClients(90)
          break
        case 'vip':
          clients = await getVIPClients()
          break
        case 'seasonal': {
          const month = proposedDate
            ? new Date(proposedDate + 'T12:00:00').getMonth() + 1
            : new Date().getMonth() + 1
          clients = await getSeasonalClients(month)
          break
        }
        case 'all':
          clients = await getAllClients()
          break
        default:
          break
      }
      setSelectedClients(clients)
    } catch (err) {
      console.error(err)
    } finally {
      setClientsLoading(false)
    }
  }

  async function loadOpenSlots() {
    if (slotsLoaded) return
    setSlotsLoaded(true)
    const slots = await getOpenDateSuggestions()
    setOpenSlots(slots)
  }

  async function handleSearch(q: string) {
    setHandpickSearch(q)
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    const results = await searchClientsForCampaign(q)
    setSearchResults(results)
  }

  function toggleClient(client: TargetClient) {
    setSelectedClients((prev) => {
      const exists = prev.find((c) => c.id === client.id)
      return exists ? prev.filter((c) => c.id !== client.id) : [...prev, client]
    })
  }

  async function handleStep3Next() {
    if (!campaignId || selectedClients.length === 0) {
      setStep(4)
      return
    }
    setSaving(true)
    try {
      await addRecipientsToCampaign(
        campaignId,
        selectedClients.map((c) => ({ id: c.id, email: c.email }))
      )
      setStep(4)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // STEP 4 HANDLERS
  // ============================================================

  async function loadRecipients() {
    if (!campaignId) return
    const list = await getCampaignRecipients(campaignId)
    // Map with client_full_name from selectedClients cache
    const nameMap = new Map(selectedClients.map((c) => [c.id, c.full_name]))
    setRecipients(
      list.map((r) => ({
        ...r,
        client_full_name: r.client_id ? (nameMap.get(r.client_id) ?? undefined) : undefined,
      }))
    )
    setApprovedCount(list.filter((r) => r.chef_approved).length)
  }

  async function handleGenerateDrafts() {
    if (!campaignId) return
    setDraftsLoading(true)
    setOllamaOffline(false)
    try {
      const result = await generateAllDrafts(campaignId)
      if (result.ollamaOffline) setOllamaOffline(true)
      await loadRecipients()
    } catch (err) {
      console.error(err)
    } finally {
      setDraftsLoading(false)
    }
  }

  async function handleApproveAll() {
    if (!campaignId) return
    setSaving(true)
    try {
      await approveAllDrafts(campaignId)
      await loadRecipients()
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // STEP 5 HANDLERS
  // ============================================================

  function toggleDeliveryMode(mode: string) {
    setDeliveryModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    )
  }

  async function handleLaunch() {
    if (!campaignId) return
    setLaunching(true)
    try {
      // Update delivery modes on campaign
      await updatePushDinner(campaignId, { delivery_modes: deliveryModes } as any)
      // Send emails if mode includes email
      if (deliveryModes.includes('email')) {
        const result = await launchCampaign(campaignId)
        setLaunchResult(result)
      }
      setLaunched(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLaunching(false)
    }
  }

  const bookingUrl = campaignId
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/book/pending`
    : ''

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step tracker */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => (s.num < step ? setStep(s.num) : undefined)}
              disabled={s.num > step}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors
                ${
                  step === s.num
                    ? 'bg-brand-600 text-white'
                    : s.num < step
                      ? 'bg-green-900 text-green-700 hover:bg-green-200 cursor-pointer'
                      : 'bg-stone-800 text-stone-400 cursor-not-allowed'
                }`}
            >
              {s.num < step ? <Check className="w-3 h-3" /> : <span>{s.num}</span>}
              {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-stone-300 shrink-0" />}
          </div>
        ))}
      </div>

      {/* ===================== STEP 1: THE DINNER ===================== */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-stone-200">
              What dinner do you want to push?
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Build the concept. We'll write the pitch.
            </p>
          </div>

          {/* Occasion */}
          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wide">
              Occasion
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {OCCASIONS.map((occ) => (
                <button
                  key={occ}
                  onClick={() => setOccasion(occ)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    occasion === occ
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-stone-700 text-stone-400 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
            {occasion === 'Custom' && (
              <input
                type="text"
                placeholder="Describe your occasion..."
                value={customOccasion}
                onChange={(e) => setCustomOccasion(e.target.value)}
                className="mt-2 w-full text-sm border border-stone-700 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 font-medium uppercase tracking-wide">
                Date
              </label>
              <div className="mt-1 flex items-center gap-2 border border-stone-700 rounded px-3 py-2">
                <Calendar className="w-4 h-4 text-stone-400" />
                <input
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="flex-1 text-sm focus:outline-none bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium uppercase tracking-wide">
                Start time
              </label>
              <div className="mt-1 flex items-center gap-2 border border-stone-700 rounded px-3 py-2">
                <input
                  type="time"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  className="flex-1 text-sm focus:outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Guest count + price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 font-medium uppercase tracking-wide">
                Max guests
              </label>
              <div className="mt-1 flex items-center gap-2 border border-stone-700 rounded px-3 py-2">
                <Users className="w-4 h-4 text-stone-400" />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={guestMax}
                  onChange={(e) => setGuestMax(parseInt(e.target.value) || 12)}
                  className="flex-1 text-sm focus:outline-none bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium uppercase tracking-wide">
                Price per person
              </label>
              <div className="mt-1 flex items-center gap-2 border border-stone-700 rounded px-3 py-2">
                <DollarSign className="w-4 h-4 text-stone-400" />
                <input
                  type="number"
                  min={0}
                  placeholder="150"
                  value={pricePerPerson}
                  onChange={(e) => setPricePerPerson(e.target.value)}
                  className="flex-1 text-sm focus:outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* AI concept draft */}
          <div className="border border-stone-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-medium text-stone-300">Dinner Pitch</span>
                <Badge variant={conceptDraft ? 'warning' : 'info'}>
                  {conceptDraft ? 'Draft' : 'Auto'}
                </Badge>
              </div>
              {!conceptDraft ? (
                <Button
                  variant="secondary"
                  onClick={handleAIDraftConcept}
                  disabled={!effectiveOccasion || conceptLoading}
                  className="text-xs h-7 px-3 gap-1"
                >
                  {conceptLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                  {conceptLoading ? 'Drafting...' : 'Auto Draft'}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setConceptDraft(null)
                    setEditableConcept('')
                  }}
                  className="text-xs h-7 px-3"
                >
                  Reset
                </Button>
              )}
            </div>
            {conceptDraft ? (
              <textarea
                value={editableConcept}
                onChange={(e) => setEditableConcept(e.target.value)}
                rows={5}
                className="w-full text-sm border border-stone-700 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
              />
            ) : (
              <p className="text-xs text-stone-400">
                Select an occasion above, then click Auto Draft to generate a compelling description
                clients will see on the booking page.
              </p>
            )}
          </div>

          {/* Campaign name override */}
          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wide">
              Campaign name{' '}
              <span className="normal-case font-normal">(optional — auto-named from occasion)</span>
            </label>
            <input
              type="text"
              placeholder={autoName || 'e.g. Halloween Dinner 2026'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full text-sm border border-stone-700 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <Button
            variant="primary"
            onClick={handleStep1Next}
            disabled={!effectiveOccasion || !proposedDate || saving}
            className="w-full gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Next — Choose a Menu'}
            {!saving && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {/* ===================== STEP 2: MENU ===================== */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-stone-200">Attach a menu</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Clients will see course names (not costs) on the booking page. Optional — skip if you
              prefer to describe it yourself.
            </p>
          </div>

          <div className="border border-stone-700 rounded-lg p-4 text-center">
            <Utensils className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">Menu picker coming soon.</p>
            <p className="text-xs text-stone-400 mt-1">
              For now your dinner description will serve as the menu preview.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Button variant="primary" onClick={handleStep2Next} className="flex-1 gap-1">
              Next — Who to Invite
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ===================== STEP 3: WHO TO INVITE ===================== */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-stone-200">Who should get invited?</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Pick a segment or handpick individual clients. Only subscribed clients are shown.
            </p>
          </div>

          {/* Segment buttons */}
          <div className="space-y-2">
            {[
              {
                key: 'occasion',
                label: `Past clients who booked ${effectiveOccasion || 'this occasion'}`,
              },
              { key: 'vip', label: 'VIP clients' },
              { key: 'dormant', label: "Clients I haven't seen in 3+ months" },
              { key: 'seasonal', label: 'Clients who booked in this season (past years)' },
              { key: 'all', label: 'All subscribed clients' },
              { key: 'handpick', label: 'Handpick clients' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() =>
                  opt.key === 'handpick' ? setSegment('handpick') : loadSegment(opt.key)
                }
                className={`w-full text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
                  segment === opt.key
                    ? 'border-brand-500 bg-brand-950 text-brand-400'
                    : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Handpick search */}
          {segment === 'handpick' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={handpickSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full text-sm border border-stone-700 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
              {searchResults.length > 0 && (
                <div className="border border-stone-700 rounded-lg divide-y divide-stone-800 max-h-48 overflow-y-auto">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleClient(c)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-stone-800 text-left"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          selectedClients.find((s) => s.id === c.id)
                            ? 'bg-brand-600 border-brand-600'
                            : 'border-stone-600'
                        }`}
                      >
                        {selectedClients.find((s) => s.id === c.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm text-stone-300">{c.full_name}</span>
                      <span className="text-xs text-stone-400 ml-auto">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Client list result */}
          {clientsLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            </div>
          )}
          {!clientsLoading && selectedClients.length > 0 && segment !== 'handpick' && (
            <div className="border border-stone-700 rounded-lg divide-y divide-stone-800 max-h-48 overflow-y-auto">
              {selectedClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleClient(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-stone-800 text-left"
                >
                  <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0 bg-brand-600 border-brand-600">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-stone-300">{c.full_name}</span>
                  {c.last_event_occasion && (
                    <span className="text-xs text-stone-400 ml-auto truncate">
                      {c.last_event_occasion}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Open slots panel */}
          <div className="border border-stone-700 rounded-lg">
            <button
              onClick={loadOpenSlots}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-stone-400 hover:bg-stone-800"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-500" />
                <span>Your open weekends near this date</span>
                <Badge variant="info">Fill my schedule</Badge>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>
            {slotsLoaded && openSlots.length > 0 && (
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {openSlots.slice(0, 12).map((slot) => (
                  <button
                    key={slot.date}
                    onClick={() => setProposedDate(slot.date)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      proposedDate === slot.date
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'border-stone-700 text-stone-400 hover:border-brand-400'
                    }`}
                  >
                    {slot.day_of_week} {slot.date}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedClients.length > 0 && (
            <div className="text-sm text-stone-400 font-medium">
              {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(2)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              variant="primary"
              onClick={handleStep3Next}
              disabled={saving}
              className="flex-1 gap-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving
                ? 'Saving...'
                : selectedClients.length > 0
                  ? `Next — Review ${selectedClients.length} Draft${selectedClients.length !== 1 ? 's' : ''}`
                  : 'Next (no recipients)'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* ===================== STEP 4: REVIEW DRAFTS ===================== */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-stone-200">Review personalised drafts</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Drafts a unique message for each client based on your history together. You approve —
              nothing sends without your OK.
            </p>
          </div>

          {/* Ollama offline warning */}
          {ollamaOffline && (
            <div className="bg-amber-950 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Ollama is not running</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Start Ollama to generate personalised drafts. Or write each message manually below
                  — click Edit on any card.
                </p>
              </div>
            </div>
          )}

          {/* Generate / Approve all controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => {
                loadRecipients()
                handleGenerateDrafts()
              }}
              disabled={draftsLoading}
              className="gap-1.5"
            >
              {draftsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
              {draftsLoading ? 'Generating...' : 'Generate All Drafts'}
            </Button>
            {recipients.some((r) => r.draft_body && !r.chef_approved) && (
              <Button
                variant="secondary"
                onClick={handleApproveAll}
                disabled={saving}
                className="gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Approve All
              </Button>
            )}
            {approvedCount > 0 && <Badge variant="success">{approvedCount} approved</Badge>}
          </div>

          {/* Load recipients on step entry */}
          {recipients.length === 0 && !draftsLoading && (
            <div className="text-center py-8">
              <p className="text-sm text-stone-500">Click "Generate All Drafts" to start.</p>
              <p className="text-xs text-stone-400 mt-1">Or load existing recipients.</p>
              <Button variant="ghost" onClick={loadRecipients} className="mt-3 text-xs">
                Load recipients
              </Button>
            </div>
          )}

          {/* Draft cards */}
          <div className="space-y-3">
            {recipients.map((r) => (
              <DraftReviewCard
                key={r.id}
                recipient={r}
                onApproved={() => setApprovedCount((c) => c + 1)}
                onSkipped={() => setRecipients((prev) => prev.filter((x) => x.id !== r.id))}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(3)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button variant="primary" onClick={() => setStep(5)} className="flex-1 gap-1">
              Next — Launch
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ===================== STEP 5: LAUNCH ===================== */}
      {step === 5 && (
        <div className="space-y-5">
          {!launched ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-stone-200">
                  How do you want to share this dinner?
                </h2>
                <p className="text-sm text-stone-500 mt-0.5">
                  Choose one or more. You control how visible and how loud this invitation is.
                </p>
              </div>

              {/* Delivery mode cards */}
              <div className="space-y-3">
                {/* Email */}
                <button
                  onClick={() => toggleDeliveryMode('email')}
                  className={`w-full text-left border rounded-lg p-4 transition-colors ${
                    deliveryModes.includes('email')
                      ? 'border-brand-500 bg-brand-950'
                      : 'border-stone-700 bg-stone-900 hover:border-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        deliveryModes.includes('email')
                          ? 'bg-brand-600 border-brand-600'
                          : 'border-stone-600'
                      }`}
                    >
                      {deliveryModes.includes('email') && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <Mail className="w-4 h-4 text-stone-500" />
                    <div>
                      <div className="text-sm font-medium text-stone-200">Personal email</div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Sends each approved draft directly to the client's inbox.{' '}
                        {approvedCount > 0
                          ? `${approvedCount} approved.`
                          : 'You approved the drafts in step 4.'}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Portal banner */}
                <button
                  onClick={() => toggleDeliveryMode('portal_banner')}
                  className={`w-full text-left border rounded-lg p-4 transition-colors ${
                    deliveryModes.includes('portal_banner')
                      ? 'border-brand-500 bg-brand-950'
                      : 'border-stone-700 bg-stone-900 hover:border-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        deliveryModes.includes('portal_banner')
                          ? 'bg-brand-600 border-brand-600'
                          : 'border-stone-600'
                      }`}
                    >
                      {deliveryModes.includes('portal_banner') && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <Bell className="w-4 h-4 text-stone-500" />
                    <div>
                      <div className="text-sm font-medium text-stone-200">Client portal banner</div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        A quiet banner appears on each client's ChefFlow dashboard next time they
                        log in. Non-invasive — they discover it on their own time. No email.
                      </div>
                    </div>
                    <Badge variant="info" className="shrink-0">
                      Low-key
                    </Badge>
                  </div>
                </button>

                {/* Link only */}
                <button
                  onClick={() => toggleDeliveryMode('link_only')}
                  className={`w-full text-left border rounded-lg p-4 transition-colors ${
                    deliveryModes.includes('link_only')
                      ? 'border-brand-500 bg-brand-950'
                      : 'border-stone-700 bg-stone-900 hover:border-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        deliveryModes.includes('link_only')
                          ? 'bg-brand-600 border-brand-600'
                          : 'border-stone-600'
                      }`}
                    >
                      {deliveryModes.includes('link_only') && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <Link2 className="w-4 h-4 text-stone-500" />
                    <div>
                      <div className="text-sm font-medium text-stone-200">Shareable link only</div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        You get a link + QR code to share however you want — Instagram story, text,
                        DM. You control who sees it.
                      </div>
                    </div>
                    <Badge variant="info" className="shrink-0">
                      Organic
                    </Badge>
                  </div>
                </button>
              </div>

              {/* Shareable link preview */}
              <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-2">
                  Your booking link
                </p>
                <p className="text-sm font-mono text-stone-300 break-all">
                  {typeof window !== 'undefined'
                    ? window.location.origin
                    : 'https://app.cheflowhq.com'}
                  /book/[generates on launch]
                </p>
                <p className="text-xs text-stone-400 mt-1.5">
                  Clients tap this → see the dinner concept → click "Count me in" → done. No login
                  required.
                </p>
              </div>

              {deliveryModes.length === 0 && (
                <p className="text-xs text-amber-600">Select at least one delivery method above.</p>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(4)} className="gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleLaunch}
                  disabled={launching || deliveryModes.length === 0}
                  className="flex-1 gap-1"
                >
                  {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {launching ? 'Launching...' : 'Launch dinner push'}
                </Button>
              </div>
            </>
          ) : (
            /* Post-launch success */
            <div className="text-center space-y-4 py-8">
              <div className="w-14 h-14 rounded-full bg-green-900 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-200">Dinner is live!</h2>
                {launchResult && (
                  <p className="text-sm text-stone-500 mt-1">
                    {launchResult.sent} email{launchResult.sent !== 1 ? 's' : ''} sent
                    {launchResult.failed > 0 ? ` · ${launchResult.failed} failed` : ''}
                  </p>
                )}
                {!deliveryModes.includes('email') && (
                  <p className="text-sm text-stone-500 mt-1">Shareable link is active.</p>
                )}
              </div>
              <Button
                variant="primary"
                onClick={() => campaignId && router.push(`/marketing/push-dinners/${campaignId}`)}
                className="mx-auto"
              >
                View campaign dashboard
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
