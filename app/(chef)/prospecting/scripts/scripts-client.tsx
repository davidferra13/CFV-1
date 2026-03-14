'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScriptEditor, ScriptList } from '@/components/prospecting/script-editor'
import type { CallScript } from '@/lib/prospecting/types'
import { Plus } from '@/components/ui/icons'

interface ScriptsPageClientProps {
  scripts: CallScript[]
}

export function ScriptsPageClient({ scripts }: ScriptsPageClientProps) {
  const [selected, setSelected] = useState<CallScript | null>(null)
  const [showNew, setShowNew] = useState(false)

  function handleSelect(script: CallScript) {
    setSelected(script)
    setShowNew(false)
  }

  function handleNew() {
    setSelected(null)
    setShowNew(true)
  }

  function handleSaved() {
    setSelected(null)
    setShowNew(false)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Script List */}
      <div className="lg:col-span-2 space-y-3">
        <Button onClick={handleNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Script
        </Button>
        <ScriptList scripts={scripts} onSelect={handleSelect} selectedId={selected?.id} />
      </div>

      {/* Editor */}
      <div className="lg:col-span-3">
        {showNew && <ScriptEditor onSaved={handleSaved} />}
        {selected && !showNew && (
          <ScriptEditor script={selected} onSaved={handleSaved} key={selected.id} />
        )}
        {!showNew && !selected && (
          <div className="rounded-lg border border-dashed border-stone-600 p-12 text-center text-stone-400">
            <p className="text-sm">Select a script to edit or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  )
}
