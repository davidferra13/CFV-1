'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getEventTemplates, quickCreateFromTemplate } from '@/lib/events/template-actions'

type Client = { id: string; full_name: string }

type Props = {
  clients: Client[]
  onClose: () => void
}

export function QuickCreateFromTemplate({ clients, onClose }: Props) {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [guestCount, setGuestCount] = useState<number | ''>('')
  const [clientSearch, setClientSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    getEventTemplates().then((t) => {
      setTemplates(t)
      setLoading(false)
    })
  }, [])

  const filteredClients = clientSearch
    ? clients.filter((c) => c.full_name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients

  async function handleCreate() {
    if (!selectedTemplate || !selectedClient || !eventDate) return
    setCreating(true)
    try {
      const result = await quickCreateFromTemplate({
        templateId: selectedTemplate,
        clientId: selectedClient,
        eventDate,
        guestCount: guestCount || undefined,
      })
      router.push(`/events/${result.eventId}`)
    } catch (err) {
      console.error('[QuickCreate]', err)
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">Quick Create from Template</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            &times;
          </button>
        </div>

        {loading ? (
          <p className="text-stone-400 text-sm">Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-stone-400 text-sm">
            No templates yet. Save an event as a template first.
          </p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100"
              >
                <option value="">Select template...</option>
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.occasion ? `(${t.occasion})` : ''}{' '}
                    {t.use_count > 0 ? `[used ${t.use_count}x]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Client</label>
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 mb-2"
              />
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100"
                size={Math.min(filteredClients.length, 5)}
              >
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Event Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Guest Count <span className="text-stone-500 font-normal">(optional override)</span>
              </label>
              <input
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="Use template default"
                className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !selectedTemplate || !selectedClient || !eventDate}
              className="w-full py-2.5 rounded-lg font-medium text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create Event'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
