'use server'

// ============================================================
// NO PRO TIER. ALL FEATURES ARE FREE.
// ============================================================
// requirePro() is a PASS-THROUGH. It only authenticates the chef.
// It does NOT gate any feature. It never will again.
//
// Why it still exists: 73 call sites across the codebase import it.
// Removing it would break compilation. The name is misleading but the
// behavior is plain auth, identical to calling requireChef() directly.
//
// If you are reading this because you saw requirePro() in a server action
// and assumed the feature is Pro-gated: IT IS NOT. It is free for everyone.
//
// Monetization: voluntary supporter contributions via Stripe only.
// See docs/monetization-shift.md and CLAUDE.md § Monetization Model.
// ============================================================

import { requireChef, type AuthUser } from '@/lib/auth/get-user'

export async function requirePro(_featureSlug: string): Promise<AuthUser> {
  return await requireChef()
}
