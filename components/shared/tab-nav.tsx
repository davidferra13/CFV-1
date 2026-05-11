'use client'

import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react'
import { useTabNav, type TabDefinition, type UseTabNavOptions } from '@/lib/shared/use-tab-nav'

// ─── Context ─────────────────────────────────────────────────────────────────

type TabNavContextValue<K extends string = string> = {
  activeTab: K
  setTab: (key: K) => void
  tabs: TabDefinition<K>[]
  isActive: (key: K) => boolean
  lazy: boolean
  visitedTabs: Set<string>
}

const TabNavContext = createContext<TabNavContextValue | null>(null)

function useTabNavContext(): TabNavContextValue {
  const ctx = useContext(TabNavContext)
  if (!ctx) {
    throw new Error('TabNav.Panel must be used inside a <TabNav> component.')
  }
  return ctx
}

// ─── TabNav (Root) ───────────────────────────────────────────────────────────

export type TabNavProps<K extends string> = UseTabNavOptions<K> & {
  children: ReactNode
  /** When true, tab panels only mount after being visited once (default: false) */
  lazy?: boolean
  /** Extra CSS classes on the outer wrapper */
  className?: string
  /** Extra CSS classes on the tab bar container */
  barClassName?: string
  /** Render prop alternative: receives activeTab key instead of using TabNav.Panel */
  renderContent?: (activeTab: K) => ReactNode
}

function TabNavRoot<K extends string>({
  children,
  lazy = false,
  className = '',
  barClassName = '',
  renderContent,
  ...hookOptions
}: TabNavProps<K>) {
  const { activeTab, setTab, tabs, isActive } = useTabNav(hookOptions)

  // Track which tabs have been visited (for lazy rendering)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]))

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev
      const next = new Set(prev)
      next.add(activeTab)
      return next
    })
  }, [activeTab])

  // Keyboard navigation refs
  const tabListRef = useRef<HTMLDivElement>(null)
  // Scroll container ref for mobile fade indicators
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftFade(el.scrollLeft > 4)
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateFades()
    el.addEventListener('scroll', updateFades, { passive: true })
    const ro = new ResizeObserver(updateFades)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateFades)
      ro.disconnect()
    }
  }, [updateFades])

  // Scroll active tab into view when it changes
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const activeBtn = el.querySelector('[data-tab-active="true"]') as HTMLElement | null
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTab])

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const focusable = tabListRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[role="tab"]:not([disabled])'
    )
    if (!focusable || focusable.length === 0) return

    const currentIndex = Array.from(focusable).findIndex((btn) => btn === document.activeElement)
    if (currentIndex === -1) return

    let nextIndex: number | null = null

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (currentIndex + 1) % focusable.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (currentIndex - 1 + focusable.length) % focusable.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIndex = focusable.length - 1
    }

    if (nextIndex !== null) {
      focusable[nextIndex].focus()
      setTab(tabs[nextIndex].key)
    }
  }

  const ctxValue: TabNavContextValue = {
    activeTab,
    setTab: setTab as (key: string) => void,
    tabs: tabs as TabDefinition<string>[],
    isActive: isActive as (key: string) => boolean,
    lazy,
    visitedTabs,
  }

  return (
    <TabNavContext.Provider value={ctxValue}>
      <div className={className}>
        {/* Tab Bar */}
        <div className="relative">
          {/* Left fade */}
          {showLeftFade && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-stone-900 to-transparent z-10" />
          )}
          {/* Right fade */}
          {showRightFade && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-stone-900 to-transparent z-10" />
          )}

          <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
            <div
              ref={tabListRef}
              role="tablist"
              aria-orientation="horizontal"
              onKeyDown={handleKeyDown}
              className={`flex gap-0 border-b border-stone-700 min-w-max ${barClassName}`}
            >
              {tabs.map((tab, index) => {
                const active = isActive(tab.key)
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    type="button"
                    id={`tab-${tab.key}`}
                    aria-selected={active}
                    aria-controls={`tabpanel-${tab.key}`}
                    tabIndex={active ? 0 : -1}
                    data-tab-active={active}
                    onClick={() => setTab(tab.key)}
                    className={`group flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-stone-900 ${
                      active
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600'
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {tab.label}
                    {tab.badge != null && (
                      <span
                        className={`ml-1 inline-flex items-center justify-center min-w-[1.25rem] px-1 h-5 rounded-full text-xs font-semibold ${
                          active
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-stone-700 text-stone-400 group-hover:bg-stone-600'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tab Panels (compound children or render prop) */}
        {renderContent ? renderContent(activeTab) : children}
      </div>
    </TabNavContext.Provider>
  )
}

// ─── TabNav.Panel ────────────────────────────────────────────────────────────

export type TabPanelProps<K extends string = string> = {
  tabKey: K
  children: ReactNode
  /** Extra CSS classes on the panel wrapper */
  className?: string
  /**
   * Force this panel to always stay mounted (even when not active).
   * Children are hidden via CSS. Useful for panels with forms that
   * should preserve state.
   */
  keepMounted?: boolean
}

function TabPanel<K extends string>({
  tabKey,
  children,
  className = '',
  keepMounted = false,
}: TabPanelProps<K>) {
  const { activeTab, lazy, visitedTabs } = useTabNavContext()
  const isActive = activeTab === tabKey
  const hasBeenVisited = visitedTabs.has(tabKey)

  // Determine whether to render content
  const shouldRender = keepMounted || isActive || (lazy && hasBeenVisited) || !lazy

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabKey}`}
      aria-labelledby={`tab-${tabKey}`}
      hidden={!isActive}
      className={`${isActive ? '' : 'hidden'} ${className}`}
    >
      {shouldRender ? children : null}
    </div>
  )
}

// ─── Compound Export ─────────────────────────────────────────────────────────

/**
 * Shared tab navigation component with URL-param sync, keyboard navigation,
 * badges, icons, lazy rendering, and mobile horizontal scroll with fades.
 *
 * @example
 * ```tsx
 * <TabNav
 *   tabs={[
 *     { key: 'overview', label: 'Overview', icon: Info },
 *     { key: 'money', label: 'Money', badge: 3, icon: DollarSign },
 *     { key: 'prep', label: 'Prep', icon: ListChecks },
 *   ]}
 *   paramKey="tab"
 *   defaultTab="overview"
 * >
 *   <TabNav.Panel tabKey="overview">
 *     <OverviewContent />
 *   </TabNav.Panel>
 *   <TabNav.Panel tabKey="money">
 *     <MoneyContent />
 *   </TabNav.Panel>
 *   <TabNav.Panel tabKey="prep">
 *     <PrepContent />
 *   </TabNav.Panel>
 * </TabNav>
 * ```
 */
export const TabNav = Object.assign(TabNavRoot, {
  Panel: TabPanel,
})

// Re-export types for convenience
export type { TabDefinition } from '@/lib/shared/use-tab-nav'
