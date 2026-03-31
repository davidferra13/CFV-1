'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus } from '@/components/ui/icons'
import {
  getOrCreateDirectCollabSpace,
  createWorkspaceCollabSpace,
} from '@/lib/network/collab-space-actions'

type Connection = {
  id: string
  business_name: string
  display_name: string | null
  profile_image_url: string | null
  chef_id: string
}

interface Props {
  connections: Connection[]
  mode: 'direct' | 'workspace'
}

export function CreateSpaceForm({ connections, mode }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedChefId, setSelectedChefId] = useState('')
  const [selectedChefIds, setSelectedChefIds] = useState<string[]>([])
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceDesc, setWorkspaceDesc] = useState('')
  const [isLocked, setIsLocked] = useState(false)

  function handleDirectSubmit() {
    if (!selectedChefId) {
      toast.error('Select a connection first.')
      return
    }
    startTransition(async () => {
      try {
        const result = await getOrCreateDirectCollabSpace({ otherChefId: selectedChefId })
        if (result.success && result.spaceId) {
          if (result.created) {
            toast.success('Direct space created.')
          }
          router.push(`/network/collabs/${result.spaceId}`)
        } else {
          toast.error(result.error || 'Failed to create space.')
        }
      } catch {
        toast.error('Something went wrong.')
      }
    })
  }

  function handleWorkspaceSubmit() {
    if (!workspaceName.trim()) {
      toast.error('Enter a workspace name.')
      return
    }
    startTransition(async () => {
      try {
        const result = await createWorkspaceCollabSpace({
          name: workspaceName.trim(),
          description: workspaceDesc.trim() || undefined,
          memberChefIds: selectedChefIds.length ? selectedChefIds : undefined,
          isLocked,
        })
        if (result.success && result.spaceId) {
          toast.success('Workspace created.')
          router.push(`/network/collabs/${result.spaceId}`)
        } else {
          toast.error(result.error || 'Failed to create workspace.')
        }
      } catch {
        toast.error('Something went wrong.')
      }
    })
  }

  if (mode === 'direct') {
    return (
      <Card className="bg-stone-900 border-stone-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-stone-200 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            Start Direct Space
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-stone-500">
            One persistent channel per chef pair. If one already exists, you will be taken to it.
          </p>
          <select
            value={selectedChefId}
            onChange={(e) => setSelectedChefId(e.target.value)}
            className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200"
          >
            <option value="">Select a connection...</option>
            {connections.map((c) => (
              <option key={c.chef_id} value={c.chef_id}>
                {c.business_name || c.display_name || 'Chef'}
              </option>
            ))}
          </select>
          <Button
            onClick={handleDirectSubmit}
            disabled={pending || !selectedChefId}
            className="w-full"
            variant="primary"
          >
            {pending ? 'Opening...' : 'Open Direct Space'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-stone-900 border-stone-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-stone-200 flex items-center gap-2">
          <Plus className="h-4 w-4 text-amber-500" />
          Create Workspace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-stone-500">
          Named workspace for solo use or multi-chef collaboration. Can coexist with direct spaces.
        </p>
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Workspace name"
          maxLength={120}
          className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500"
        />
        <input
          type="text"
          value={workspaceDesc}
          onChange={(e) => setWorkspaceDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500"
        />
        <div>
          <label className="text-xs text-stone-400 block mb-1">Add members (optional)</label>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {connections.map((c) => (
              <label
                key={c.chef_id}
                className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedChefIds.includes(c.chef_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChefIds((prev) => [...prev, c.chef_id])
                    } else {
                      setSelectedChefIds((prev) => prev.filter((id) => id !== c.chef_id))
                    }
                  }}
                  className="rounded border-stone-600"
                />
                {c.business_name || c.display_name || 'Chef'}
              </label>
            ))}
            {connections.length === 0 && (
              <p className="text-xs text-stone-500">No connections yet. Solo workspace only.</p>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer">
          <input
            type="checkbox"
            checked={isLocked}
            onChange={(e) => setIsLocked(e.target.checked)}
            className="rounded border-stone-600"
          />
          Lock membership (prevent future changes)
        </label>
        <Button
          onClick={handleWorkspaceSubmit}
          disabled={pending || !workspaceName.trim()}
          className="w-full"
          variant="primary"
        >
          {pending ? 'Creating...' : 'Create Workspace'}
        </Button>
      </CardContent>
    </Card>
  )
}
