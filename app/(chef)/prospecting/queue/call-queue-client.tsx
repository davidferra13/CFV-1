'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildDailyQueue } from '@/lib/prospecting/queue-actions'
import { getScriptForCategory } from '@/lib/prospecting/script-actions'
import { QueueCard } from '@/components/prospecting/queue-card'
import { Loader2, Phone } from 'lucide-react'
import type { Prospect, CallScript } from '@/lib/prospecting/types'

export function CallQueueClient() {
  const [count, setCount] = useState(10)
  const [queue, setQueue] = useState<Prospect[]>([])
  const [scripts, setScripts] = useState<Record<string, CallScript | null>>({})
  const [isPending, startTransition] = useTransition()
  const [built, setBuilt] = useState(false)

  function handleBuild() {
    startTransition(async () => {
      const prospects = await buildDailyQueue(count)
      setQueue(prospects)
      setBuilt(true)

      // Load scripts for each unique category
      const categories = [...new Set(prospects.map((p) => p.category))]
      const scriptMap: Record<string, CallScript | null> = {}
      for (const cat of categories) {
        try {
          scriptMap[cat] = await getScriptForCategory(cat)
        } catch {
          scriptMap[cat] = null
        }
      }
      setScripts(scriptMap)
    })
  }

  return (
    <div className="space-y-6">
      {!built && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-brand-500" />
              Build Your Call Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-stone-700">How many calls today?</label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
              >
                <option value={5}>5 calls</option>
                <option value={10}>10 calls</option>
                <option value={15}>15 calls</option>
                <option value={20}>20 calls</option>
                <option value={30}>30 calls</option>
                <option value={50}>50 calls</option>
              </select>
            </div>
            <Button onClick={handleBuild} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Building queue...
                </>
              ) : (
                'Build Queue'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {built && queue.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-stone-500">
            <p className="text-lg font-medium">No prospects available for calling</p>
            <p className="text-sm mt-1">
              Run an{' '}
              <a href="/prospecting/scrub" className="text-brand-600 hover:underline">
                AI Scrub
              </a>{' '}
              first to generate prospects.
            </p>
          </CardContent>
        </Card>
      )}

      {built && queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">
              Today&apos;s Queue ({queue.length} prospects)
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setBuilt(false)}>
              Rebuild Queue
            </Button>
          </div>
          {queue.map((prospect) => (
            <QueueCard key={prospect.id} prospect={prospect} script={scripts[prospect.category]} />
          ))}
        </div>
      )}
    </div>
  )
}
