'use client'

// BookingPageSettings - configure the public /book/[slug] page.
// Enable/disable, set slug, headline, bio, merchandising copy, and booking model.

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import {
  upsertBookingSettings,
  type BookingSettings,
  type FeaturedBookingMenuOption,
} from '@/lib/booking/booking-settings-actions'

type Props = {
  initialSettings: BookingSettings
  menuOptions: FeaturedBookingMenuOption[]
}

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://cheflowhq.com'

export function BookingPageSettings({ initialSettings, menuOptions }: Props) {
  const [enabled, setEnabled] = useState(initialSettings.booking_enabled)
  const [slug, setSlug] = useState(initialSettings.booking_slug ?? '')
  const [headline, setHeadline] = useState(initialSettings.booking_headline ?? '')
  const [bio, setBio] = useState(initialSettings.booking_bio_short ?? '')
  const [minNotice, setMinNotice] = useState(String(initialSettings.booking_min_notice_days ?? 7))

  const [bookingModel, setBookingModel] = useState<'inquiry_first' | 'instant_book'>(
    initialSettings.booking_model ?? 'inquiry_first'
  )
  const [basePriceCents, setBasePriceCents] = useState(
    initialSettings.booking_base_price_cents
      ? String(initialSettings.booking_base_price_cents / 100)
      : ''
  )
  const [pricingType, setPricingType] = useState<'flat_rate' | 'per_person'>(
    initialSettings.booking_pricing_type ?? 'flat_rate'
  )
  const [depositType, setDepositType] = useState<'percent' | 'fixed'>(
    initialSettings.booking_deposit_type ?? 'percent'
  )
  const [depositPercent, setDepositPercent] = useState(
    String(initialSettings.booking_deposit_percent ?? 30)
  )
  const [depositFixedCents, setDepositFixedCents] = useState(
    initialSettings.booking_deposit_fixed_cents
      ? String(initialSettings.booking_deposit_fixed_cents / 100)
      : ''
  )
  const [featuredMenuId, setFeaturedMenuId] = useState(
    initialSettings.featured_booking_menu_id ?? ''
  )
  const [featuredBadge, setFeaturedBadge] = useState(initialSettings.featured_booking_badge ?? '')
  const [featuredTitle, setFeaturedTitle] = useState(initialSettings.featured_booking_title ?? '')
  const [featuredPitch, setFeaturedPitch] = useState(initialSettings.featured_booking_pitch ?? '')

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const bookingUrl = slug ? `${SITE_URL}/book/${slug}` : null

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await upsertBookingSettings({
        booking_enabled: enabled,
        booking_slug: slug || undefined,
        booking_headline: headline || undefined,
        booking_bio_short: bio || undefined,
        booking_min_notice_days: parseInt(minNotice, 10) || 7,
        booking_model: bookingModel,
        booking_base_price_cents: basePriceCents
          ? Math.round(parseFloat(basePriceCents) * 100)
          : null,
        booking_pricing_type: pricingType,
        booking_deposit_type: depositType,
        booking_deposit_percent:
          depositType === 'percent' ? parseFloat(depositPercent) || null : null,
        booking_deposit_fixed_cents:
          depositType === 'fixed' && depositFixedCents
            ? Math.round(parseFloat(depositFixedCents) * 100)
            : null,
        featured_booking_menu_id: featuredMenuId || null,
        featured_booking_badge: featuredBadge || null,
        featured_booking_title: featuredTitle || null,
        featured_booking_pitch: featuredPitch || null,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error ?? 'Save failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    if (!bookingUrl) return
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm font-medium text-stone-300">Enable public booking page</span>
      </label>

      {enabled && (
        <div className="space-y-4 pl-7">
          <Input
            label="Booking URL slug"
            required
            placeholder="your-name"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            helperText={
              bookingUrl ? `Your link: ${bookingUrl}` : 'Set a slug to generate your link'
            }
          />

          {bookingUrl && (
            <div className="flex items-center gap-2">
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 underline hover:text-brand-400"
              >
                Preview booking page
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-500 hover:text-stone-300"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          )}

          <Input
            label="Headline"
            placeholder="Private chef for intimate gatherings in San Francisco"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            helperText="Shown below your name on the booking page"
          />

          <Textarea
            label="Short bio"
            placeholder="A brief description of your style and what makes you unique..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />

          <Input
            label="Minimum notice days"
            type="number"
            min="0"
            max="90"
            value={minNotice}
            onChange={(e) => setMinNotice(e.target.value)}
            helperText="Clients cannot book dates within this many days"
          />

          <Card className="space-y-4 p-4">
            <div>
              <p className="text-sm font-medium text-stone-300">Featured ready-to-book menu</p>
              <p className="mt-1 text-xs text-stone-500">
                Showcase one menu clients can buy into immediately instead of starting with a fully
                custom brief. Featured-menu bookings are always treated as one-off events.
              </p>
            </div>

            <Select
              label="Featured menu"
              value={featuredMenuId}
              onChange={(e) => setFeaturedMenuId(e.target.value)}
              options={menuOptions.map((menu) => ({
                value: menu.id,
                label: `${menu.name}${menu.target_guest_count ? ` | ${menu.target_guest_count} guests` : ''}${menu.is_showcase ? ' | Showcase' : ''}`,
              }))}
              helperText={
                menuOptions.length > 0
                  ? 'Clients will see this menu on your public profile and can start a booking or request directly from it.'
                  : 'Create a menu first if you want a ready-to-book option.'
              }
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Offer badge"
                placeholder="Signature Dinner"
                value={featuredBadge}
                onChange={(e) => setFeaturedBadge(e.target.value)}
                helperText="Short eyebrow above the card. Leave blank to use the default label."
              />

              <Input
                label="Offer headline"
                placeholder="A menu I can take from yes to booked with almost no back-and-forth"
                value={featuredTitle}
                onChange={(e) => setFeaturedTitle(e.target.value)}
                helperText="Use this to sell the offer, not just restate the menu name."
              />
            </div>

            <Textarea
              label="Offer pitch"
              placeholder="Share why this menu works so well, what kind of evening it fits, and why clients should start here."
              value={featuredPitch}
              onChange={(e) => setFeaturedPitch(e.target.value)}
              rows={3}
              helperText="Shown on your public profile, inquiry page, and booking flow when this menu is selected."
            />

            {menuOptions.length === 0 && (
              <p className="text-xs text-stone-500">
                No eligible menus yet. Build one in your menu library, then come back and feature it
                here.
              </p>
            )}
          </Card>

          <Card className="space-y-4 p-4">
            <p className="text-sm font-medium text-stone-300">Booking model</p>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="bookingModel"
                  checked={bookingModel === 'inquiry_first'}
                  onChange={() => setBookingModel('inquiry_first')}
                  className="mt-0.5 h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-medium text-stone-100">Inquiry first</span>
                  <p className="text-xs text-stone-500">
                    Clients submit a request. You review and send a proposal before they pay.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="bookingModel"
                  checked={bookingModel === 'instant_book'}
                  onChange={() => setBookingModel('instant_book')}
                  className="mt-0.5 h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-medium text-stone-100">Instant book</span>
                  <p className="text-xs text-stone-500">
                    Clients pay a deposit upfront and book instantly. You are notified of new
                    bookings.
                  </p>
                </div>
              </label>
            </div>

            {bookingModel === 'instant_book' && (
              <div className="space-y-3 border-t border-stone-800 pt-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-300">
                      Pricing type
                    </label>
                    <select
                      value={pricingType}
                      onChange={(e) => setPricingType(e.target.value as 'flat_rate' | 'per_person')}
                      title="Pricing type"
                      className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="flat_rate">Flat rate</option>
                      <option value="per_person">Per person</option>
                    </select>
                  </div>
                  <Input
                    label={pricingType === 'per_person' ? 'Price per person ($)' : 'Base price ($)'}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="500.00"
                    value={basePriceCents}
                    onChange={(e) => setBasePriceCents(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-300">
                      Deposit type
                    </label>
                    <select
                      value={depositType}
                      onChange={(e) => setDepositType(e.target.value as 'percent' | 'fixed')}
                      title="Deposit type"
                      className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="percent">Percentage of total</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                  </div>

                  {depositType === 'percent' ? (
                    <Input
                      label="Deposit percentage (%)"
                      type="number"
                      min="1"
                      max="100"
                      required
                      placeholder="30"
                      value={depositPercent}
                      onChange={(e) => setDepositPercent(e.target.value)}
                      helperText="Percentage of total event price"
                    />
                  ) : (
                    <Input
                      label="Deposit amount ($)"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="150.00"
                      value={depositFixedCents}
                      onChange={(e) => setDepositFixedCents(e.target.value)}
                      helperText="Fixed deposit amount in dollars"
                    />
                  )}
                </div>

                <p className="text-xs text-stone-400">
                  Requires Stripe Connect to be set up. Clients will be redirected to Stripe
                  Checkout to pay the deposit.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {error && (
        <Alert variant="error" title="Save failed">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" title="Saved">
          Booking page settings updated.
        </Alert>
      )}

      <Button
        type="button"
        variant="primary"
        onClick={handleSave}
        loading={saving}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
