import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ShieldCheck } from '@/components/ui/icons'
import { requireClient } from '@/lib/auth/get-user'
import { requestDinnerCircleInviteByProfileToken } from '@/lib/hub/friend-actions'
import { getProfileByToken } from '@/lib/hub/profile-actions'

interface Props {
  params: Promise<{ profileToken: string }>
}

export const metadata: Metadata = { title: 'Join Dinner Circle - ChefFlow' }

export default async function DinnerCircleInvitePage({ params }: Props) {
  await requireClient()
  const { profileToken } = await params

  const inviter = await getProfileByToken(profileToken)
  if (!inviter) notFound()

  let status: 'sent' | 'already_friends' | 'already_pending' | 'self' | 'error' = 'sent'
  let errorMessage: string | null = null

  try {
    const result = await requestDinnerCircleInviteByProfileToken(profileToken)
    status = result.status
  } catch (error) {
    status = 'error'
    errorMessage = error instanceof Error ? error.message : 'Could not process invite link.'
  }

  const statusTitle =
    status === 'sent'
      ? 'Invite sent'
      : status === 'already_friends'
        ? 'Already connected'
        : status === 'already_pending'
          ? 'Invite already pending'
          : status === 'self'
            ? 'This is your invite link'
            : 'Invite failed'

  const statusBody =
    status === 'sent'
      ? `Your request to join ${inviter.display_name}'s dinner circle has been sent.`
      : status === 'already_friends'
        ? `You are already in ${inviter.display_name}'s dinner circle.`
        : status === 'already_pending'
          ? `You already sent a request to ${inviter.display_name}.`
          : status === 'self'
            ? 'Share this link with people you trust so they can request to join your circle.'
            : errorMessage || 'Please ask for a fresh invite link.'

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/my-hub/friends"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dinner Circle
      </Link>

      <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
        <div className="mb-4 flex items-center gap-3">
          {status === 'error' ? (
            <ShieldCheck className="h-6 w-6 text-red-400" />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          )}
          <h1 className="text-2xl font-bold text-stone-100">{statusTitle}</h1>
        </div>

        <p className="text-stone-300">{statusBody}</p>
        <p className="mt-2 text-xs text-stone-500">
          Privacy reminder: clients are not publicly discoverable. Connections happen only through
          direct invite links.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/my-hub/friends"
            className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Go to Dinner Circle
          </Link>
          <Link
            href="/my-hub"
            className="inline-flex items-center rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-300 hover:border-stone-600 hover:text-stone-100"
          >
            Back to My Hub
          </Link>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
