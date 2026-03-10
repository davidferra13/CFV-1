'use client'

import { useState, useEffect, useTransition } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2, Package } from 'lucide-react'
import {
  getReceiptMatchesForReview,
  applyReceiptPrices,
  type IngredientMatch,
  type ApplyMatchInput,
} from '@/lib/costing/receipt-cost-sync'

type MatchStatus = 'pending' | 'approved' | 'rejected'

type MatchRow = IngredientMatch & {
  status: MatchStatus
  overrideQuantity: number
}

function formatCents(cents: number | null): string {
  if (cents == null) return 'N/A'
  return `$${(cents / 100).toFixed(2)}`
}

function confidenceLabel(score: number): { text: string; color: string } {
  if (score >= 0.8) return { text: 'High', color: 'text-green-600' }
  if (score >= 0.5) return { text: 'Medium', color: 'text-amber-600' }
  if (score >= 0.3) return { text: 'Low', color: 'text-orange-600' }
  return { text: 'No match', color: 'text-gray-400' }
}

export function ReceiptCostMatcher({ receiptPhotoId }: { receiptPhotoId: string }) {
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [storeName, setStoreName] = useState<string | null>(null)
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applying, startApply] = useTransition()
  const [result, setResult] = useState<{
    ingredientsUpdated: number
    recipesAffected: number
    priceChanges: Array<{
      ingredientName: string
      oldCostCents: number | null
      newCostCents: number
      recipesAffected: number
    }>
  } | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await getReceiptMatchesForReview(receiptPhotoId)
        if (mounted) {
          setStoreName(data.storeName)
          setPurchaseDate(data.purchaseDate)
          setMatches(
            data.matches.map((m) => ({
              ...m,
              status: m.matchedIngredientId && m.confidence >= 0.5 ? 'approved' : 'pending',
              overrideQuantity: 1,
            }))
          )
        }
      } catch (err) {
        if (mounted) setError('Failed to load receipt matches')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [receiptPhotoId])

  function toggleStatus(lineItemId: string) {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.lineItemId !== lineItemId) return m
        const nextStatus: MatchStatus =
          m.status === 'approved' ? 'rejected' : m.status === 'rejected' ? 'pending' : 'approved'
        return { ...m, status: nextStatus }
      })
    )
  }

  function updateQuantity(lineItemId: string, quantity: number) {
    setMatches((prev) =>
      prev.map((m) =>
        m.lineItemId === lineItemId ? { ...m, overrideQuantity: Math.max(0.01, quantity) } : m
      )
    )
  }

  function handleApplyAll() {
    const approved = matches.filter(
      (m) =>
        m.status === 'approved' &&
        m.matchedIngredientId &&
        m.lineItemPriceCents &&
        m.lineItemPriceCents > 0
    )

    if (approved.length === 0) return

    const previousMatches = [...matches]

    startApply(async () => {
      try {
        const applyInputs: ApplyMatchInput[] = approved.map((m) => ({
          lineItemId: m.lineItemId,
          ingredientId: m.matchedIngredientId!,
          priceCents: m.lineItemPriceCents!,
          quantity: m.overrideQuantity,
        }))

        const res = await applyReceiptPrices(applyInputs, receiptPhotoId, storeName)
        setResult(res)
      } catch (err) {
        setMatches(previousMatches)
        setError('Failed to apply prices. Please try again.')
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Matching receipt items to your ingredients...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Prices Updated</h3>
          </div>
          <p className="text-sm text-green-700">
            Updated {result.ingredientsUpdated} ingredient
            {result.ingredientsUpdated !== 1 ? 's' : ''}. {result.recipesAffected} recipe
            {result.recipesAffected !== 1 ? 's' : ''} recalculated.
          </p>
        </div>

        {result.priceChanges.length > 0 && (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Ingredient</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Old Price</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-600" />
                  <th className="px-4 py-2 text-right font-medium text-gray-600">New Price</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Recipes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.priceChanges.map((pc) => (
                  <tr key={pc.ingredientId}>
                    <td className="px-4 py-2 font-medium text-gray-900">{pc.ingredientName}</td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      {formatCents(pc.oldCostCents)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <ArrowRight className="h-4 w-4 text-gray-400 mx-auto" />
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      {formatCents(pc.newCostCents)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">{pc.recipesAffected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const approvedCount = matches.filter(
    (m) => m.status === 'approved' && m.matchedIngredientId && m.lineItemPriceCents
  ).length
  const unmatchedCount = matches.filter((m) => !m.matchedIngredientId).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            Match to Ingredients
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {storeName && <span className="font-medium">{storeName}</span>}
            {storeName && purchaseDate && ' - '}
            {purchaseDate && <span>{purchaseDate}</span>}
          </p>
        </div>
        <button
          onClick={handleApplyAll}
          disabled={applying || approvedCount === 0}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {applying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Apply {approvedCount} Match{approvedCount !== 1 ? 'es' : ''}
            </>
          )}
        </button>
      </div>

      {unmatchedCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {unmatchedCount} item{unmatchedCount !== 1 ? 's' : ''} could not be matched to an
          ingredient.
        </div>
      )}

      {/* Matches Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600 w-8" />
              <th className="px-4 py-2 text-left font-medium text-gray-600">Receipt Item</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Matched Ingredient</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Receipt Price</th>
              <th className="px-4 py-2 text-center font-medium text-gray-600">Qty</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Current Cost</th>
              <th className="px-4 py-2 text-center font-medium text-gray-600">Confidence</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Recipes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {matches.map((m) => {
              const conf = confidenceLabel(m.confidence)
              const hasMatch = !!m.matchedIngredientId

              return (
                <tr
                  key={m.lineItemId}
                  className={
                    m.status === 'rejected'
                      ? 'bg-gray-50 opacity-50'
                      : m.status === 'approved'
                        ? 'bg-green-50/30'
                        : ''
                  }
                >
                  <td className="px-4 py-2">
                    {hasMatch && (
                      <button
                        onClick={() => toggleStatus(m.lineItemId)}
                        className="p-0.5 rounded hover:bg-gray-100"
                        title={
                          m.status === 'approved'
                            ? 'Click to reject'
                            : m.status === 'rejected'
                              ? 'Click to reconsider'
                              : 'Click to approve'
                        }
                      >
                        {m.status === 'approved' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : m.status === 'rejected' ? (
                          <XCircle className="h-5 w-5 text-red-400" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-900">{m.lineItemDescription}</td>
                  <td className="px-4 py-2">
                    {hasMatch ? (
                      <span className="font-medium text-gray-900">
                        {m.matchedIngredientName}
                        {m.matchedIngredientUnit && (
                          <span className="text-gray-400 ml-1">({m.matchedIngredientUnit})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">No match found</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-900">
                    {formatCents(m.lineItemPriceCents)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {hasMatch && m.status !== 'rejected' && (
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={m.overrideQuantity}
                        onChange={(e) =>
                          updateQuantity(m.lineItemId, parseFloat(e.target.value) || 1)
                        }
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-500">
                    {formatCents(m.currentCostCents)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs font-medium ${conf.color}`}>{conf.text}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {m.affectedRecipeCount > 0 ? m.affectedRecipeCount : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
