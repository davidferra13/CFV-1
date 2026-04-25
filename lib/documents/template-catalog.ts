import type { OperationalDocumentType } from '@/lib/documents/document-definitions'

export type { OperationalDocumentType } from '@/lib/documents/document-definitions'

export type DocumentTemplateSlug =
  | 'event-summary'
  | 'grocery-list'
  | 'front-of-house-menu'
  | 'prep-sheet'
  | 'execution-sheet'
  | 'non-negotiables-checklist'
  | 'packing-list'
  | 'post-service-reset'
  | 'travel-route'
  | 'content-asset-capture'
  | 'banquet-event-order'

export type DocumentTemplateEntry = {
  slug: DocumentTemplateSlug
  label: string
  description: string
  sourcePath: string
  downloadName: string
}

export const DOCUMENT_TEMPLATE_CATALOG: DocumentTemplateEntry[] = [
  {
    slug: 'event-summary',
    label: 'Event Summary Template',
    description: 'One-page event context sheet for service day.',
    sourcePath: 'docs/PDFref/templates/06-event-summary-template.md',
    downloadName: 'event-summary-template.md',
  },
  {
    slug: 'grocery-list',
    label: 'Grocery List Template',
    description: 'Shopping sheet by stop and store section.',
    sourcePath: 'docs/PDFref/templates/02-grocery-list-template.md',
    downloadName: 'grocery-list-template.md',
  },
  {
    slug: 'front-of-house-menu',
    label: 'Front-of-House Menu Template',
    description: 'Client-facing menu sheet for print display.',
    sourcePath: 'docs/PDFref/templates/11-front-of-house-menu-template.md',
    downloadName: 'front-of-house-menu-template.md',
  },
  {
    slug: 'prep-sheet',
    label: 'Prep Sheet Template',
    description: 'At-home prep and day-of execution checklist.',
    sourcePath: 'docs/PDFref/templates/03-prep-service-sheet-template.md',
    downloadName: 'prep-sheet-template.md',
  },
  {
    slug: 'execution-sheet',
    label: 'Execution Sheet Template',
    description: 'On-site course fire and timing controls.',
    sourcePath: 'docs/PDFref/templates/07-execution-sheet-template.md',
    downloadName: 'execution-sheet-template.md',
  },
  {
    slug: 'non-negotiables-checklist',
    label: 'Non-Negotiables Checklist Template',
    description: 'Critical no-miss controls before and during service.',
    sourcePath: 'docs/PDFref/templates/08-non-negotiables-checklist-template.md',
    downloadName: 'non-negotiables-checklist-template.md',
  },
  {
    slug: 'packing-list',
    label: 'Packing List Template',
    description: 'Load plan by transport zone and final checks.',
    sourcePath: 'docs/PDFref/templates/04-packing-list-template.md',
    downloadName: 'packing-list-template.md',
  },
  {
    slug: 'post-service-reset',
    label: 'Post-Service Reset Template',
    description: 'Closeout and reset checks after service.',
    sourcePath: 'docs/PDFref/templates/05-closeout-sheet-template.md',
    downloadName: 'post-service-reset-template.md',
  },
  {
    slug: 'travel-route',
    label: 'Travel Route Template',
    description: 'Routing, parking, and leg-level timing plan.',
    sourcePath: 'docs/PDFref/templates/09-travel-route-template.md',
    downloadName: 'travel-route-template.md',
  },
  {
    slug: 'content-asset-capture',
    label: 'Content Asset Capture Template',
    description: 'Shot list and capture checklist by service phase.',
    sourcePath: 'docs/PDFref/templates/10-content-asset-capture-sheet-template.md',
    downloadName: 'content-asset-capture-template.md',
  },
  {
    slug: 'banquet-event-order',
    label: 'Banquet Event Order Template',
    description: 'Consolidated operational document for venue coordinators and staff.',
    sourcePath: 'docs/PDFref/templates/12-banquet-event-order-template.md',
    downloadName: 'banquet-event-order-template.md',
  },
]

export const TEMPLATE_SLUG_BY_DOC_TYPE: Record<OperationalDocumentType, DocumentTemplateSlug> = {
  summary: 'event-summary',
  grocery: 'grocery-list',
  foh: 'front-of-house-menu',
  prep: 'prep-sheet',
  execution: 'execution-sheet',
  checklist: 'non-negotiables-checklist',
  packing: 'packing-list',
  reset: 'post-service-reset',
  travel: 'travel-route',
  shots: 'content-asset-capture',
  beo: 'banquet-event-order',
}

export function getDocumentTemplateBySlug(slug: string): DocumentTemplateEntry | null {
  return DOCUMENT_TEMPLATE_CATALOG.find((entry) => entry.slug === slug) ?? null
}
