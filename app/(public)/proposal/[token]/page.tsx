import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { checkRateLimit } from '@/lib/rateLimit'
import { getPublicProposal } from '@/lib/proposals/client-proposal-actions'
import { ProposalPublicView } from '@/components/proposals/proposal-public-view'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const proposal = await getPublicProposal(token)

  if (!proposal) {
    return { title: 'Proposal Not Found' }
  }

  const chefLabel = proposal.chefBusinessName || proposal.chefName || 'Your Chef'

  return {
    title: `${proposal.title} - ${chefLabel}`,
    description: proposal.personalNote
      ? proposal.personalNote.slice(0, 160)
      : `A personalized culinary proposal from ${chefLabel}`,
    openGraph: {
      title: proposal.title,
      description: proposal.personalNote
        ? proposal.personalNote.slice(0, 160)
        : `A personalized culinary proposal from ${chefLabel}`,
      ...(proposal.coverPhotoUrl ? { images: [proposal.coverPhotoUrl] } : {}),
    },
  }
}

export default async function PublicProposalPage({ params }: Props) {
  const { token } = await params
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`proposal:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const proposal = await getPublicProposal(token)

  if (!proposal) {
    notFound()
  }

  return <ProposalPublicView proposal={proposal} shareToken={token} />
}
