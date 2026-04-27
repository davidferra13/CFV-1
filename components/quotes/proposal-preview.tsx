'use client'

import { useEffect, useState, useTransition } from 'react'
import { createQuoteFromProposal } from '@/lib/quotes/quick-proposal-actions'
import type { ProposalData, ProposalOverrides } from '@/lib/quotes/quick-proposal-actions'
import { getEventMenuCost } from '@/lib/quotes/actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/currency'
import { TiptapEditor } from '@/components/ui/tiptap-editor'

const DEFAULT_TERMS_KEY = 'chefflow-default-proposal-terms'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatServiceStyle(style: string): string {
  return style
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatConfidenceScore(score: number | null): string | null {
  if (score === null) return null
  return `${Math.round(score * 100)}%`
}

type ProposalPreviewProps = {
  proposal: ProposalData
  onQuoteCreated?: (quoteId: string) => void
  onClose?: () => void
}

export function ProposalPreview({ proposal, onQuoteCreated, onClose }: ProposalPreviewProps) {
  const [isPending, startTransition] = useTransition()

  // Editable fields
  const [quoteName, setQuoteName] = useState(
    `Proposal for ${proposal.clientName} - ${proposal.occasion || 'Event'}`
  )
  const [totalCents, setTotalCents] = useState(proposal.quotedPriceCents || 0)
  const [perPersonCents, setPerPersonCents] = useState(proposal.pricePerPersonCents || 0)
  const [pricingModel, setPricingModel] = useState(proposal.pricingModel)
  const [pricingNotes, setPricingNotes] = useState(proposal.pricingNotes || '')
  const [depositRequired, setDepositRequired] = useState(false)
  const [depositPercentage, setDepositPercentage] = useState(50)
  const [terms, setTerms] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DEFAULT_TERMS_KEY) || ''
    }
    return ''
  })
  const [internalNotes, setInternalNotes] = useState('')

  // Menu cost for chef-only margin indicator
  const [menuCostData, setMenuCostData] = useState<{
    totalFoodCostCents: number
    hasAllCosts: boolean
  } | null>(null)

  useEffect(() => {
    if (!proposal.eventId) return
    let cancelled = false
    getEventMenuCost(proposal.eventId)
      .then((data) => {
        if (!cancelled && data) {
          setMenuCostData({
            totalFoodCostCents: data.totalFoodCostCents,
            hasAllCosts: data.hasAllCosts,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [proposal.eventId])

  // Compute deposit amount from percentage
  const depositAmountCents = depositRequired
    ? Math.round((totalCents * depositPercentage) / 100)
    : null

  // Valid until (default: 14 days from now)
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date()
    const fut = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 14)
    return `${fut.getFullYear()}-${String(fut.getMonth() + 1).padStart(2, '0')}-${String(fut.getDate()).padStart(2, '0')}`
  })

  function handleCreateQuote() {
    if (totalCents <= 0) {
      toast.error('Please enter a total price')
      return
    }

    startTransition(async () => {
      try {
        const overrides: ProposalOverrides = {
          quoteName,
          totalQuotedCents: totalCents,
          pricePerPersonCents: pricingModel === 'per_person' ? perPersonCents : null,
          pricingModel,
          pricingNotes: pricingNotes || null,
          depositRequired,
          depositAmountCents,
          depositPercentage: depositRequired ? depositPercentage : null,
          validUntil,
          internalNotes: internalNotes || null,
        }

        const result = await createQuoteFromProposal(proposal.eventId, overrides)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        // Save terms to localStorage for future use
        if (terms) {
          localStorage.setItem(DEFAULT_TERMS_KEY, terms)
        }

        toast.success('Quote created successfully')
        onQuoteCreated?.(result.quoteId)
      } catch (err) {
        toast.error('Failed to create quote')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <label className="block text-sm font-medium text-gray-500 mb-1">Proposal Name</label>
        <input
          type="text"
          value={quoteName}
          onChange={(e) => setQuoteName(e.target.value)}
          className="w-full text-lg font-semibold bg-transparent border-b border-dashed border-gray-300 focus:border-brand-500 focus:outline-none pb-1"
        />
      </div>

      {/* Chef Info */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">From</h3>
        <p className="font-medium">{proposal.chefBusinessName}</p>
        <p className="text-sm text-gray-600">{proposal.chefEmail}</p>
        {proposal.chefPhone && <p className="text-sm text-gray-600">{proposal.chefPhone}</p>}
      </section>

      {/* Client Info */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">To</h3>
        <p className="font-medium">{proposal.clientName}</p>
        <p className="text-sm text-gray-600">{proposal.clientEmail}</p>
        {proposal.clientPhone && <p className="text-sm text-gray-600">{proposal.clientPhone}</p>}
      </section>

      {/* Event Details */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Event Details
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Date:</span>{' '}
            <span className="font-medium">{formatDate(proposal.eventDate)}</span>
          </div>
          {proposal.occasion && (
            <div>
              <span className="text-gray-500">Occasion:</span>{' '}
              <span className="font-medium">{proposal.occasion}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Guests:</span>{' '}
            <span className="font-medium">{proposal.guestCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Service:</span>{' '}
            <span className="font-medium">{formatServiceStyle(proposal.serviceStyle)}</span>
          </div>
          <div>
            <span className="text-gray-500">Serve Time:</span>{' '}
            <span className="font-medium">{proposal.serveTime}</span>
          </div>
          <div>
            <span className="text-gray-500">Location:</span>{' '}
            <span className="font-medium">
              {proposal.locationCity}, {proposal.locationState}
            </span>
          </div>
        </div>
        {proposal.specialRequests && (
          <div className="mt-2 text-sm">
            <span className="text-gray-500">Special Requests:</span>{' '}
            <span>{proposal.specialRequests}</span>
          </div>
        )}
      </section>

      {/* Dietary */}
      {(proposal.dietaryRestrictions.length > 0 || proposal.allergies.length > 0) && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Dietary Accommodations
          </h3>
          {proposal.dietaryRestrictions.length > 0 && (
            <div className="text-sm mb-1">
              <span className="text-gray-500">Restrictions:</span>{' '}
              {proposal.dietaryRestrictions.join(', ')}
            </div>
          )}
          {proposal.allergies.length > 0 && (
            <div className="text-sm">
              <span className="text-red-600 font-medium">Allergies:</span>{' '}
              {proposal.allergies.join(', ')}
            </div>
          )}
        </section>
      )}

      {proposal.profileGuidance && (
        <section className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Client Profile Guidance
          </h3>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {proposal.profileGuidance.confidenceScore !== null && (
              <div>
                <p className="text-gray-500">Confidence</p>
                <p className="font-medium">
                  {formatConfidenceScore(proposal.profileGuidance.confidenceScore)}
                </p>
              </div>
            )}
            {proposal.profileGuidance.serviceDepth && (
              <div>
                <p className="text-gray-500">Service Depth</p>
                <p className="font-medium">{proposal.profileGuidance.serviceDepth}</p>
              </div>
            )}
            {proposal.profileGuidance.emotionalState && (
              <div>
                <p className="text-gray-500">Emotional State</p>
                <p className="font-medium">{proposal.profileGuidance.emotionalState}</p>
              </div>
            )}
          </div>

          {proposal.profileGuidance.confidenceSummary && (
            <p className="text-sm text-gray-600">{proposal.profileGuidance.confidenceSummary}</p>
          )}

          {proposal.profileGuidance.hardVetoes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-2">
                Hard Vetoes
              </p>
              <div className="flex flex-wrap gap-2">
                {proposal.profileGuidance.hardVetoes.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {proposal.profileGuidance.strongLikes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-2">
                Strong Likes
              </p>
              <div className="flex flex-wrap gap-2">
                {proposal.profileGuidance.strongLikes.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {proposal.profileGuidance.noveltyOpportunities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-brand-700 uppercase tracking-wider mb-2">
                Novelty Opportunities
              </p>
              <div className="flex flex-wrap gap-2">
                {proposal.profileGuidance.noveltyOpportunities.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs text-brand-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {proposal.profileGuidance.ambiguities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-2">
                Clarifications Needed
              </p>
              <div className="space-y-2">
                {proposal.profileGuidance.ambiguities.map((ambiguity) => (
                  <div
                    key={`${ambiguity.title}-${ambiguity.question}`}
                    className="rounded-md border border-amber-200 bg-amber-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-amber-900">{ambiguity.title}</p>
                      <span className="text-xs uppercase tracking-wider text-amber-700">
                        {ambiguity.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-amber-900/80">{ambiguity.question}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Menu */}
      {(proposal.menuName || proposal.menuContent) && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Menu
          </h3>
          {proposal.menuName && <p className="font-medium">{proposal.menuName}</p>}
          {proposal.cuisineType && (
            <p className="text-sm text-gray-500 italic">{proposal.cuisineType}</p>
          )}
          {proposal.menuDescription && (
            <p className="text-sm text-gray-600 mt-1">{proposal.menuDescription}</p>
          )}
          {proposal.menuContent && (
            <div className="mt-2 text-sm whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border">
              {proposal.menuContent}
            </div>
          )}
        </section>
      )}

      {/* Pricing */}
      <section className="bg-brand-50 rounded-lg p-4 border border-brand-100">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Pricing
        </h3>

        <div className="space-y-3">
          {/* Pricing model */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Pricing Model</label>
            <select
              value={pricingModel}
              onChange={(e) =>
                setPricingModel(e.target.value as 'per_person' | 'flat_rate' | 'custom')
              }
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
            >
              <option value="flat_rate">Flat Rate</option>
              <option value="per_person">Per Person</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Total */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Total Price</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={(totalCents / 100).toFixed(2)}
                onChange={(e) => setTotalCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Per person (if applicable) */}
          {pricingModel === 'per_person' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Price Per Person</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(perPersonCents / 100).toFixed(2)}
                  onChange={(e) =>
                    setPerPersonCents(Math.round(parseFloat(e.target.value || '0') * 100))
                  }
                  className="w-full border rounded-md px-3 py-1.5 text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {proposal.guestCount} guests x {formatCurrency(perPersonCents)} ={' '}
                {formatCurrency(perPersonCents * proposal.guestCount)}
              </p>
            </div>
          )}

          {/* Deposit */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deposit-required"
              checked={depositRequired}
              onChange={(e) => setDepositRequired(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="deposit-required" className="text-sm">
              Require deposit
            </label>
          </div>

          {depositRequired && (
            <div className="pl-6 space-y-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Deposit Percentage</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={depositPercentage}
                    onChange={(e) => setDepositPercentage(parseInt(e.target.value || '50'))}
                    className="w-20 border rounded-md px-3 py-1.5 text-sm"
                  />
                  <span className="text-sm text-gray-500">%</span>
                  {depositAmountCents !== null && (
                    <span className="text-sm text-gray-500">
                      ({formatCurrency(depositAmountCents)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Valid until */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Valid Until</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
            />
          </div>

          {/* Pricing notes */}
          <div>
            <TiptapEditor
              label="Pricing Notes (visible to client)"
              value={pricingNotes}
              onChange={setPricingNotes}
              minHeight={80}
              placeholder="Includes groceries, cooking, service, and cleanup..."
              toolbar={['text', 'list']}
            />
          </div>
        </div>
      </section>

      {/* Chef-only margin indicator (never shown to client) */}
      {menuCostData &&
        totalCents > 0 &&
        (() => {
          const foodCostPct = parseFloat(
            ((menuCostData.totalFoodCostCents / totalCents) * 100).toFixed(1)
          )
          const marginCents = totalCents - menuCostData.totalFoodCostCents
          const colorClass =
            foodCostPct <= 30
              ? 'text-emerald-600'
              : foodCostPct <= 40
                ? 'text-amber-600'
                : 'text-red-600'
          return (
            <section className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                Chef only (not on client proposal)
              </p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">Your margin:</span>
                <span
                  className={`font-semibold ${marginCents > 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {formatCurrency(marginCents)}
                </span>
                <span className={`font-semibold ${colorClass}`}>({foodCostPct}% food cost)</span>
              </div>
              {!menuCostData.hasAllCosts && (
                <p className="text-xs text-amber-500">Based on partial recipe cost data</p>
              )}
            </section>
          )
        })()}

      {/* Terms */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Terms and Conditions
        </h3>
        <TiptapEditor
          value={terms}
          onChange={setTerms}
          minHeight={160}
          placeholder="Payment terms, cancellation policy, liability, dietary disclaimers..."
          toolbar={['text', 'heading', 'list', 'insert']}
        />
        <p className="text-xs text-gray-500 mt-1">Terms are saved locally for future proposals</p>
      </section>

      {/* Internal notes */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Internal Notes (not visible to client)
        </h3>
        <TiptapEditor
          value={internalNotes}
          onChange={setInternalNotes}
          minHeight={80}
          placeholder="Notes for your records only..."
          toolbar={['text', 'list']}
          compact
        />
      </section>

      {/* Warning if quote exists */}
      {proposal.hasExistingQuote && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          This event already has a quote (ID: {proposal.existingQuoteId}). Creating a new quote is
          not allowed while one exists.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
        {onClose && (
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleCreateQuote}
          loading={isPending}
          disabled={isPending || proposal.hasExistingQuote || totalCents <= 0}
          className="flex-1"
        >
          {isPending ? 'Creating Quote...' : 'Create Quote'}
        </Button>
      </div>
    </div>
  )
}
