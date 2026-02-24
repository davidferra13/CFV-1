'use client'

import { useState } from 'react'
import { updateClient } from '@/lib/clients/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

type Props = {
  clientId: string
  referralPotential: string | null
  redFlags: string | null
  acquisitionCostCents: number | null
  complaintHandling: string | null
  wowFactors: string | null
  paymentBehavior: string | null
  tippingPattern: string | null
  farewellStyle: string | null
}

export function BusinessIntelPanel({ clientId, ...initial }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [referralPotential, setReferralPotential] = useState(initial.referralPotential || '')
  const [redFlags, setRedFlags] = useState(initial.redFlags || '')
  const [acquisitionCost, setAcquisitionCost] = useState(
    initial.acquisitionCostCents ? String(initial.acquisitionCostCents / 100) : ''
  )
  const [complaintHandling, setComplaintHandling] = useState(initial.complaintHandling || '')
  const [wowFactors, setWowFactors] = useState(initial.wowFactors || '')
  const [paymentBehavior, setPaymentBehavior] = useState(initial.paymentBehavior || '')
  const [tippingPattern, setTippingPattern] = useState(initial.tippingPattern || '')
  const [farewellStyle, setFarewellStyle] = useState(initial.farewellStyle || '')

  async function handleSave() {
    setSaving(true)
    try {
      await updateClient(clientId, {
        referral_potential: (referralPotential || null) as any,
        red_flags: redFlags || undefined,
        acquisition_cost_cents: acquisitionCost
          ? Math.round(parseFloat(acquisitionCost) * 100)
          : null,
        complaint_handling_notes: complaintHandling || undefined,
        wow_factors: wowFactors || undefined,
        payment_behavior: paymentBehavior || undefined,
        tipping_pattern: tippingPattern || undefined,
        farewell_style: farewellStyle || undefined,
      })
      setEditing(false)
    } catch (err) {
      console.error('Failed to update business intel:', err)
    } finally {
      setSaving(false)
    }
  }

  const POTENTIAL_COLORS: Record<string, string> = {
    high: 'bg-green-900 text-green-700',
    medium: 'bg-amber-900 text-amber-700',
    low: 'bg-stone-800 text-stone-400',
  }

  const hasData =
    referralPotential ||
    redFlags ||
    acquisitionCost ||
    complaintHandling ||
    wowFactors ||
    paymentBehavior ||
    tippingPattern ||
    farewellStyle

  if (!editing) {
    return (
      <div className="rounded-lg border border-stone-700 overflow-hidden">
        <div className="px-4 py-3 bg-stone-800 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-stone-200">Chef&apos;s Internal Assessment</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-700 text-stone-500 font-medium">
              Chef Only
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-brand-500 hover:text-brand-600"
          >
            Edit
          </button>
        </div>
        {hasData ? (
          <div className="p-4 space-y-3">
            {referralPotential && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500">Referral Potential:</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${POTENTIAL_COLORS[referralPotential] || ''}`}
                >
                  {referralPotential}
                </span>
              </div>
            )}
            {redFlags && (
              <div className="bg-red-950 border border-red-200 rounded-lg p-3">
                <span className="text-xs font-medium text-red-700 uppercase">Red Flags</span>
                <p className="text-sm text-red-800 mt-1">{redFlags}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {paymentBehavior && (
                <>
                  <span className="text-stone-500">Payment Behavior</span>
                  <span className="text-stone-200">{paymentBehavior}</span>
                </>
              )}
              {tippingPattern && (
                <>
                  <span className="text-stone-500">Tipping Pattern</span>
                  <span className="text-stone-200">{tippingPattern}</span>
                </>
              )}
              {wowFactors && (
                <>
                  <span className="text-stone-500">Wow Factors</span>
                  <span className="text-stone-200">{wowFactors}</span>
                </>
              )}
              {farewellStyle && (
                <>
                  <span className="text-stone-500">Farewell Style</span>
                  <span className="text-stone-200">{farewellStyle}</span>
                </>
              )}
              {complaintHandling && (
                <>
                  <span className="text-stone-500">Complaint Handling</span>
                  <span className="text-stone-200">{complaintHandling}</span>
                </>
              )}
              {acquisitionCost && (
                <>
                  <span className="text-stone-500">Acquisition Cost</span>
                  <span className="text-stone-200">${acquisitionCost}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 text-center text-stone-400 text-sm">
            No internal assessment recorded yet
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-brand-700 overflow-hidden">
      <div className="px-4 py-3 bg-brand-950 border-b border-brand-700">
        <h3 className="font-medium text-stone-200">Chef&apos;s Internal Assessment</h3>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs text-stone-500 bg-stone-800 rounded-lg p-3">
          Clients will never see this information. This is strictly for your internal business
          intelligence.
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
          value={redFlags}
          onChange={(e) => setRedFlags(e.target.value)}
          placeholder="Late cancellations, boundary issues, unrealistic expectations"
        />
        <Textarea
          label="Payment Behavior"
          value={paymentBehavior}
          onChange={(e) => setPaymentBehavior(e.target.value)}
          placeholder="Pays promptly? Always late? Prefers Venmo?"
        />
        <Textarea
          label="Tipping Pattern"
          value={tippingPattern}
          onChange={(e) => setTippingPattern(e.target.value)}
          placeholder="Generous? Standard 20%? Never tips?"
        />
        <Textarea
          label="Wow Factors"
          value={wowFactors}
          onChange={(e) => setWowFactors(e.target.value)}
          placeholder="What impresses them? Tableside flambe? Exotic ingredients?"
        />
        <Textarea
          label="Farewell Style"
          value={farewellStyle}
          onChange={(e) => setFarewellStyle(e.target.value)}
          placeholder="Linger and chat? Quick exit?"
        />
        <Textarea
          label="Complaint Handling"
          value={complaintHandling}
          onChange={(e) => setComplaintHandling(e.target.value)}
          placeholder="Direct? Passive? Leaves bad reviews?"
        />
        <Input
          label="Acquisition Cost ($)"
          type="number"
          value={acquisitionCost}
          onChange={(e) => setAcquisitionCost(e.target.value)}
          placeholder="Marketing spend"
        />
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
  )
}
