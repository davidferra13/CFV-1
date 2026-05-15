import { getRailStrip } from '@/lib/discovery/universal-rail-actions'
import { RailStrip } from './rail-strip'

export async function RailStripWrapper() {
  let data
  try {
    data = await getRailStrip()
  } catch {
    return null
  }

  return <RailStrip initialData={data} />
}

export function RailStripSkeleton() {
  return <div className="h-8 bg-stone-950/80 border-b border-stone-800/50" />
}
