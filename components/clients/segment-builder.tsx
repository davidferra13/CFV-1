'use client'
import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { createSegment } from '@/lib/clients/segments'
import { toast } from 'sonner'

interface Filter { field: string; op: string; value: string }

const FIELD_OPTIONS = [
  { value: 'total_spend_cents', label: 'Total Spend' },
  { value: 'event_count', label: 'Number of Events' },
  { value: 'days_since_last_event', label: 'Days Since Last Event' },
  { value: 'status', label: 'Client Status' },
]
const OP_OPTIONS = [
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equals' },
]

export function SegmentBuilder() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [filters, setFilters] = useState<Filter[]>([{ field: 'days_since_last_event', op: 'gt', value: '90' }])
  const [color, setColor] = useState('#6366f1')
  const [isPending, startTransition] = useTransition()

  function addFilter() { setFilters(prev => [...prev, { field: 'status', op: 'eq', value: 'active' }]) }
  function removeFilter(i: number) { setFilters(prev => prev.filter((_, idx) => idx !== i)) }
  function updateFilter(i: number, key: keyof Filter, value: string) {
    setFilters(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: value } : f))
  }

  function handleSave() {
    if (!name.trim()) return toast.error('Segment name is required')
    startTransition(async () => {
      try {
        await createSegment({ name, description, filters, color })
        toast.success('Segment created!')
        setName(''); setDescription(''); setFilters([{ field: 'days_since_last_event', op: 'gt', value: '90' }])
      } catch (err: any) { toast.error(err.message) }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Create New Segment</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Segment Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., High-Value Dormant" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Color</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-20 rounded border border-stone-300" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-stone-700">Filters</label>
            <Button size="sm" variant="ghost" onClick={addFilter}><Plus className="h-4 w-4 mr-1" />Add Filter</Button>
          </div>
          {filters.map((f, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <select value={f.field} onChange={e => updateFilter(i, 'field', e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm flex-1">
                {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={f.op} onChange={e => updateFilter(i, 'op', e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-36">
                {OP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-28" placeholder="Value" />
              <button onClick={() => removeFilter(i)} className="text-stone-400 hover:text-red-500"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} loading={isPending}>Save Segment</Button>
      </CardContent>
    </Card>
  )
}
