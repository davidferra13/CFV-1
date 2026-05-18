'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, Clock, Play, Flag } from '@/components/ui/icons'
import {
  LIFECYCLE_STAGE_CONFIGS,
  getStageRelation,
  type LifecycleWorkspaceStage,
} from '@/lib/lifecycle/event-lifecycle-stage'

// Stage icon mapping
const STAGE_ICONS: Record<LifecycleWorkspaceStage, typeof Clock> = {
  planning: Clock,
  confirmed: CheckCircle,
  active: Play,
  closeout: Flag,
}

// Stage colors for the indicator dot and active border
const STAGE_COLORS: Record<
  LifecycleWorkspaceStage,
  { dot: string; border: string; bg: string; text: string }
> = {
  planning: {
    dot: 'bg-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-950/30',
    text: 'text-blue-300',
  },
  confirmed: {
    dot: 'bg-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
  },
  active: {
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/30',
    text: 'text-emerald-300',
  },
  closeout: {
    dot: 'bg-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-950/30',
    text: 'text-purple-300',
  },
}

interface LifecycleStagePanelProps {
  stage: LifecycleWorkspaceStage
  currentStage: LifecycleWorkspaceStage
  children: ReactNode
}

function LifecycleStagePanel({ stage, currentStage, children }: LifecycleStagePanelProps) {
  const relation = getStageRelation(currentStage, stage)
  const isCurrentStage = relation === 'current'
  const [expanded, setExpanded] = useState(isCurrentStage)

  const config = LIFECYCLE_STAGE_CONFIGS.find((c) => c.key === stage)
  if (!config) return null

  const colors = STAGE_COLORS[stage]
  const Icon = STAGE_ICONS[stage]

  const toggle = useCallback(() => setExpanded((prev) => !prev), [])

  const relationLabel =
    relation === 'past' ? 'Completed' : relation === 'future' ? 'Upcoming' : 'Current'

  return (
    <div
      className={`rounded-lg border ${isCurrentStage ? colors.border : 'border-stone-700/50'} ${isCurrentStage ? colors.bg : 'bg-stone-900/50'} transition-colors`}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        {/* Stage indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`w-2 h-2 rounded-full ${isCurrentStage ? colors.dot : relation === 'past' ? 'bg-stone-500' : 'bg-stone-600'}`}
          />
          <Icon className={`h-4 w-4 ${isCurrentStage ? colors.text : 'text-stone-400'}`} />
        </div>

        {/* Label and description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${isCurrentStage ? colors.text : 'text-stone-300'}`}
            >
              {config.label}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                isCurrentStage
                  ? `${colors.bg} ${colors.text}`
                  : relation === 'past'
                    ? 'bg-stone-800 text-stone-400'
                    : 'bg-stone-800/50 text-stone-500'
              }`}
            >
              {relationLabel}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs text-stone-500 mt-0.5 truncate">{config.description}</p>
          )}
        </div>

        {/* Expand/collapse chevron */}
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-stone-400 shrink-0" />
        )}
      </button>

      {/* Content area */}
      {expanded && <div className="px-4 pb-4 space-y-6">{children}</div>}
    </div>
  )
}

interface LifecycleWorkspacePanelProps {
  currentStage: LifecycleWorkspaceStage
  planningContent: ReactNode
  confirmedContent: ReactNode
  activeContent: ReactNode
  closeoutContent: ReactNode
}

/**
 * Lifecycle-aware workspace that groups event detail sections by stage.
 * Current stage is expanded by default; others are collapsed with progressive disclosure.
 * On desktop (md+), this replaces the flat section scroll with organized panels.
 * On mobile, the tab nav still controls which sections are visible.
 */
export function LifecycleWorkspacePanel({
  currentStage,
  planningContent,
  confirmedContent,
  activeContent,
  closeoutContent,
}: LifecycleWorkspacePanelProps) {
  const contentMap: Record<LifecycleWorkspaceStage, ReactNode> = {
    planning: planningContent,
    confirmed: confirmedContent,
    active: activeContent,
    closeout: closeoutContent,
  }

  return (
    <div className="hidden md:flex md:flex-col md:gap-4">
      {LIFECYCLE_STAGE_CONFIGS.map((config) => (
        <LifecycleStagePanel key={config.key} stage={config.key} currentStage={currentStage}>
          {contentMap[config.key]}
        </LifecycleStagePanel>
      ))}
    </div>
  )
}
