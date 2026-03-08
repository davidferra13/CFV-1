// Email Brand Helpers
// Bridges getChefBrand() with the email template system.
// Notification functions call these to get brand props for BaseLayout.

import { getChefBrand } from '@/lib/chef/brand'
import type { ChefBrandProps } from '@/lib/email/templates/base-layout'

/**
 * Fetch chef brand data formatted for email templates.
 * Returns brand props for BaseLayout + the fromName for sendEmail.
 * Never throws - returns defaults if fetch fails.
 */
export async function getEmailBrand(
  chefId: string | null | undefined
): Promise<{ brand: ChefBrandProps; fromName: string }> {
  if (!chefId) {
    return {
      brand: {},
      fromName: 'ChefFlow',
    }
  }

  try {
    const chefBrand = await getChefBrand(chefId)
    return {
      brand: {
        businessName: chefBrand.businessName,
        logoUrl: chefBrand.logoUrl,
        primaryColor: chefBrand.primaryColor,
        showPoweredBy: chefBrand.showPoweredBy,
      },
      fromName: chefBrand.businessName,
    }
  } catch (err) {
    console.error('[getEmailBrand] Failed to fetch brand, using defaults:', err)
    return {
      brand: {},
      fromName: 'ChefFlow',
    }
  }
}
