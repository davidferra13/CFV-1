'use client'

// Staff Briefing Panel
// Renders the compiled staff briefing for a single event.
// Shows timeline, menu, plating style, service expectations,
// client vibe, allergies, and staff roles.
// "Copy as text" and "Print" buttons provided.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { generateStaffBriefing, type StaffBriefingData } from '@/lib/staff/briefing-actions'
import { getQrCodeUrl } from '@/lib/qr/qr-code'

const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family-style',
  cocktail: 'Cocktail reception',
  buffet: 'Buffet',
  flexible: 'Flexible',
  not_sure: 'Not yet decided',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</h3>
      <div className="text-sm text-stone-100 space-y-1">{children}</div>
    </div>
  )
}

function buildPlainText(b: StaffBriefingData): string {
  const lines: string[] = []
  lines.push(`STAFF BRIEFING — ${b.occasion ?? 'Private Event'}`)
  if (b.eventDate) lines.push(b.eventDate)
  lines.push('')

  lines.push('TIMELINE')
  if (b.arrivalTime) lines.push(`  Arrival (setup): ${b.arrivalTime}`)
  if (b.serveTime) lines.push(`  Service start: ${b.serveTime}`)
  lines.push(`  Guests: ${b.guestCount ?? 'TBD'}`)
  if (b.locationAddress) lines.push(`  Location: ${b.locationAddress}`)
  lines.push('')

  if (b.menuItems.length > 0) {
    lines.push('MENU')
    b.menuItems.forEach((item) => lines.push(`  • ${item}`))
    if (b.menuNotes) lines.push(`  Notes: ${b.menuNotes}`)
    lines.push('')
  }

  if (b.serviceStylePref) {
    lines.push(`SERVICE STYLE: ${SERVICE_STYLE_LABELS[b.serviceStylePref] ?? b.serviceStylePref}`)
    lines.push('')
  }

  if (b.dietaryRestrictions.length > 0) {
    lines.push('DIETARY / ALLERGIES')
    b.dietaryRestrictions.forEach((d) => lines.push(`  ⚠ ${d}`))
    lines.push('')
  }

  if (b.specialRequests) {
    lines.push('SPECIAL REQUESTS / CLIENT NOTES')
    lines.push(`  ${b.specialRequests}`)
    lines.push('')
  }

  if (b.kitchenNotes) {
    lines.push('KITCHEN NOTES')
    b.kitchenNotes.split('\n').forEach((line) => lines.push(`  ${line}`))
    lines.push('')
  }

  if (b.staff.length > 0) {
    lines.push('STAFF')
    b.staff.forEach((s) => {
      const hrs = s.scheduledHours ? ` (${s.scheduledHours}h)` : ''
      const phone = s.phone ? ` | ${s.phone}` : ''
      lines.push(`  ${s.name} — ${s.role}${hrs}${phone}`)
    })
  }

  return lines.join('\n')
}

type Props = {
  eventId: string
  hasStaff: boolean
}

export function StaffBriefingPanel({ eventId, hasStaff }: Props) {
  const [briefing, setBriefing] = useState<StaffBriefingData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const data = await generateStaffBriefing(eventId)
        if (!data) setError('Could not load event data.')
        else setBriefing(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate briefing.')
      }
    })
  }

  function handleCopy() {
    if (!briefing) return
    const text = buildPlainText(briefing)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrint() {
    window.print()
  }

  if (!hasStaff) {
    return (
      <p className="text-sm text-stone-500">
        Assign staff to this event before generating a briefing.
      </p>
    )
  }

  if (!briefing) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-stone-400">
          Generate a one-page briefing with timeline, menu, allergies, and staff roles — ready to
          paste into a group text or print.
        </p>
        <Button size="sm" variant="secondary" onClick={handleGenerate} loading={isPending}>
          Generate Briefing
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4 print:text-sm" id="staff-briefing-print">
      {/* Briefing Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wider">Staff Briefing</p>
          <h3 className="text-base font-semibold text-stone-100">
            {briefing.occasion ?? 'Private Event'}
          </h3>
          {briefing.eventDate && <p className="text-sm text-stone-400">{briefing.eventDate}</p>}
        </div>
        <div className="flex gap-2 print:hidden shrink-0">
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy as text'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handlePrint}>
            Print
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setBriefing(null)}>
            Regenerate
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-stone-700 bg-stone-800 p-4 space-y-4">
        {/* Timeline */}
        <Section title="Timeline">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-stone-500 text-xs">Arrival (setup):</span>
            <span className="font-medium">{briefing.arrivalTime ?? '2 hrs before service'}</span>
            <span className="text-stone-500 text-xs">Service start:</span>
            <span className="font-medium">{briefing.serveTime ?? 'TBD'}</span>
            <span className="text-stone-500 text-xs">Guests:</span>
            <span className="font-medium">{briefing.guestCount ?? 'TBD'}</span>
            {briefing.locationAddress && (
              <>
                <span className="text-stone-500 text-xs">Location:</span>
                <span className="font-medium">{briefing.locationAddress}</span>
              </>
            )}
          </div>
        </Section>

        {/* Menu */}
        {briefing.menuItems.length > 0 && (
          <Section title="Menu">
            <ul className="space-y-0.5">
              {briefing.menuItems.map((item, i) => (
                <li key={i} className="text-stone-200">
                  • {item}
                </li>
              ))}
            </ul>
            {briefing.menuNotes && (
              <p className="text-xs text-stone-500 mt-1 italic">{briefing.menuNotes}</p>
            )}
          </Section>
        )}

        {/* Service Style */}
        {briefing.serviceStylePref && (
          <Section title="Service Style">
            <p>{SERVICE_STYLE_LABELS[briefing.serviceStylePref] ?? briefing.serviceStylePref}</p>
          </Section>
        )}

        {/* Dietary / Allergies */}
        {briefing.dietaryRestrictions.length > 0 && (
          <Section title="Dietary / Allergies — MUST KNOW">
            <ul className="space-y-0.5">
              {briefing.dietaryRestrictions.map((item, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-amber-600 font-bold">⚠</span>
                  <span className="font-medium text-amber-900">{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Special Requests / Client Notes */}
        {briefing.specialRequests && (
          <Section title="Special Requests / Client Notes">
            <p className="text-stone-300 whitespace-pre-line">{briefing.specialRequests}</p>
          </Section>
        )}

        {/* Kitchen Notes */}
        {briefing.kitchenNotes && (
          <Section title="Kitchen Notes">
            <p className="text-stone-300 whitespace-pre-line">{briefing.kitchenNotes}</p>
          </Section>
        )}

        {/* Staff Roster */}
        {briefing.staff.length > 0 && (
          <Section title="Staff Roster">
            <div className="space-y-1">
              {briefing.staff.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-stone-500"> — {s.role}</span>
                    {s.scheduledHours && (
                      <span className="text-stone-400"> ({s.scheduledHours}h)</span>
                    )}
                  </span>
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="text-stone-500 hover:text-stone-200 text-xs"
                    >
                      {s.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* QR Code — scan to open live event page */}
      <div className="flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-800/50 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getQrCodeUrl(
            `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.cheflowhq.com'}/events/${eventId}`,
            120
          )}
          alt="Event QR code"
          width={60}
          height={60}
          className="rounded"
        />
        <div>
          <p className="text-xs font-medium text-stone-300">Scan for live event details</p>
          <p className="text-xs text-stone-500">Menu, allergies, timeline, and real-time updates</p>
        </div>
      </div>

      <p className="text-xs text-stone-400 print:hidden">
        Generated {new Date(briefing.generatedAt).toLocaleString()}
      </p>
    </div>
  )
}
