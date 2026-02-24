'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/clients/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { TagArrayInput } from '@/components/ui/tag-array-input'

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string
  description?: string
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-stone-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-left bg-stone-800 hover:bg-stone-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-stone-200">{title}</span>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-700 text-stone-400">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {description && !open && (
        <p className="px-4 py-1.5 text-xs text-stone-400 bg-stone-800 border-t border-stone-800">
          {description}
        </p>
      )}
      {open && <div className="p-4 space-y-4 bg-stone-900">{children}</div>}
    </div>
  )
}

// ─── Pet Entry Sub-form ───────────────────────────────────────────────────────

type PetEntry = { name: string; type: string; notes?: string }

function PetManager({
  value,
  onChange,
}: {
  value: PetEntry[]
  onChange: (pets: PetEntry[]) => void
}) {
  function addPet() {
    onChange([...value, { name: '', type: 'dog' }])
  }

  function updatePet(index: number, field: keyof PetEntry, val: string) {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: val }
    onChange(updated)
  }

  function removePet(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-300">Pets</label>
      {value.map((pet, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Input
            placeholder="Name"
            value={pet.name}
            onChange={(e) => updatePet(i, 'name', e.target.value)}
            className="flex-1"
          />
          <Select
            value={pet.type}
            onChange={(e) => updatePet(i, 'type', e.target.value)}
            className="w-28"
          >
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="bird">Bird</option>
            <option value="fish">Fish</option>
            <option value="reptile">Reptile</option>
            <option value="other">Other</option>
          </Select>
          <Input
            placeholder="Notes (e.g. jumps on guests)"
            value={pet.notes || ''}
            onChange={(e) => updatePet(i, 'notes', e.target.value)}
            className="flex-[2]"
          />
          <button
            type="button"
            onClick={() => removePet(i)}
            className="text-red-400 hover:text-red-600 p-2"
            aria-label="Remove pet"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addPet}
        className="text-sm text-brand-500 hover:text-brand-600 font-medium"
      >
        + Add pet
      </button>
    </div>
  )
}

// ─── Children Manager ─────────────────────────────────────────────────────────

function ChildrenManager({
  value,
  onChange,
}: {
  value: string[]
  onChange: (children: string[]) => void
}) {
  function addChild() {
    onChange([...value, ''])
  }

  function updateChild(index: number, val: string) {
    const updated = [...value]
    updated[index] = val
    onChange(updated)
  }

  function removeChild(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-300">Children</label>
      {value.map((child, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="Child name"
            value={child}
            onChange={(e) => updateChild(i, e.target.value)}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => removeChild(i)}
            className="text-red-400 hover:text-red-600 p-2"
            aria-label="Remove child"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addChild}
        className="text-sm text-brand-500 hover:text-brand-600 font-medium"
      >
        + Add child
      </button>
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

const CUISINE_SUGGESTIONS = [
  'Italian',
  'French',
  'Japanese',
  'Mexican',
  'Thai',
  'Indian',
  'Chinese',
  'Mediterranean',
  'Korean',
  'Spanish',
  'Greek',
  'Vietnamese',
  'Peruvian',
  'Middle Eastern',
  'Southern',
  'Cajun/Creole',
  'Caribbean',
  'Ethiopian',
  'Turkish',
  'American',
  'Farm-to-Table',
  'Seafood',
  'BBQ/Grilling',
]

const RESTRICTION_SUGGESTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Kosher',
  'Halal',
  'Pescatarian',
  'Keto',
  'Paleo',
  'Low-Sodium',
  'Low-Sugar',
  'Whole30',
  'AIP',
  'FODMAP',
]

const ALLERGY_SUGGESTIONS = [
  'Peanuts',
  'Tree Nuts',
  'Shellfish',
  'Fish',
  'Milk/Dairy',
  'Eggs',
  'Wheat/Gluten',
  'Soy',
  'Sesame',
  'Corn',
  'Mustard',
  'Celery',
  'Lupin',
  'Sulfites',
  'Latex (cross-reactive)',
]

const EQUIPMENT_SUGGESTIONS = [
  'Stand Mixer',
  'Food Processor',
  'Blender',
  'Immersion Blender',
  'Cast Iron Skillet',
  'Dutch Oven',
  'Sheet Pans',
  'Cutting Boards',
  'Chef Knife Set',
  'Mandoline',
  'Sous Vide',
  'Instant Pot',
  'Air Fryer',
  'Grill (outdoor)',
  'Smoker',
  'Pizza Stone',
  'Torch (creme brulee)',
  'Chafing Dishes',
  'Ice Cream Maker',
]

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function ClientCreateForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'quick' | 'full'>('quick')

  // ─── Form State ───────────────────────────────────────────────────────
  // Identity (Quick Add)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [referralSource, setReferralSource] = useState('')
  const [status, setStatus] = useState('active')

  // Identity Extended
  const [preferredName, setPreferredName] = useState('')
  const [preferredContact, setPreferredContact] = useState('')
  const [referralDetail, setReferralDetail] = useState('')
  const [occupation, setOccupation] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [anniversary, setAnniversary] = useState('')
  const [instagram, setInstagram] = useState('')

  // Household
  const [partnerName, setPartnerName] = useState('')
  const [children, setChildren] = useState<string[]>([])
  const [pets, setPets] = useState<PetEntry[]>([])
  const [familyNotes, setFamilyNotes] = useState('')

  // Dietary
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [dislikes, setDislikes] = useState<string[]>([])
  const [spiceTolerance, setSpiceTolerance] = useState('')
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([])
  const [favoriteDishes, setFavoriteDishes] = useState<string[]>([])
  const [wineBeveragePrefs, setWineBeveragePrefs] = useState('')

  // Address / Access
  const [address, setAddress] = useState('')
  const [parkingInstructions, setParkingInstructions] = useState('')
  const [accessInstructions, setAccessInstructions] = useState('')
  const [gateCode, setGateCode] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [securityNotes, setSecurityNotes] = useState('')
  const [houseRules, setHouseRules] = useState('')

  // Kitchen
  const [kitchenSize, setKitchenSize] = useState('')
  const [kitchenConstraints, setKitchenConstraints] = useState('')
  const [hasDishwasher, setHasDishwasher] = useState<boolean | null>(null)
  const [outdoorCooking, setOutdoorCooking] = useState('')
  const [nearestGrocery, setNearestGrocery] = useState('')
  const [waterQuality, setWaterQuality] = useState('')
  const [placeSettings, setPlaceSettings] = useState('')
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>([])
  const [equipmentMustBring, setEquipmentMustBring] = useState<string[]>([])
  const [ovenNotes, setOvenNotes] = useState('')
  const [burnerNotes, setBurnerNotes] = useState('')
  const [counterNotes, setCounterNotes] = useState('')
  const [refrigerationNotes, setRefrigerationNotes] = useState('')
  const [platingNotes, setPlatingNotes] = useState('')
  const [sinkNotes, setSinkNotes] = useState('')

  // Service Defaults
  const [serviceStyle, setServiceStyle] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [preferredDays, setPreferredDays] = useState<string[]>([])
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [cleanupExpectations, setCleanupExpectations] = useState('')
  const [leftoversPref, setLeftoversPref] = useState('')

  // Personality / Communication
  const [formalityLevel, setFormalityLevel] = useState('')
  const [communicationStyle, setCommunicationStyle] = useState('')
  const [vibeNotes, setVibeNotes] = useState('')
  const [whatTheyCareAbout, setWhatTheyCareAbout] = useState('')
  const [wowFactors, setWowFactors] = useState('')
  const [paymentBehavior, setPaymentBehavior] = useState('')
  const [tippingPattern, setTippingPattern] = useState('')
  const [farewellStyle, setFarewellStyle] = useState('')
  const [complaintHandling, setComplaintHandling] = useState('')

  // Business Intelligence
  const [referralPotential, setReferralPotential] = useState('')
  const [redFlags, setRedFlags] = useState('')
  const [acquisitionCost, setAcquisitionCost] = useState('')

  // ─── Submit ───────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!fullName.trim()) {
      setError('Full name is required')
      setLoading(false)
      return
    }

    try {
      // Build the payload — only include non-empty values
      const payload: Record<string, unknown> = {
        full_name: fullName.trim(),
      }

      // Quick Add fields (always sent)
      if (email.trim()) payload.email = email.trim()
      if (phone.trim()) payload.phone = phone.trim()
      if (referralSource) payload.referral_source = referralSource
      if (status && status !== 'active') payload.status = status
      if (preferredName.trim()) payload.preferred_name = preferredName.trim()
      if (address.trim()) payload.address = address.trim()
      if (partnerName.trim()) payload.partner_name = partnerName.trim()
      if (guestCount.trim()) payload.typical_guest_count = guestCount.trim()
      if (allergies.length > 0) payload.allergies = allergies
      if (dietaryRestrictions.length > 0) payload.dietary_restrictions = dietaryRestrictions
      if (vibeNotes.trim()) payload.vibe_notes = vibeNotes.trim()

      // Full Profile fields (only sent in full mode)
      if (mode === 'full') {
        if (preferredContact) payload.preferred_contact_method = preferredContact
        if (referralDetail.trim()) payload.referral_source_detail = referralDetail.trim()
        if (occupation.trim()) payload.occupation = occupation.trim()
        if (companyName.trim()) payload.company_name = companyName.trim()
        if (birthday) payload.birthday = birthday
        if (anniversary) payload.anniversary = anniversary
        if (instagram.trim()) payload.instagram_handle = instagram.trim().replace(/^@/, '')

        // Household
        if (children.filter((c) => c.trim()).length > 0)
          payload.children = children.filter((c) => c.trim())
        if (pets.filter((p) => p.name.trim()).length > 0)
          payload.pets = pets.filter((p) => p.name.trim())
        if (familyNotes.trim()) payload.family_notes = familyNotes.trim()

        // Dietary (extended — allergies & restrictions already sent above)
        if (dislikes.length > 0) payload.dislikes = dislikes
        if (spiceTolerance) payload.spice_tolerance = spiceTolerance
        if (favoriteCuisines.length > 0) payload.favorite_cuisines = favoriteCuisines
        if (favoriteDishes.length > 0) payload.favorite_dishes = favoriteDishes
        if (wineBeveragePrefs.trim()) payload.wine_beverage_preferences = wineBeveragePrefs.trim()

        // Address / Access (address already sent above)
        if (parkingInstructions.trim()) payload.parking_instructions = parkingInstructions.trim()
        if (accessInstructions.trim()) payload.access_instructions = accessInstructions.trim()
        if (gateCode.trim()) payload.gate_code = gateCode.trim()
        if (wifiPassword.trim()) payload.wifi_password = wifiPassword.trim()
        if (securityNotes.trim()) payload.security_notes = securityNotes.trim()
        if (houseRules.trim()) payload.house_rules = houseRules.trim()

        // Kitchen
        if (kitchenSize.trim()) payload.kitchen_size = kitchenSize.trim()
        if (kitchenConstraints.trim()) payload.kitchen_constraints = kitchenConstraints.trim()
        if (hasDishwasher !== null) payload.has_dishwasher = hasDishwasher
        if (outdoorCooking.trim()) payload.outdoor_cooking_notes = outdoorCooking.trim()
        if (nearestGrocery.trim()) payload.nearest_grocery_store = nearestGrocery.trim()
        if (waterQuality.trim()) payload.water_quality_notes = waterQuality.trim()
        if (placeSettings.trim())
          payload.available_place_settings = parseInt(placeSettings, 10) || undefined
        if (equipmentAvailable.length > 0) payload.equipment_available = equipmentAvailable
        if (equipmentMustBring.length > 0) payload.equipment_must_bring = equipmentMustBring
        if (ovenNotes.trim()) payload.kitchen_oven_notes = ovenNotes.trim()
        if (burnerNotes.trim()) payload.kitchen_burner_notes = burnerNotes.trim()
        if (counterNotes.trim()) payload.kitchen_counter_notes = counterNotes.trim()
        if (refrigerationNotes.trim())
          payload.kitchen_refrigeration_notes = refrigerationNotes.trim()
        if (platingNotes.trim()) payload.kitchen_plating_notes = platingNotes.trim()
        if (sinkNotes.trim()) payload.kitchen_sink_notes = sinkNotes.trim()

        // Service Defaults (guest count already sent above)
        if (serviceStyle.trim()) payload.preferred_service_style = serviceStyle.trim()
        if (preferredDays.length > 0) payload.preferred_event_days = preferredDays
        if (budgetMin.trim())
          payload.budget_range_min_cents = Math.round(parseFloat(budgetMin) * 100)
        if (budgetMax.trim())
          payload.budget_range_max_cents = Math.round(parseFloat(budgetMax) * 100)
        if (cleanupExpectations.trim()) payload.cleanup_expectations = cleanupExpectations.trim()
        if (leftoversPref.trim()) payload.leftovers_preference = leftoversPref.trim()

        // Personality / Communication (vibe notes already sent above)
        if (formalityLevel) payload.formality_level = formalityLevel
        if (communicationStyle.trim()) payload.communication_style_notes = communicationStyle.trim()
        if (whatTheyCareAbout.trim()) payload.what_they_care_about = whatTheyCareAbout.trim()
        if (wowFactors.trim()) payload.wow_factors = wowFactors.trim()
        if (paymentBehavior.trim()) payload.payment_behavior = paymentBehavior.trim()
        if (tippingPattern.trim()) payload.tipping_pattern = tippingPattern.trim()
        if (farewellStyle.trim()) payload.farewell_style = farewellStyle.trim()
        if (complaintHandling.trim()) payload.complaint_handling_notes = complaintHandling.trim()

        // Business Intelligence
        if (referralPotential) payload.referral_potential = referralPotential
        if (redFlags.trim()) payload.red_flags = redFlags.trim()
        if (acquisitionCost.trim())
          payload.acquisition_cost_cents = Math.round(parseFloat(acquisitionCost) * 100)
      }

      const result = await createClient(payload as any)
      // Navigate to the new client's detail page
      router.push(`/clients/${result.client.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
            mode === 'quick'
              ? 'bg-brand-9500 text-white'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          Quick Add
        </button>
        <button
          type="button"
          onClick={() => setMode('full')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
            mode === 'full'
              ? 'bg-brand-9500 text-white'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          Full Profile
        </button>
        <span className="text-xs text-stone-400 ml-2">
          {mode === 'quick'
            ? 'Get them in the system fast — fill in details later'
            : 'The complete client dossier — every field you could ever need'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ─── Quick Add Fields (always visible) ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Preferred Name / Nickname"
            placeholder="What they like to be called"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            placeholder="client@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Phone"
            placeholder="(555) 555-5555"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Textarea
            label="Address"
            placeholder="Full address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Select
            label="How did they find you?"
            value={referralSource}
            onChange={(e) => setReferralSource(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="referral">Referral</option>
            <option value="instagram">Instagram</option>
            <option value="website">Website</option>
            <option value="take_a_chef">Take a Chef</option>
            <option value="phone">Phone Call</option>
            <option value="email">Email</option>
            <option value="other">Other</option>
          </Select>
          <Input
            label="Partner / Spouse Name"
            placeholder="Name"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
          />
          <Input
            label="Typical Guest Count"
            placeholder="e.g. 4-6, 8-12, 20+"
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
          />
        </div>

        {/* Dietary — always on Quick Add because it's safety-critical */}
        <div className="space-y-3">
          <TagArrayInput
            label="Allergies"
            value={allergies}
            onChange={setAllergies}
            placeholder="Type allergy and press Enter"
            suggestions={ALLERGY_SUGGESTIONS}
          />
          <TagArrayInput
            label="Dietary Restrictions"
            value={dietaryRestrictions}
            onChange={setDietaryRestrictions}
            placeholder="e.g. Vegetarian, Gluten-Free"
            suggestions={RESTRICTION_SUGGESTIONS}
          />
        </div>

        {/* Quick notes field */}
        <Textarea
          label="Notes"
          placeholder="Anything else from the first call — vibe, special requests, how they sounded..."
          value={vibeNotes}
          onChange={(e) => setVibeNotes(e.target.value)}
        />

        {/* ─── Full Profile Sections (collapsible) ────────────────────── */}
        {mode === 'full' && (
          <div className="space-y-3 pt-2">
            {/* 1. Identity & Demographics */}
            <Section
              title="Identity & Demographics"
              description="Occupation, birthday, social media, contact preferences"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Preferred Contact Method"
                  value={preferredContact}
                  onChange={(e) => setPreferredContact(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="phone">Phone Call</option>
                  <option value="text">Text Message</option>
                  <option value="email">Email</option>
                  <option value="instagram">Instagram DM</option>
                </Select>
                <Input
                  label="Occupation"
                  placeholder="Attorney, Doctor, CEO, etc."
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
                <Input
                  label="Company"
                  placeholder="Where they work"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
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
                  label="Instagram Handle"
                  placeholder="@handle"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
                <Input
                  label="Referral Source Detail"
                  placeholder="Who referred them?"
                  value={referralDetail}
                  onChange={(e) => setReferralDetail(e.target.value)}
                  helperText="Name of the person who referred them, or specific source"
                />
              </div>
              <Select
                label="Client Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="vip">VIP</option>
                <option value="repeat_ready">Repeat Ready</option>
                <option value="dormant">Dormant</option>
              </Select>
            </Section>

            {/* 2. Household & Family */}
            <Section title="Household & Family" description="Children, pets, family dynamics">
              <ChildrenManager value={children} onChange={setChildren} />
              <PetManager value={pets} onChange={setPets} />
              <Textarea
                label="Family Notes"
                placeholder="Any family dynamics, guest patterns, or household notes worth knowing"
                value={familyNotes}
                onChange={(e) => setFamilyNotes(e.target.value)}
              />
            </Section>

            {/* 3. Dietary & Culinary Preferences */}
            <Section
              title="Culinary Preferences"
              description="Favorites, dislikes, spice tolerance, beverages"
            >
              <TagArrayInput
                label="Dislikes / Won't Eat"
                value={dislikes}
                onChange={setDislikes}
                placeholder="Foods they dislike"
              />
              <Select
                label="Spice Tolerance"
                value={spiceTolerance}
                onChange={(e) => setSpiceTolerance(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="none">None — no spice at all</option>
                <option value="mild">Mild</option>
                <option value="medium">Medium</option>
                <option value="hot">Hot</option>
                <option value="very_hot">Very Hot — bring the heat</option>
              </Select>
              <TagArrayInput
                label="Favorite Cuisines"
                value={favoriteCuisines}
                onChange={setFavoriteCuisines}
                placeholder="e.g. Italian, Japanese"
                suggestions={CUISINE_SUGGESTIONS}
              />
              <TagArrayInput
                label="Favorite Dishes"
                value={favoriteDishes}
                onChange={setFavoriteDishes}
                placeholder="Specific dishes they love"
              />
              <Textarea
                label="Wine & Beverage Preferences"
                placeholder="Red wine lover? Cocktail preferences? Non-drinker?"
                value={wineBeveragePrefs}
                onChange={(e) => setWineBeveragePrefs(e.target.value)}
              />
            </Section>

            {/* 4. Address & Access */}
            <Section title="Access & Security" description="Parking, gate codes, WiFi, house rules">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Gate Code"
                  placeholder="Gate or entry code"
                  value={gateCode}
                  onChange={(e) => setGateCode(e.target.value)}
                />
                <Input
                  label="WiFi Password"
                  placeholder="For timers, recipes, music"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                />
              </div>
              <Textarea
                label="Parking Instructions"
                placeholder="Where to park, driveway rules, street parking, etc."
                value={parkingInstructions}
                onChange={(e) => setParkingInstructions(e.target.value)}
              />
              <Textarea
                label="Access Instructions"
                placeholder="Which door to use, doorbell, knock, etc."
                value={accessInstructions}
                onChange={(e) => setAccessInstructions(e.target.value)}
              />
              <Textarea
                label="Security Notes"
                placeholder="Alarm system, cameras, doorman, etc."
                value={securityNotes}
                onChange={(e) => setSecurityNotes(e.target.value)}
              />
              <Textarea
                label="House Rules"
                placeholder="Shoes off, noise level, no smoking, etc."
                value={houseRules}
                onChange={(e) => setHouseRules(e.target.value)}
              />
            </Section>

            {/* 5. Kitchen Profile */}
            <Section
              title="Kitchen Profile"
              description="Equipment, layout, limitations, nearby stores"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Kitchen Size"
                  value={kitchenSize}
                  onChange={(e) => setKitchenSize(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="small">Small — limited counter/storage</option>
                  <option value="medium">Medium — standard home kitchen</option>
                  <option value="large">Large — spacious, multiple stations</option>
                  <option value="professional">Professional — commercial-grade</option>
                </Select>
                <div className="flex items-end gap-4 pb-1">
                  <label className="text-sm font-medium text-stone-300">Dishwasher?</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="dishwasher"
                        checked={hasDishwasher === true}
                        onChange={() => setHasDishwasher(true)}
                        className="text-brand-500"
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="dishwasher"
                        checked={hasDishwasher === false}
                        onChange={() => setHasDishwasher(false)}
                        className="text-brand-500"
                      />
                      No
                    </label>
                  </div>
                </div>
                <Input
                  label="Available Place Settings"
                  type="number"
                  placeholder="How many?"
                  value={placeSettings}
                  onChange={(e) => setPlaceSettings(e.target.value)}
                />
                <Input
                  label="Nearest Grocery Store"
                  placeholder="Name and distance"
                  value={nearestGrocery}
                  onChange={(e) => setNearestGrocery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  label="Oven Notes"
                  placeholder="Gas/electric? Temperature accuracy? Reliability?"
                  value={ovenNotes}
                  onChange={(e) => setOvenNotes(e.target.value)}
                />
                <Textarea
                  label="Stovetop / Burner Notes"
                  placeholder="Gas, induction, electric? How many burners?"
                  value={burnerNotes}
                  onChange={(e) => setBurnerNotes(e.target.value)}
                />
                <Textarea
                  label="Counter / Prep Space"
                  placeholder="How much prep surface? Island?"
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                />
                <Textarea
                  label="Refrigeration / Storage"
                  placeholder="Fridge/freezer size? Extra cooler space?"
                  value={refrigerationNotes}
                  onChange={(e) => setRefrigerationNotes(e.target.value)}
                />
                <Textarea
                  label="Plating Surfaces"
                  placeholder="Warming drawer? Heat lamps? Counter space for plating?"
                  value={platingNotes}
                  onChange={(e) => setPlatingNotes(e.target.value)}
                />
                <Textarea
                  label="Sink Notes"
                  placeholder="Hot water? Double sink? Drainage?"
                  value={sinkNotes}
                  onChange={(e) => setSinkNotes(e.target.value)}
                />
              </div>
              <Textarea
                label="Kitchen Constraints / Limitations"
                placeholder="Anything that limits what you can cook here"
                value={kitchenConstraints}
                onChange={(e) => setKitchenConstraints(e.target.value)}
              />
              <Textarea
                label="Outdoor Cooking"
                placeholder="Grill, smoker, pizza oven, fire pit, etc."
                value={outdoorCooking}
                onChange={(e) => setOutdoorCooking(e.target.value)}
              />
              <Input
                label="Water Quality"
                placeholder="Well water, city water, filtered, etc."
                value={waterQuality}
                onChange={(e) => setWaterQuality(e.target.value)}
              />
              <TagArrayInput
                label="Equipment Available at Client's Home"
                value={equipmentAvailable}
                onChange={setEquipmentAvailable}
                placeholder="What they have"
                suggestions={EQUIPMENT_SUGGESTIONS}
              />
              <TagArrayInput
                label="Equipment You Must Bring"
                value={equipmentMustBring}
                onChange={setEquipmentMustBring}
                placeholder="What you need to bring"
                suggestions={EQUIPMENT_SUGGESTIONS}
              />
            </Section>

            {/* 6. Service Defaults */}
            <Section
              title="Service Defaults"
              description="Preferred style, budget, cleanup, event preferences"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Preferred Service Style"
                  value={serviceStyle}
                  onChange={(e) => setServiceStyle(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="plated">Plated (formal)</option>
                  <option value="family-style">Family Style</option>
                  <option value="buffet">Buffet</option>
                  <option value="tasting">Tasting Menu</option>
                  <option value="meal-prep">Meal Prep</option>
                  <option value="cooking-class">Cooking Class</option>
                  <option value="cocktail-party">Cocktail Party / Passed Apps</option>
                  <option value="bbq">BBQ / Outdoor Grill</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Preferred Event Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => (
                    <label key={day} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={preferredDays.includes(day.toLowerCase())}
                        onChange={(e) => {
                          const d = day.toLowerCase()
                          setPreferredDays(
                            e.target.checked
                              ? [...preferredDays, d]
                              : preferredDays.filter((pd) => pd !== d)
                          )
                        }}
                        className="text-brand-500 rounded"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Budget Range — Minimum ($)"
                  type="number"
                  placeholder="e.g. 500"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  helperText="Per event minimum spend"
                />
                <Input
                  label="Budget Range — Maximum ($)"
                  type="number"
                  placeholder="e.g. 2000"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  helperText="Per event maximum spend"
                />
              </div>
              <Select
                label="Cleanup Expectations"
                value={cleanupExpectations}
                onChange={(e) => setCleanupExpectations(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="full_reset">
                  Full Kitchen Reset — leave it cleaner than I found it
                </option>
                <option value="cooking_mess">Cooking Mess Only — clean what I used</option>
                <option value="minimal">Minimal — they prefer to clean up themselves</option>
                <option value="staff_handles">Their Staff Handles Cleanup</option>
              </Select>
              <Select
                label="Leftovers Preference"
                value={leftoversPref}
                onChange={(e) => setLeftoversPref(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="package_all">Package Everything — they love leftovers</option>
                <option value="portion_control">Portion Control — cook just enough</option>
                <option value="staff_takes">Staff / Helper Takes Leftovers</option>
                <option value="compost">Compost / Discard</option>
                <option value="no_preference">No Preference</option>
              </Select>
            </Section>

            {/* 7. Personality & Communication */}
            <Section
              title="Personality & Communication"
              description="How they interact, what impresses them, vibe"
              badge="Chef Only"
            >
              <Select
                label="Formality Level"
                value={formalityLevel}
                onChange={(e) => setFormalityLevel(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="casual">Casual — first names, relaxed vibe</option>
                <option value="semi_formal">Semi-Formal — friendly but professional</option>
                <option value="formal">Formal — Mr./Mrs., white-glove service</option>
              </Select>
              <Textarea
                label="Communication Style"
                placeholder="Quick texter? Long emailer? Phone call only? How responsive are they?"
                value={communicationStyle}
                onChange={(e) => setCommunicationStyle(e.target.value)}
              />
              <Textarea
                label="Vibe Notes"
                placeholder="Their personality, energy, how they interact with you"
                value={vibeNotes}
                onChange={(e) => setVibeNotes(e.target.value)}
              />
              <Textarea
                label="What They Care About"
                placeholder="What matters most to them? Presentation? Health? Impressing guests?"
                value={whatTheyCareAbout}
                onChange={(e) => setWhatTheyCareAbout(e.target.value)}
              />
              <Textarea
                label="Wow Factors"
                placeholder="What impresses them? Tableside flambe? Exotic ingredients? Plating art?"
                value={wowFactors}
                onChange={(e) => setWowFactors(e.target.value)}
              />
              <Textarea
                label="Payment Behavior"
                placeholder="Pays promptly? Always late? Prefers Venmo? Tips in cash?"
                value={paymentBehavior}
                onChange={(e) => setPaymentBehavior(e.target.value)}
              />
              <Textarea
                label="Tipping Pattern"
                placeholder="Generous tipper? Standard 20%? Never tips? Tips in cash?"
                value={tippingPattern}
                onChange={(e) => setTippingPattern(e.target.value)}
              />
              <Textarea
                label="Farewell Style"
                placeholder="How they say goodbye — linger and chat? Quick exit?"
                value={farewellStyle}
                onChange={(e) => setFarewellStyle(e.target.value)}
              />
              <Textarea
                label="How They Handle Issues"
                placeholder="Direct? Passive? Complains to your face? Leaves bad reviews?"
                value={complaintHandling}
                onChange={(e) => setComplaintHandling(e.target.value)}
              />
            </Section>

            {/* 8. Chef's Internal Assessment */}
            <Section
              title="Chef's Internal Assessment"
              description="Business intelligence — referral potential, red flags, acquisition cost"
              badge="Chef Only"
            >
              <p className="text-xs text-stone-500 bg-stone-800 rounded-lg p-3">
                These fields are strictly for your internal use. Clients will never see any of this
                information.
              </p>
              <Select
                label="Referral Potential"
                value={referralPotential}
                onChange={(e) => setReferralPotential(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="high">High — connected, loves to recommend</option>
                <option value="medium">Medium — would refer if asked</option>
                <option value="low">Low — keeps to themselves</option>
              </Select>
              <Textarea
                label="Red Flags"
                placeholder="Anything to watch out for — late cancellations, boundary issues, unrealistic expectations"
                value={redFlags}
                onChange={(e) => setRedFlags(e.target.value)}
              />
              <Input
                label="Client Acquisition Cost ($)"
                type="number"
                placeholder="Marketing spend to acquire this client"
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
                helperText="How much did it cost to land this client?"
              />
            </Section>
          </div>
        )}

        {/* ─── Submit ──────────────────────────────────────────────────── */}
        <div className="flex gap-2 pt-4 border-t border-stone-700">
          <Button type="submit" loading={loading}>
            {mode === 'quick' ? 'Add Client' : 'Create Full Profile'}
          </Button>
          <Button variant="ghost" type="button" onClick={() => router.push('/clients')}>
            Cancel
          </Button>
        </div>
      </form>

      {error && (
        <Alert variant="error" title="Error" className="mt-4">
          {error}
        </Alert>
      )}
    </div>
  )
}
