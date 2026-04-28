import { getStoryData } from '@/lib/stories/story-data'
import { EventStoryPreview } from '@/components/stories/event-story-preview'
import Link from 'next/link'

export default async function EventStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let data

  try {
    data = await getStoryData(id)
  } catch {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Link href="/events" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Back to events
        </Link>
        <div className="mt-6 rounded-lg border border-stone-800 bg-stone-900/50 p-6">
          <h1 className="text-2xl font-bold text-stone-100">Event Story Unavailable</h1>
          <p className="mt-2 text-sm text-stone-400">
            This story could not be loaded. It may belong to another account, no longer exist, or
            not be available until the event is completed.
          </p>
        </div>
      </div>
    )
  }

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

      <div className="mt-4 p-4 rounded-lg bg-stone-900/50 border border-stone-800">
        <h2 className="text-sm font-semibold text-stone-100">Sharing clearance</h2>
        <p className="mt-2 text-sm text-stone-400">
          Before posting or sending this recap, verify these items for the event.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-stone-400">
          <li>Client approval for social or client-facing sharing</li>
          <li>Guest consent and privacy expectations for any visible details</li>
          <li>Music, image, and media source rights for the final capture</li>
          <li>Venue rules for photography, recording, and public posting</li>
        </ul>
      </div>
    </div>
  )
}
