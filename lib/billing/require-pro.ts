'use server'

import { requireChef, type AuthUser } from '@/lib/auth/get-user'

// Compatibility shim for old call sites. ChefFlow access is universal, so this
// function now performs only the normal chef auth check.
export async function requirePro(_featureSlug: string): Promise<AuthUser> {
  return requireChef()
}
