'use server'

import { requireChef } from '@/lib/auth/get-user'

type ConnectionStatus = {
  connected: boolean
  status?: string
  accountName?: string | null
  connectedAt?: string | null
  lastError?: string | null
}

export async function getOAuthConnectionStatuses(): Promise<
  Record<'quickbooks' | 'docusign' | 'square', ConnectionStatus>
> {
  const user = await requireChef()
  const tenantId = user.entityId

  const [qb, ds, sq] = await Promise.all([
    import('@/lib/integrations/quickbooks/quickbooks-client')
      .then((m) => m.getQuickBooksConnectionStatus(tenantId))
      .catch(() => ({ connected: false })),
    import('@/lib/integrations/docusign/docusign-client')
      .then((m) => m.getDocuSignConnectionStatus(tenantId))
      .catch(() => ({ connected: false })),
    import('@/lib/integrations/square/square-client')
      .then((m) => m.getSquareConnectionStatus(tenantId))
      .catch(() => ({ connected: false })),
  ])

  return {
    quickbooks: {
      connected: qb.connected,
      status: 'status' in qb ? (qb as any).status : undefined,
      accountName:
        'companyName' in qb
          ? (qb as any).companyName
          : 'merchantName' in qb
            ? (qb as any).merchantName
            : null,
      connectedAt: 'connectedAt' in qb ? (qb as any).connectedAt : null,
      lastError: 'lastError' in qb ? (qb as any).lastError : null,
    },
    docusign: {
      connected: ds.connected,
      status: 'status' in ds ? (ds as any).status : undefined,
      accountName: 'accountName' in ds ? (ds as any).accountName : null,
      connectedAt: 'connectedAt' in ds ? (ds as any).connectedAt : null,
      lastError: 'lastError' in ds ? (ds as any).lastError : null,
    },
    square: {
      connected: sq.connected,
      status: 'status' in sq ? (sq as any).status : undefined,
      accountName: 'merchantName' in sq ? (sq as any).merchantName : null,
      connectedAt: 'connectedAt' in sq ? (sq as any).connectedAt : null,
      lastError: 'lastError' in sq ? (sq as any).lastError : null,
    },
  }
}
