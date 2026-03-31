// Recipe Import Hub
// Consolidates all recipe import methods in one place:
// - Photo import (batch): recipe cards, cookbook pages, handwritten notes
// - URL import (batch): AllRecipes, Food Network, etc.
// - Smart Import (text): paste/type recipe text, AI parses it
// - Brain Dump: freeform description, AI structures it
// - Sprint Mode: queue-based capture for past dishes

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { RecipeImportHubClient } from './import-hub-client'

export const metadata: Metadata = { title: 'Import Recipes' }

export default async function RecipeImportPage() {
  await requireChef()

  const aiConfigured = !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)
  const visionConfigured = !!process.env.GEMINI_API_KEY

  return <RecipeImportHubClient aiConfigured={aiConfigured} visionConfigured={visionConfigured} />
}
