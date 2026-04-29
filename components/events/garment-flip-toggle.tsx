'use client'

import type { ReactNode } from 'react'

type Props = {
  menus: Array<{
    id: string
    name: string
    description: string | null
    serviceStyle: string | null
    dishes: Array<unknown>
  }>
  occasion?: string | null
  guestCount?: number | null
  eventDate?: string | Date
  children: ReactNode
}

export function GarmentFlipToggle({ children }: Props) {
  return <>{children}</>
}
