'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { updatePipelineStage } from '@/lib/prospecting/pipeline-actions'
import type { Prospect } from '@/lib/prospecting/types'
import type { PipelineStage } from '@/lib/prospecting/constants'
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_COLORS,
} from '@/lib/prospecting/constants'
import {
  Building2,
  User,
  GripVertical,
  Phone,
  Mail,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PipelineBoardProps {
  initialStages: Record<PipelineStage, Prospect[]>
  revenueByStage?: Record<PipelineStage, { count: number; totalRevenue: number }>
}

export function PipelineBoard({ initialStages, revenueByStage }: PipelineBoardProps) {
  const [stages, setStages] = useState(initialStages)
  const [draggedProspect, setDraggedProspect] = useState<Prospect | null>(null)
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDragStart(prospect: Prospect) {
    setDraggedProspect(prospect)
  }

  function handleDragOver(e: React.DragEvent, stage: PipelineStage) {
    e.preventDefault()
    setDragOverStage(stage)
  }

  function handleDragLeave() {
    setDragOverStage(null)
  }

  function handleDrop(targetStage: PipelineStage) {
    if (!draggedProspect || draggedProspect.pipeline_stage === targetStage) {
      setDraggedProspect(null)
      setDragOverStage(null)
      return
    }

    const sourceStage = (draggedProspect.pipeline_stage || 'new') as PipelineStage
    const prospect = draggedProspect

    // Optimistic update
    setStages((prev) => {
      const newStages = { ...prev }
      newStages[sourceStage] = prev[sourceStage].filter((p) => p.id !== prospect.id)
      newStages[targetStage] = [{ ...prospect, pipeline_stage: targetStage }, ...prev[targetStage]]
      return newStages
    })

    setDraggedProspect(null)
    setDragOverStage(null)

    // Server update
    startTransition(async () => {
      try {
        await updatePipelineStage(prospect.id, targetStage)
        router.refresh()
      } catch {
        // Revert on error
        setStages((prev) => {
          const newStages = { ...prev }
          newStages[targetStage] = prev[targetStage].filter((p) => p.id !== prospect.id)
          newStages[sourceStage] = [
            { ...prospect, pipeline_stage: sourceStage },
            ...prev[sourceStage],
          ]
          return newStages
        })
      }
    })
  }

  // Only show active stages (hide lost/converted if empty to save space)
  const activeStages = PIPELINE_STAGES.filter(
    (s) => stages[s].length > 0 || !['converted', 'lost'].includes(s)
  )

  const totalActive = Object.values(stages)
    .flat()
    .filter((p) => !['converted', 'lost'].includes(p.pipeline_stage || 'new')).length

  // Total pipeline revenue (active stages only)
  const totalPipelineRevenue = revenueByStage
    ? Object.entries(revenueByStage)
        .filter(([stage]) => !['converted', 'lost'].includes(stage))
        .reduce((sum, [, data]) => sum + data.totalRevenue, 0)
    : 0

  function formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
    return `$${amount.toFixed(0)}`
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm text-stone-400">
        <span>{totalActive} active prospects in pipeline</span>
        {totalPipelineRevenue > 0 && (
          <span className="flex items-center gap-1 text-green-400 font-medium">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(totalPipelineRevenue)} potential revenue
          </span>
        )}
        {isPending && (
          <span className="flex items-center gap-1 text-brand-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Updating...
          </span>
        )}
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {activeStages.map((stage) => {
          const stageRevenue = revenueByStage?.[stage]?.totalRevenue ?? 0

          return (
            <div
              key={stage}
              className={`flex-shrink-0 w-72 rounded-lg border ${
                dragOverStage === stage
                  ? 'border-brand-500 bg-brand-950/30'
                  : 'border-stone-700 bg-stone-900/50'
              } transition-colors`}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(stage)}
            >
              {/* Column header */}
              <div className="p-3 border-b border-stone-800">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${PIPELINE_STAGE_COLORS[stage]}`}
                  >
                    {PIPELINE_STAGE_LABELS[stage]}
                  </span>
                  <span className="text-xs text-stone-500">{stages[stage].length}</span>
                </div>
                {stageRevenue > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-green-500">
                    <DollarSign className="h-2.5 w-2.5" />
                    {formatCurrency(stageRevenue)}
                  </div>
                )}
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 max-h-[65vh] overflow-y-auto">
                {stages[stage].length === 0 && (
                  <p className="text-xs text-stone-600 text-center py-8">Drop prospects here</p>
                )}
                {stages[stage].map((prospect) => (
                  <PipelineCard
                    key={prospect.id}
                    prospect={prospect}
                    onDragStart={() => handleDragStart(prospect)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PipelineCard({ prospect, onDragStart }: { prospect: Prospect; onDragStart: () => void }) {
  const scoreDelta =
    prospect.previous_lead_score != null ? prospect.lead_score - prospect.previous_lead_score : null

  return (
    <Card
      className="p-3 cursor-grab active:cursor-grabbing hover:border-stone-600 transition-colors"
      draggable
      onDragStart={onDragStart}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-stone-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Link
            href={`/prospecting/${prospect.id}`}
            className="text-sm font-medium text-stone-100 hover:underline flex items-center gap-1"
          >
            {prospect.prospect_type === 'individual' ? (
              <User className="h-3 w-3 text-stone-400 flex-shrink-0" />
            ) : (
              <Building2 className="h-3 w-3 text-stone-400 flex-shrink-0" />
            )}
            <span className="truncate">{prospect.name}</span>
          </Link>

          {prospect.description && (
            <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{prospect.description}</p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {/* Lead score with trend arrow */}
            <span
              className={`inline-flex items-center gap-0.5 min-w-[1.5rem] text-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                prospect.lead_score >= 70
                  ? 'bg-green-950 text-green-400'
                  : prospect.lead_score >= 40
                    ? 'bg-amber-950 text-amber-400'
                    : 'bg-stone-800 text-stone-500'
              }`}
            >
              {prospect.lead_score}
              {scoreDelta != null && scoreDelta > 0 && (
                <TrendingUp className="h-2.5 w-2.5 text-green-400" />
              )}
              {scoreDelta != null && scoreDelta < 0 && (
                <TrendingDown className="h-2.5 w-2.5 text-red-400" />
              )}
            </span>

            {/* Location */}
            {(prospect.city || prospect.region) && (
              <span className="text-[10px] text-stone-500 truncate">
                {prospect.city || prospect.region}
              </span>
            )}

            {/* Contact indicators */}
            <div className="flex items-center gap-1 ml-auto">
              {prospect.phone && <Phone className="h-2.5 w-2.5 text-stone-500" />}
              {prospect.email && <Mail className="h-2.5 w-2.5 text-stone-500" />}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
