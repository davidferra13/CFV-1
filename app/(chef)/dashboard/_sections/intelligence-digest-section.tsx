// Intelligence Digest Section - Dashboard widget
// Server component that fetches weekly digest data, renders client digest widget.

import { getWeeklyDigest } from '@/lib/intelligence/signal-actions-wired'
import { IntelligenceDigestClient } from './intelligence-digest-client'

export async function IntelligenceDigestSection() {
  try {
    const digest = await getWeeklyDigest()
    return <IntelligenceDigestClient digest={digest} />
  } catch (err) {
    console.error('[Dashboard/IntelligenceDigest] getWeeklyDigest failed:', err)
    return null
  }
}
