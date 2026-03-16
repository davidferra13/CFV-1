'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS } from '@/lib/prospecting/constants'
import type { PipelineStage } from '@/lib/prospecting/constants'
import type { StageHistoryEntry } from '@/lib/prospecting/types'
import { GitBranch, ArrowRight } from '@/components/ui/icons'
import { format } from 'date-fns'

interface StageHistoryPanelProps {
  history: StageHistoryEntry[]
}

export function StageHistoryPanel({ history }: StageHistoryPanelProps) {
  if (history.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-stone-500" />
          Pipeline History ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 text-xs rounded-lg bg-stone-800 px-3 py-2"
            >
              {entry.from_stage ? (
                <span
                  className={`rounded-full px-2 py-0.5 font-medium border ${
                    PIPELINE_STAGE_COLORS[entry.from_stage as PipelineStage] ||
                    'bg-stone-800 text-stone-400 border-stone-700'
                  }`}
                >
                  {PIPELINE_STAGE_LABELS[entry.from_stage as PipelineStage] || entry.from_stage}
                </span>
              ) : (
                <span className="text-stone-500 italic">start</span>
              )}
              <ArrowRight className="h-3 w-3 text-stone-500 flex-shrink-0" />
              <span
                className={`rounded-full px-2 py-0.5 font-medium border ${
                  PIPELINE_STAGE_COLORS[entry.to_stage as PipelineStage] ||
                  'bg-stone-800 text-stone-400 border-stone-700'
                }`}
              >
                {PIPELINE_STAGE_LABELS[entry.to_stage as PipelineStage] || entry.to_stage}
              </span>
              <span className="text-stone-500 ml-auto flex-shrink-0">
                {format(new Date(entry.changed_at), 'MMM d, h:mm a')}
              </span>
              {entry.notes && (
                <span className="text-stone-400 truncate max-w-[200px]" title={entry.notes}>
                  - {entry.notes}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
