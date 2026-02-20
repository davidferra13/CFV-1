'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  attachSocialAssetToPost,
  detachSocialAssetFromPost,
  generateAnnualSocialPlan,
  updateSocialPost,
  uploadSocialAsset,
  upsertSocialQueueSettings,
} from '@/lib/social/actions'
import type { SocialMediaAsset, SocialPlatform, SocialPost, SocialPostAssetLink, SocialPostStatus, SocialQueueSettings, SocialQueueSummary } from '@/lib/social/types'

type EditorState = {
  status: SocialPostStatus
  title: string
  caption_master: string
  hashtags: string
  mention_handles: string
  location_tag: string
  alt_text: string
  cta: string
  media_url: string
  platforms: SocialPlatform[]
}

function parseList(raw: string): string[] {
  return raw.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean)
}

function buildEditor(post: SocialPost): EditorState {
  return {
    status: post.status,
    title: post.title,
    caption_master: post.caption_master,
    hashtags: post.hashtags.join(' '),
    mention_handles: post.mention_handles.join(' '),
    location_tag: post.location_tag,
    alt_text: post.alt_text,
    cta: post.cta,
    media_url: post.media_url ?? '',
    platforms: post.platforms,
  }
}

export function SocialPlannerClient({
  settings,
  posts,
  summary,
  assets,
  links,
}: {
  settings: SocialQueueSettings
  posts: SocialPost[]
  summary: SocialQueueSummary
  assets: SocialMediaAsset[]
  links: SocialPostAssetLink[]
  windowCounts: Record<SocialPlatform, number>
}) {
  const router = useRouter()
  const [rows, setRows] = useState(posts)
  const [vault, setVault] = useState(assets)
  const [assetLinks, setAssetLinks] = useState(links)
  const [selectedPostId, setSelectedPostId] = useState(posts[0]?.id ?? '')
  const [editor, setEditor] = useState(posts[0] ? buildEditor(posts[0]) : null)
  const [assetToAttach, setAssetToAttach] = useState('')
  const [assetFiles, setAssetFiles] = useState<File[]>([])
  const [assetTags, setAssetTags] = useState('')
  const [forceRegenerate, setForceRegenerate] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selectedPost = useMemo(() => rows.find((row) => row.id === selectedPostId), [rows, selectedPostId])
  const selectedLinks = useMemo(() => assetLinks.filter((link) => link.post_id === selectedPostId), [assetLinks, selectedPostId])
  const assetsById = useMemo(() => new Map(vault.map((asset) => [asset.id, asset])), [vault])

  const onGenerate = () => {
    startTransition(async () => {
      try {
        await upsertSocialQueueSettings({
          target_year: settings.target_year,
          posts_per_week: settings.posts_per_week,
          timezone: settings.timezone,
          queue_days: settings.queue_days,
          queue_times: settings.queue_times,
          holdout_slots_per_month: settings.holdout_slots_per_month,
        })
        await generateAnnualSocialPlan({
          target_year: settings.target_year,
          posts_per_week: settings.posts_per_week,
          timezone: settings.timezone,
          queue_days: settings.queue_days,
          queue_times: settings.queue_times,
          holdout_slots_per_month: settings.holdout_slots_per_month,
          force_regenerate: forceRegenerate,
        })
        router.refresh()
      } catch (error: any) {
        alert(error?.message ?? 'Generation failed.')
      }
    })
  }

  const onUploadAssets = () => {
    if (assetFiles.length === 0) return
    startTransition(async () => {
      try {
        const created: SocialMediaAsset[] = []
        for (const file of assetFiles) {
          const formData = new FormData()
          formData.set('asset', file)
          formData.set('assetTags', assetTags)
          const item = await uploadSocialAsset(formData)
          created.push(item)
        }
        setVault((current) => [...created, ...current])
        setAssetFiles([])
        setAssetTags('')
      } catch (error: any) {
        alert(error?.message ?? 'Upload failed.')
      }
    })
  }

  const onAttach = () => {
    if (!selectedPost || !assetToAttach) return
    startTransition(async () => {
      try {
        const link = await attachSocialAssetToPost({ post_id: selectedPost.id, asset_id: assetToAttach, is_primary: true })
        setAssetLinks((current) => [...current.filter((item) => item.id !== link.id), link])
        const refreshed = await updateSocialPost(selectedPost.id, {})
        setRows((current) => current.map((item) => (item.id === refreshed.id ? refreshed : item)))
      } catch (error: any) {
        alert(error?.message ?? 'Attach failed.')
      }
    })
  }

  const onSavePost = () => {
    if (!selectedPost || !editor) return
    startTransition(async () => {
      try {
        const updated = await updateSocialPost(selectedPost.id, {
          status: editor.status,
          title: editor.title,
          caption_master: editor.caption_master,
          hashtags: parseList(editor.hashtags),
          mention_handles: parseList(editor.mention_handles),
          location_tag: editor.location_tag,
          alt_text: editor.alt_text,
          cta: editor.cta,
          media_url: editor.media_url || null,
          platforms: editor.platforms,
        })
        setRows((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      } catch (error: any) {
        alert(error?.message ?? 'Save failed.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Annual Queue</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="text-sm text-stone-600">Posts: {summary.totalPosts} | Year: {settings.target_year}</div>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={forceRegenerate} onChange={(e) => setForceRegenerate(e.target.checked)} /> Replace year</label>
          <Button onClick={onGenerate} loading={isPending}>Generate/Regenerate</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Media Vault</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <input type="file" multiple accept="image/*,video/*" className="rounded border border-stone-300 px-2 py-2 text-sm" onChange={(e) => setAssetFiles(Array.from(e.target.files ?? []))} />
            <Input placeholder="Tags" value={assetTags} onChange={(e) => setAssetTags(e.target.value)} />
            <Button onClick={onUploadAssets} loading={isPending}>Upload</Button>
          </div>
          <div className="overflow-auto border border-stone-200 rounded-lg max-h-48">
            <table className="min-w-full text-xs">
              <thead className="bg-stone-50"><tr><th className="px-2 py-1 text-left">Asset</th><th className="px-2 py-1 text-left">Type</th><th className="px-2 py-1 text-left">Tags</th></tr></thead>
              <tbody>{vault.slice(0, 200).map((asset) => <tr key={asset.id}><td className="px-2 py-1">{asset.asset_name}</td><td className="px-2 py-1">{asset.asset_kind}</td><td className="px-2 py-1">{asset.asset_tags.join(', ')}</td></tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Posts</CardTitle></CardHeader>
        <CardContent className="overflow-auto max-h-64">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50"><tr><th className="px-2 py-1 text-left">Code</th><th className="px-2 py-1 text-left">Title</th><th className="px-2 py-1 text-left">Preflight</th><th className="px-2 py-1 text-left">Status</th><th className="px-2 py-1 text-left">Edit</th></tr></thead>
            <tbody>{rows.slice(0, 300).map((post) => <tr key={post.id}><td className="px-2 py-1">{post.post_code}</td><td className="px-2 py-1">{post.title}</td><td className="px-2 py-1">{post.preflight_ready ? <Badge variant="success">Ready</Badge> : <Badge variant="warning">{post.preflight_missing_items.length} missing</Badge>}</td><td className="px-2 py-1"><select value={post.status} onChange={(e) => onQuickStatusChange(post.id, e.target.value as SocialPostStatus)} className="rounded border border-stone-300 px-1 py-0.5">{Object.entries({ idea: 'Idea', draft: 'Draft', approved: 'Approved', queued: 'Queued', published: 'Published', archived: 'Archived' }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td><td className="px-2 py-1"><button type="button" className="text-brand-600" onClick={() => { setSelectedPostId(post.id); setEditor(buildEditor(post)) }}>Edit</button></td></tr>)}</tbody>
          </table>
        </CardContent>
      </Card>

      {selectedPost && editor && (
        <Card>
          <CardHeader><CardTitle>Edit {selectedPost.post_code}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!selectedPost.preflight_ready && <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">Missing: {selectedPost.preflight_missing_items.join(', ')}</div>}
            <div className="grid gap-2 md:grid-cols-3">
              <Input label="Title" value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} />
              <Input label="CTA" value={editor.cta} onChange={(e) => setEditor({ ...editor, cta: e.target.value })} />
              <Input label="Location tag" value={editor.location_tag} onChange={(e) => setEditor({ ...editor, location_tag: e.target.value })} />
              <Input label="Hashtags" value={editor.hashtags} onChange={(e) => setEditor({ ...editor, hashtags: e.target.value })} />
              <Input label="Mention tags" value={editor.mention_handles} onChange={(e) => setEditor({ ...editor, mention_handles: e.target.value })} />
              <Input label="Media URL (optional)" value={editor.media_url} onChange={(e) => setEditor({ ...editor, media_url: e.target.value })} />
            </div>
            <Textarea label="Alt text" value={editor.alt_text} onChange={(e) => setEditor({ ...editor, alt_text: e.target.value })} />
            <Textarea label="Master caption" value={editor.caption_master} onChange={(e) => setEditor({ ...editor, caption_master: e.target.value })} />
            <div className="flex gap-2 items-end">
              <select className="rounded border border-stone-300 px-2 py-2 text-sm min-w-72" value={assetToAttach} onChange={(e) => setAssetToAttach(e.target.value)}>
                <option value="">Attach vault asset...</option>
                {vault.map((asset) => <option key={asset.id} value={asset.id}>{asset.asset_name}</option>)}
              </select>
              <Button size="sm" onClick={onAttach} loading={isPending}>Attach + Primary</Button>
            </div>
            <div className="space-y-1">
              {selectedLinks.map((link) => {
                const asset = assetsById.get(link.asset_id)
                if (!asset) return null
                return <div key={link.id} className="text-xs border rounded px-2 py-1 flex items-center justify-between">{asset.asset_name}<button type="button" className="text-red-600" onClick={() => onDetachAsset(link.id)}>Detach</button></div>
              })}
            </div>
            <Button onClick={onSavePost} loading={isPending}>Save Post</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )

  function onQuickStatusChange(postId: string, status: SocialPostStatus) {
    startTransition(async () => {
      try {
        const updated = await updateSocialPost(postId, { status })
        setRows((current) => current.map((item) => (item.id === postId ? updated : item)))
      } catch (error: any) {
        alert(error?.message ?? 'Status update failed.')
      }
    })
  }

  function onDetachAsset(linkId: string) {
    startTransition(async () => {
      try {
        await detachSocialAssetFromPost({ link_id: linkId })
        setAssetLinks((current) => current.filter((item) => item.id !== linkId))
      } catch (error: any) {
        alert(error?.message ?? 'Detach failed.')
      }
    })
  }
}
