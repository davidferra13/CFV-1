import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getMenuBoardItems } from '@/lib/food-truck/menu-board-actions'
import { MenuBoardDisplay } from '@/components/food-truck/menu-board-display'

export const metadata: Metadata = { title: 'Menu Display - ChefFlow' }

export default async function MenuBoardDisplayPage() {
  await requireChef()

  const boardData = await getMenuBoardItems()

  return (
    <MenuBoardDisplay
      initialCategories={boardData.categories}
      initialSettings={boardData.settings}
      fullScreen
    />
  )
}
