// New Conversation Button — Opens a client picker to start a new chat
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { getClients } from '@/lib/clients/actions'
import { getOrCreateConversation } from '@/lib/chat/actions'
import { MessageCircle, Search } from 'lucide-react'

type Client = {
  id: string
  full_name: string
  email: string
  phone: string | null
}

export function NewConversationButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Fetch clients when modal opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    getClients()
      .then((data) => setClients(data as Client[]))
      .catch(() => setError('Failed to load clients'))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    )
  }, [clients, search])

  const handleSelect = async (client: Client) => {
    setCreating(true)
    setError(null)
    try {
      const result = await getOrCreateConversation({
        client_id: client.id,
        context_type: 'standalone',
      })
      if (result.success) {
        setOpen(false)
        router.push(`/chat/${result.conversation.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation')
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setSearch('')
    setError(null)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New Conversation</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

          {/* Modal */}
          <div className="relative bg-stone-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-100">New Conversation</h3>
              <button
                onClick={handleClose}
                className="text-stone-400 hover:text-stone-400 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-sm text-stone-500">Select a client to start a conversation with.</p>

            {error && <Alert variant="error">{error}</Alert>}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {/* Client List */}
            <div className="max-h-64 overflow-y-auto border border-stone-700 rounded-lg divide-y divide-stone-800">
              {loading ? (
                <div className="p-8 text-center text-sm text-stone-400">Loading clients...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-stone-400">
                  {clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
                </div>
              ) : (
                filtered.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelect(client)}
                    disabled={creating}
                    className="w-full text-left px-4 py-3 hover:bg-stone-800 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-stone-100 text-sm">{client.full_name}</div>
                    <div className="text-xs text-stone-500">{client.email}</div>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleClose} disabled={creating}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
