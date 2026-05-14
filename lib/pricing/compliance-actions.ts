'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { getPieCompliance } from './pie-compliance'

export async function fetchPieCompliance() {
  await requireAdmin()
  return getPieCompliance()
}
