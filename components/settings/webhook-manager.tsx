'use client'
import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createWebhookEndpoint, deleteWebhookEndpoint } from '@/lib/webhooks/actions'

interface WebhookEndpoint { id: string; url: string; events: string[]; is_active: boolean; description?: string }

const AVAILABLE_EVENTS = [
  'event.completed', 'event.confirmed', 'payment.received',
  'inquiry.created', 'inquiry.converted', 'client.created',
]

export function WebhookManager({ endpoints }: { endpoints: WebhookEndpoint[] }) {
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['event.completed'])
  const [isPending, startTransition] = useTransition()

  function toggleEvent(e: string) {
    setSelectedEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  function handleAdd() {
    if (!url.trim()) return toast.error('URL is required')
    try { new URL(url) } catch { return toast.error('Invalid URL') }
    startTransition(async () => {
      try {
        await createWebhookEndpoint({ url, description, events: selectedEvents })
        toast.success('Webhook endpoint created')
        setShowForm(false); setUrl(''); setDescription('')
      } catch (err: any) { toast.error(err.message) }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteWebhookEndpoint(id)
        toast.success('Endpoint deleted')
      } catch (err: any) { toast.error(err.message) }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-600">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} configured</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Add Endpoint</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Webhook Endpoint</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Endpoint URL *</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-app.com/webhooks/chefflow" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this endpoint do?" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Events to Subscribe</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EVENTS.map(e => (
                  <button key={e} onClick={() => toggleEvent(e)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedEvents.includes(e) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-stone-700 border-stone-300 hover:border-brand-400'}`}>{e}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} loading={isPending}>Create Endpoint</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {endpoints.length === 0 && !showForm && (
        <Card><CardContent className="py-12 text-center"><p className="text-stone-500">No webhook endpoints configured yet.</p></CardContent></Card>
      )}
      {endpoints.map(ep => (
        <Card key={ep.id}>
          <CardContent className="flex items-start justify-between py-4">
            <div>
              <p className="font-medium text-stone-900 font-mono text-sm">{ep.url}</p>
              {ep.description && <p className="text-sm text-stone-500 mt-1">{ep.description}</p>}
              <div className="flex flex-wrap gap-1 mt-2">
                {ep.events?.map(e => <Badge key={e} variant="default">{e}</Badge>)}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={ep.is_active ? 'success' : 'error'}>{ep.is_active ? 'Active' : 'Inactive'}</Badge>
              <Button size="sm" variant="danger" onClick={() => handleDelete(ep.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
