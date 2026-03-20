'use client'

// MenuContextSidebar - Shows client dietary info, past menus, matching templates,
// inventory stock levels, and allergen validation warnings.
// Appears alongside the menu editor to give chefs context while building menus.
// Respects per-operator menu_engine_features toggles from chef_preferences.

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  getMenuContextData,
  getMenuIngredientStock,
  validateMenuAllergens,
  checkMenuScaleMismatch,
  getMenuInquiryLink,
  getMenuSeasonalWarnings,
  getMenuPerformance,
  getMenuClientTaste,
  getMenuPrepEstimate,
  getMenuVendorHints,
  checkMenuBudgetCompliance,
  detectMenuDietaryConflicts,
} from '@/lib/menus/menu-intelligence-actions'
import type {
  MenuIngredientStock,
  MenuAllergenWarning,
  SeasonalIngredientWarning,
  MenuPerformanceHistory,
  MenuClientTasteSummary,
  MenuPrepEstimate,
  MenuVendorHint,
  BudgetComplianceResult,
  DietaryConflict,
} from '@/lib/menus/menu-intelligence-actions'
import type { MenuEngineFeatures } from '@/lib/scheduling/types'
import { DEFAULT_MENU_ENGINE_FEATURES, MENU_ENGINE_FEATURE_KEYS } from '@/lib/scheduling/types'
import Link from 'next/link'

interface MenuContextSidebarProps {
  menuId: string
  className?: string
  features?: MenuEngineFeatures
}

export function MenuContextSidebar({
  menuId,
  className = '',
  features = DEFAULT_MENU_ENGINE_FEATURES,
}: MenuContextSidebarProps) {
  const [isPending, startTransition] = useTransition()
  const [context, setContext] = useState<Awaited<ReturnType<typeof getMenuContextData>> | null>(
    null
  )
  const [stock, setStock] = useState<MenuIngredientStock[]>([])
  const [allergenData, setAllergenData] = useState<{
    warnings: MenuAllergenWarning[]
    clientName: string | null
  } | null>(null)
  const [scaleMismatch, setScaleMismatch] = useState<{
    menuGuestCount: number
    eventGuestCount: number
    eventName: string | null
  } | null>(null)
  const [inquiryLink, setInquiryLink] = useState<{
    inquiryId: string
    inquiryStatus: string | null
  } | null>(null)
  const [seasonalWarnings, setSeasonalWarnings] = useState<SeasonalIngredientWarning[]>([])
  const [performance, setPerformance] = useState<MenuPerformanceHistory | null>(null)
  const [clientTaste, setClientTaste] = useState<MenuClientTasteSummary | null>(null)
  const [prepEstimate, setPrepEstimate] = useState<MenuPrepEstimate | null>(null)
  const [vendorHintCount, setVendorHintCount] = useState(0)
  const [budgetCompliance, setBudgetCompliance] = useState<BudgetComplianceResult | null>(null)
  const [dietaryConflicts, setDietaryConflicts] = useState<{
    conflicts: DietaryConflict[]
    clientName: string | null
  } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        // Always fetch core context data (season, guest tier, client, previous menus, templates)
        const fetches: Promise<unknown>[] = [getMenuContextData(menuId)]

        // Conditionally fetch based on enabled features
        fetches.push(
          features.stock_alerts
            ? getMenuIngredientStock(menuId).catch(() => [])
            : Promise.resolve([])
        )
        fetches.push(
          features.allergen_validation
            ? validateMenuAllergens(menuId).catch(() => null)
            : Promise.resolve(null)
        )
        fetches.push(
          features.scale_mismatch
            ? checkMenuScaleMismatch(menuId).catch(() => null)
            : Promise.resolve(null)
        )
        fetches.push(
          features.inquiry_link
            ? getMenuInquiryLink(menuId).catch(() => null)
            : Promise.resolve(null)
        )
        fetches.push(
          features.seasonal_warnings
            ? getMenuSeasonalWarnings(menuId).catch(() => [])
            : Promise.resolve([])
        )
        fetches.push(
          features.menu_history
            ? getMenuPerformance(menuId).catch(() => null)
            : Promise.resolve(null)
        )
        fetches.push(
          features.client_taste
            ? getMenuClientTaste(menuId).catch(() => null)
            : Promise.resolve(null)
        )
        fetches.push(
          features.prep_estimate
            ? getMenuPrepEstimate(menuId).catch(() => null)
            : Promise.resolve(null)
        )
        fetches.push(
          features.vendor_hints ? getMenuVendorHints(menuId).catch(() => []) : Promise.resolve([])
        )
        fetches.push(
          features.budget_compliance
            ? checkMenuBudgetCompliance(menuId).catch(() => null)
            : Promise.resolve(null)
        )
        fetches.push(
          features.dietary_conflicts
            ? detectMenuDietaryConflicts(menuId).catch(() => null)
            : Promise.resolve(null)
        )

        const [
          data,
          stockData,
          allergens,
          mismatch,
          inquiry,
          seasonal,
          perf,
          taste,
          prep,
          vendorHintsData,
          budget,
          dietaryConflictsData,
        ] = await Promise.all(fetches)

        setContext(data as Awaited<ReturnType<typeof getMenuContextData>>)
        setStock(stockData as MenuIngredientStock[])
        setAllergenData(
          allergens as { warnings: MenuAllergenWarning[]; clientName: string | null } | null
        )
        setScaleMismatch(
          mismatch as {
            menuGuestCount: number
            eventGuestCount: number
            eventName: string | null
          } | null
        )
        setInquiryLink(inquiry as { inquiryId: string; inquiryStatus: string | null } | null)
        setSeasonalWarnings(seasonal as SeasonalIngredientWarning[])
        setPerformance(perf as MenuPerformanceHistory | null)
        setClientTaste(taste as MenuClientTasteSummary | null)
        setPrepEstimate(prep as MenuPrepEstimate | null)
        setVendorHintCount((vendorHintsData as MenuVendorHint[]).length)
        setBudgetCompliance(budget as BudgetComplianceResult | null)
        setDietaryConflicts(
          dietaryConflictsData as {
            conflicts: DietaryConflict[]
            clientName: string | null
          } | null
        )
        setLoadError(null)
      } catch (err) {
        console.error('[MenuContextSidebar] Failed to load:', err)
        setLoadError('Could not load context')
      }
    })
  }, [menuId, features])

  if (loadError) {
    return (
      <div className={`rounded-lg border border-red-500/30 bg-red-500/10 p-3 ${className}`}>
        <p className="text-xs text-red-300">{loadError}</p>
      </div>
    )
  }

  if (!context && isPending) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-stone-700 rounded w-2/3" />
          <div className="h-3 bg-stone-700 rounded w-full" />
          <div className="h-3 bg-stone-700 rounded w-4/5" />
        </div>
      </div>
    )
  }

  if (!context) return null

  const hasDietary = context.clientDietary.length > 0 || context.clientAllergies.length > 0
  const hasPreviousMenus = context.previousMenus.length > 0
  const hasTemplates = context.matchingTemplates.length > 0
  const stockIssues = stock.filter((s) => s.status !== 'ok')
  const allergenWarnings = allergenData?.warnings || []
  const hasAnyContent =
    hasDietary ||
    hasPreviousMenus ||
    hasTemplates ||
    stockIssues.length > 0 ||
    allergenWarnings.length > 0 ||
    scaleMismatch ||
    inquiryLink ||
    seasonalWarnings.length > 0 ||
    performance ||
    clientTaste ||
    prepEstimate ||
    vendorHintCount > 0 ||
    budgetCompliance ||
    (dietaryConflicts && dietaryConflicts.conflicts.length > 0)

  if (!hasAnyContent) {
    const disabledCount = MENU_ENGINE_FEATURE_KEYS.filter((k) => !features[k]).length
    const allDisabled = disabledCount === MENU_ENGINE_FEATURE_KEYS.length

    if (allDisabled) {
      return (
        <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
          <p className="text-xs text-stone-500">All menu intelligence features are disabled.</p>
          <Link
            href="/settings/menu-engine"
            className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block"
          >
            Configure features
          </Link>
        </div>
      )
    }

    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <p className="text-xs text-stone-500">
          No additional context available. Link this menu to an event with a client to see dietary
          preferences, past menus, and template suggestions.
        </p>
        {disabledCount > 0 && (
          <p className="text-xxs text-stone-600 mt-2">
            {disabledCount} feature{disabledCount !== 1 ? 's' : ''} disabled.{' '}
            <Link href="/settings/menu-engine" className="text-brand-400 hover:text-brand-300">
              Configure
            </Link>
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border border-stone-700 bg-stone-800/50 divide-y divide-stone-700 ${className}`}
    >
      {/* Scale mismatch alert */}
      {features.scale_mismatch && scaleMismatch && (
        <div className="px-4 py-3 bg-amber-500/10">
          <p className="text-xs text-amber-400 font-medium mb-1">Guest Count Mismatch</p>
          <p className="text-xxs text-stone-400">
            Menu targets {scaleMismatch.menuGuestCount} guests, but{' '}
            {scaleMismatch.eventName || 'the event'} has {scaleMismatch.eventGuestCount}. Use the
            scale dialog to match.
          </p>
        </div>
      )}

      {/* Allergen validation warnings */}
      {features.allergen_validation && allergenWarnings.length > 0 && (
        <div className="px-4 py-3 bg-red-500/10">
          <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">
            Allergen Conflicts ({allergenWarnings.length})
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {allergenWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Badge
                  variant={w.severity === 'critical' ? 'error' : 'warning'}
                  className="text-xxs shrink-0"
                >
                  {w.severity === 'critical' ? '!!!' : '!'}
                </Badge>
                <p className="text-xxs text-stone-300">
                  <span className="font-medium">{w.ingredientName}</span> in {w.dishName} conflicts
                  with <span className="text-red-300">{w.allergen}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget compliance check */}
      {features.budget_compliance && budgetCompliance && (
        <div
          className={`px-4 py-3 ${
            budgetCompliance.status === 'critical'
              ? 'bg-red-500/10'
              : budgetCompliance.status === 'warning'
                ? 'bg-amber-500/10'
                : ''
          }`}
        >
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
            Budget Check
          </h4>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-sm font-bold ${
                budgetCompliance.status === 'critical'
                  ? 'text-red-400'
                  : budgetCompliance.status === 'warning'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {budgetCompliance.marginPercent.toFixed(1)}% food cost
            </span>
            <Badge
              variant={
                budgetCompliance.status === 'critical'
                  ? 'error'
                  : budgetCompliance.status === 'warning'
                    ? 'warning'
                    : 'success'
              }
            >
              {budgetCompliance.status}
            </Badge>
          </div>
          <p className="text-xxs text-stone-500 mt-1">
            Cost: ${(budgetCompliance.totalCostCents / 100).toFixed(2)} / Quoted: $
            {(budgetCompliance.quotedPriceCents / 100).toFixed(2)}
          </p>
        </div>
      )}

      {/* Active dietary conflict detection */}
      {features.dietary_conflicts && dietaryConflicts && dietaryConflicts.conflicts.length > 0 && (
        <div className="px-4 py-3 bg-amber-500/10">
          <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">
            Taste Conflicts ({dietaryConflicts.conflicts.length})
          </h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {dietaryConflicts.conflicts.map((c, i) => (
              <div key={i} className="text-xxs text-stone-300">
                <span className="font-medium text-amber-300">{c.ingredientName}</span> in{' '}
                {c.dishName}
                <p className="text-stone-500 mt-0.5">
                  {dietaryConflicts.clientName} marked &quot;{c.clientPreference}&quot; as disliked
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seasonal ingredient warnings */}
      {features.seasonal_warnings && seasonalWarnings.length > 0 && (
        <div className="px-4 py-3 bg-amber-500/10">
          <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">
            Seasonal Alerts ({seasonalWarnings.length})
          </h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {seasonalWarnings.map((w, i) => (
              <div key={i} className="text-xxs text-stone-300">
                <span className="font-medium text-amber-300">{w.ingredientName}</span> in{' '}
                {w.dishName}
                <p className="text-stone-500 mt-0.5">{w.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prep time estimate */}
      {features.prep_estimate && prepEstimate && (
        <div className="px-4 py-3">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
            Prep Estimate
          </h4>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-stone-200">
              {Math.round((prepEstimate.estimatedTotalMinutes / 60) * 10) / 10}h
            </span>
            <span className="text-xxs text-stone-500">total estimated</span>
          </div>
          <div className="flex gap-3 mt-1 text-xxs text-stone-500">
            <span>Prep: {Math.round(prepEstimate.estimatedPrepMinutes)}m</span>
            <span>Service: {Math.round(prepEstimate.estimatedServiceMinutes)}m</span>
          </div>
          <div className="mt-1">
            <Badge
              variant={
                prepEstimate.confidence === 'high'
                  ? 'success'
                  : prepEstimate.confidence === 'medium'
                    ? 'warning'
                    : 'default'
              }
            >
              {prepEstimate.confidence} confidence ({prepEstimate.basedOnEvents} events)
            </Badge>
          </div>
        </div>
      )}

      {/* Client taste profile */}
      {features.client_taste &&
        clientTaste &&
        (clientTaste.loved.length > 0 || clientTaste.disliked.length > 0) && (
          <div className="px-4 py-3 space-y-2">
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
              {clientTaste.clientName}&apos;s Preferences
            </h4>
            {clientTaste.cuisinePreferences.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {clientTaste.cuisinePreferences.map((c) => (
                  <Badge key={c} variant="info">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
            {clientTaste.loved.length > 0 && (
              <div>
                <p className="text-xxs text-emerald-400 font-medium mb-1">Loved</p>
                <div className="flex flex-wrap gap-1">
                  {clientTaste.loved.map((item) => (
                    <Badge key={item} variant="success">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {clientTaste.disliked.length > 0 && (
              <div>
                <p className="text-xxs text-red-400 font-medium mb-1">Avoid</p>
                <div className="flex flex-wrap gap-1">
                  {clientTaste.disliked.map((item) => (
                    <Badge key={item} variant="error">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {clientTaste.pastEventCount > 0 && (
              <p className="text-xxs text-stone-500">
                {clientTaste.pastEventCount} past event{clientTaste.pastEventCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

      {/* Menu performance history */}
      {features.menu_history && performance && (
        <div className="px-4 py-3 space-y-1.5">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Menu History
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xxs">
            <div>
              <span className="text-stone-500">Times used</span>
              <p className="text-stone-200 font-medium">{performance.timesUsed}</p>
            </div>
            {performance.avgMarginPercent !== null && (
              <div>
                <span className="text-stone-500">Avg margin</span>
                <p
                  className={`font-medium ${
                    performance.avgMarginPercent >= 60
                      ? 'text-emerald-400'
                      : performance.avgMarginPercent >= 40
                        ? 'text-stone-200'
                        : 'text-amber-400'
                  }`}
                >
                  {performance.avgMarginPercent}%
                </p>
              </div>
            )}
          </div>
          {performance.lastUsedDate && (
            <p className="text-xxs text-stone-500">
              Last:{' '}
              {new Date(performance.lastUsedDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {performance.lastUsedClient && ` for ${performance.lastUsedClient}`}
            </p>
          )}
          {performance.lastUsedEventId && (
            <Link
              href={`/events/${performance.lastUsedEventId}`}
              className="text-xxs text-stone-500 hover:text-stone-300 transition-colors"
            >
              View last event →
            </Link>
          )}
        </div>
      )}

      {/* Inquiry link */}
      {features.inquiry_link && inquiryLink && (
        <div className="px-4 py-2">
          <Link
            href={`/inquiries/${inquiryLink.inquiryId}`}
            className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            <span>← Back to Inquiry</span>
            {inquiryLink.inquiryStatus && (
              <Badge variant="default">{inquiryLink.inquiryStatus.replace(/_/g, ' ')}</Badge>
            )}
          </Link>
        </div>
      )}

      {/* Season + guest tier (always shown, core context) */}
      <div className="px-4 py-3 flex items-center gap-2">
        <Badge variant="info">{context.season}</Badge>
        <Badge variant="default">{context.guestTier}</Badge>
        {context.clientName && (
          <span className="text-xs text-stone-400 ml-auto truncate max-w-[120px]">
            {context.clientName}
          </span>
        )}
      </div>

      {/* Client dietary info (always shown, core safety data) */}
      {hasDietary && (
        <div className="px-4 py-3 space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Client Dietary
          </h4>
          {context.clientAllergies.length > 0 && (
            <div>
              <p className="text-xxs text-red-400 font-medium mb-1">ALLERGIES</p>
              <div className="flex flex-wrap gap-1">
                {context.clientAllergies.map((allergy) => (
                  <Badge key={allergy} variant="error">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {context.clientDietary.length > 0 && (
            <div>
              <p className="text-xxs text-stone-500 font-medium mb-1">Restrictions</p>
              <div className="flex flex-wrap gap-1">
                {context.clientDietary.map((restriction) => (
                  <Badge key={restriction} variant="warning">
                    {restriction}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inventory stock check */}
      {features.stock_alerts && stockIssues.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Stock Alerts ({stockIssues.length})
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {stockIssues.map((item) => (
              <div
                key={item.ingredientId}
                className="flex items-center justify-between gap-2 text-xxs"
              >
                <span className="text-stone-300 truncate">{item.ingredientName}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={item.status === 'out' ? 'text-red-400' : 'text-amber-400'}>
                    {item.onHandQuantity} {item.onHandUnit || item.neededUnit}
                  </span>
                  <span className="text-stone-600">/</span>
                  <span className="text-stone-500">
                    {item.neededQuantity} {item.neededUnit}
                  </span>
                  <Badge
                    variant={item.status === 'out' ? 'error' : 'warning'}
                    className="text-xxs ml-1"
                  >
                    {item.status === 'out' ? 'OUT' : 'LOW'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/inventory"
            className="text-xxs text-stone-500 hover:text-stone-300 transition-colors"
          >
            View full inventory →
          </Link>
        </div>
      )}

      {/* Vendor hints summary (full details in cost sidebar) */}
      {features.vendor_hints && vendorHintCount > 0 && (
        <div className="px-4 py-2">
          <p className="text-xxs text-emerald-400">
            {vendorHintCount} ingredient{vendorHintCount !== 1 ? 's' : ''} with cheaper vendor
            options
          </p>
          <p className="text-xxs text-stone-500">See cost breakdown above for details.</p>
        </div>
      )}

      {/* Previous menus for this client (always shown, core context) */}
      {hasPreviousMenus && (
        <div className="px-4 py-3 space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Previously Served
          </h4>
          <div className="space-y-1">
            {context.previousMenus.map((pm) => (
              <Link
                key={pm.id}
                href={`/culinary/menus/${pm.id}`}
                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-stone-800 transition-colors text-xs group"
              >
                <span className="text-stone-300 group-hover:text-stone-100 flex-1 truncate">
                  {pm.name}
                </span>
                {pm.eventDate && (
                  <span className="text-stone-500 text-xxs">
                    {new Date(pm.eventDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
                {pm.guestCount && <span className="text-stone-600 text-xxs">{pm.guestCount}g</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Matching templates (always shown, core context) */}
      {hasTemplates && (
        <div className="px-4 py-3 space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">Templates</h4>
          <div className="space-y-1">
            {context.matchingTemplates.slice(0, 5).map((tmpl) => (
              <Link
                key={tmpl.id}
                href={`/culinary/menus/${tmpl.id}`}
                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-stone-800 transition-colors text-xs group"
              >
                <span className="text-stone-300 group-hover:text-stone-100 flex-1 truncate">
                  {tmpl.name}
                </span>
                {tmpl.serviceStyle && (
                  <Badge variant="default">{tmpl.serviceStyle.replace('_', ' ')}</Badge>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
