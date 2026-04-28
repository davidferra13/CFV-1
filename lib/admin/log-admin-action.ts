import 'server-only'

import { logAdminAction as appendAdminAuditLog } from './audit'

type LogAdminActionInput = Parameters<typeof appendAdminAuditLog>[0]

export async function logAdminAction(input: LogAdminActionInput) {
  return appendAdminAuditLog(input)
}
