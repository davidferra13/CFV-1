// Admin Recipes — All recipes across every chef

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminRecipes } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { BookOpen, AlertCircle } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'

export default async function AdminRecipesPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let recipes = await getAdminRecipes().catch(() => [])
  let error = recipes.length === 0 ? null : null

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-950 rounded-lg">
          <BookOpen size={18} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Recipes</h1>
          <p className="text-sm text-stone-500">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} across all chefs
          </p>
        </div>
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {recipes.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No recipes found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Recipe
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Cuisine
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Servings
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Prep
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Cook
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipes.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{recipe.name}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {recipe.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs">{recipe.category ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {recipe.cuisine_type ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {recipe.servings ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {recipe.prep_time_minutes ? `${recipe.prep_time_minutes}m` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m` : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(recipe.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={recipe.tenant_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
