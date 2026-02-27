'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mergeProspects } from '@/lib/prospecting/pipeline-actions'
import { Loader2, Merge, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Prospect } from '@/lib/prospecting/types'

interface ProspectMergePanelProps {
  prospect: Prospect
  duplicates: Prospect[]
}

export function ProspectMergePanel({ prospect, duplicates }: ProspectMergePanelProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [mergedIds, setMergedIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  if (duplicates.length === 0) return null

  function handleMerge(duplicateId: string, duplicateName: string) {
    setResult(null)
    startTransition(async () => {
      try {
        await mergeProspects(prospect.id, duplicateId)
        setMergedIds((prev) => new Set([...prev, duplicateId]))
        setResult(`Merged "${duplicateName}" successfully`)
        router.refresh()
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Merge failed')
      }
    })
  }

  const remainingDuplicates = duplicates.filter((d) => !mergedIds.has(d.id))

  if (remainingDuplicates.length === 0 && mergedIds.size > 0) {
    return (
      <Card className="border-green-800 bg-green-950/20">
        <CardContent className="py-3">
          <p className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" />
            All duplicates merged.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-800 bg-amber-950/20">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          Possible Duplicates ({remainingDuplicates.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-stone-400">
          These prospects have similar names. Merge to combine their data into this record.
        </p>
        {remainingDuplicates.map((dup) => (
          <div
            key={dup.id}
            className="flex items-center justify-between rounded-lg bg-stone-800 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm text-stone-200 truncate">{dup.name}</p>
              <p className="text-xs text-stone-500">
                {[dup.city, dup.state].filter(Boolean).join(', ')}
                {dup.phone ? ` · ${dup.phone}` : ''}
                {' · Score: '}
                {dup.lead_score}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleMerge(dup.id, dup.name)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Merge className="h-3.5 w-3.5 mr-1" />
                  Merge
                </>
              )}
            </Button>
          </div>
        ))}
        {result && <p className="text-xs text-stone-400 mt-1">{result}</p>}
      </CardContent>
    </Card>
  )
}
