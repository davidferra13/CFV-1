'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  createConnection,
  updateConnection,
  removeConnection,
  type ClientConnection,
} from '@/lib/connections/actions'

const RELATIONSHIP_SUGGESTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'partner', label: 'Partner' },
  { value: 'friend', label: 'Friend' },
  { value: 'family', label: 'Family' },
  { value: 'acquaintance', label: 'Acquaintance' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'regular_guest', label: 'Regular Guest' },
  { value: 'referral', label: 'Referral' },
]

type AvailableClient = {
  id: string
  full_name: string
  email: string
}

export function ClientConnections({
  clientId,
  connections,
  allClients,
}: {
  clientId: string
  connections: ClientConnection[]
  allClients: AvailableClient[]
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [selectedClientId, setSelectedClientId] = useState('')
  const [relationshipType, setRelationshipType] = useState('')
  const [customType, setCustomType] = useState('')
  const [notes, setNotes] = useState('')

  // Edit form state
  const [editRelationshipType, setEditRelationshipType] = useState('')
  const [editCustomType, setEditCustomType] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Filter out already-connected clients and self
  const connectedIds = new Set(connections.map((c) => c.connected_client_id))
  connectedIds.add(clientId)
  const availableClients = allClients.filter((c) => !connectedIds.has(c.id))

  function resetAddForm() {
    setSelectedClientId('')
    setRelationshipType('')
    setCustomType('')
    setNotes('')
    setError(null)
    setAdding(false)
  }

  function getEffectiveType(type: string, custom: string) {
    return type === 'custom' ? custom.trim() : type
  }

  async function handleAdd() {
    const effectiveType = getEffectiveType(relationshipType, customType)
    if (!selectedClientId || !effectiveType) {
      setError('Select a client and relationship type')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createConnection({
        client_a_id: clientId,
        client_b_id: selectedClientId,
        relationship_type: effectiveType,
        notes: notes || undefined,
      })
      resetAddForm()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add connection')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(conn: ClientConnection) {
    const isSuggested = RELATIONSHIP_SUGGESTIONS.some((s) => s.value === conn.relationship_type)
    setEditingId(conn.id)
    setEditRelationshipType(isSuggested ? conn.relationship_type : 'custom')
    setEditCustomType(isSuggested ? '' : conn.relationship_type)
    setEditNotes(conn.notes ?? '')
    setError(null)
  }

  async function handleUpdate(connectionId: string) {
    const effectiveType = getEffectiveType(editRelationshipType, editCustomType)
    if (!effectiveType) {
      setError('Relationship type is required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updateConnection(connectionId, {
        relationship_type: effectiveType,
        notes: editNotes || null,
      })
      setEditingId(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update connection')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(connectionId: string) {
    setSaving(true)
    setError(null)
    try {
      await removeConnection(connectionId)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove connection')
    } finally {
      setSaving(false)
    }
  }

  function formatType(type: string) {
    const found = RELATIONSHIP_SUGGESTIONS.find((s) => s.value === type)
    if (found) return found.label
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Connections</CardTitle>
          {!adding && (
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              Add Connection
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}

        {/* Existing connections */}
        {connections.length === 0 && !adding && (
          <p className="text-sm text-stone-500">
            No connections yet. Link this client to others to track relationships.
          </p>
        )}

        {connections.length > 0 && (
          <div className="space-y-2 mb-4">
            {connections.map((conn) => (
              <div key={conn.id}>
                {editingId === conn.id ? (
                  /* Edit mode */
                  <div className="p-3 rounded-lg border border-brand-200 bg-brand-50/30 space-y-2">
                    <div className="flex gap-2">
                      <Select
                        value={editRelationshipType}
                        onChange={(e) => setEditRelationshipType(e.target.value)}
                        options={[
                          ...RELATIONSHIP_SUGGESTIONS,
                          { value: 'custom', label: 'Custom...' },
                        ]}
                      />
                      {editRelationshipType === 'custom' && (
                        <Input
                          placeholder="e.g., neighbor"
                          value={editCustomType}
                          onChange={(e) => setEditCustomType(e.target.value)}
                        />
                      )}
                    </div>
                    <Input
                      placeholder="Notes (optional)"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(conn.id)} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-stone-50 group">
                    <div className="min-w-0">
                      <a
                        href={`/clients/${conn.connected_client_id}`}
                        className="text-sm font-medium text-brand-700 hover:text-brand-800"
                      >
                        {conn.connected_client_name}
                      </a>
                      <span className="mx-2 text-stone-300">-</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-200 text-stone-700">
                        {formatType(conn.relationship_type)}
                      </span>
                      {conn.notes && (
                        <p className="text-xs text-stone-500 mt-0.5 truncate">{conn.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(conn)} disabled={saving}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(conn.id)} disabled={saving}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add connection form */}
        {adding && (
          <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50 space-y-3">
            <Select
              label="Client"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              options={availableClients.map((c) => ({
                value: c.id,
                label: `${c.full_name} (${c.email})`,
              }))}
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  label="Relationship"
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  options={[
                    ...RELATIONSHIP_SUGGESTIONS,
                    { value: 'custom', label: 'Custom...' },
                  ]}
                />
              </div>
              {relationshipType === 'custom' && (
                <div className="flex-1">
                  <Input
                    label="Custom Type"
                    placeholder="e.g., neighbor"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                  />
                </div>
              )}
            </div>
            <Input
              label="Notes (optional)"
              placeholder="e.g., Referred by Sarah, met at gala"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? 'Adding...' : 'Add Connection'}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAddForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
