'use client'

import { useState, useRef, useTransition } from 'react'
import { ImagePlus, Globe, Users, Lock, ChevronDown, X, MapPin, Hash } from 'lucide-react'
import { createSocialPost, uploadPostMedia } from '@/lib/social/chef-social-actions'
import type { PostVisibility, SocialChannel } from '@/lib/social/chef-social-actions'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Visibility = PostVisibility

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string; icon: React.ReactNode }> = [
  { value: 'public', label: 'Public', icon: <Globe className="h-3.5 w-3.5" /> },
  { value: 'followers', label: 'Followers', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'connections', label: 'Connections', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'private', label: 'Only Me', icon: <Lock className="h-3.5 w-3.5" /> },
]

export function SocialPostComposer({
  myName,
  myAvatar,
  channels = [],
  defaultChannelId,
  onPosted,
}: {
  myName: string
  myAvatar?: string | null
  channels?: SocialChannel[]
  defaultChannelId?: string | null
  onPosted?: () => void
}) {
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [channelId, setChannelId] = useState<string | null>(defaultChannelId ?? null)
  const [locationTag, setLocationTag] = useState('')
  const [showLocation, setShowLocation] = useState(false)
  const [showVisMenu, setShowVisMenu] = useState(false)
  const [mediaItems, setMediaItems] = useState<
    Array<{ url: string; type: 'image' | 'video'; preview: string }>
  >([])
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedVis = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!

  async function handleFiles(files: FileList) {
    setError(null)
    setUploading(true)
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const result = await uploadPostMedia(formData)
        const preview = URL.createObjectURL(file)
        setMediaItems((prev) => [...prev, { url: result.url, type: result.type, preview }])
      } catch (e: any) {
        setError(e.message ?? 'Upload failed')
      }
    }
    setUploading(false)
  }

  function removeMedia(index: number) {
    setMediaItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    if (!content.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const postType = mediaItems.some((m) => m.type === 'video')
          ? 'video'
          : mediaItems.length > 0
            ? 'photo'
            : 'text'

        await createSocialPost({
          content: content.trim(),
          media_urls: mediaItems.map((m) => m.url),
          media_types: mediaItems.map((m) => m.type),
          post_type: postType,
          visibility,
          channel_id: channelId ?? null,
          location_tag: locationTag.trim() || null,
        })

        setContent('')
        setMediaItems([])
        setLocationTag('')
        setShowLocation(false)
        onPosted?.()
      } catch (e: any) {
        setError(e.message ?? 'Failed to post')
      }
    })
  }

  const initials = myName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="bg-surface rounded-2xl border border-stone-700 shadow-sm p-4 space-y-3">
      {/* Top row */}
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          {myAvatar && <AvatarImage src={myAvatar} alt={myName} />}
          <AvatarFallback className="bg-amber-900 text-amber-800 text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share something with the chef community..."
          rows={3}
          maxLength={5000}
          className="flex-1 resize-none text-sm bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-stone-400"
        />
      </div>

      {/* Media previews */}
      {mediaItems.length > 0 && (
        <div className="flex gap-2 flex-wrap ml-13">
          {mediaItems.map((item, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-800">
              {item.type === 'video' ? (
                <video src={item.preview} className="w-full h-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.preview} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => removeMedia(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Location input */}
      {showLocation && (
        <div className="flex items-center gap-2 ml-13">
          <MapPin className="h-4 w-4 text-stone-400 flex-shrink-0" />
          <input
            type="text"
            value={locationTag}
            onChange={(e) => setLocationTag(e.target.value)}
            placeholder="Add location..."
            maxLength={100}
            className="text-sm border border-stone-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 flex-1"
          />
        </div>
      )}

      {/* Channel selector */}
      {channels.length > 0 && (
        <div className="flex items-center gap-2 ml-13">
          <Hash className="h-4 w-4 text-stone-400 flex-shrink-0" />
          <select
            value={channelId ?? ''}
            onChange={(e) => setChannelId(e.target.value || null)}
            className="text-sm border border-stone-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-surface"
          >
            <option value="">No channel</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.icon} {ch.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600 ml-13">{error}</p>}

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between pt-1 border-t border-stone-800">
        <div className="flex items-center gap-1">
          {/* Media upload */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || mediaItems.length >= 10}
            title="Add photo or video"
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-700 transition-colors disabled:opacity-40"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />

          {/* Location toggle */}
          <button
            onClick={() => setShowLocation((s) => !s)}
            title="Add location"
            className={`p-2 rounded-lg transition-colors ${showLocation ? 'text-amber-600 bg-amber-950' : 'text-stone-500 hover:bg-stone-700'}`}
          >
            <MapPin className="h-4 w-4" />
          </button>

          {/* Visibility picker */}
          <div className="relative">
            <button
              onClick={() => setShowVisMenu((s) => !s)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:bg-stone-700 transition-colors"
            >
              {selectedVis.icon}
              <span>{selectedVis.label}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showVisMenu && (
              <div className="absolute left-0 bottom-full mb-1 bg-surface border border-stone-700 rounded-xl shadow-lg z-20 min-w-[140px]">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setVisibility(opt.value)
                      setShowVisMenu(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-800 rounded-xl ${visibility === opt.value ? 'font-medium text-amber-700' : 'text-stone-300'}`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!content.trim() || pending || uploading}
          className="text-sm px-4 py-2 h-auto"
        >
          {pending ? 'Posting...' : uploading ? 'Uploading...' : 'Post'}
        </Button>
      </div>
    </div>
  )
}
