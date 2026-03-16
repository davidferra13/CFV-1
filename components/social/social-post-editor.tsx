'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { TagInput } from '@/components/ui/tag-input'
import { SocialCaptionEditor, type CaptionState } from '@/components/social/social-caption-editor'
import { SocialPlatformPreview } from '@/components/social/social-platform-preview'
import { SocialPostPreflight } from '@/components/social/social-post-preflight'
import { SocialPillarBadge } from '@/components/social/social-pillar-badge'
import { SocialHashtagSetPicker } from '@/components/social/social-hashtag-set-picker'
import {
  updateSocialPost,
  attachSocialAssetToPost,
  detachSocialAssetFromPost,
} from '@/lib/social/actions'
import type {
  SocialMediaAsset,
  SocialPillar,
  SocialPlatform,
  SocialPost,
  SocialPostAssetLink,
  SocialPostStatus,
} from '@/lib/social/types'
import {
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PILLAR_LABELS,
  SOCIAL_STATUS_LABELS,
} from '@/lib/social/types'
import type { SocialHashtagSet } from '@/lib/social/hashtag-actions'
import { format } from 'date-fns'
import {
  Save,
  CheckCircle,
  X,
  Film,
  Link as LinkIcon,
  Image as ImageIcon,
  Wifi,
} from '@/components/ui/icons'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

type Tab = 'caption' | 'platforms' | 'media' | 'settings'

const ALL_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'x',
  'pinterest',
  'youtube_shorts',
]
const ALL_PILLARS: SocialPillar[] = [
  'recipe',
  'behind_scenes',
  'education',
  'social_proof',
  'offers',
  'seasonal',
]
const ALL_STATUSES: SocialPostStatus[] = [
  'idea',
  'draft',
  'approved',
  'queued',
  'published',
  'archived',
]

type EditorState = CaptionState & {
  title: string
  pillar: SocialPillar
  status: SocialPostStatus
  platforms: SocialPlatform[]
  hashtags: string[]
  mention_handles: string[]
  location_tag: string
  alt_text: string
  cta: string
  offer_link: string
  campaign: string
  notes: string
  media_url: string
  seasonal_flag: boolean
  hot_swap_ready: boolean
}

function buildEditorState(post: SocialPost): EditorState {
  return {
    title: post.title,
    pillar: post.pillar,
    status: post.status,
    platforms: post.platforms,
    hashtags: post.hashtags,
    mention_handles: post.mention_handles,
    location_tag: post.location_tag,
    alt_text: post.alt_text,
    cta: post.cta,
    offer_link: post.offer_link ?? '',
    campaign: post.campaign,
    notes: post.notes,
    media_url: post.media_url ?? '',
    seasonal_flag: post.seasonal_flag,
    hot_swap_ready: post.hot_swap_ready,
    caption_master: post.caption_master,
    caption_instagram: post.caption_instagram,
    caption_facebook: post.caption_facebook,
    caption_tiktok: post.caption_tiktok,
    caption_linkedin: post.caption_linkedin,
    caption_x: post.caption_x,
    caption_pinterest: post.caption_pinterest,
    caption_youtube_shorts: post.caption_youtube_shorts,
  }
}

type Props = {
  post: SocialPost
  linkedAssets: SocialPostAssetLink[]
  allAssets: SocialMediaAsset[]
  hashtagSets: SocialHashtagSet[]
  allPosts: SocialPost[]
  /** Set of platforms the chef has connected via OAuth (used to show connection indicators) */
  connectedPlatforms?: Set<SocialPlatform>
  chefId: string
}

export function SocialPostEditor({
  post: initialPost,
  linkedAssets: initialLinks,
  allAssets,
  hashtagSets,
  connectedPlatforms = new Set(),
  chefId,
}: Props) {
  const router = useRouter()
  const [post, setPost] = useState(initialPost)
  const [links, setLinks] = useState(initialLinks)
  const [editor, setEditor] = useState<EditorState>(buildEditorState(initialPost))
  const [activeTab, setActiveTab] = useState<Tab>('caption')
  const [activeCaptionPlatform, setActiveCaptionPlatform] = useState<SocialPlatform | 'master'>(
    'master'
  )
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram')
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [vaultOpen, setVaultOpen] = useState(false)

  const defaultData = useMemo(() => buildEditorState(initialPost), [initialPost])
  const currentData = useMemo(() => editor, [editor])

  const protection = useProtectedForm({
    surfaceId: 'social-post',
    recordId: initialPost.id,
    tenantId: chefId,
    defaultData,
    currentData,
    throttleMs: 10_000,
  })

  function applyDraftData(data: Record<string, unknown>) {
    setEditor((prev) => {
      const restored = { ...prev }
      for (const key of Object.keys(prev)) {
        if (key in data) {
          ;(restored as Record<string, unknown>)[key] = data[key]
        }
      }
      return restored
    })
  }

  const primaryLink = links.find((l) => l.is_primary)
  const primaryAsset = primaryLink ? allAssets.find((a) => a.id === primaryLink.asset_id) : null
  const linkedAssetObjs = links
    .map((l) => ({ link: l, asset: allAssets.find((a) => a.id === l.asset_id) }))
    .filter((x): x is { link: SocialPostAssetLink; asset: SocialMediaAsset } => !!x.asset)
    .sort((a, b) => a.link.display_order - b.link.display_order)

  const currentMediaUrl = editor.media_url || primaryAsset?.public_url || null

  function update<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setEditor((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    setSaveError(null)
    setSaveSuccess(false)
    startTransition(async () => {
      try {
        const updated = await updateSocialPost(post.id, {
          title: editor.title,
          pillar: editor.pillar,
          status: editor.status,
          platforms: editor.platforms,
          hashtags: editor.hashtags,
          mention_handles: editor.mention_handles,
          location_tag: editor.location_tag,
          alt_text: editor.alt_text,
          cta: editor.cta,
          offer_link: editor.offer_link || null,
          campaign: editor.campaign,
          notes: editor.notes,
          media_url: editor.media_url || null,
          seasonal_flag: editor.seasonal_flag,
          hot_swap_ready: editor.hot_swap_ready,
          caption_master: editor.caption_master,
          caption_instagram: editor.caption_instagram,
          caption_facebook: editor.caption_facebook,
          caption_tiktok: editor.caption_tiktok,
          caption_linkedin: editor.caption_linkedin,
          caption_x: editor.caption_x,
          caption_pinterest: editor.caption_pinterest,
          caption_youtube_shorts: editor.caption_youtube_shorts,
        })
        setPost(updated)
        protection.markCommitted()
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        router.refresh()
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Save failed.')
      }
    })
  }

  function handleAttachAsset(assetId: string) {
    const isPrimary = !primaryLink
    startTransition(async () => {
      try {
        const link = await attachSocialAssetToPost({
          post_id: post.id,
          asset_id: assetId,
          is_primary: isPrimary,
        })
        setLinks((prev) => {
          const without = prev.filter((l) => l.id !== link.id)
          return [...without, link]
        })
        const updated = await updateSocialPost(post.id, {})
        setPost(updated)
        setVaultOpen(false)
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Attach failed.')
      }
    })
  }

  function handleDetachAsset(linkId: string) {
    startTransition(async () => {
      try {
        await detachSocialAssetFromPost({ link_id: linkId })
        setLinks((prev) => prev.filter((l) => l.id !== linkId))
        const updated = await updateSocialPost(post.id, {})
        setPost(updated)
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Detach failed.')
      }
    })
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'caption', label: 'Caption' },
    { key: 'platforms', label: 'Platforms & Preview' },
    { key: 'media', label: 'Media' },
    { key: 'settings', label: 'Settings' },
  ]

  const statusBadgeVariant = (
    s: SocialPostStatus
  ): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    if (s === 'published') return 'success'
    if (s === 'queued' || s === 'approved') return 'info'
    if (s === 'draft') return 'warning'
    return 'default'
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyDraftData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      <div className="space-y-4">
        {/* Header card */}
        <div className="bg-stone-900 rounded-xl border border-stone-700 px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <SocialPillarBadge pillar={post.pillar} />
            <Badge variant={statusBadgeVariant(post.status)}>
              {SOCIAL_STATUS_LABELS[post.status]}
            </Badge>
            <span className="text-xs text-stone-400">
              {format(new Date(post.schedule_at), 'EEE, MMM d, yyyy · h:mm a')}
            </span>
          </div>
          <Input
            value={editor.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Post title (internal reference only)"
          />
        </div>

        {/* Tab navigation + content */}
        <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
          <div className="flex gap-0 border-b border-stone-800 overflow-x-auto">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  'px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  activeTab === key
                    ? 'border-brand-600 text-brand-400'
                    : 'border-transparent text-stone-500 hover:text-stone-300',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-5 py-5">
            {/* CAPTION TAB */}
            {activeTab === 'caption' && (
              <div className="space-y-5">
                <SocialCaptionEditor
                  captions={editor}
                  activePlatform={activeCaptionPlatform}
                  onChange={(key, value) => update(key as keyof EditorState, value)}
                  onSetActivePlatform={setActiveCaptionPlatform}
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-stone-300">Hashtags</label>
                    <SocialHashtagSetPicker
                      sets={hashtagSets}
                      onInsert={(tags) =>
                        update('hashtags', [
                          ...editor.hashtags,
                          ...tags.filter((t) => !editor.hashtags.includes(t)),
                        ])
                      }
                    />
                  </div>
                  <TagInput
                    value={editor.hashtags}
                    onChange={(tags) => update('hashtags', tags)}
                    placeholder="Type a hashtag and press Enter"
                    helperText={`${editor.hashtags.length} hashtag${editor.hashtags.length !== 1 ? 's' : ''} · Instagram recommends 3–5 for reach`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Call to Action"
                    value={editor.cta}
                    onChange={(e) => update('cta', e.target.value)}
                    placeholder="e.g. Book your table tonight"
                  />
                  <Input
                    label="Location Tag"
                    value={editor.location_tag}
                    onChange={(e) => update('location_tag', e.target.value)}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1.5">
                    Mentions / @Tags
                  </label>
                  <TagInput
                    value={editor.mention_handles}
                    onChange={(tags) => update('mention_handles', tags)}
                    placeholder="@username and press Enter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1.5">
                    Alt Text <span className="text-stone-400 font-normal">(accessibility)</span>
                  </label>
                  <Textarea
                    value={editor.alt_text}
                    onChange={(e) => update('alt_text', e.target.value)}
                    rows={2}
                    placeholder="Describe the image for screen readers..."
                  />
                </div>
              </div>
            )}

            {/* PLATFORMS + PREVIEW TAB */}
            {activeTab === 'platforms' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-stone-300 block mb-3">
                    Publish to
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {ALL_PLATFORMS.map((platform) => {
                      const checked = editor.platforms.includes(platform)
                      const isConnected = connectedPlatforms.has(platform)
                      return (
                        <label
                          key={platform}
                          className={[
                            'flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
                            checked
                              ? 'border-brand-600 bg-brand-950'
                              : 'border-stone-700 hover:border-stone-600',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              update(
                                'platforms',
                                checked
                                  ? editor.platforms.filter((p) => p !== platform)
                                  : [...editor.platforms, platform]
                              )
                            }
                            className="rounded"
                          />
                          <span className="flex-1 text-sm text-stone-300">
                            {SOCIAL_PLATFORM_LABELS[platform]}
                          </span>
                          {isConnected ? (
                            <Wifi
                              className="w-3 h-3 text-emerald-500 flex-shrink-0"
                              aria-label="Account connected"
                            />
                          ) : (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0"
                              title="Not connected"
                              aria-label="Not connected"
                            />
                          )}
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-xs text-stone-400 mt-2 flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-500" />
                    Connected account - will auto-publish when Queued.
                    {connectedPlatforms.size === 0 && (
                      <a href="/social/connections" className="text-brand-600 hover:underline ml-1">
                        Connect platforms →
                      </a>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-stone-300 block mb-3">
                    Platform Preview
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                    {ALL_PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPreviewPlatform(p)}
                        className={[
                          'px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors flex-shrink-0',
                          previewPlatform === p
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700',
                        ].join(' ')}
                      >
                        {SOCIAL_PLATFORM_LABELS[p]}
                      </button>
                    ))}
                  </div>
                  <div className="max-w-xs">
                    <SocialPlatformPreview
                      platform={previewPlatform}
                      caption={
                        (editor[`caption_${previewPlatform}` as keyof EditorState] as string) ||
                        editor.caption_master
                      }
                      hashtags={editor.hashtags}
                      mediaUrl={currentMediaUrl}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MEDIA TAB */}
            {activeTab === 'media' && (
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-stone-300 block mb-2">
                    Primary Media
                  </label>
                  {primaryAsset ? (
                    <div className="flex items-start gap-3">
                      <div className="w-24 h-24 rounded-lg border border-stone-700 overflow-hidden flex-shrink-0 bg-stone-800">
                        {primaryAsset.asset_kind === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={primaryAsset.public_url}
                            alt={primaryAsset.asset_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-6 h-6 text-stone-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-200">
                          {primaryAsset.asset_name}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {primaryAsset.asset_kind} ·{' '}
                          {Math.round(primaryAsset.file_size_bytes / 1024)}KB
                        </p>
                        {primaryAsset.duration_seconds && (
                          <p className="text-xs text-stone-400">{primaryAsset.duration_seconds}s</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-stone-400 py-2">
                      <ImageIcon className="w-4 h-4" />
                      No primary media attached
                    </div>
                  )}
                </div>

                <Input
                  label="Media URL (optional override)"
                  value={editor.media_url}
                  onChange={(e) => update('media_url', e.target.value)}
                  placeholder="https://... (leave blank to use vault asset)"
                />

                {linkedAssetObjs.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-stone-300 block mb-2">
                      Linked Assets ({linkedAssetObjs.length})
                    </label>
                    <div className="space-y-2">
                      {linkedAssetObjs.map(({ link, asset }) => (
                        <div
                          key={link.id}
                          className="flex items-center gap-3 rounded-lg border border-stone-700 px-3 py-2"
                        >
                          <div className="w-10 h-10 rounded border border-stone-800 overflow-hidden flex-shrink-0 bg-stone-800">
                            {asset.asset_kind === 'image' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={asset.public_url}
                                alt={asset.asset_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-3 h-3 text-stone-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-stone-300 truncate">{asset.asset_name}</p>
                            {link.is_primary && (
                              <span className="text-[10px] text-emerald-600 font-medium">
                                Primary
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label="Detach asset"
                            onClick={() => handleDetachAsset(link.id)}
                            className="text-stone-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="secondary" size="sm" onClick={() => setVaultOpen(true)}>
                  <ImageIcon className="w-4 h-4 mr-1.5" />
                  Browse Media Vault
                </Button>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-stone-300 block mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update('status', s)}
                        className={[
                          'px-3 py-1.5 text-sm rounded-full border transition-colors',
                          editor.status === s
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'border-stone-700 text-stone-400 hover:border-stone-600',
                        ].join(' ')}
                      >
                        {SOCIAL_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {editor.status === 'queued' && !post.preflight_ready && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠ Complete the preflight checklist before queuing for auto-publishing.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-stone-300 block mb-2">
                    Content Pillar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_PILLARS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => update('pillar', p)}
                        className={[
                          'px-3 py-1.5 text-sm rounded-full border transition-colors',
                          editor.pillar === p
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'border-stone-700 text-stone-400 hover:border-stone-600',
                        ].join(' ')}
                      >
                        {SOCIAL_PILLAR_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Campaign Name"
                    value={editor.campaign}
                    onChange={(e) => update('campaign', e.target.value)}
                    placeholder="e.g. Summer 2026"
                  />
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1.5">
                      Offer Link
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                      <input
                        type="url"
                        value={editor.offer_link}
                        onChange={(e) => update('offer_link', e.target.value)}
                        placeholder="https://..."
                        className="w-full pl-8 pr-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editor.seasonal_flag}
                      onChange={(e) => update('seasonal_flag', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-stone-300">Seasonal post</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editor.hot_swap_ready}
                      onChange={(e) => update('hot_swap_ready', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-stone-300">Hot-swap ready</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1.5">
                    Internal Notes
                  </label>
                  <Textarea
                    value={editor.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    rows={3}
                    placeholder="Private notes about this post..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preflight + save bar */}
        <div className="bg-stone-900 rounded-xl border border-stone-700 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between sticky bottom-4 shadow-sm">
          <div className="flex-1">
            <SocialPostPreflight post={post} />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                Saved
              </span>
            )}
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            <Button variant="primary" onClick={handleSave} loading={isPending}>
              <Save className="w-4 h-4 mr-1.5" />
              Save Post
            </Button>
          </div>
        </div>

        {/* Vault picker overlay */}
        {vaultOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40" onClick={() => setVaultOpen(false)} />
            <div className="relative bg-stone-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
                <h3 className="font-semibold text-stone-100">Select from Media Vault</h3>
                <button
                  type="button"
                  aria-label="Close vault picker"
                  onClick={() => setVaultOpen(false)}
                  className="text-stone-400 hover:text-stone-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {allAssets.map((asset) => {
                  const alreadyLinked = links.some((l) => l.asset_id === asset.id)
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        if (!alreadyLinked) handleAttachAsset(asset.id)
                      }}
                      disabled={alreadyLinked || isPending}
                      className={[
                        'rounded-lg border overflow-hidden aspect-square relative group transition-all',
                        alreadyLinked
                          ? 'border-emerald-300 opacity-60 cursor-default'
                          : 'border-stone-700 hover:border-brand-400 hover:shadow-sm cursor-pointer',
                      ].join(' ')}
                    >
                      {asset.asset_kind === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.public_url}
                          alt={asset.asset_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-800 flex flex-col items-center justify-center gap-1">
                          <Film className="w-6 h-6 text-stone-400" />
                          {asset.duration_seconds && (
                            <span className="text-[10px] text-stone-400">
                              {asset.duration_seconds}s
                            </span>
                          )}
                        </div>
                      )}
                      {alreadyLinked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/80">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white truncate">{asset.asset_name}</p>
                      </div>
                    </button>
                  )
                })}
                {allAssets.length === 0 && (
                  <div className="col-span-4 text-center py-12 text-stone-400 text-sm">
                    No assets in vault yet.
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-stone-800">
                <p className="text-xs text-stone-400">
                  First attachment becomes the primary media. Additional attachments create a
                  carousel.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormShield>
  )
}
