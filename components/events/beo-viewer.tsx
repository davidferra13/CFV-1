'use client'

// BEO Viewer Component
// Renders the Banquet Event Order in a clean, printable format.
// Supports toggling between Full (with financials) and Kitchen (staff-only) versions.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { BEOData } from '@/lib/beo/types'

// ─── Props ────────────────────────────────────────────────────────────────────

type BEOViewerProps = {
  initialBeo: BEOData
  eventId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: string | null): string {
  if (!t) return 'TBD'
  try {
    const parts = t.split(':')
    const h = parseInt(parts[0], 10)
    const m = parts[1] || '00'
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${m} ${ampm}`
  } catch {
    return t
  }
}

function serviceStyleLabel(s: string): string {
  const map: Record<string, string> = {
    plated: 'Plated',
    family_style: 'Family Style',
    buffet: 'Buffet',
    passed: 'Passed/Canape',
    tasting: 'Tasting Menu',
    stations: 'Stations',
    cooking_class: 'Cooking Class',
    meal_prep: 'Meal Prep',
    drop_off: 'Drop Off',
  }
  return map[s] || s
}

function paymentStatusLabel(s: string): string {
  const map: Record<string, string> = {
    unpaid: 'Unpaid',
    deposit_paid: 'Deposit Paid',
    partial: 'Partial',
    paid: 'Paid in Full',
    refunded: 'Refunded',
    overpaid: 'Overpaid',
  }
  return map[s] || s
}

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BEOViewer({ initialBeo, eventId }: BEOViewerProps) {
  const [beo, setBeo] = useState<BEOData>(initialBeo)
  const [version, setVersion] = useState<'full' | 'kitchen'>(initialBeo.version)
  const [isPending, startTransition] = useTransition()

  const handleVersionToggle = async (newVersion: 'full' | 'kitchen') => {
    if (newVersion === version) return
    const previousBeo = beo
    const previousVersion = version

    setVersion(newVersion)

    startTransition(async () => {
      try {
        const { getEventBEO } = await import('@/lib/beo/actions')
        const result = await getEventBEO(eventId, newVersion === 'full')
        if (result) {
          setBeo(result.data)
        }
      } catch {
        // Rollback on failure
        setBeo(previousBeo)
        setVersion(previousVersion)
      }
    })
  }

  const hasDietary = beo.dietaryRestrictions.length > 0 || beo.allergies.length > 0
  const hasNotes =
    beo.specialRequests || beo.kitchenNotes || beo.siteNotes || beo.accessInstructions

  return (
    <div className="beo-viewer">
      {/* Controls (hidden in print) */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVersionToggle('full')}
            disabled={isPending}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              version === 'full'
                ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700'
                : 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-stone-700'
            }`}
          >
            Full BEO
          </button>
          <button
            onClick={() => handleVersionToggle('kitchen')}
            disabled={isPending}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              version === 'kitchen'
                ? 'bg-amber-900/50 text-amber-300 border border-amber-700'
                : 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-stone-700'
            }`}
          >
            Kitchen Only
          </button>
        </div>

        <Button variant="ghost" size="sm" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      {isPending && (
        <div className="text-center py-2 text-sm text-stone-500 print:hidden">
          Switching version...
        </div>
      )}

      {/* BEO Document */}
      <div className="bg-white text-stone-900 rounded-lg shadow-lg print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="border-b-[3px] border-stone-900 px-8 pt-8 pb-4">
          <div className="text-base font-semibold text-stone-200">{beo.chef.businessName}</div>
          <h1 className="text-2xl font-bold">
            Banquet Event Order
            <span
              className={`ml-2 inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                version === 'kitchen' ? 'bg-amber-100 text-amber-200' : 'bg-cyan-100 text-cyan-200'
              }`}
            >
              {version === 'kitchen' ? 'Kitchen' : 'Full'}
            </span>
          </h1>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Event Details + Client Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Details */}
            <Section title="Event Details">
              <InfoRow label="Event" value={beo.eventName} />
              <InfoRow label="Date" value={beo.formattedDate} />
              <InfoRow label="Service Time" value={formatTime(beo.serveTime)} />
              <InfoRow label="Service Style" value={serviceStyleLabel(beo.serviceStyle)} />
              <InfoRow
                label="Guest Count"
                value={
                  <span>
                    {beo.guestCount}
                    {!beo.guestCountConfirmed && (
                      <span className="text-orange-600 italic text-sm ml-1">(unconfirmed)</span>
                    )}
                  </span>
                }
              />
              <InfoRow label="Status" value={statusLabel(beo.status)} />
            </Section>

            {/* Client & Location */}
            <Section title="Client & Location">
              <InfoRow label="Client" value={beo.client.name} />
              {version === 'full' && beo.client.email && (
                <InfoRow label="Email" value={beo.client.email} />
              )}
              {beo.client.phone && <InfoRow label="Phone" value={beo.client.phone} />}
              <InfoRow label="Address" value={beo.locationAddress} />
              <InfoRow
                label="City/State"
                value={`${beo.locationCity}, ${beo.locationState} ${beo.locationZip}`}
              />
              {beo.locationNotes && <InfoRow label="Location Notes" value={beo.locationNotes} />}
            </Section>
          </div>

          {/* Dietary Notes */}
          {hasDietary && (
            <Section title="Dietary Notes & Allergies">
              {beo.dietaryRestrictions.length > 0 && (
                <div className="text-sm mb-1">
                  <span className="font-semibold">Dietary Restrictions: </span>
                  {beo.dietaryRestrictions.join(', ')}
                </div>
              )}
              {beo.allergies.length > 0 && (
                <div className="text-sm text-red-200 font-medium">
                  <span className="font-semibold">Allergies: </span>
                  {beo.allergies.join(', ')}
                </div>
              )}
            </Section>
          )}

          {/* Menu */}
          <Section title={beo.menuName ? `Menu - ${beo.menuName}` : 'Menu'}>
            {beo.menuDescription && (
              <p className="text-sm italic text-stone-500 mb-3">{beo.menuDescription}</p>
            )}

            {beo.isSimpleMenu && beo.simpleMenuContent ? (
              <div className="text-sm bg-stone-50 border border-stone-200 rounded p-3 whitespace-pre-wrap">
                {beo.simpleMenuContent}
              </div>
            ) : beo.courses.length > 0 ? (
              <div className="space-y-4">
                {beo.courses.map((course) => (
                  <div key={course.number}>
                    <h3 className="text-sm font-semibold text-stone-200 mb-2">{course.name}</h3>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-stone-50">
                          <th className="text-left px-2 py-1 text-[11px] uppercase text-stone-500 font-semibold">
                            Dish
                          </th>
                          <th className="text-left px-2 py-1 text-[11px] uppercase text-stone-500 font-semibold">
                            Description
                          </th>
                          {version === 'kitchen' && (
                            <th className="text-left px-2 py-1 text-[11px] uppercase text-stone-500 font-semibold">
                              Plating
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {course.dishes.map((dish, i) => (
                          <tr key={i} className="border-b border-stone-100">
                            <td className="px-2 py-1.5 align-top font-medium">
                              {dish.name || 'Untitled'}
                              {(dish.dietaryTags.length > 0 || dish.allergenFlags.length > 0) && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {dish.dietaryTags.map((t) => (
                                    <span
                                      key={t}
                                      className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-200"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  {dish.allergenFlags.map((t) => (
                                    <span
                                      key={t}
                                      className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-200 font-bold"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5 align-top text-stone-600">
                              {dish.description || ''}
                            </td>
                            {version === 'kitchen' && (
                              <td className="px-2 py-1.5 align-top text-stone-600">
                                {dish.platingInstructions || ''}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400 italic">No menu attached to this event.</p>
            )}
          </Section>

          {/* Timeline */}
          <Section title="Timeline">
            <InfoRow label="Arrival / Setup" value={formatTime(beo.timeline.arrivalTime)} />
            <InfoRow label="Service Time" value={formatTime(beo.timeline.serveTime)} />
            <InfoRow label="Departure" value={formatTime(beo.timeline.departureTime)} />
          </Section>

          {/* Staff */}
          {beo.staff.length > 0 && (
            <Section title="Staff">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="text-left px-2 py-1 text-[11px] uppercase text-stone-500 font-semibold">
                      Name
                    </th>
                    <th className="text-left px-2 py-1 text-[11px] uppercase text-stone-500 font-semibold">
                      Role
                    </th>
                    <th className="text-left px-2 py-1 text-[11px] uppercase text-stone-500 font-semibold">
                      Phone
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {beo.staff.map((s, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="px-2 py-1.5">{s.name}</td>
                      <td className="px-2 py-1.5 text-stone-600">{s.role}</td>
                      <td className="px-2 py-1.5 text-stone-600">{s.phone || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Notes */}
          {hasNotes && (
            <Section title="Notes & Instructions">
              {beo.specialRequests && (
                <NoteRow label="Special Requests" value={beo.specialRequests} />
              )}
              {beo.kitchenNotes && <NoteRow label="Kitchen Notes" value={beo.kitchenNotes} />}
              {beo.siteNotes && <NoteRow label="Site Notes" value={beo.siteNotes} />}
              {beo.accessInstructions && (
                <NoteRow label="Access Instructions" value={beo.accessInstructions} />
              )}
            </Section>
          )}

          {/* Additional Details */}
          {(beo.alcoholBeingServed !== null || beo.cannabisPreference !== null) && (
            <Section title="Additional Details">
              {beo.alcoholBeingServed !== null && (
                <InfoRow label="Alcohol" value={beo.alcoholBeingServed ? 'Yes' : 'No'} />
              )}
              {beo.cannabisPreference !== null && (
                <InfoRow label="Cannabis" value={beo.cannabisPreference ? 'Yes' : 'No'} />
              )}
            </Section>
          )}

          {/* Financials (full version only) */}
          {beo.financials && (
            <Section title="Financial Summary">
              {beo.financials.quotedPriceCents !== null && (
                <InfoRow
                  label="Quoted Price"
                  value={formatCurrency(beo.financials.quotedPriceCents)}
                  mono
                />
              )}
              {beo.financials.depositAmountCents !== null && (
                <InfoRow
                  label="Deposit Required"
                  value={formatCurrency(beo.financials.depositAmountCents)}
                  mono
                />
              )}
              <InfoRow
                label="Total Paid"
                value={formatCurrency(beo.financials.totalPaidCents)}
                mono
              />
              {beo.financials.totalRefundedCents > 0 && (
                <InfoRow
                  label="Refunded"
                  value={`(${formatCurrency(beo.financials.totalRefundedCents)})`}
                  mono
                />
              )}
              <div className="border-t-2 border-stone-900 mt-1 pt-1">
                <InfoRow
                  label="Balance Due"
                  value={formatCurrency(beo.financials.outstandingBalanceCents)}
                  mono
                  bold
                />
              </div>
              <InfoRow
                label="Payment Status"
                value={paymentStatusLabel(beo.financials.paymentStatus)}
              />
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 px-8 py-3 text-center text-xs text-stone-400">
          {beo.chef.businessName} | {beo.chef.email}
          {beo.chef.phone ? ` | ${beo.chef.phone}` : ''}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-1 mb-3">
        {title}
      </h2>
      {children}
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
  bold,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex justify-between text-sm border-b border-stone-100 py-1">
      <span className="text-stone-500 font-semibold">{label}</span>
      <span className={`text-stone-900 ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm mb-2">
      <span className="font-semibold">{label}: </span>
      <span className="text-stone-600">{value}</span>
    </div>
  )
}
