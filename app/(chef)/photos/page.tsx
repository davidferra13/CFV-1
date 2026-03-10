import { getRecentPhotos } from '@/lib/photos/photo-actions'
import { RecentPhotos } from '@/components/photos/recent-photos'

export const metadata = {
  title: 'Photos | ChefFlow',
}

export default async function PhotosPage() {
  const { photos, error } = await getRecentPhotos(50)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Photo Gallery</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Recent photos across your business. Attach photos to events, recipes, equipment, and more
          from their detail pages.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          Could not load photos: {error}
        </div>
      ) : (
        <RecentPhotos photos={photos} />
      )}
    </div>
  )
}
