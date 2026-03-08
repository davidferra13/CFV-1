// Pricing Calculator - helps chefs determine what to charge
'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Calculator, DollarSign, TrendingUp, ArrowLeft, Lightbulb, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import {
  calculatePricing,
  formatCents,
  EVENT_TYPE_LABELS,
  EXPERIENCE_LABELS,
  MARKET_LABELS,
  type EventType,
  type ExperienceLevel,
  type MarketArea,
  type PricingOutput,
} from '@/lib/finance/pricing-calculator'

export default function PricingCalculatorPage() {
  // Input state
  const [guestCount, setGuestCount] = useState(10)
  const [courses, setCourses] = useState(4)
  const [ingredientCost, setIngredientCost] = useState('200')
  const [prepHours, setPrepHours] = useState('3')
  const [cookingHours, setCookingHours] = useState('2')
  const [cleanupHours, setCleanupHours] = useState('0.5')
  const [travelMiles, setTravelMiles] = useState('20')
  const [eventType, setEventType] = useState<EventType>('dinner-party')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('established')
  const [marketArea, setMarketArea] = useState<MarketArea>('suburban')

  // Calculate in real time
  const result: PricingOutput = useMemo(() => {
    return calculatePricing({
      guestCount: Math.max(1, guestCount),
      courses: Math.max(1, Math.min(7, courses)),
      estimatedIngredientCostCents: Math.round((parseFloat(ingredientCost) || 0) * 100),
      prepHours: parseFloat(prepHours) || 0,
      cookingHours: parseFloat(cookingHours) || 0,
      cleanupHours: parseFloat(cleanupHours) || 0,
      travelMiles: parseFloat(travelMiles) || 0,
      eventType,
      experienceLevel,
      marketArea,
    })
  }, [guestCount, courses, ingredientCost, prepHours, cookingHours, cleanupHours, travelMiles, eventType, experienceLevel, marketArea])

  const breakdownTotal =
    result.breakdown.ingredientCostCents +
    result.breakdown.laborCostCents +
    result.breakdown.travelCostCents +
    result.breakdown.overheadCents +
    result.breakdown.profitMarginCents

  function barWidth(cents: number) {
    if (breakdownTotal === 0) return '0%'
    return `${Math.max(2, (cents / breakdownTotal) * 100)}%`
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/financials"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Finance
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Calculator className="h-6 w-6" />
          Pricing Calculator
        </h1>
        <p className="mt-1 text-muted-foreground">
          Figure out what to charge based on your costs, time, and market.
          All calculations happen locally, nothing is saved.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* LEFT: Inputs */}
        <div className="space-y-6">
          {/* Guest Count */}
          <Card className="p-4">
            <label className="mb-2 block text-sm font-medium">
              Guest Count: <span className="text-lg font-bold text-primary">{guestCount}</span>
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </Card>

          {/* Courses */}
          <Card className="p-4">
            <label className="mb-2 block text-sm font-medium">Number of Courses</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((c) => (
                <Button
                  key={c}
                  variant={courses === c ? 'primary' : 'ghost'}
                  className="h-10 w-10 p-0"
                  onClick={() => setCourses(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </Card>

          {/* Ingredient Cost */}
          <Card className="p-4">
            <label className="mb-2 block text-sm font-medium">Estimated Ingredient Cost ($)</label>
            <Input
              type="number"
              min={0}
              step={10}
              value={ingredientCost}
              onChange={(e) => setIngredientCost(e.target.value)}
              placeholder="Total ingredient cost for this event"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Raw ingredient cost. The calculator applies a 3x markup (industry standard 33% food cost ratio).
            </p>
          </Card>

          {/* Hours */}
          <Card className="p-4">
            <label className="mb-3 block text-sm font-medium">Time (hours)</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Prep</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={prepHours}
                  onChange={(e) => setPrepHours(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Cooking</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={cookingHours}
                  onChange={(e) => setCookingHours(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Cleanup</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={cleanupHours}
                  onChange={(e) => setCleanupHours(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Travel */}
          <Card className="p-4">
            <label className="mb-2 block text-sm font-medium">Travel Distance (miles, round trip)</label>
            <Input
              type="number"
              min={0}
              step={5}
              value={travelMiles}
              onChange={(e) => setTravelMiles(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Calculated at $0.67/mile (2026 IRS mileage rate).
            </p>
          </Card>

          {/* Event Type */}
          <Card className="p-4">
            <label className="mb-2 block text-sm font-medium">Event Type</label>
            <Select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
            >
              {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Card>

          {/* Experience Level */}
          <Card className="p-4">
            <label className="mb-3 block text-sm font-medium">Your Experience Level</label>
            <div className="space-y-2">
              {(Object.entries(EXPERIENCE_LABELS) as [ExperienceLevel, { label: string; description: string }][]).map(
                ([value, { label, description }]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      experienceLevel === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="experience"
                      value={value}
                      checked={experienceLevel === value}
                      onChange={() => setExperienceLevel(value)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                  </label>
                )
              )}
            </div>
          </Card>

          {/* Market Area */}
          <Card className="p-4">
            <label className="mb-3 block text-sm font-medium">Market Area</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(MARKET_LABELS) as [MarketArea, { label: string; description: string }][]).map(
                ([value, { label, description }]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer flex-col rounded-lg border p-3 text-center transition-colors ${
                      marketArea === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="market"
                      value={value}
                      checked={marketArea === value}
                      onChange={() => setMarketArea(value)}
                      className="sr-only"
                    />
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </label>
                )
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT: Output */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Price Range */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 p-6">
            <div className="mb-1 text-sm font-medium text-muted-foreground">Charge</div>
            <div className="text-3xl font-bold text-primary">
              {formatCents(result.rangeLowCents)} - {formatCents(result.rangeHighCents)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                Recommended: {formatCents(result.recommendedPriceCents)}
              </span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {formatCents(result.perGuestCents)} per guest
            </div>
          </Card>

          {/* Breakdown */}
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Cost Breakdown
            </h3>
            <div className="space-y-3">
              <BreakdownBar
                label="Ingredients (3x markup)"
                cents={result.breakdown.ingredientCostCents}
                width={barWidth(result.breakdown.ingredientCostCents)}
                color="bg-emerald-500"
              />
              <BreakdownBar
                label="Labor"
                cents={result.breakdown.laborCostCents}
                width={barWidth(result.breakdown.laborCostCents)}
                color="bg-blue-500"
              />
              <BreakdownBar
                label="Travel"
                cents={result.breakdown.travelCostCents}
                width={barWidth(result.breakdown.travelCostCents)}
                color="bg-amber-500"
              />
              <BreakdownBar
                label="Overhead (15-20%)"
                cents={result.breakdown.overheadCents}
                width={barWidth(result.breakdown.overheadCents)}
                color="bg-purple-500"
              />
              <BreakdownBar
                label="Profit Margin"
                cents={result.breakdown.profitMarginCents}
                width={barWidth(result.breakdown.profitMarginCents)}
                color="bg-rose-500"
              />
            </div>
          </Card>

          {/* Effective Rate */}
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Effective Hourly Rate
              </h3>
            </div>
            <div className="mt-2 text-3xl font-bold">
              ${result.hourlyEffectiveRate.toFixed(0)}<span className="text-lg text-muted-foreground">/hr</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              What you actually earn per hour, factoring in all prep, cooking, and cleanup time.
            </p>
          </Card>

          {/* Insights */}
          {result.insights.length > 0 && (
            <Card className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Insights
                </h3>
              </div>
              <ul className="space-y-2">
                {result.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {insight}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Quick link to create a quote */}
          <Card className="p-4">
            <Link
              href="/quotes/new"
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Ready to quote? Create a new quote with these numbers in mind.
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}

function BreakdownBar({
  label,
  cents,
  width,
  color,
}: {
  label: string
  cents: number
  width: string
  color: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{formatCents(cents)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width }} />
      </div>
    </div>
  )
}
