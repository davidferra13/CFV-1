// Contract Status Badge
// Shows the current contract status with color coding.

import { Badge } from '@/components/ui/badge'

type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'voided'

const STATUS_CONFIG: Record<
  ContractStatus,
  { label: string; variant: 'default' | 'warning' | 'info' | 'success' | 'error' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  sent: { label: 'Sent', variant: 'warning' },
  viewed: { label: 'Viewed', variant: 'info' },
  signed: { label: 'Signed', variant: 'success' },
  voided: { label: 'Voided', variant: 'error' },
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return <Badge variant={config.variant}>{config.label}</Badge>
}
