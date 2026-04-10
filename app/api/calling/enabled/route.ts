/**
 * Supplier Calling Feature Gate Check
 *
 * Returns whether the current chef has the supplier_calling flag enabled.
 * Used by the VendorCallQueuePanel to decide whether to show the Auto-call button.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServerClient } from '@/lib/db/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ enabled: false })

    const chefId = (session.user as any).tenantId
    if (!chefId) return NextResponse.json({ enabled: false })

    const db: any = createServerClient()
    const { data } = await db
      .from('chef_feature_flags')
      .select('enabled')
      .eq('chef_id', chefId)
      .eq('flag_name', 'supplier_calling')
      .maybeSingle()

    return NextResponse.json({ enabled: data?.enabled === true })
  } catch {
    return NextResponse.json({ enabled: false })
  }
}
