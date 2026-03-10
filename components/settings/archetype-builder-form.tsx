'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  saveCustomArchetype,
  resetToPreset,
  exportArchetypeConfig,
  type CustomArchetypeConfig,
} from '@/lib/archetypes/builder-actions'

// ============================================
// TYPES
// ============================================

type PresetOption = {
  id: string
  label: string
  description: string
  emoji: string
  enabledModules: string[]
  primaryNavHrefs: string[]
  mobileTabHrefs: string[]
}

type ModuleOption = {
  slug: string
  label: string
  description: string
  tier: string
  alwaysVisible: boolean
}

type NavItemOption = {
  href: string
  label: string
}

type WidgetOption = {
  id: string
  label: string
  category: string
  categoryLabel: string
}

type Props = {
  customConfig: CustomArchetypeConfig | null
  currentModules: string[]
  presets: PresetOption[]
  moduleOptions: ModuleOption[]
  navItems: NavItemOption[]
  widgetOptions: WidgetOption[]
}

// ============================================
// COMPONENT
// ============================================

export function ArchetypeBuilderForm({
  customConfig,
  currentModules,
  presets,
  moduleOptions,
  navItems,
  widgetOptions,
}: Props) {
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState(customConfig?.name || '')
  const [enabledModules, setEnabledModules] = useState<string[]>(
    customConfig?.enabledModules || currentModules
  )
  const [primaryNavHrefs, setPrimaryNavHrefs] = useState<string[]>(
    customConfig?.primaryNavHrefs || []
  )
  const [mobileTabHrefs, setMobileTabHrefs] = useState<string[]>(customConfig?.mobileTabHrefs || [])
  const [dashboardWidgets, setDashboardWidgets] = useState<string[]>(
    customConfig?.dashboardWidgets || []
  )

  // Snapshot for rollback
  const [snapshot] = useState({
    name: customConfig?.name || '',
    enabledModules: customConfig?.enabledModules || currentModules,
    primaryNavHrefs: customConfig?.primaryNavHrefs || [],
    mobileTabHrefs: customConfig?.mobileTabHrefs || [],
    dashboardWidgets: customConfig?.dashboardWidgets || [],
  })

  // Group modules by tier
  const freeModules = moduleOptions.filter((m) => m.tier === 'free')
  const proModules = moduleOptions.filter((m) => m.tier === 'pro')

  // Group widgets by category
  const widgetsByCategory = useMemo(() => {
    const groups: Record<string, { label: string; widgets: WidgetOption[] }> = {}
    for (const w of widgetOptions) {
      if (!groups[w.category]) {
        groups[w.category] = { label: w.categoryLabel, widgets: [] }
      }
      groups[w.category].widgets.push(w)
    }
    return Object.entries(groups)
  }, [widgetOptions])

  // ── Preset loading ──

  const loadPreset = useCallback(
    (presetId: string) => {
      if (presetId === '') return
      const preset = presets.find((p) => p.id === presetId)
      if (!preset) return
      setEnabledModules([...preset.enabledModules])
      setPrimaryNavHrefs([...preset.primaryNavHrefs])
      setMobileTabHrefs([...preset.mobileTabHrefs])
      setDashboardWidgets([])
      setName('')
      toast.success(`Loaded "${preset.label}" preset as starting point`)
    },
    [presets]
  )

  // ── Module toggles ──

  const toggleModule = useCallback(
    (slug: string) => {
      const mod = moduleOptions.find((m) => m.slug === slug)
      if (mod?.alwaysVisible) return // cannot toggle always-visible modules
      setEnabledModules((prev) =>
        prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
      )
    },
    [moduleOptions]
  )

  // ── Nav ordering ──

  const moveNavItem = useCallback((index: number, direction: 'up' | 'down') => {
    setPrimaryNavHrefs((prev) => {
      const next = [...prev]
      const swapIdx = direction === 'up' ? index - 1 : index + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[index], next[swapIdx]] = [next[swapIdx], next[index]]
      return next
    })
  }, [])

  const toggleNavItem = useCallback((href: string) => {
    setPrimaryNavHrefs((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    )
  }, [])

  // ── Mobile tab toggles ──

  const toggleMobileTab = useCallback((href: string) => {
    setMobileTabHrefs((prev) => {
      if (prev.includes(href)) {
        return prev.filter((h) => h !== href)
      }
      if (prev.length >= 5) {
        toast.error('Mobile tab bar can have at most 5 items')
        return prev
      }
      return [...prev, href]
    })
  }, [])

  // ── Widget toggles ──

  const toggleWidget = useCallback((id: string) => {
    setDashboardWidgets((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    )
  }, [])

  // ── Save ──

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please give your custom setup a name')
      return
    }

    const config: CustomArchetypeConfig = {
      name: name.trim(),
      enabledModules,
      primaryNavHrefs,
      mobileTabHrefs,
      dashboardWidgets,
    }

    startTransition(async () => {
      try {
        await saveCustomArchetype(config)
        toast.success('Custom archetype saved')
      } catch (err) {
        // Rollback
        setName(snapshot.name)
        setEnabledModules(snapshot.enabledModules)
        setPrimaryNavHrefs(snapshot.primaryNavHrefs)
        setMobileTabHrefs(snapshot.mobileTabHrefs)
        setDashboardWidgets(snapshot.dashboardWidgets)
        toast.error(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  // ── Reset to preset ──

  const handleReset = (presetId: string) => {
    startTransition(async () => {
      try {
        await resetToPreset(presetId)
        const preset = presets.find((p) => p.id === presetId)
        if (preset) {
          setEnabledModules([...preset.enabledModules])
          setPrimaryNavHrefs([...preset.primaryNavHrefs])
          setMobileTabHrefs([...preset.mobileTabHrefs])
          setDashboardWidgets([])
          setName('')
        }
        toast.success('Reset to preset')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to reset')
      }
    })
  }

  // ── Export ──

  const handleExport = () => {
    startTransition(async () => {
      try {
        const json = await exportArchetypeConfig()
        navigator.clipboard.writeText(json)
        toast.success('Configuration copied to clipboard')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to export')
      }
    })
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ── Section 1: Start from Preset ── */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-2">Start from a Preset</h2>
        <p className="text-sm text-stone-400 mb-4">
          Pick a base archetype to pre-fill modules, navigation, and widgets. Then customize from
          there.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => loadPreset(preset.id)}
              className="flex flex-col items-start gap-1 p-3 rounded-lg border border-stone-700 hover:border-amber-600 hover:bg-stone-800/50 transition-colors text-left"
            >
              <span className="text-xl">{preset.emoji}</span>
              <span className="text-sm font-medium text-stone-200">{preset.label}</span>
              <span className="text-xs text-stone-500">{preset.description}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Section 2: Modules ── */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-stone-100">Modules</h2>
          <span className="text-sm text-stone-400">
            {enabledModules.length} module{enabledModules.length !== 1 ? 's' : ''} enabled
          </span>
        </div>
        <p className="text-sm text-stone-400 mb-4">
          Toggle which feature areas are active in your workspace.
        </p>

        {/* Free modules */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Free
          </h3>
          <div className="space-y-2">
            {freeModules.map((mod) => (
              <label
                key={mod.slug}
                className="flex items-center gap-3 p-2 rounded hover:bg-stone-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={enabledModules.includes(mod.slug)}
                  onChange={() => toggleModule(mod.slug)}
                  disabled={mod.alwaysVisible}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-stone-900"
                />
                <div>
                  <span className="text-sm text-stone-200">{mod.label}</span>
                  {mod.alwaysVisible && (
                    <span className="ml-2 text-xs text-stone-500">(always on)</span>
                  )}
                  <p className="text-xs text-stone-500">{mod.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Pro modules */}
        <div>
          <h3 className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider mb-2">
            Pro
          </h3>
          <div className="space-y-2">
            {proModules.map((mod) => (
              <label
                key={mod.slug}
                className="flex items-center gap-3 p-2 rounded hover:bg-stone-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={enabledModules.includes(mod.slug)}
                  onChange={() => toggleModule(mod.slug)}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-stone-900"
                />
                <div>
                  <span className="text-sm text-stone-200">{mod.label}</span>
                  <p className="text-xs text-stone-500">{mod.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Navigation ── */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-2">Navigation</h2>
        <p className="text-sm text-stone-400 mb-4">
          Choose which items appear in your sidebar and arrange their order. Check up to 5 for the
          mobile tab bar.
        </p>

        <div className="space-y-1">
          {navItems.map((item) => {
            const isInNav = primaryNavHrefs.includes(item.href)
            const navIndex = primaryNavHrefs.indexOf(item.href)
            const isInMobile = mobileTabHrefs.includes(item.href)

            return (
              <div
                key={item.href}
                className={`flex items-center gap-3 p-2 rounded ${
                  isInNav ? 'bg-stone-800/60' : 'bg-transparent'
                }`}
              >
                {/* Nav toggle */}
                <input
                  type="checkbox"
                  checked={isInNav}
                  onChange={() => toggleNavItem(item.href)}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-stone-900"
                />

                {/* Label */}
                <span className="text-sm text-stone-200 flex-1">{item.label}</span>

                {/* Mobile tab toggle */}
                {isInNav && (
                  <button
                    onClick={() => toggleMobileTab(item.href)}
                    className={`text-xs px-2 py-0.5 rounded border ${
                      isInMobile
                        ? 'border-amber-600 bg-amber-600/20 text-amber-400'
                        : 'border-stone-700 text-stone-500 hover:border-stone-600'
                    }`}
                    title={isInMobile ? 'Remove from mobile tabs' : 'Add to mobile tabs'}
                  >
                    {isInMobile ? 'Mobile' : '+ Mobile'}
                  </button>
                )}

                {/* Ordering buttons */}
                {isInNav && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveNavItem(navIndex, 'up')}
                      disabled={navIndex <= 0}
                      className="text-xs text-stone-500 hover:text-stone-300 disabled:opacity-30 px-1"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveNavItem(navIndex, 'down')}
                      disabled={navIndex >= primaryNavHrefs.length - 1}
                      className="text-xs text-stone-500 hover:text-stone-300 disabled:opacity-30 px-1"
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-3 text-xs text-stone-500">
          Mobile tabs: {mobileTabHrefs.length}/5 selected
        </div>
      </section>

      {/* ── Section 4: Dashboard Widgets ── */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-stone-100">Dashboard Widgets</h2>
          <span className="text-sm text-stone-400">
            {dashboardWidgets.length} widget{dashboardWidgets.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        <p className="text-sm text-stone-400 mb-4">
          Choose which widgets appear on your dashboard.
        </p>

        <div className="space-y-5">
          {widgetsByCategory.map(([categoryKey, group]) => (
            <div key={categoryKey}>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                {group.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {group.widgets.map((widget) => (
                  <label
                    key={widget.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-stone-800/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={dashboardWidgets.includes(widget.id)}
                      onChange={() => toggleWidget(widget.id)}
                      className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-stone-900"
                    />
                    <span className="text-sm text-stone-300">{widget.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 5: Name & Save ── */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Name and Save</h2>

        <div className="mb-4">
          <label htmlFor="archetype-name" className="block text-sm text-stone-300 mb-1">
            Configuration name
          </label>
          <input
            id="archetype-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Bakery + Catering Setup"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={isPending} variant="primary">
            {isPending ? 'Saving...' : 'Save Custom Archetype'}
          </Button>

          <Button onClick={handleExport} disabled={isPending} variant="secondary">
            Export as JSON
          </Button>

          {/* Reset dropdown */}
          <div className="relative group">
            <Button variant="ghost" disabled={isPending}>
              Reset to Preset
            </Button>
            <div className="absolute left-0 top-full mt-1 w-48 bg-stone-800 border border-stone-700 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleReset(preset.id)}
                  className="w-full text-left px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 first:rounded-t-lg last:rounded-b-lg"
                >
                  {preset.emoji} {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
