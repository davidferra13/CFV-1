'use client'

import { useRouter } from 'next/navigation'
import { CircleLayout } from '@/components/circles/redesign'
import type { CircleRailItem } from '@/components/circles/redesign/circle-rail'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

type Props = {
  circles: CircleRailItem[]
  activeCircleId: string
  circle: CircleDetail
}

export function CircleRedesignShell({ circles, activeCircleId, circle }: Props) {
  const router = useRouter()
  return (
    <CircleLayout
      circles={circles}
      activeCircleId={activeCircleId}
      circle={circle}
      onSelectCircle={(id) => router.push(`/circles/${id}`)}
    >
      {null}
    </CircleLayout>
  )
}
