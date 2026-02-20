'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { uploadSocialAsset, updateSocialAsset, deleteSocialAsset } from '@/lib/social/actions'
import type { SocialMediaAsset } from '@/lib/social/types'
import { Upload, Search, Film, Image as ImageIcon, X, Tag, Archive, Loader2 } from 'lucide-react'

type Props = {
  assets: SocialMediaAsset[]
  usageCounts: Record<string, number>
}

type Filter = 'all' | 'image' | 'video'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function SocialVaultBrowser({ assets: initialAssets, usageCounts }: Props) {
  const router = useRouter()
  const [assets, setAssets] = useState(initialAssets)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editingAsset, setEditingAsset] = useState<SocialMediaAsset | null>(null)
  const [editName, setEditName] = useState('')
  const [editTags, setEditTags] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = assets.filter((a) => {
    if (filter === 'image' && a.asset_kind !== 'image') return false
    if (filter === 'video' && a.asset_kind !== 'video') return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.asset_name.toLowerCase().includes(q) ||
        a.asset_tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError(null)
    const created: SocialMediaAsset[] = []
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.set('asset', file)
        formData.set('assetTags', '')
        const item = await uploadSocialAsset(formData)
        created.push(item)
      }
      setAssets((prev) => [...created, ...prev])
      router.refresh()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function openEdit(asset: SocialMediaAsset) {
    setEditingAsset(asset)
    setEditName(asset.asset_name)
    setEditTags(asset.asset_tags.join(', '))
  }

  function handleSaveEdit() {
    if (!editingAsset) return
    startTransition(async () => {
      try {
        const updated = await updateSocialAsset(editingAsset.id, {
          asset_name: editName.trim(),
          asset_tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
        })
        setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
        setEditingAsset(null)
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Save failed.')
      }
    })
  }

  function handleArchive(assetId: string) {
    startTransition(async () => {
      try {
        await deleteSocialAsset(assetId)
        setAssets((prev) => prev.filter((a) => a.id !== assetId))
        router.refresh()
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Archive failed.')
      }
    })
  }

  const imageCount = assets.filter((a) => a.asset_kind === 'image').length
  const videoCount = assets.filter((a) => a.asset_kind === 'video').length

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div
        className={[
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          uploading ? 'border-brand-300 bg-brand-50' : 'border-stone-200 hover:border-stone-300 bg-stone-50',
        ].join(' ')}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
          className="hidden"
          aria-label="Upload media files"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-brand-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm font-medium">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-stone-500 cursor-pointer">
            <Upload className="w-6 h-6" />
            <p className="text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-stone-400">
              Images (JPEG, PNG, WebP, HEIC) · Videos (MP4, MOV, WebM) · Max 100MB per file
            </p>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <X className="w-4 h-4 flex-shrink-0" />
          {uploadError}
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setUploadError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or tag…"
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
        <div className="flex gap-1">
          {([ ['all', `All (${assets.length})`], ['image', `Images (${imageCount})`], ['video', `Videos (${videoCount})`]] as [Filter, string][]).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFilter(val)}
              className={[
                'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                filter === val
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-stone-50 rounded-xl border border-dashed border-stone-200">
          <div className="text-3xl mb-2">🖼</div>
          <p className="text-stone-500 text-sm">
            {search ? 'No assets match your search.' : 'Your vault is empty — upload some media to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              className="group bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-stone-300 hover:shadow-sm transition-all"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-stone-100 relative overflow-hidden">
                {asset.asset_kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.public_url}
                    alt={asset.asset_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-stone-400">
                    <Film className="w-8 h-8" />
                    {asset.duration_seconds && (
                      <span className="text-xs">{asset.duration_seconds}s</span>
                    )}
                  </div>
                )}
                {/* Usage badge */}
                {(usageCounts[asset.id] ?? 0) > 0 && (
                  <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] rounded px-1.5 py-0.5">
                    {usageCounts[asset.id]} post{(usageCounts[asset.id] ?? 0) !== 1 ? 's' : ''}
                  </div>
                )}
                {/* Kind icon */}
                <div className="absolute top-1.5 left-1.5">
                  {asset.asset_kind === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5 text-white drop-shadow" />
                  ) : (
                    <Film className="w-3.5 h-3.5 text-white drop-shadow" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="px-3 py-2">
                <p className="text-xs font-medium text-stone-800 truncate">{asset.asset_name}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">{formatBytes(asset.file_size_bytes)}</p>
                {asset.asset_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {asset.asset_tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500"
                      >
                        {tag}
                      </span>
                    ))}
                    {asset.asset_tags.length > 3 && (
                      <span className="text-[10px] text-stone-400">+{asset.asset_tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-3 pb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(asset)}
                  className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-700 transition-colors"
                >
                  <Tag className="w-3 h-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleArchive(asset.id)}
                  disabled={isPending}
                  className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-red-500 transition-colors ml-auto"
                >
                  <Archive className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit drawer */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setEditingAsset(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-900">Edit Asset</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setEditingAsset(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="edit-asset-name" className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                <input
                  id="edit-asset-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Tags <span className="text-stone-400 font-normal">(comma separated)</span>
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="dinner, summer, 4th of july"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setEditingAsset(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit} loading={isPending} className="flex-1">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
