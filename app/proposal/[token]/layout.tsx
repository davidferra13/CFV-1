import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Proposal',
  description: 'Review, sign, and pay for your private chef experience.',
  robots: { index: false, follow: false },
}

export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>
}
