'use client'

import { useState, type ReactNode } from 'react'
import { LayoutDashboard, Calendar, AlertTriangle, BarChart3, Brain } from '@/components/ui/icons'
import { MyDashboardTab } from './my-dashboard-tab'

type TabId = 'my' | 'schedule' | 'alerts' | 'business' | 'intelligence'

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'my', label: 'My Dashboard', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'business', label: 'Business', icon: BarChart3 },
  { id: 'intelligence', label: 'Intelligence', icon: Brain },
]

interface DashboardTabsProps {
  scheduleContent: ReactNode
  alertsContent: ReactNode
  businessContent: ReactNode
  intelligenceContent: ReactNode
  chefId: string
}

export function DashboardTabs({
  scheduleContent,
  alertsContent,
  businessContent,
  intelligenceContent,
  chefId,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('my')

  return (
    <>
      {/* Tab bar - full width across grid */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-600/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'my' ? 'Mine' : tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'my' && <MyDashboardTab chefId={chefId} />}

      {activeTab === 'schedule' && scheduleContent}
      {activeTab === 'alerts' && alertsContent}
      {activeTab === 'business' && businessContent}
      {activeTab === 'intelligence' && intelligenceContent}
    </>
  )
}
