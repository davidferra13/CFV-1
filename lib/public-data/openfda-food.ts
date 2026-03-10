import { cacheFetch } from '@/lib/cache/upstash'

const OPEN_FDA_FOOD_BASE = 'https://api.fda.gov/food/enforcement.json'
const CACHE_TTL_SECONDS = 12 * 60 * 60

export type FoodRecallNotice = {
  recallNumber: string
  productDescription: string
  classification: string | null
  reportDate: string | null
  reasonForRecall: string | null
  recallingFirm: string | null
}

function getApiKey(): string | null {
  return process.env.OPENFDA_API_KEY ?? null
}

export async function searchFoodRecalls(query: string, limit = 5): Promise<FoodRecallNotice[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return []

  return cacheFetch<FoodRecallNotice[]>(
    `public-data:openfda:${normalizedQuery.toLowerCase()}:${limit}`,
    CACHE_TTL_SECONDS,
    async () => {
      try {
        const params = new URLSearchParams({
          search: `product_description:"${normalizedQuery}"`,
          limit: String(Math.max(1, Math.min(limit, 20))),
        })

        const apiKey = getApiKey()
        if (apiKey) params.set('api_key', apiKey)

        const res = await fetch(`${OPEN_FDA_FOOD_BASE}?${params}`, {
          next: { revalidate: CACHE_TTL_SECONDS },
        })

        if (!res.ok) return []

        const json = await res.json()
        const results = Array.isArray(json?.results) ? json.results : []

        return results.map((result: any) => ({
          recallNumber: String(result?.recall_number ?? ''),
          productDescription: String(result?.product_description ?? ''),
          classification: result?.classification ?? null,
          reportDate: result?.report_date ?? null,
          reasonForRecall: result?.reason_for_recall ?? null,
          recallingFirm: result?.recalling_firm ?? null,
        }))
      } catch {
        return []
      }
    }
  )
}
