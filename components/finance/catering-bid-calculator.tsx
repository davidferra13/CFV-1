'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  generateCateringBid,
  searchRecipesForBid,
  type GenerateBidParams,
  type BidResult,
} from '@/lib/finance/catering-bid-actions'
import { getPricingConfig } from '@/lib/pricing/config-actions'
import { CateringBidSummary } from './catering-bid-summary'
import { formatCurrency } from '@/lib/utils/currency'

type SelectedRecipe = {
  recipeId: string
  name: string
  servings: number
  category: string
  costPerPortionCents: number | null
  yieldQuantity: number | null
}

type SearchResult = {
  id: string
  name: string
  category: string
  yieldQuantity: number | null
  costPerPortionCents: number | null
  hasAllPrices: boolean
}

const STEPS = [
  'Event Setup',
  'Select Recipes',
  'Labor & Overhead',
  'Travel & Equipment',
  'Review Bid',
] as const

const DRAFT_STORAGE_KEY = 'chefflow-bid-draft'

export function CateringBidCalculator({
  onQuoteCreated,
}: {
  onQuoteCreated?: (quoteId: string) => void
}) {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Step 1: Event setup
  const [guestCount, setGuestCount] = useState(10)
  const [bidName, setBidName] = useState('')

  // Step 2: Recipes
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Step 3: Labor & overhead
  const [laborHours, setLaborHours] = useState(8)
  const [laborRateDollars, setLaborRateDollars] = useState(35)
  const [overheadPercent, setOverheadPercent] = useState(15)
  const [profitMarginPercent, setProfitMarginPercent] = useState(20)

  // Step 4: Travel & equipment
  const [travelMiles, setTravelMiles] = useState(0)
  const [includeEquipment, setIncludeEquipment] = useState(false)
  const [equipmentCostDollars, setEquipmentCostDollars] = useState(0)

  // Result
  const [bidResult, setBidResult] = useState<BidResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Running total calculation (client-side estimate)
  const estimatedFoodCents = selectedRecipes.reduce((sum, r) => {
    if (!r.costPerPortionCents || !r.yieldQuantity) return sum
    const baseCost = r.costPerPortionCents * r.yieldQuantity
    const scale = r.servings / r.yieldQuantity
    return sum + Math.round(baseCost * scale)
  }, 0)

  const laborCostCents = Math.round(laborHours * laborRateDollars * 100)
  const travelCostCents = Math.round(travelMiles * 72.5)
  const equipCostCents = includeEquipment ? equipmentCostDollars * 100 : 0
  const directCosts = estimatedFoodCents + laborCostCents + travelCostCents + equipCostCents
  const overheadEst = Math.round(directCosts * (overheadPercent / 100))
  const subtotalEst = directCosts + overheadEst
  const profitEst = Math.round(subtotalEst * (profitMarginPercent / 100))
  const runningTotal = subtotalEst + profitEst

  // Search recipes
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 1) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const results = await searchRecipesForBid(query)
      setSearchResults(results)
    } catch {
      // preserve previous results so user doesn't lose context
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Load all recipes on mount for browsing
  useEffect(() => {
    searchRecipesForBid('')
      .then(setSearchResults)
      .catch((err) => {
        console.error('[catering-bid] Search failed:', err)
      })
    // Hydrate labor rate and overhead from chef pricing config
    getPricingConfig()
      .then((config) => {
        if (config.hourly_rate_cents != null && config.hourly_rate_cents > 0) {
          setLaborRateDollars(config.hourly_rate_cents / 100)
        }
        if (config.overhead_percent != null && config.overhead_percent > 0) {
          setOverheadPercent(config.overhead_percent)
        }
      })
      .catch(() => {
        /* keep defaults */
      })
  }, [])

  const addRecipe = (result: SearchResult) => {
    if (selectedRecipes.some((r) => r.recipeId === result.id)) return
    setSelectedRecipes((prev) => [
      ...prev,
      {
        recipeId: result.id,
        name: result.name,
        servings: guestCount,
        category: result.category,
        costPerPortionCents: result.costPerPortionCents,
        yieldQuantity: result.yieldQuantity,
      },
    ])
  }

  const removeRecipe = (recipeId: string) => {
    setSelectedRecipes((prev) => prev.filter((r) => r.recipeId !== recipeId))
  }

  const updateServings = (recipeId: string, servings: number) => {
    setSelectedRecipes((prev) =>
      prev.map((r) => (r.recipeId === recipeId ? { ...r, servings } : r))
    )
  }

  // Generate bid
  const handleGenerateBid = () => {
    setError(null)
    const params: GenerateBidParams = {
      guestCount,
      courses: selectedRecipes.map((r) => ({
        recipeId: r.recipeId,
        servings: r.servings,
      })),
      laborHours,
      laborRateCents: laborRateDollars * 100,
      overheadPercent,
      profitMarginPercent,
      includeEquipment,
      equipmentCostCents: equipmentCostDollars * 100,
      travelMiles,
    }

    startTransition(async () => {
      try {
        const result = await generateCateringBid(params)
        setBidResult(result)
        setStep(4)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate bid')
      }
    })
  }

  // Save draft to localStorage
  const saveDraft = () => {
    const draft = {
      bidName,
      guestCount,
      selectedRecipes,
      laborHours,
      laborRateDollars,
      overheadPercent,
      profitMarginPercent,
      travelMiles,
      includeEquipment,
      equipmentCostDollars,
      savedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // localStorage not available
    }
  }

  // Load draft from localStorage
  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) return false
      const draft = JSON.parse(raw)
      setBidName(draft.bidName || '')
      setGuestCount(draft.guestCount || 10)
      setSelectedRecipes(draft.selectedRecipes || [])
      setLaborHours(draft.laborHours || 8)
      setLaborRateDollars(draft.laborRateDollars || 35)
      setOverheadPercent(draft.overheadPercent || 15)
      setProfitMarginPercent(draft.profitMarginPercent || 20)
      setTravelMiles(draft.travelMiles || 0)
      setIncludeEquipment(draft.includeEquipment || false)
      setEquipmentCostDollars(draft.equipmentCostDollars || 0)
      return true
    } catch {
      return false
    }
  }

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return guestCount > 0
      case 1:
        return selectedRecipes.length > 0
      case 2:
        return laborHours >= 0 && laborRateDollars >= 0
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => {
              if (i < step || (i === 4 && bidResult)) setStep(i)
            }}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm whitespace-nowrap transition-colors ${
              i === step
                ? 'bg-orange-600 text-white'
                : i < step
                  ? 'bg-orange-100 text-orange-700 cursor-pointer hover:bg-orange-200'
                  : 'bg-gray-100 text-gray-400'
            }`}
          >
            <span className="font-medium">{i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Running total bar */}
      {step < 4 && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 border">
          <span className="text-sm text-gray-600">Running estimate</span>
          <div className="text-right">
            <span className="text-lg font-semibold">{formatCurrency(runningTotal)}</span>
            {guestCount > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({formatCurrency(Math.round(runningTotal / guestCount))}/person)
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {/* Step 0: Event Setup */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bid-name">Bid Name (optional)</Label>
              <Input
                id="bid-name"
                value={bidName}
                onChange={(e) => setBidName(e.target.value)}
                placeholder="e.g., Johnson Wedding Reception"
              />
            </div>
            <div>
              <Label htmlFor="guest-count">Guest Count</Label>
              <Input
                id="guest-count"
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  if (loadDraft()) {
                    setStep(0)
                  }
                }}
              >
                Load Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select Recipes */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Select Recipes <Badge variant="info">{selectedRecipes.length} selected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div>
              <Label htmlFor="recipe-search">Search your recipe book</Label>
              <Input
                id="recipe-search"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Type to search..."
              />
            </div>

            {/* Search results */}
            {isSearching && <p className="text-sm text-gray-500">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                {searchResults
                  .filter((r) => !selectedRecipes.some((sr) => sr.recipeId === r.id))
                  .map((result) => (
                    <button
                      key={result.id}
                      onClick={() => addRecipe(result)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-medium">{result.name}</span>
                        <span className="ml-2 text-gray-500">{result.category}</span>
                      </div>
                      {result.costPerPortionCents != null && (
                        <span className="text-gray-500">
                          {formatCurrency(result.costPerPortionCents)}/portion
                        </span>
                      )}
                      {!result.hasAllPrices && <Badge variant="warning">Incomplete pricing</Badge>}
                    </button>
                  ))}
              </div>
            )}

            {/* Selected recipes */}
            {selectedRecipes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Selected courses</h4>
                {selectedRecipes.map((recipe) => (
                  <div
                    key={recipe.recipeId}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{recipe.name}</p>
                      <p className="text-xs text-gray-500">
                        {recipe.category}
                        {recipe.costPerPortionCents != null &&
                          ` - ${formatCurrency(recipe.costPerPortionCents)}/portion`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`servings-${recipe.recipeId}`} className="text-xs">
                        Servings
                      </Label>
                      <Input
                        id={`servings-${recipe.recipeId}`}
                        type="number"
                        min={1}
                        value={recipe.servings}
                        onChange={(e) =>
                          updateServings(
                            recipe.recipeId,
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-20"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => removeRecipe(recipe.recipeId)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {selectedRecipes.length === 0 && (
              <p className="text-sm text-gray-500">
                Search and select recipes from your recipe book to include in this bid.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Labor & Overhead */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Labor & Overhead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="labor-hours">Labor Hours</Label>
                <Input
                  id="labor-hours"
                  type="number"
                  min={0}
                  step={0.5}
                  value={laborHours}
                  onChange={(e) => setLaborHours(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div>
                <Label htmlFor="labor-rate">Hourly Rate ($)</Label>
                <Input
                  id="labor-rate"
                  type="number"
                  min={0}
                  value={laborRateDollars}
                  onChange={(e) =>
                    setLaborRateDollars(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">Labor cost: {formatCurrency(laborCostCents)}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="overhead-pct">Overhead %</Label>
                <Input
                  id="overhead-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={overheadPercent}
                  onChange={(e) =>
                    setOverheadPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
                  }
                />
                <p className="text-xs text-gray-400 mt-1">
                  Applied to all direct costs (food + labor + travel + equipment)
                </p>
              </div>
              <div>
                <Label htmlFor="profit-pct">Markup %</Label>
                <Input
                  id="profit-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={profitMarginPercent}
                  onChange={(e) =>
                    setProfitMarginPercent(
                      Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                    )
                  }
                />
                <p className="text-xs text-gray-400 mt-1">Applied after overhead</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Travel & Equipment */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Travel & Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="travel-miles">Travel Distance (miles)</Label>
              <Input
                id="travel-miles"
                type="number"
                min={0}
                value={travelMiles}
                onChange={(e) => setTravelMiles(Math.max(0, parseFloat(e.target.value) || 0))}
              />
              <p className="text-xs text-gray-400 mt-1">
                Reimbursed at 72.5 cents/mile (2026 IRS rate)
                {travelMiles > 0 && (
                  <span className="ml-1 font-medium">= {formatCurrency(travelCostCents)}</span>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeEquipment}
                  onChange={(e) => setIncludeEquipment(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Include equipment costs</span>
              </label>
              {includeEquipment && (
                <div>
                  <Label htmlFor="equipment-cost">Equipment Cost ($)</Label>
                  <Input
                    id="equipment-cost"
                    type="number"
                    min={0}
                    value={equipmentCostDollars}
                    onChange={(e) =>
                      setEquipmentCostDollars(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && bidResult && (
        <CateringBidSummary
          result={bidResult}
          guestCount={guestCount}
          bidName={bidName}
          onQuoteCreated={(quoteId) => {
            clearDraft()
            onQuoteCreated?.(quoteId)
          }}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {step > 0 && step < 4 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step < 4 && (
            <Button variant="secondary" onClick={saveDraft}>
              Save Draft
            </Button>
          )}
          {step < 3 && (
            <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
            </Button>
          )}
          {step === 3 && (
            <Button
              variant="primary"
              onClick={handleGenerateBid}
              disabled={isPending || selectedRecipes.length === 0}
            >
              {isPending ? 'Calculating...' : 'Generate Bid'}
            </Button>
          )}
          {step === 4 && (
            <Button
              variant="ghost"
              onClick={() => {
                setBidResult(null)
                setStep(0)
              }}
            >
              Start New Bid
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
