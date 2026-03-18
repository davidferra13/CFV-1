'use client'

import { useState } from 'react'
import { FileText, Download, Sparkles, AlertTriangle } from '@/components/ui/icons'
import { TaskLoader } from '@/components/ui/task-loader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generateContract, type GeneratedContract } from '@/lib/ai/contract-generator'
import { toast } from 'sonner'

export function ContractGeneratorPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<GeneratedContract | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await generateContract(eventId)
      setResult(data)
      setExpanded(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Contract generation failed')
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!result) return
    const blob = new Blob([result.fullMarkdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'service-agreement-draft.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Service Agreement Draft</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <TaskLoader contextId="gen-contract" />
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Contract
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Full service agreement with payment terms, cancellation policy, and allergen clauses.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">{result.title}</span>
          <Badge variant="warning">Draft</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleDownload}>
            <Download className="w-3 h-3 mr-1" />
            Save .md
          </Button>
          <Button variant="ghost" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <TaskLoader message="Regenerating..." iconSize={12} /> : 'Regenerate'}
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-amber-950 border border-amber-200 rounded p-2 text-xs text-amber-800">
        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        {result.disclaimer}
      </div>

      {expanded && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {result.sections.map((section, i) => (
            <div key={i} className="border-b border-stone-800 pb-2">
              <h4 className="text-xs font-semibold text-stone-300 mb-1">{section.heading}</h4>
              <p className="text-xs text-stone-400 whitespace-pre-wrap">{section.content}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs-tight text-stone-400">
        Draft · {new Date(result.generatedAt).toLocaleDateString()} · Review every clause before
        sending to client
      </p>
    </div>
  )
}
