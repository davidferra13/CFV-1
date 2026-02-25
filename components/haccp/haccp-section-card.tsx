'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toggleHACCPSection, updateHACCPSectionNotes } from '@/lib/haccp/actions'
import type { SectionOverride } from '@/lib/haccp/types'

type Props = {
  sectionId: string
  title: string
  sectionNumber?: string
  children: React.ReactNode
  override?: SectionOverride
  customNotes?: string
}

export function HACCPSectionCard({
  sectionId,
  title,
  sectionNumber,
  children,
  override,
  customNotes,
}: Props) {
  const enabled = override?.enabled ?? true
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(customNotes ?? override?.customNotes ?? '')
  const [isPending, startTransition] = useTransition()

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      await toggleHACCPSection(sectionId, checked)
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateHACCPSectionNotes(sectionId, notes)
      setShowNotes(false)
    })
  }

  return (
    <Card className={`transition-opacity ${!enabled ? 'opacity-50' : ''}`}>
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {sectionNumber && <Badge variant="default">{sectionNumber}</Badge>}
            <h3 className="font-semibold text-stone-100">{title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <span className="text-xs text-stone-500">{enabled ? 'On' : 'Off'}</span>
            <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isPending} />
          </div>
        </div>

        {enabled && (
          <>
            <div className="text-sm text-stone-300 space-y-2">{children}</div>

            {/* Custom notes */}
            {override?.customNotes && !showNotes && (
              <div className="rounded-md bg-stone-800 border border-stone-700 px-3 py-2">
                <p className="text-xs font-medium text-stone-400 mb-1">Your notes</p>
                <p className="text-sm text-stone-300">{override.customNotes}</p>
              </div>
            )}

            <div className="print:hidden">
              {showNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add your own notes for this section..."
                    className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={handleSaveNotes} disabled={isPending}>
                      {isPending ? 'Saving...' : 'Save Notes'}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNotes(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNotes(true)}
                  className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {override?.customNotes ? 'Edit notes' : '+ Add notes'}
                </button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
