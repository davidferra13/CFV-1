// Recipe Dump - Get recipes out of your head, fast
// Type a name, dump what you know, Ollama parses it, you save it.
// Supports creating recipe families (variations) in flow.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipeFamilies } from '@/lib/recipes/actions'
import { RecipeDumpClient } from './recipe-dump-client'

export const metadata: Metadata = { title: 'Recipe Dump - ChefFlow' }

export default async function RecipeDumpPage() {
  await requireChef()
  const families = await getRecipeFamilies()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Recipe Dump</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Type the name, dump everything you know. Ollama does the rest.
        </p>
      </div>
      <RecipeDumpClient existingFamilies={families} />
    </div>
  )
}
