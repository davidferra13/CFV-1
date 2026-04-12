// Daily Ops - Quick Action Bar (client component)
// Handles the "Generate Opening Tasks" button which calls a server action.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { generateTasksFromTemplate } from '@/lib/tasks/template-actions'
import Link from 'next/link'

type Props = {
  openingTemplateId: string | null
}

export function DailyOpsActionsBar({ openingTemplateId }: Props) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleGenerateTasks() {
    if (!openingTemplateId) return
    setGenerating(true)
    setResult(null)

    try {
      const _doab = new Date()
      const today = `${_doab.getFullYear()}-${String(_doab.getMonth() + 1).padStart(2, '0')}-${String(_doab.getDate()).padStart(2, '0')}`
      const tasks = await generateTasksFromTemplate(openingTemplateId, today)
      setResult({ type: 'success', message: `Generated ${tasks.length} opening tasks` })
      router.refresh()
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to generate tasks',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {/* Generate Opening Tasks */}
        {openingTemplateId ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateTasks}
            loading={generating}
            disabled={generating}
          >
            Generate Opening Tasks
          </Button>
        ) : (
          <Link href="/tasks/templates">
            <Button variant="secondary" size="sm">
              Create Opening Template
            </Button>
          </Link>
        )}

        {/* View Order Sheet */}
        <Link href="/stations/orders">
          <Button variant="secondary" size="sm">
            View Order Sheet
          </Button>
        </Link>

        {/* Clipboard Hub */}
        <Link href="/stations">
          <Button variant="ghost" size="sm">
            Clipboard Hub
          </Button>
        </Link>
      </div>

      {/* Result feedback */}
      {result && (
        <p className={`text-sm ${result.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}
