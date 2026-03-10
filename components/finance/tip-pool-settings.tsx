'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createTipPoolConfig,
  updateTipPoolConfig,
  deleteTipPoolConfig,
  type TipPoolConfig,
} from '@/lib/finance/staff-tip-actions'

// Staff roles from the staff_role enum
const AVAILABLE_ROLES = [
  { value: 'sous_chef', label: 'Sous Chef' },
  { value: 'kitchen_assistant', label: 'Kitchen Assistant' },
  { value: 'service_staff', label: 'Service Staff' },
  { value: 'server', label: 'Server' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'dishwasher', label: 'Dishwasher' },
  { value: 'other', label: 'Other' },
]

const POOL_METHODS = [
  {
    value: 'equal',
    label: 'Equal Split',
    description: 'Tips divided evenly among all participants',
  },
  {
    value: 'hours_based',
    label: 'Hours-Based',
    description: 'Tips distributed proportionally by hours worked',
  },
  {
    value: 'points_based',
    label: 'Points-Based',
    description: 'Coming soon (uses hours-based as fallback)',
  },
] as const

interface TipPoolSettingsProps {
  initialConfigs: TipPoolConfig[]
}

export function TipPoolSettings({ initialConfigs }: TipPoolSettingsProps) {
  const [configs, setConfigs] = useState<TipPoolConfig[]>(initialConfigs)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [method, setMethod] = useState<'equal' | 'hours_based' | 'points_based'>('equal')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  function resetForm() {
    setName('')
    setMethod('equal')
    setSelectedRoles([])
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  function startEdit(config: TipPoolConfig) {
    setName(config.name)
    setMethod(config.poolMethod)
    setSelectedRoles(config.includedRoles)
    setEditingId(config.id)
    setShowForm(true)
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function handleSave() {
    if (!name.trim()) {
      setError('Pool name is required')
      return
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateTipPoolConfig(editingId, {
            name: name.trim(),
            poolMethod: method,
            includedRoles: selectedRoles,
          })
          setConfigs((prev) =>
            prev.map((c) =>
              c.id === editingId
                ? { ...c, name: name.trim(), poolMethod: method, includedRoles: selectedRoles }
                : c
            )
          )
        } else {
          await createTipPoolConfig({
            name: name.trim(),
            poolMethod: method,
            includedRoles: selectedRoles,
          })
          // Reload would be ideal, but for now just add a placeholder
          setConfigs((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              tenantId: '',
              name: name.trim(),
              poolMethod: method,
              includedRoles: selectedRoles,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ])
        }
        resetForm()
      } catch (err) {
        setError('Failed to save pool configuration')
      }
    })
  }

  function handleToggleActive(config: TipPoolConfig) {
    startTransition(async () => {
      try {
        await updateTipPoolConfig(config.id, { isActive: !config.isActive })
        setConfigs((prev) =>
          prev.map((c) => (c.id === config.id ? { ...c, isActive: !c.isActive } : c))
        )
      } catch (err) {
        setError('Failed to update pool status')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteTipPoolConfig(id)
        setConfigs((prev) => prev.filter((c) => c.id !== id))
      } catch (err) {
        setError('Failed to delete pool configuration')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tip Pool Configurations</CardTitle>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} size="sm">
                New Pool
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          {/* Create / Edit form */}
          {showForm && (
            <div className="border border-stone-700 rounded-lg p-4 mb-6 space-y-4">
              <h3 className="text-sm font-semibold text-stone-200">
                {editingId ? 'Edit Pool' : 'New Pool'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Pool Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. FOH Pool, Default Pool"
                  />
                </div>
                <div>
                  <Label>Distribution Method</Label>
                  <select
                    value={method}
                    onChange={(e) =>
                      setMethod(e.target.value as 'equal' | 'hours_based' | 'points_based')
                    }
                    className="block w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200"
                  >
                    {POOL_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-stone-500 mt-1">
                    {POOL_METHODS.find((m) => m.value === method)?.description}
                  </p>
                </div>
              </div>

              <div>
                <Label>Included Roles (leave empty for all roles)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABLE_ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => toggleRole(role.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedRoles.includes(role.value)
                          ? 'bg-brand-600 border-brand-500 text-white'
                          : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isPending}>
                  {editingId ? 'Save Changes' : 'Create Pool'}
                </Button>
                <Button variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing configs */}
          {configs.length === 0 ? (
            <p className="text-sm text-stone-500">
              No tip pools configured. Create one to start distributing tips.
            </p>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-stone-700 bg-stone-800"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-200">{config.name}</p>
                      <Badge variant={config.isActive ? 'success' : 'default'}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-stone-400 mt-0.5">
                      Method: {config.poolMethod.replace('_', ' ')}
                      {config.includedRoles.length > 0 && (
                        <span>
                          {' '}
                          · Roles:{' '}
                          {config.includedRoles
                            .map((r) => AVAILABLE_ROLES.find((ar) => ar.value === r)?.label ?? r)
                            .join(', ')}
                        </span>
                      )}
                      {config.includedRoles.length === 0 && <span> · All roles</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(config)}
                      disabled={isPending}
                    >
                      {config.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(config)}
                      disabled={isPending}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                      disabled={isPending}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
