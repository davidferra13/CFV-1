'use server'

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { chefs } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'

interface ExternalContactsInput {
  bankUrl: string
  accountantEmail: string
  lawyerPhone: string
  lawyerEmail: string
  insurancePortalUrl: string
  websiteAdminUrl: string
  commissaryUrl: string
}

export async function saveExternalContacts(
  data: ExternalContactsInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId

  if (!tenantId) {
    return { success: false, error: 'No tenant found' }
  }

  try {
    await db
      .update(chefs)
      .set({
        bankUrl: data.bankUrl || null,
        accountantEmail: data.accountantEmail || null,
        lawyerPhone: data.lawyerPhone || null,
        lawyerEmail: data.lawyerEmail || null,
        insurancePortalUrl: data.insurancePortalUrl || null,
        websiteAdminUrl: data.websiteAdminUrl || null,
        commissaryUrl: data.commissaryUrl || null,
      })
      .where(eq(chefs.id, tenantId))

    return { success: true }
  } catch (err) {
    console.error('Failed to save external contacts:', err)
    return { success: false, error: 'Database update failed' }
  }
}
