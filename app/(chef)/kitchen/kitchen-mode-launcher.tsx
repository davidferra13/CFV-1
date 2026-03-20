'use client'

import { useRouter } from 'next/navigation'
import { KitchenMode } from '@/components/kitchen/kitchen-mode'

const PLACEHOLDER_STEPS = [{ id: 'placeholder', title: 'No active prep steps', completed: false }]

export function KitchenModeLauncher() {
  const router = useRouter()

  return <KitchenMode steps={PLACEHOLDER_STEPS} onExit={() => router.back()} />
}
