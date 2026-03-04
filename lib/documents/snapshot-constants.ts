import type { SnapshotDocumentType } from '@/lib/documents/document-definitions'

export const SNAPSHOT_DOCUMENT_LABELS: Record<SnapshotDocumentType, string> = {
  summary: 'Event Summary',
  grocery: 'Grocery List',
  foh: 'Front-of-House Menu',
  prep: 'Prep Sheet',
  execution: 'Execution Sheet',
  checklist: 'Non-Negotiables Checklist',
  packing: 'Packing List',
  reset: 'Post-Service Reset Checklist',
  travel: 'Travel Route',
  shots: 'Content Asset Capture Sheet',
  all: 'Full 8-Sheet Packet',
}
