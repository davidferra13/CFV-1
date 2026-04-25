'use client'

import type { ChefCircleSummary, PipelineStage } from '@/lib/hub/chef-circle-actions'

// ---------------------------------------------------------------------------
// Pipeline stats bar + attention summary for the circles page.
// Shows at-a-glance: how many circles at each stage, what needs action.
// ---------------------------------------------------------------------------

const STAGE_GROUPS = [
  {
    label: 'Leads',
    stages: ['new_inquiry', 'awaiting_client', 'awaiting_chef'] as PipelineStage[],
    color: 'bg-blue-500',
  },
  {
    label: 'Quoted',
    stages: ['quoted'] as PipelineStage[],
    color: 'bg-violet-500',
  },
  {
    label: 'Booked',
    stages: ['accepted', 'paid', 'confirmed'] as PipelineStage[],
    color: 'bg-emerald-500',
  },
  {
    label: 'Live',
    stages: ['in_progress'] as PipelineStage[],
    color: 'bg-orange-500',
  },
  {
    label: 'Past',
    stages: ['completed', 'cancelled', 'declined', 'expired'] as PipelineStage[],
    color: 'bg-stone-600',
  },
]

interface PipelineHeaderProps {
  circles: ChefCircleSummary[]
}

export function CirclesPipelineHeader({ circles }: PipelineHeaderProps) {
  const attentionItems = circles.filter((c) => c.needs_attention)
  const totalActive = circles.filter(
    (c) => !['completed', 'cancelled', 'declined', 'expired', 'active'].includes(c.pipeline_stage)
  ).length
  const totalValueCents = circles
    .filter(
      (c) => !['completed', 'cancelled', 'declined', 'expired', 'active'].includes(c.pipeline_stage)
    )
    .reduce((sum, c) => sum + (c.estimated_value_cents ?? 0), 0)

  // Stage group counts
  const groupCounts = STAGE_GROUPS.map((g) => ({
    ...g,
    count: circles.filter((c) => g.stages.includes(c.pipeline_stage)).length,
  }))

  // Don't render if no business circles
  if (totalActive === 0 && attentionItems.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Pipeline funnel bar */}
      <div className="flex items-center gap-1">
        {groupCounts.map((g) => (
          <div key={g.label} className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${g.color}`} />
              <span className="text-[11px] font-medium text-stone-400">{g.label}</span>
            </div>
            <span className="text-lg font-bold text-stone-200">{g.count}</span>
          </div>
        ))}

        {/* Separator + total */}
        <div className="ml-auto flex flex-col items-end">
          <span className="text-[11px] text-stone-500">Active pipeline</span>
          <span className="text-lg font-bold text-stone-100">{totalActive}</span>
          {totalValueCents > 0 && (
            <span className="text-[11px] text-emerald-400/70">
              ${Math.round(totalValueCents / 100).toLocaleString()} pipeline
            </span>
          )}
        </div>
      </div>

      {/* Attention banner */}
      {attentionItems.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-sm font-semibold text-amber-300">
              {attentionItems.length} circle{attentionItems.length !== 1 ? 's' : ''} need{attentionItems.length === 1 ? 's' : ''} your attention
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {attentionItems.slice(0, 5).map((c) => (
              <a
                key={c.id}
                href={`/circles/${c.id}`}
                className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 transition-colors hover:bg-amber-500/20"
              >
                <span>{c.emoji || '💬'}</span>
                <span className="font-medium">{c.client_name || c.name}</span>
                {c.attention_reason && (
                  <span className="text-amber-400/70">{c.attention_reason}</span>
                )}
              </a>
            ))}
            {attentionItems.length > 5 && (
              <span className="px-2 py-1 text-xs text-amber-500">
                +{attentionItems.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
