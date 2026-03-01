'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, X, Filter, Users, Search } from 'lucide-react'
import { buildBehavioralSegment, getSegmentPreview } from '@/lib/marketing/segmentation-actions'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterCriteria {
  minEvents?: number
  maxEvents?: number
  minSpendCents?: number
  lastEventBefore?: string
  lastEventAfter?: string
  tags?: string[]
}

interface Segment {
  id: string
  name: string
  filterCriteria: FilterCriteria
}

interface BehavioralSegmentBuilderProps {
  segments: Segment[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BehavioralSegmentBuilder({
  segments: initialSegments,
}: BehavioralSegmentBuilderProps) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments)
  const [isPending, startTransition] = useTransition()
  const [showBuilder, setShowBuilder] = useState(false)

  // Builder form state
  const [segmentName, setSegmentName] = useState('')
  const [minEvents, setMinEvents] = useState('')
  const [maxEvents, setMaxEvents] = useState('')
  const [minSpendDollars, setMinSpendDollars] = useState('')
  const [lastEventBefore, setLastEventBefore] = useState('')
  const [lastEventAfter, setLastEventAfter] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  function resetBuilder() {
    setSegmentName('')
    setMinEvents('')
    setMaxEvents('')
    setMinSpendDollars('')
    setLastEventBefore('')
    setLastEventAfter('')
    setTagsInput('')
    setPreviewCount(null)
    setShowBuilder(false)
  }

  function buildFilterCriteria(): FilterCriteria {
    const criteria: FilterCriteria = {}
    if (minEvents) criteria.minEvents = parseInt(minEvents, 10)
    if (maxEvents) criteria.maxEvents = parseInt(maxEvents, 10)
    if (minSpendDollars) criteria.minSpendCents = Math.round(parseFloat(minSpendDollars) * 100)
    if (lastEventBefore) criteria.lastEventBefore = lastEventBefore
    if (lastEventAfter) criteria.lastEventAfter = lastEventAfter
    if (tagsInput.trim()) {
      criteria.tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    }
    return criteria
  }

  function handlePreview() {
    const criteria = buildFilterCriteria()
    startTransition(async () => {
      try {
        const preview = await getSegmentPreview(criteria)
        setPreviewCount(preview.count)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to preview segment'
        toast.error(message)
      }
    })
  }

  function handleSave() {
    if (!segmentName.trim()) {
      toast.error('Segment name is required')
      return
    }

    const criteria = buildFilterCriteria()
    if (Object.keys(criteria).length === 0) {
      toast.error('Add at least one filter criteria')
      return
    }

    startTransition(async () => {
      try {
        const result = await buildBehavioralSegment({
          name: segmentName.trim(),
          filters: criteria,
        })
        if (result.segment) {
          setSegments((prev) => [
            ...prev,
            {
              id: result.segment.id,
              name: result.segment.name,
              filterCriteria: result.segment.filters as unknown as FilterCriteria,
            },
          ])
        }
        resetBuilder()
        toast.success('Segment created')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create segment'
        toast.error(message)
      }
    })
  }

  function handleDelete(segmentId: string) {
    // Delete action not yet available on the server; remove from local view only
    setSegments((prev) => prev.filter((s) => s.id !== segmentId))
    toast.info('Segment hidden from view (server-side delete coming soon)')
  }

  function formatCriteria(criteria: FilterCriteria): string[] {
    const parts: string[] = []
    if (criteria.minEvents != null) parts.push(`Min ${criteria.minEvents} events`)
    if (criteria.maxEvents != null) parts.push(`Max ${criteria.maxEvents} events`)
    if (criteria.minSpendCents != null)
      parts.push(`Min spend $${(criteria.minSpendCents / 100).toFixed(2)}`)
    if (criteria.lastEventBefore) parts.push(`Last event before ${criteria.lastEventBefore}`)
    if (criteria.lastEventAfter) parts.push(`Last event after ${criteria.lastEventAfter}`)
    if (criteria.tags && criteria.tags.length > 0) parts.push(`Tags: ${criteria.tags.join(', ')}`)
    return parts
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Behavioral Segments</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setShowBuilder(!showBuilder)}>
          <Plus className="h-4 w-4 mr-1" />
          New Segment
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Builder Form */}
        {showBuilder && (
          <div className="rounded-lg border border-brand-700 bg-brand-950/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Build Segment
              </h4>
              <button onClick={resetBuilder} className="text-stone-400 hover:text-stone-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <Input
              label="Segment Name"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              placeholder="e.g., High-Frequency VIP Clients"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min Events"
                type="number"
                value={minEvents}
                onChange={(e) => setMinEvents(e.target.value)}
                placeholder="e.g., 3"
                helperText="Minimum completed events"
              />
              <Input
                label="Max Events"
                type="number"
                value={maxEvents}
                onChange={(e) => setMaxEvents(e.target.value)}
                placeholder="e.g., 10"
                helperText="Maximum completed events"
              />
            </div>

            <Input
              label="Min Total Spend ($)"
              type="number"
              value={minSpendDollars}
              onChange={(e) => setMinSpendDollars(e.target.value)}
              placeholder="e.g., 5000"
              helperText="Minimum lifetime spend in dollars"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Last Event Before"
                type="date"
                value={lastEventBefore}
                onChange={(e) => setLastEventBefore(e.target.value)}
                helperText="Clients whose last event was before this date"
              />
              <Input
                label="Last Event After"
                type="date"
                value={lastEventAfter}
                onChange={(e) => setLastEventAfter(e.target.value)}
                helperText="Clients whose last event was after this date"
              />
            </div>

            <Input
              label="Tags (comma-separated)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., vip, corporate, repeat"
              helperText="Filter by client tags"
            />

            {/* Preview Count */}
            {previewCount !== null && (
              <div className="rounded-lg bg-stone-800 p-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-stone-400" />
                <span className="text-sm font-medium text-stone-100">
                  {previewCount} client{previewCount !== 1 ? 's' : ''} match this segment
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handlePreview} loading={isPending}>
                <Search className="h-3 w-3 mr-1" />
                Preview Count
              </Button>
              <Button size="sm" onClick={handleSave} loading={isPending}>
                Save Segment
              </Button>
              <Button size="sm" variant="ghost" onClick={resetBuilder}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing Segments */}
        {segments.length > 0 && (
          <div className="space-y-2">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="rounded-lg border border-stone-700 p-4 hover:bg-stone-800 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-stone-100">{segment.name}</p>
                  <button
                    onClick={() => handleDelete(segment.id)}
                    className="p-1.5 rounded text-stone-400 hover:text-red-500 hover:bg-stone-700"
                    title="Delete segment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formatCriteria(segment.filterCriteria).map((label, i) => (
                    <Badge key={i} variant="info">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {segments.length === 0 && !showBuilder && (
          <p className="text-sm text-stone-400 italic text-center py-8">
            No behavioral segments yet. Create one to target specific client groups.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
