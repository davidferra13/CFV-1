import type { Metadata } from 'next'
import { getProposalByToken } from '@/lib/proposal/actions'
import { ProposalFlow } from '@/components/proposal/proposal-flow'
import { getPublicProposal } from '@/lib/proposals/client-proposal-actions'
import { ProposalPublicView } from '@/components/proposals/proposal-public-view'
import { Clock, XCircle } from 'lucide-react'

type Props = {
  params: { token: string } | Promise<{ token: string }>
  searchParams?: { payment?: string } | Promise<{ payment?: string }>
}

async function resolveProps({ params, searchParams }: Props) {
  return {
    params: await Promise.resolve(params),
    searchParams: await Promise.resolve(searchParams ?? {}),
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const {
    params: { token },
  } = await resolveProps(props)
  const proposal = await getPublicProposal(token)

  if (!proposal) {
    return { title: 'Proposal' }
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

export default async function ProposalPage({ params, searchParams }: Props) {
  const resolved = await resolveProps({ params, searchParams })
  const { token } = resolved.params
  const { payment } = resolved.searchParams

  if (payment) {
    try {
      const proposal = await getProposalByToken(token)
      return (
        <ProposalFlow
          proposal={proposal}
          token={token}
          paymentStatus={
            payment === 'success' ? 'success' : payment === 'cancelled' ? 'cancelled' : undefined
          }
        />
      )
    } catch {
      // Fall through to alternate proposal lookups below.
    }
  }

  const publicProposal = await getPublicProposal(token)
  if (publicProposal) {
    return <ProposalPublicView proposal={publicProposal} shareToken={token} />
  }

  let proposal
  try {
    proposal = await getProposalByToken(token)
  } catch {
    proposal = null
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Proposal Not Found</h1>
          <p className="text-gray-500">
            This proposal link is invalid or is no longer available. Please contact your chef for an
            updated link.
          </p>
        </div>
      </div>
    )
  }

  // Expired
  if (proposal.expiresAt && new Date(proposal.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Proposal Expired</h1>
          <p className="text-gray-500">
            This proposal is no longer available. Please reach out to your chef to request a new
            one.
          </p>
        </div>
      </div>
    )
  }

  // Revoked
  // (revoked tokens are rejected by the action, but handle defensively)

  return (
    <ProposalFlow
      proposal={proposal}
      token={token}
      paymentStatus={
        payment === 'success' ? 'success' : payment === 'cancelled' ? 'cancelled' : undefined
      }
    />
  )
}
