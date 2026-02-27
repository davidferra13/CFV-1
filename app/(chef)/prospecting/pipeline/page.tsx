// Prospecting Pipeline — Kanban View
// Drag-and-drop pipeline board for tracking prospect outreach stages.

import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { getProspectsByPipelineStage } from '@/lib/prospecting/pipeline-actions'
import { PipelineBoard } from '@/components/prospecting/pipeline-board'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Pipeline - ChefFlow' }

export default async function PipelinePage() {
  await requireAdmin()
  await requireChef()

  const stages = await getProspectsByPipelineStage()

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
        <Link href="/prospecting/scrub">
          <Button>+ AI Scrub</Button>
        </Link>
      </div>

      <PipelineBoard initialStages={stages} />
    </div>
  )
}
