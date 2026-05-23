'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  brokerRemySensitiveBoundary,
  type RemySensitiveBoundaryDecision,
  type RemySensitiveBoundaryInput,
} from '@/lib/remy/sensitive-boundary-broker'

export async function evaluateRemySensitiveBoundary(
  input: Omit<RemySensitiveBoundaryInput, 'userRole'> & {
    userRole?: RemySensitiveBoundaryInput['userRole']
  }
): Promise<RemySensitiveBoundaryDecision> {
  const user = await requireChef()

  return brokerRemySensitiveBoundary({
    ...input,
    userRole: input.userRole ?? user.role,
  })
}
