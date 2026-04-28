import { redirect } from 'next/navigation'

type SearchParams = Record<string, string | string[] | undefined>

function buildRecipesNewPath(searchParams: SearchParams = {}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item)
      }
    } else if (value !== undefined) {
      params.set(key, value)
    }
  }

  const queryString = params.toString()

  return queryString ? `/recipes/new?${queryString}` : '/recipes/new'
}

export default async function CulinaryNewRecipePage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams

  redirect(buildRecipesNewPath(resolvedSearchParams))
}
