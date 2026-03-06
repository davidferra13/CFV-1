import { Card } from '@/components/ui/card'
import type { WfpStory } from '@/lib/charity/wfp-actions'
import { Globe, ExternalLink } from '@/components/ui/icons'

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export function WfpFeed({ stories }: { stories: WfpStory[] }) {
  if (stories.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="text-sm font-medium text-stone-300 flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4" />
          World Food Programme
        </h2>
        <p className="text-sm text-stone-500">Could not load WFP news feed. Check back later.</p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-stone-300 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          World Food Programme — Latest
        </h2>
        <a
          href="https://www.wfp.org/news"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
        >
          See all <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="divide-y divide-stone-800">
        {stories.map((story) => (
          <a
            key={story.link}
            href={story.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-3 hover:bg-stone-800/30 -mx-1 px-1 rounded transition-colors"
          >
            <p className="text-sm font-medium text-stone-200 line-clamp-2">{story.title}</p>
            {story.description && (
              <p className="text-xs text-stone-500 mt-1 line-clamp-2">{story.description}</p>
            )}
            {story.pubDate && (
              <span className="text-xs text-stone-600 mt-1 block">{formatDate(story.pubDate)}</span>
            )}
          </a>
        ))}
      </div>
    </Card>
  )
}
