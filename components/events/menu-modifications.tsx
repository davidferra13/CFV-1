'use client'

// MenuModifications — Log and manage differences between proposed and served menu.
// Extended with optional photo proof upload per modification record.

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  logMenuModification,
  deleteMenuModification,
  uploadModificationPhoto,
} from '@/lib/menus/modifications'

const MODIFICATION_TYPES = [
  { value: 'substitution', label: 'Substituted' },
  { value: 'addition', label: 'Added (not on menu)' },
  { value: 'removal', label: 'Not served' },
  { value: 'method_change', label: 'Method changed' },
] as const

const COMMON_REASONS = [
  'Item unavailable',
  'Had substitute on hand',
  "Chef's choice",
  'Client request',
  'Forgot ingredient/equipment',
  'Quality issue at store',
]

type Modification = {
  id: string
  modification_type: string
  original_description: string | null
  actual_description: string | null
  reason: string | null
  photo_url: string | null
  created_at: string
}

export function MenuModifications({
  eventId,
  initialModifications,
}: {
  eventId: string
  initialModifications: Modification[]
}) {
  const [mods, setMods] = useState<Modification[]>(initialModifications)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [modType, setModType] = useState<string>('substitution')
  const [original, setOriginal] = useState('')
  const [actual, setActual] = useState('')
  const [reason, setReason] = useState('')

  // Track signed URLs for photos uploaded this session
  const [sessionPhotoUrls, setSessionPhotoUrls] = useState<Record<string, string>>({})
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleAdd() {
    if (!original && !actual) return
    setSaving(true)
    try {
      const result = await logMenuModification({
        event_id: eventId,
        modification_type: modType as any,
        original_description: original || null,
        actual_description: actual || null,
        reason: reason || null,
      })
      if (result.modification) {
        setMods([...mods, result.modification as unknown as Modification])
      }
      setIsAdding(false)
      setOriginal('')
      setActual('')
      setReason('')
      setModType('substitution')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    try {
      await deleteMenuModification(id, eventId)
      setMods(mods.filter((m) => m.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setRemovingId(null)
    }
  }

  function handleAddPhotoClick(modId: string) {
    uploadTargetRef.current = modId
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const targetModId = uploadTargetRef.current
    if (!file || !targetModId) return
    e.target.value = '' // reset so same file can re-trigger onChange
    setUploadingPhotoFor(targetModId)
    const formData = new FormData()
    formData.set('photo', file)
    startTransition(async () => {
      try {
        const result = await uploadModificationPhoto(targetModId, eventId, formData)
        if (result.success) {
          setSessionPhotoUrls((prev) => ({ ...prev, [targetModId]: result.signedUrl }))
        }
      } catch (err) {
        toast.error('Failed to upload modification photo')
      }
      setUploadingPhotoFor(null)
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Menu Changes</CardTitle>
          {!isAdding && (
            <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
              Log Change
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Shared hidden file input for all modification rows */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload modification photo"
        />

        {mods.length === 0 && !isAdding && (
          <p className="text-sm text-stone-500">
            No menu changes recorded. Log any differences between what was proposed and what was
            served.
          </p>
        )}

        {mods.length > 0 && (
          <div className="space-y-3 mb-4">
            {mods.map((m) => {
              const sessionUrl = sessionPhotoUrls[m.id] ?? null
              const hasPhoto = !!sessionUrl || !!m.photo_url
              return (
                <div key={m.id} className="py-2 border-b border-stone-800 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-800 text-stone-300 capitalize">
                          {m.modification_type.replace('_', ' ')}
                        </span>
                        {hasPhoto && (
                          <span className="text-xs text-emerald-600 font-medium">
                            photo attached
                          </span>
                        )}
                      </div>
                      {m.original_description && m.actual_description && (
                        <p className="text-sm text-stone-100 mt-1">
                          {m.original_description} &rarr; {m.actual_description}
                        </p>
                      )}
                      {m.original_description && !m.actual_description && (
                        <p className="text-sm text-stone-100 mt-1">
                          {m.original_description} (not served)
                        </p>
                      )}
                      {!m.original_description && m.actual_description && (
                        <p className="text-sm text-stone-100 mt-1">Added: {m.actual_description}</p>
                      )}
                      {m.reason && (
                        <p className="text-xs text-stone-500 mt-0.5">Reason: {m.reason}</p>
                      )}
                      {sessionUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sessionUrl}
                          alt="Modification proof"
                          className="mt-2 max-h-32 rounded-md border border-stone-700 object-contain bg-stone-800"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!hasPhoto && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddPhotoClick(m.id)}
                          disabled={uploadingPhotoFor === m.id}
                          className="text-stone-500 hover:text-stone-300 text-xs"
                        >
                          {uploadingPhotoFor === m.id ? 'Uploading...' : 'Add Photo'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(m.id)}
                        disabled={removingId === m.id || saving}
                        className="text-red-600 hover:text-red-200"
                      >
                        {removingId === m.id ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {isAdding && (
          <div className="space-y-3 border rounded-lg p-4 bg-stone-800">
            <div>
              <label className="text-xs font-medium text-stone-400">Change Type</label>
              <Select
                options={[...MODIFICATION_TYPES]}
                value={modType}
                onChange={(e) => setModType(e.target.value)}
              />
            </div>
            {modType !== 'addition' && (
              <div>
                <label className="text-xs font-medium text-stone-400">
                  Original (what was planned)
                </label>
                <Input
                  placeholder="e.g., Cauliflower puree"
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                />
              </div>
            )}
            {modType !== 'removal' && (
              <div>
                <label className="text-xs font-medium text-stone-400">
                  Actual (what was served)
                </label>
                <Input
                  placeholder="e.g., Parsnip puree"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-stone-400">Reason</label>
              <Input
                placeholder="Why the change?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="text-xs px-2 py-0.5 rounded-full bg-stone-700 text-stone-400 hover:bg-stone-300"
                    onClick={() => setReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || (!original && !actual)}>
                {saving ? 'Saving...' : 'Log Change'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
