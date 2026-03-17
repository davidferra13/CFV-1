import { getStoryData } from '@/lib/stories/story-data'
import { EventStoryPreview } from '@/components/stories/event-story-preview'
import Link from 'next/link'

export default async function EventStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getStoryData(id)

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href={`/events/${id}`}
            className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            &larr; Back to event
          </Link>
          <h1 className="text-2xl font-bold text-stone-100 mt-2">Event Story</h1>
          <p className="text-sm text-stone-400 mt-1">
            Preview your animated event recap. Share it on social media or send it to your client.
          </p>
        </div>
      </div>

      <EventStoryPreview data={data} />

      <div className="mt-8 p-4 rounded-lg bg-stone-900/50 border border-stone-800">
        <p className="text-sm text-stone-400">
          Use your browser&apos;s screenshot or screen recording tool to capture this preview for
          Instagram, TikTok, or direct client sharing.
        </p>
      </div>
    </div>
  )
}
