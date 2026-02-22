// Recipe Sprint Mode — Backfill capture page
// Loads all dish components with no recipe, sorted most-recent first.
// Chef works through the queue: paste → AI parse → save → next.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAllUnrecordedComponents } from '@/lib/recipes/actions'
import { RecipeSprintClient } from '@/components/recipes/recipe-sprint-client'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export const metadata: Metadata = { title: 'Recipe Sprint — ChefFlow' }

export default async function RecipeSprintPage() {
  await requireChef()

  const [items] = await Promise.all([getAllUnrecordedComponents()])

  const aiConfigured = !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-stone-900">Recipe Sprint</h1>
          </div>
          <p className="text-stone-600 mt-1">
            {items.length > 0
              ? `${items.length} dish${items.length !== 1 ? 'es' : ''} from past events with no recipe recorded — let's fix that.`
              : 'All dish components have recipes recorded.'}
          </p>
        </div>
        <Link href="/recipes" className="text-sm text-stone-500 hover:text-stone-700 font-medium">
          View Recipe Book
        </Link>
      </div>

      {!aiConfigured && items.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <strong>Auto-parsing not configured.</strong> Set GEMINI_API_KEY in your environment for
          automatic ingredient and method extraction. Descriptions will be saved as method text —
          you can edit the full recipe after.
        </div>
      )}

      <RecipeSprintClient initialItems={items} aiConfigured={aiConfigured} />
    </div>
  )
}
