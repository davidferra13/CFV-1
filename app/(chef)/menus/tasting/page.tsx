import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getTastingMenus } from '@/lib/menus/tasting-menu-actions'
import { TastingMenuHub } from './tasting-menu-hub'

export const metadata: Metadata = { title: 'Tasting Menus' }

export default async function TastingMenuPage() {
  await requireChef()
  const menus = await getTastingMenus()

  return <TastingMenuHub initialMenus={menus} />
}
