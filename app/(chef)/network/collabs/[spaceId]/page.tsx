import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getCollabSpaceDetail } from '@/lib/network/collab-space-actions'
import { SpaceViewClient } from './space-view-client'

interface Props {
  params: { spaceId: string }
  searchParams: { thread?: string }
}

export async function generateMetadata({ params }: Props) {
  return { title: 'Private Space' }
}

export default async function CollabSpacePage({ params, searchParams }: Props) {
  const user = await requireChef()
  const detail = await getCollabSpaceDetail({
    spaceId: params.spaceId,
    threadId: searchParams.thread,
  })

  if (!detail) {
    notFound()
  }

  return <SpaceViewClient detail={detail} currentChefId={user.entityId} spaceId={params.spaceId} />
}
