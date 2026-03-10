'use client'

// Module Discovery Grid - browse all available modules grouped by the 6 universal dimensions.
// Search, filter, and toggle modules on/off with optimistic UI and rollback on failure.

import { useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Search,
  Utensils,
  Truck,
  Clock,
  Wallet,
  Users,
  ShieldCheck,
  BookOpen,
  UtensilsCrossed,
  LayoutGrid,
  Timer,
  Grid3X3,
  Monitor,
  MapPin,
  Warehouse,
  Calendar,
  CheckSquare,
  FileText,
  Receipt,
  DollarSign,
  Users2,
  Inbox,
  Heart,
  MessageSquare,
  MessageCircle,
  ShieldAlert,
  Thermometer,
  FileCheck,
  GraduationCap,
  Package,
} from '@/components/ui/icons'
import type { Icon } from '@phosphor-icons/react'
import { toggleDiscoveryModule } from '@/lib/archetypes/discovery-actions'
import type { DimensionGroup, CatalogModuleWithState } from '@/lib/archetypes/discovery-actions'
import type { DimensionId } from '@/lib/archetypes/module-catalog'
import { ARCHETYPES } from '@/lib/archetypes/presets'

// Map icon names to actual icon components
const ICON_MAP: Record<string, Icon> = {
  Utensils,
  Truck,
  Clock,
  Wallet,
  Users,
  ShieldCheck,
  BookOpen,
  UtensilsCrossed,
  LayoutGrid,
  Timer,
  Grid3X3,
  Monitor,
  MapPin,
  Warehouse,
  Calendar,
  CheckSquare,
  FileText,
  Receipt,
  DollarSign,
  Users2,
  Inbox,
  Heart,
  MessageSquare,
  MessageCircle,
  ShieldAlert,
  Thermometer,
  FileCheck,
  GraduationCap,
  Package,
}

// Dimension accent colors for visual grouping
const DIMENSION_COLORS: Record<
  DimensionId,
  { border: string; bg: string; text: string; badge: string }
> = {
  production: {
    border: 'border-amber-600/40',
    bg: 'bg-amber-950/20',
    text: 'text-amber-400',
    badge: 'bg-amber-900/40 text-amber-300',
  },
  movement: {
    border: 'border-blue-600/40',
    bg: 'bg-blue-950/20',
    text: 'text-blue-400',
    badge: 'bg-blue-900/40 text-blue-300',
  },
  time: {
    border: 'border-violet-600/40',
    bg: 'bg-violet-950/20',
    text: 'text-violet-400',
    badge: 'bg-violet-900/40 text-violet-300',
  },
  money: {
    border: 'border-emerald-600/40',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-400',
    badge: 'bg-emerald-900/40 text-emerald-300',
  },
  people: {
    border: 'border-pink-600/40',
    bg: 'bg-pink-950/20',
    text: 'text-pink-400',
    badge: 'bg-pink-900/40 text-pink-300',
  },
  compliance: {
    border: 'border-red-600/40',
    bg: 'bg-red-950/20',
    text: 'text-red-400',
    badge: 'bg-red-900/40 text-red-300',
  },
}

type Props = {
  initialGroups: DimensionGroup[]
}

export function ModuleDiscoveryGrid({ initialGroups }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Count enabled modules
  const { enabledCount, totalCount } = useMemo(() => {
    let enabled = 0
    let total = 0
    for (const group of groups) {
      for (const mod of group.modules) {
        total++
        if (mod.enabled) enabled++
      }
    }
    return { enabledCount: enabled, totalCount: total }
  }, [groups])

  // Filter modules by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups
    const q = searchQuery.toLowerCase()
    return groups
      .map((group) => ({
        ...group,
        modules: group.modules.filter(
          (mod) =>
            mod.label.toLowerCase().includes(q) ||
            mod.description.toLowerCase().includes(q) ||
            group.dimension.label.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.modules.length > 0)
  }, [groups, searchQuery])

  function handleToggle(moduleKey: string, currentEnabled: boolean) {
    const newEnabled = !currentEnabled

    // Optimistic update
    const previousGroups = groups
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        modules: group.modules.map((mod) =>
          mod.key === moduleKey ? { ...mod, enabled: newEnabled } : mod
        ),
      }))
    )

    startTransition(async () => {
      try {
        const result = await toggleDiscoveryModule(moduleKey, newEnabled)
        if (!result.success) {
          // Rollback
          setGroups(previousGroups)
          toast.error(result.error || 'Failed to update module')
          return
        }
        toast.success(newEnabled ? 'Module enabled' : 'Module disabled')
      } catch (err) {
        // Rollback on failure
        setGroups(previousGroups)
        toast.error('Failed to update module')
      }
    })
  }

  function getArchetypeLabels(archetypeIds: string[]): string[] {
    return archetypeIds
      .map((id) => ARCHETYPES.find((a) => a.id === id))
      .filter(Boolean)
      .map((a) => `${a!.emoji} ${a!.label}`)
  }

  return (
    <div className="space-y-8">
      {/* Search bar and counter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-700 bg-stone-900 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div className="shrink-0 text-sm text-stone-400">
          <span className="font-semibold text-stone-200">{enabledCount}</span> of{' '}
          <span className="font-semibold text-stone-200">{totalCount}</span> modules enabled
        </div>
      </div>

      {/* Dimension groups */}
      {filteredGroups.map((group) => {
        const colors = DIMENSION_COLORS[group.dimension.id]
        const DimensionIcon = ICON_MAP[group.dimension.iconName]

        return (
          <div key={group.dimension.id} className="space-y-3">
            {/* Dimension header */}
            <div className="flex items-center gap-3">
              {DimensionIcon && (
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                  <DimensionIcon size={20} className={colors.text} />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-stone-100">{group.dimension.label}</h2>
                <p className="text-xs text-stone-500">{group.dimension.description}</p>
              </div>
            </div>

            {/* Module cards grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.modules.map((mod) => {
                const ModIcon = ICON_MAP[mod.iconName]
                const archetypeLabels = getArchetypeLabels(mod.defaultArchetypes)
                const hasSlug = !!mod.moduleSlug

                return (
                  <div
                    key={mod.key}
                    className={`rounded-xl border p-4 transition-colors ${
                      mod.enabled
                        ? `${colors.border} ${colors.bg}`
                        : 'border-stone-700/50 bg-stone-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {ModIcon && (
                          <ModIcon
                            size={18}
                            className={`mt-0.5 shrink-0 ${mod.enabled ? colors.text : 'text-stone-500'}`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-stone-100">{mod.label}</h3>
                          <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                            {mod.description}
                          </p>
                          {/* Archetype badges */}
                          {archetypeLabels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {archetypeLabels.map((label) => (
                                <span
                                  key={label}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-400"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Toggle switch */}
                      {hasSlug ? (
                        <button
                          onClick={() => handleToggle(mod.key, mod.enabled)}
                          disabled={isPending}
                          className={`relative shrink-0 h-8 w-12 rounded-full transition-colors disabled:opacity-50 ${
                            mod.enabled ? 'bg-brand-500' : 'bg-stone-600'
                          }`}
                          aria-label={`Toggle ${mod.label}`}
                        >
                          <span
                            className={`absolute left-0.5 top-0.5 h-7 w-7 rounded-full bg-stone-900 shadow transition-transform ${
                              mod.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider shrink-0 mt-1">
                          Coming soon
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* No results */}
      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <Search size={32} className="mx-auto text-stone-600 mb-3" />
          <p className="text-stone-400">No modules match your search.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-brand-400 text-sm mt-2 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {isPending && <p className="text-xs text-stone-400 animate-pulse">Saving...</p>}
    </div>
  )
}
