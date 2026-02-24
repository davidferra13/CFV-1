import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import {
  getChefJourneyById,
  getChefJourneyEntries,
  getChefJourneyIdeas,
  getChefJourneyMedia,
  getChefJourneyRecipeLinks,
} from '@/lib/journey/actions'
import { getRecipes } from '@/lib/recipes/actions'
import { JourneyDetail } from '@/components/journey/journey-detail'

export default async function JournalDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { tab?: string }
}) {
  await requireChef()

  const journey = await getChefJourneyById(params.id)
  if (!journey) notFound()

  const [entries, ideas, media, recipeLinks, recipes] = await Promise.all([
    getChefJourneyEntries(journey.id),
    getChefJourneyIdeas(journey.id),
    getChefJourneyMedia(journey.id),
    getChefJourneyRecipeLinks(journey.id),
    getRecipes({ sort: 'name' }),
  ])

  const recipeOptions = recipes.map((recipe) => ({ id: recipe.id, name: recipe.name }))
  const requestedTab = typeof searchParams?.tab === 'string' ? searchParams.tab.toLowerCase() : ''
  const initialTab =
    requestedTab === 'scrapbook'
      ? 'media'
      : requestedTab === 'recipes'
        ? 'recipes'
        : requestedTab === 'ideas'
          ? 'ideas'
          : requestedTab === 'progress'
            ? 'progress'
            : 'entries'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/settings" className="text-brand-600 hover:text-brand-400">
            Settings
          </Link>
          <span className="text-stone-400">/</span>
          <Link href="/settings/journal" className="text-brand-600 hover:text-brand-400">
            Chef Journal
          </Link>
          <span className="text-stone-400">/</span>
          <span className="text-stone-500 truncate max-w-[220px]">{journey.title}</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-100 mt-2">{journey.title}</h1>
        <p className="text-stone-400 mt-1">
          Journal every destination, insight, and idea so your culinary repertoire compounds over
          time.
        </p>
      </div>

      <JourneyDetail
        journey={journey}
        initialEntries={entries}
        initialIdeas={ideas}
        initialMedia={media}
        initialRecipeLinks={recipeLinks}
        recipeOptions={recipeOptions}
        initialTab={initialTab}
      />
    </div>
  )
}
