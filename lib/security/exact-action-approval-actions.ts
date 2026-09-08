'use server'

import { approveExactActionRequest as approve } from '@/lib/security/exact-action-approval'

export async function approveExactActionRequest(input: {
  approvalId: string
  displayedActionHash: string
}): Promise<{ approved: true; expiresAt: string }> {
  return approve(input)
}
