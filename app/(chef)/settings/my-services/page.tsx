'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings2, Save, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import {
  getServiceConfig,
  saveServiceConfig,
  type ChefServiceConfig,
} from '@/lib/chef-services/service-config-actions'

// ─── Toggle Section Component ───────────────────────────────────────────────

function Section({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-stone-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-800/50 transition-colors"
      >
        <div className="text-left">
          <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
          {description && <p className="text-xs text-stone-400 mt-0.5">{description}</p>}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-stone-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-stone-700/50 pt-4">{children}</div>
      )}
    </div>
  )
}

// ─── Toggle Row ─────────────────────────────────────────────────────────────

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="pt-0.5">
        <div
          onClick={(e) => {
            e.preventDefault()
            onChange(!checked)
          }}
          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
            checked ? 'bg-brand-500' : 'bg-stone-600'
          }`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              checked ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
      <div>
        <span className="text-sm text-stone-200 group-hover:text-stone-100">{label}</span>
        {description && <p className="text-xs text-stone-500 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

// ─── Text Field (for policy terms, etc.) ────────────────────────────────────

function TextField({
  label,
  value,
  onChange,
  placeholder,
  visible,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  visible?: boolean
}) {
  if (visible === false) return null
  return (
    <div className="ml-12 mt-1">
      <label className="block text-xs text-stone-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full max-w-md rounded-md border border-stone-700 bg-stone-800/50 px-3 py-1.5 text-sm
                   focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-stone-600"
      />
    </div>
  )
}

// ─── Number Field ───────────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  visible,
  suffix,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  visible?: boolean
  suffix?: string
}) {
  if (visible === false) return null
  return (
    <div className="ml-12 mt-1">
      <label className="block text-xs text-stone-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={placeholder}
          className="w-32 rounded-md border border-stone-700 bg-stone-800/50 px-3 py-1.5 text-sm
                     focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-stone-600"
        />
        {suffix && <span className="text-xs text-stone-500">{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Select Field ───────────────────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="ml-12 mt-1">
      <label className="block text-xs text-stone-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-stone-700 bg-stone-800/50 px-3 py-1.5 text-sm
                   focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function MyServicesPage() {
  const [config, setConfig] = useState<ChefServiceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getServiceConfig()
      setConfig(data)
    } catch (err) {
      console.error('Failed to load service config:', err)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const update = <K extends keyof ChefServiceConfig>(key: K, value: ChefServiceConfig[K]) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const result = await saveServiceConfig(config)
      if (result.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(result.error ?? 'Failed to save')
      }
    } catch (err) {
      console.error('Failed to save service config:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-700 rounded w-1/3" />
          <div className="h-4 bg-stone-700 rounded w-2/3" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-stone-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="p-6">
        <p className="text-red-400">Failed to load service configuration.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        href="/settings"
        className="inline-flex text-sm text-stone-500 hover:text-stone-300 mb-4"
      >
        Back to Settings
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Settings2 className="h-7 w-7 text-brand-500" />
        <h1 className="text-2xl font-bold">My Services</h1>
      </div>

      <p className="text-stone-400 mb-6">
        Configure what you offer and how you operate. Remy uses these settings to communicate
        accurately with clients. If something is turned off, Remy will never mention it.
      </p>

      <div className="space-y-3">
        {/* SERVICES */}
        <Section
          title="Services I Offer"
          description="What's included when a client books you"
          defaultOpen
        >
          <Toggle
            label="Grocery shopping"
            description="You handle all shopping for the event"
            checked={config.offers_grocery_shopping}
            onChange={(v) => update('offers_grocery_shopping', v)}
          />
          <Toggle
            label="Dessert course"
            checked={config.offers_dessert_course}
            onChange={(v) => update('offers_dessert_course', v)}
          />
          <Toggle
            label="Post-event cleanup"
            checked={config.offers_cleanup}
            onChange={(v) => update('offers_cleanup', v)}
          />
          <Toggle
            label="Leftover packaging"
            description="Package and label leftovers for the client"
            checked={config.offers_leftover_packaging}
            onChange={(v) => update('offers_leftover_packaging', v)}
          />
          <Toggle
            label="Table setup and plating presentation"
            checked={config.offers_table_setup}
            onChange={(v) => update('offers_table_setup', v)}
          />
          <Toggle
            label="Front-of-house serving"
            description="You serve guests during dinner"
            checked={config.offers_serving}
            onChange={(v) => update('offers_serving', v)}
          />
          <Toggle
            label="Cocktail hour / passed appetizers"
            checked={config.offers_cocktail_hour}
            onChange={(v) => update('offers_cocktail_hour', v)}
          />
          <Toggle
            label="Wine / drink pairings"
            checked={config.offers_wine_pairings}
            onChange={(v) => update('offers_wine_pairings', v)}
          />
          <Toggle
            label="Bartending"
            checked={config.offers_bartending}
            onChange={(v) => update('offers_bartending', v)}
          />
          <Toggle
            label="Pre-event tastings"
            description="Offer tasting sessions before the event"
            checked={config.offers_tastings}
            onChange={(v) => update('offers_tastings', v)}
          />
        </Section>

        {/* EQUIPMENT */}
        <Section
          title="Equipment and Supplies"
          description="What you bring vs what the client provides"
        >
          <Toggle
            label="I bring my own knives and cookware"
            checked={config.brings_own_cookware}
            onChange={(v) => update('brings_own_cookware', v)}
          />
          <Toggle
            label="I bring dinnerware and tableware"
            checked={config.brings_dinnerware}
            onChange={(v) => update('brings_dinnerware', v)}
          />
          <Toggle
            label="I bring linens"
            checked={config.brings_linens}
            onChange={(v) => update('brings_linens', v)}
          />
          <Toggle
            label="I can coordinate rentals"
            description="Tables, chairs, glassware, etc."
            checked={config.coordinates_rentals}
            onChange={(v) => update('coordinates_rentals', v)}
          />
        </Section>

        {/* STAFFING */}
        <Section title="Staffing" description="Additional people you bring to events">
          <Toggle
            label="I bring a server"
            checked={config.brings_server}
            onChange={(v) => update('brings_server', v)}
          />
          <Toggle
            label="I bring a sous chef / assistant"
            checked={config.brings_sous_chef}
            onChange={(v) => update('brings_sous_chef', v)}
          />
          <Toggle
            label="I bring a bartender"
            checked={config.brings_bartender}
            onChange={(v) => update('brings_bartender', v)}
          />
          <Toggle
            label="I can coordinate additional staff"
            checked={config.coordinates_additional_staff}
            onChange={(v) => update('coordinates_additional_staff', v)}
          />
        </Section>

        {/* DIETARY */}
        <Section title="Dietary Handling" description="What dietary needs you accommodate">
          <Toggle
            label="Allergies"
            description="Cross-contamination awareness, separate prep"
            checked={config.handles_allergies}
            onChange={(v) => update('handles_allergies', v)}
          />
          <Toggle
            label="Religious dietary laws"
            description="Halal, kosher, etc."
            checked={config.handles_religious_diets}
            onChange={(v) => update('handles_religious_diets', v)}
          />
          <Toggle
            label="Medical diets"
            description="Keto, low-sodium, diabetic-friendly, etc."
            checked={config.handles_medical_diets}
            onChange={(v) => update('handles_medical_diets', v)}
          />
        </Section>

        {/* POLICIES */}
        <Section title="Policies" description="Your terms and conditions">
          <Toggle
            label="Cancellation policy"
            checked={config.has_cancellation_policy}
            onChange={(v) => update('has_cancellation_policy', v)}
          />
          <TextField
            label="Cancellation terms"
            value={config.cancellation_terms ?? ''}
            onChange={(v) => update('cancellation_terms', v || null)}
            placeholder="e.g. 48 hours notice, 50% deposit forfeited"
            visible={config.has_cancellation_policy}
          />

          <Toggle
            label="Reschedule policy"
            checked={config.has_reschedule_policy}
            onChange={(v) => update('has_reschedule_policy', v)}
          />
          <TextField
            label="Reschedule terms"
            value={config.reschedule_terms ?? ''}
            onChange={(v) => update('reschedule_terms', v || null)}
            placeholder="e.g. One free reschedule with 72 hours notice"
            visible={config.has_reschedule_policy}
          />

          <Toggle
            label="Guest count change deadline"
            checked={config.has_guest_count_deadline}
            onChange={(v) => update('has_guest_count_deadline', v)}
          />
          <NumberField
            label="Days before event"
            value={config.guest_count_deadline_days}
            onChange={(v) => update('guest_count_deadline_days', v)}
            placeholder="3"
            suffix="days before event"
            visible={config.has_guest_count_deadline}
          />

          <Toggle
            label="Travel fee"
            description="Charge extra beyond a certain distance"
            checked={config.charges_travel_fee}
            onChange={(v) => update('charges_travel_fee', v)}
          />
          <NumberField
            label="Free radius"
            value={config.travel_fee_radius_miles}
            onChange={(v) => update('travel_fee_radius_miles', v)}
            placeholder="25"
            suffix="miles"
            visible={config.charges_travel_fee}
          />
          <NumberField
            label="Fee amount (cents)"
            value={config.travel_fee_cents}
            onChange={(v) => update('travel_fee_cents', v)}
            placeholder="5000"
            suffix="cents (5000 = $50)"
            visible={config.charges_travel_fee}
          />

          <Toggle
            label="Minimum spend"
            checked={config.has_minimum_spend}
            onChange={(v) => update('has_minimum_spend', v)}
          />
          <NumberField
            label="Minimum (cents)"
            value={config.minimum_spend_cents}
            onChange={(v) => update('minimum_spend_cents', v)}
            placeholder="50000"
            suffix="cents (50000 = $500)"
            visible={config.has_minimum_spend}
          />

          <Toggle
            label="Minimum guest count"
            checked={config.has_minimum_guests}
            onChange={(v) => update('has_minimum_guests', v)}
          />
          <NumberField
            label="Minimum guests"
            value={config.minimum_guests}
            onChange={(v) => update('minimum_guests', v)}
            placeholder="4"
            suffix="guests"
            visible={config.has_minimum_guests}
          />

          <SelectField
            label="Gratuity"
            value={config.gratuity_policy}
            onChange={(v) => update('gratuity_policy', v as ChefServiceConfig['gratuity_policy'])}
            options={[
              { value: 'not_expected', label: 'Not expected' },
              { value: 'appreciated', label: 'Appreciated but not required' },
              { value: 'included', label: 'Included in price' },
            ]}
          />

          <Toggle
            label="Grocery cost included in price"
            description="If off, grocery is billed separately"
            checked={config.grocery_cost_included}
            onChange={(v) => update('grocery_cost_included', v)}
          />
          <Toggle
            label="I carry liability insurance"
            checked={config.is_insured}
            onChange={(v) => update('is_insured', v)}
          />
        </Section>

        {/* CUSTOM RESPONSE TEXT */}
        <Section
          title="Your Words"
          description="Write how YOU want things communicated. Remy will use your exact language instead of generating its own."
          defaultOpen
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-stone-300 mb-1">Intro pitch</label>
              <p className="text-xs text-stone-500 mb-2">
                How you describe what you do in a first reply to a new client
              </p>
              <textarea
                value={config.custom_intro_pitch ?? ''}
                onChange={(e) => update('custom_intro_pitch', e.target.value || null)}
                placeholder='e.g. "I handle everything from shopping to cleanup. You just show up, sit down, and enjoy the evening with your guests."'
                rows={2}
                className="w-full rounded-md border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm
                           focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-stone-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-300 mb-1">What's included</label>
              <p className="text-xs text-stone-500 mb-2">
                Your way of explaining what a client gets when they book you
              </p>
              <textarea
                value={config.custom_whats_included ?? ''}
                onChange={(e) => update('custom_whats_included', e.target.value || null)}
                placeholder={
                  'e.g. "Shopping, cooking, plating, serving, and cleanup. You don\'t lift a finger."'
                }
                rows={2}
                className="w-full rounded-md border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm
                           focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-stone-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-300 mb-1">Cleanup</label>
              <textarea
                value={config.custom_cleanup_note ?? ''}
                onChange={(e) => update('custom_cleanup_note', e.target.value || null)}
                placeholder='e.g. "I leave the kitchen cleaner than I found it."'
                rows={1}
                className="w-full rounded-md border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm
                           focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-stone-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-300 mb-1">Dietary handling</label>
              <textarea
                value={config.custom_dietary_note ?? ''}
                onChange={(e) => update('custom_dietary_note', e.target.value || null)}
                placeholder='e.g. "I take allergies very seriously. Separate prep, dedicated cutting boards, no cross-contamination."'
                rows={2}
                className="w-full rounded-md border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm
                           focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-stone-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-300 mb-1">Gratuity</label>
              <textarea
                value={config.custom_gratuity_note ?? ''}
                onChange={(e) => update('custom_gratuity_note', e.target.value || null)}
                placeholder='e.g. "Gratuity is never expected but always appreciated."'
                rows={1}
                className="w-full rounded-md border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm
                           focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-stone-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-300 mb-1">Travel</label>
              <textarea
                value={config.custom_travel_note ?? ''}
                onChange={(e) => update('custom_travel_note', e.target.value || null)}
                placeholder='e.g. "I cover the entire North Shore at no extra charge."'
                rows={1}
                className="w-full rounded-md border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm
                           focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-stone-600 resize-none"
              />
            </div>
          </div>
        </Section>

        {/* COMMUNICATION */}
        <Section
          title="Communication Preferences"
          description="How you interact with clients before and after events"
        >
          <Toggle
            label="Share menu for approval before the event"
            checked={config.shares_menu_for_approval}
            onChange={(v) => update('shares_menu_for_approval', v)}
          />
          <Toggle
            label="Pre-event check-in call or text"
            checked={config.does_preevent_checkin}
            onChange={(v) => update('does_preevent_checkin', v)}
          />
          <Toggle
            label="Final details reminder before event"
            checked={config.sends_final_details_reminder}
            onChange={(v) => update('sends_final_details_reminder', v)}
          />
          <Toggle
            label="Post-event follow-up"
            checked={config.sends_postevent_followup}
            onChange={(v) => update('sends_postevent_followup', v)}
          />
        </Section>

        {/* EXTRAS */}
        <Section title="Extras" description="Additional things you offer or accommodate">
          <Toggle
            label="I photograph my food for my portfolio"
            checked={config.photographs_food}
            onChange={(v) => update('photographs_food', v)}
          />
          <Toggle
            label="I post about events on social media (with permission)"
            checked={config.posts_on_social_media}
            onChange={(v) => update('posts_on_social_media', v)}
          />
          <Toggle
            label="I offer NDA / confidentiality agreements"
            checked={config.offers_nda}
            onChange={(v) => update('offers_nda', v)}
          />
          <Toggle
            label="I coordinate with other vendors"
            description="Florists, photographers, event planners, etc."
            checked={config.coordinates_vendors}
            onChange={(v) => update('coordinates_vendors', v)}
          />
          <Toggle
            label="I accommodate outdoor events"
            checked={config.accommodates_outdoor_events}
            onChange={(v) => update('accommodates_outdoor_events', v)}
          />
          <Toggle
            label="I handle kid-friendly menus"
            checked={config.handles_kid_menus}
            onChange={(v) => update('handles_kid_menus', v)}
          />
        </Section>
      </div>

      {/* Save */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5
                     text-sm font-medium text-white hover:bg-brand-600
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>

        {saved && (
          <span className="text-sm text-green-500">
            Remy will use your updated service config in future conversations.
          </span>
        )}

        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  )
}
