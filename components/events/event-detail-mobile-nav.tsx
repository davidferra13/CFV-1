'use client'

import {
  Info,
  DollarSign,
  ClipboardList,
  CheckSquare,
  Ticket,
  ListChecks,
  Store,
} from '@/components/ui/icons'
import { useTabNav, type TabDefinition } from '@/lib/shared/use-tab-nav'
import {
  STAGE_TAB_MAPPING,
  type LifecycleWorkspaceStage,
} from '@/lib/lifecycle/event-lifecycle-stage'

export type EventDetailTab = 'overview' | 'popup' | 'money' | 'prep' | 'tickets' | 'ops' | 'wrap'

const EVENT_TABS: TabDefinition<EventDetailTab>[] = [
  { key: 'overview', label: 'Overview', icon: Info },
  { key: 'popup', label: 'Pop-Up', icon: Store },
  { key: 'money', label: 'Finance', icon: DollarSign },
  { key: 'prep', label: 'Prep', icon: ListChecks },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'ops', label: 'Ops', icon: ClipboardList },
  { key: 'wrap', label: 'Wrap-up', icon: CheckSquare },
]

/** Color for the lifecycle stage dot on each mobile tab */
const STAGE_DOT_COLORS: Record<LifecycleWorkspaceStage, string> = {
  planning: 'bg-blue-400',
  confirmed: 'bg-amber-400',
  active: 'bg-emerald-400',
  closeout: 'bg-purple-400',
}

/** Resolve which lifecycle stage a tab belongs to */
function getTabStage(tabKey: string): LifecycleWorkspaceStage {
  for (const [stage, tabs] of Object.entries(STAGE_TAB_MAPPING)) {
    if (tabs.includes(tabKey)) return stage as LifecycleWorkspaceStage
  }
  return 'planning'
}

/**
 * Sticky in-page tab bar for event detail on mobile.
 * Hidden on md+ (desktop uses LifecycleWorkspacePanel instead).
 * Uses shared useTabNav hook for URL-synced tab state.
 * Each tab shows a colored lifecycle stage dot for orientation.
 */
export function EventDetailMobileNav({
  lifecycleStage,
}: {
  lifecycleStage?: LifecycleWorkspaceStage
}) {
  const { activeTab, setTab, tabs, isActive } = useTabNav<EventDetailTab>({
    tabs: EVENT_TABS,
    defaultTab: 'overview',
    paramKey: 'tab',
  })

  return (
    <nav className="md:hidden sticky top-14 z-page-bar bg-stone-900 border-b border-stone-700 shadow-sm -mx-4 px-4">
      <div className="flex" role="tablist" aria-orientation="horizontal">
        {tabs.map((tab) => {
          const active = isActive(tab.key)
          const Icon = tab.icon
          const tabStage = getTabStage(tab.key)
          const isCurrentLifecycleStage = lifecycleStage === tabStage
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors border-b-2 ${
                active
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              <div className="relative">
                {Icon && <Icon className="h-4 w-4" />}
                {isCurrentLifecycleStage && (
                  <span
                    className={`absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full ${STAGE_DOT_COLORS[tabStage]}`}
                  />
                )}
              </div>
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * Wraps a section group so it's only visible on the given tab on mobile.
 * On md+ all sections are always visible (full scroll, no tabs).
 */
export function EventDetailSection({
  tab,
  activeTab,
  children,
}: {
  tab: EventDetailTab
  activeTab: EventDetailTab
  children: React.ReactNode
}) {
  return <div className={tab === activeTab ? '' : 'hidden md:contents'}>{children}</div>
}
