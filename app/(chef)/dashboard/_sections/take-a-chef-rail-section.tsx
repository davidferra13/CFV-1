import { getTakeAChefRailData } from '@/lib/inquiries/take-a-chef-rail-actions'
import { TakeAChefRail, TakeAChefRailSkeleton } from '@/components/rail/take-a-chef-rail'

export async function TakeAChefRailSection() {
  let data
  try {
    data = await getTakeAChefRailData()
  } catch (err) {
    console.error('[TakeAChefRailSection] Failed to load rail data:', err)
    return null
  }

  if (!data || data.inquiries.length === 0) return null

  return <TakeAChefRail data={data} />
}

export { TakeAChefRailSkeleton }
