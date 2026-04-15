// Hub layout - no public nav/footer.
// All hub routes (/hub/g/*, /hub/join/*, /hub/me/*, etc.) render standalone
// without the marketing site chrome. Guests land here directly from invite links.

import type { Metadata } from 'next'

// Hub pages contain guest PII (dietary restrictions, allergies, household info).
// Prevent search engine indexing and crawling of all hub routes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
