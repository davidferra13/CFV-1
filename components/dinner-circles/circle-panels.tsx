'use client'

import { useState } from 'react'
import { BringList } from './bring-list'
import { PollList } from './poll-card'
import { BroadcastComposer } from './broadcast-composer'
import { ThemeBoard } from './theme-board'
import { ChangeHistoryDrawer } from './change-history-drawer'
import { DinnerCircleActionDrawer } from './action-drawer'
import { DinnerCircleAccommodationIntake } from './accommodation-intake'
import { DinnerCircleArrivalGuide } from './arrival-guide'
import { DinnerCircleEventWorkspacePanel } from './event-workspace-panel'
import type {
  DinnerCircleActionRole,
  DinnerCircleResolvedAction,
} from '@/lib/dinner-circles/action-surface'

type PanelTab =
  | 'workspace'
  | 'arrival'
  | 'bring'
  | 'polls'
  | 'accommodations'
  | 'broadcast'
  | 'theme'
  | 'history'

interface BringItem {
  id: string
  item_name: string
  item_notes: string | null
  category: string | null
  quantity: string | null
  required: boolean
  claimed_by: string | null
  brought_at: string | null
  is_fulfilled: boolean
  created_by: string
}

interface Poll {
  id: string
  circle_id: string
  question: string
  options: { label: string; description?: string }[]
  poll_type: string
  is_closed: boolean
  close_at: string | null
  result_visibility: 'public' | 'after_close' | 'host_only'
  allow_vote_change: boolean
  final_choice: number | null
  final_choice_note: string | null
  requires_chef_review: boolean
  caller_vote: { voter_id: string; option_index: number } | null
  votes: { voter_id: string; option_index: number }[]
}

interface Broadcast {
  id: string
  audience_type: 'all' | 'missing_rsvp' | 'missing_dietary' | 'bring_list_assignees' | 'custom'
  message: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed'
  channel: string
  scheduled_at: string | null
  sent_at: string | null
  cancelled_at: string | null
  recipient_count: number | null
  created_at: string
}

interface ThemeBoardData {
  circle_id: string
  mood_description: string | null
  color_palette: { hex: string; label?: string }[]
  decor_ideas: { idea: string; imageUrl?: string; source?: string }[]
  playlist_notes: string | null
  playlist_url: string | null
  atmosphere_notes: string | null
  menu_aesthetic_notes: string | null
  chef_visibility: 'full' | 'summary' | 'none'
  contributions: {
    id: string
    contributor_id: string
    type: string
    content: string
    image_url?: string | null
    created_at: string
  }[]
}

interface DinnerCirclePanelsProps {
  circleId: string
  callerProfileId: string
  isHost: boolean
  viewerRole?: DinnerCircleActionRole
  initialBringItems: BringItem[]
  initialPolls: Poll[]
  initialBroadcasts: Broadcast[]
  initialThemeBoard: ThemeBoardData | null
}

const TABS: { key: PanelTab; label: string }[] = [
  { key: 'workspace', label: 'Event Plan' },
  { key: 'arrival', label: 'Arrival' },
  { key: 'bring', label: 'Bring List' },
  { key: 'polls', label: 'Polls' },
  { key: 'accommodations', label: 'Access Needs' },
  { key: 'broadcast', label: 'Broadcasts' },
  { key: 'theme', label: 'Theme Board' },
  { key: 'history', label: 'History' },
]

export function DinnerCirclePanels({
  circleId,
  callerProfileId,
  isHost,
  viewerRole,
  initialBringItems,
  initialPolls,
  initialBroadcasts,
  initialThemeBoard,
}: DinnerCirclePanelsProps) {
  const [tab, setTab] = useState<PanelTab>('arrival')
  const [historyOpen, setHistoryOpen] = useState(false)

  // Non-host members only see bring/polls/theme (no broadcast, no history)
  const visibleTabs = isHost
    ? TABS
    : TABS.filter((t) => t.key !== 'broadcast' && t.key !== 'history')
  const actionRole = viewerRole ?? (isHost ? 'host' : 'member')

  function handleAction(action: DinnerCircleResolvedAction) {
    if (action.id === 'bring_list') setTab('bring')
    if (action.id === 'view_guide') setTab('arrival')
    if (
      action.id === 'attendee_profiles' ||
      action.id === 'seating_plan' ||
      action.id === 'concierge_qa' ||
      action.id === 'celebration_board' ||
      action.id === 'menu_reveal' ||
      action.id === 'itinerary' ||
      action.id === 'weather_backup' ||
      action.id === 'live_status' ||
      action.id === 'digest_controls' ||
      action.id === 'event_packet' ||
      action.id === 'collaborator_access' ||
      action.id === 'memory_album' ||
      action.id === 'growth_actions' ||
      action.id === 'visual_intake' ||
      action.id === 'print_share'
    ) {
      setTab('workspace')
    }
    if (action.id === 'vote_poll') setTab('polls')
    if (action.id === 'accommodation_update') setTab('accommodations')
    if (action.id === 'broadcast' && isHost) setTab('broadcast')
    if (action.id === 'set_theme') setTab('theme')
  }

  return (
    <div className="mt-6 space-y-4 rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <DinnerCircleActionDrawer
          circleId={circleId}
          viewerRole={actionRole}
          permissions={{
            canPost: true,
            canInvite: isHost,
            canBroadcast: isHost,
            canManageTheme: isHost,
            canManagePrivacy: isHost,
          }}
          onAction={handleAction}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b px-4 pt-3 pb-0">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === 'history') {
                setHistoryOpen(true)
              } else {
                setTab(t.key)
              }
            }}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap
              ${
                tab === t.key && t.key !== 'history'
                  ? 'border-b-2 border-brand-600 text-brand-700'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="px-6 pb-6">
        {tab === 'workspace' && (
          <DinnerCircleEventWorkspacePanel viewerRole={actionRole} isHost={isHost} />
        )}
        {tab === 'arrival' && <DinnerCircleArrivalGuide circleId={circleId} isHost={isHost} />}
        {tab === 'bring' && (
          <BringList
            circleId={circleId}
            items={initialBringItems}
            callerProfileId={callerProfileId}
            isHost={isHost}
          />
        )}
        {tab === 'polls' && (
          <PollList
            polls={initialPolls}
            circleId={circleId}
            callerProfileId={callerProfileId}
            isHost={isHost}
          />
        )}
        {tab === 'accommodations' && (
          <DinnerCircleAccommodationIntake
            circleId={circleId}
            callerProfileId={callerProfileId}
            isHost={isHost}
          />
        )}
        {tab === 'broadcast' && isHost && (
          <BroadcastComposer circleId={circleId} history={initialBroadcasts} />
        )}
        {tab === 'theme' && (
          <ThemeBoard
            circleId={circleId}
            board={initialThemeBoard}
            isHost={isHost}
            callerProfileId={callerProfileId}
          />
        )}
      </div>

      {/* History drawer (host only) */}
      {isHost && (
        <ChangeHistoryDrawer
          circleId={circleId}
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  )
}
