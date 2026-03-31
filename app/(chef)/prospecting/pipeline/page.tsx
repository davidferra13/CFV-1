// Prospecting Pipeline - Kanban View
// Drag-and-drop pipeline board for tracking prospect outreach stages.

import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import {
  getProspectsByPipelineStage,
  getPipelineRevenueByStage,
} from '@/lib/prospecting/pipeline-actions'
import { PipelineBoard } from '@/components/prospecting/pipeline-board'
import { AutoPipelineRulesButton } from '@/components/prospecting/auto-pipeline-rules-button'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Pipeline' }

export default async function PipelinePage() {
  await requireAdmin()
  await requireChef()

  const [stages, revenue] = await Promise.all([
    getProspectsByPipelineStage(),
    getPipelineRevenueByStage(),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/prospecting"
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Prospects
          </Link>
          <h1 className="text-3xl font-bold text-stone-100">Sales Pipeline</h1>
          <p className="text-stone-400 mt-1">Track prospects through your outreach funnel</p>
        </div>
        <div className="flex items-center gap-2">
          <AutoPipelineRulesButton />
          <Link href="/prospecting/scrub">
            <Button>+ AI Scrub</Button>
          </Link>
        </div>
      </div>

      <PipelineBoard initialStages={stages} revenueByStage={revenue} />
    </div>
  )
}
