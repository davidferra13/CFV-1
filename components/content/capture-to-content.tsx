'use client'

// Capture-to-Content Panel
// Shows captures tagged 'marketing-thought' and lets chef turn them into content drafts.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Tag, FileText, Sparkles, Check } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Capture } from '@/lib/capture/actions'
import { updateCapture } from '@/lib/capture/actions'
import { type ContentPlatform, saveContentDraft } from '@/lib/content/post-event-content-actions'

const PLATFORMS: { value: ContentPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'story', label: 'Story' },
  { value: 'blog', label: 'Blog' },
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website' },
  { value: 'newsletter', label: 'Newsletter' },
]

export default function CaptureToContent({ initialCaptures }: { initialCaptures: Capture[] }) {
  const [captures, setCaptures] = useState<Capture[]>(initialCaptures)
  const [converting, startConverting] = useTransition()
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, ContentPlatform>>({})

  const getPlatform = (captureId: string): ContentPlatform =>
    selectedPlatforms[captureId] ?? 'instagram'

  const handleConvert = (capture: Capture) => {
    const platform = getPlatform(capture.id)
    startConverting(async () => {
      try {
        const title = capture.rawContent.slice(0, 100)
        const result = await saveContentDraft({
          eventId: null,
          platform,
          draftText: capture.rawContent,
          title,
          captureSourceId: capture.id,
          aiGenerated: false,
        })
        if (result.success) {
          await updateCapture(capture.id, { status: 'sorted' })
          setCaptures((prev) => prev.filter((c) => c.id !== capture.id))
          toast.success('Draft created from capture')
        } else {
          toast.error(result.error)
        }
      } catch {
        toast.error('Failed to create draft from capture')
      }
    })
  }

  if (captures.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="mx-auto h-8 w-8 text-stone-500 mb-3" />
        <p className="text-stone-400">No marketing captures yet.</p>
        <p className="text-sm text-stone-500 mt-1">
          Tag a capture as &quot;marketing-thought&quot; to see it here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {captures.map((capture) => (
        <Card key={capture.id} className="bg-stone-800 border-stone-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-stone-200 flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-400" />
                {new Date(capture.createdAt).toLocaleDateString()}
              </CardTitle>
              <div className="flex items-center gap-1.5">
                {capture.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="text-xs bg-stone-700 text-stone-300"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-300 whitespace-pre-wrap leading-relaxed">
              {capture.rawContent}
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-stone-700">
              <select
                title="Select platform"
                value={getPlatform(capture.id)}
                onChange={(e) =>
                  setSelectedPlatforms((prev) => ({
                    ...prev,
                    [capture.id]: e.target.value as ContentPlatform,
                  }))
                }
                className="rounded-md bg-stone-900 border-stone-600 text-stone-300 text-xs py-1.5 px-2"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>

              <Button
                size="sm"
                onClick={() => handleConvert(capture)}
                disabled={converting}
                className="ml-auto text-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {converting ? 'Creating...' : 'Turn into Draft'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
