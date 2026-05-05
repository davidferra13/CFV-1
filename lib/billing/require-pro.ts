'use server'

import { requireChef, type AuthUser } from '@/lib/auth/get-user'

export async function requirePro(_featureSlug: string): Promise<AuthUser> {
  return requireChef()
}
