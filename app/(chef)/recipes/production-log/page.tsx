// Global Production Log — see every recipe production across all recipes
// Business owner view: who made what, when, how much, shelf life status

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAllProductionLogs } from '@/lib/recipes/production-log-actions'
import { ProductionLogClient } from './production-log-client'

export const metadata: Metadata = { title: 'Production Log — ChefFlow' }

export default async function ProductionLogPage() {
  await requireChef()
  const entries = await getAllProductionLogs()

  return <ProductionLogClient entries={entries} />
}
