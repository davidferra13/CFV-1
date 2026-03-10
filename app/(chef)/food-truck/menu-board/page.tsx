import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getMenuBoardItems, getAllRecipesForBoard } from '@/lib/food-truck/menu-board-actions'
import { MenuBoardAdmin } from '@/components/food-truck/menu-board-admin'
import { MenuBoardDisplay } from '@/components/food-truck/menu-board-display'

export const metadata: Metadata = { title: 'Menu Board - ChefFlow' }

export default async function MenuBoardPage() {
  await requireChef()

  const [boardData, allRecipes] = await Promise.all([getMenuBoardItems(), getAllRecipesForBoard()])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Menu Board</h1>
        <p className="text-zinc-400 mt-1">
          Manage your food truck menu board. Set prices, 86 items, and open the display for your
          truck window.
        </p>
      </div>

      {/* Admin controls */}
      <MenuBoardAdmin initialRecipes={allRecipes} />

      {/* Preview */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-3">Preview</h2>
        <MenuBoardDisplay
          initialCategories={boardData.categories}
          initialSettings={boardData.settings}
        />
      </div>
    </div>
  )
}
