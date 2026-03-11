import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BusinessDocumentBatchUpload } from '@/components/documents/business-document-batch-upload'
import type { BusinessDocumentVaultOverview } from '@/lib/documents/file-service'

type VaultFilterLink = {
  label: string
  href: string
  active: boolean
}

type PreservedParam = {
  name: string
  value: string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function BusinessDocumentVault({
  overview,
  preservedParams,
  filterLinks,
  resetHref,
}: {
  overview: BusinessDocumentVaultOverview
  preservedParams: PreservedParam[]
  filterLinks: VaultFilterLink[]
  resetHref: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-stone-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Business Document Vault</CardTitle>
            <p className="mt-1 text-sm text-stone-400">
              Store original contracts, compliance files, W-9s, permits, and legacy business docs
              in one private vault.
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Image-based scans can open in a deterministic enhanced preview. Original files stay
              preserved and unchanged.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{overview.totalUploaded} uploaded</Badge>
            <Badge variant="default">{overview.extractionCompletedCount} text-ready</Badge>
            <Badge variant="success">{overview.filteredCount} shown</Badge>
          </div>
        </div>

        <form action="/documents" method="get" className="mt-4 flex flex-col gap-3 lg:flex-row">
          {preservedParams.map((param) => (
            <input key={`${param.name}-${param.value}`} type="hidden" name={param.name} value={param.value} />
          ))}
          {overview.activeDocumentType !== 'all' && (
            <input type="hidden" name="v_type" value={overview.activeDocumentType} />
          )}
          <input
            type="text"
            name="v_q"
            defaultValue={overview.activeQuery}
            placeholder="Search uploaded business documents..."
            className="h-10 flex-1 rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200 placeholder:text-stone-500"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
            {(overview.activeQuery || overview.activeDocumentType !== 'all') && (
              <Button type="button" variant="ghost" size="sm" href={resetHref}>
                Reset
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {filterLinks.map((link) => (
            <Button
              key={link.label}
              type="button"
              size="sm"
              variant={link.active ? 'primary' : 'secondary'}
              href={link.href}
            >
              {link.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-[1.05fr,1.45fr]">
        <div>
          <BusinessDocumentBatchUpload />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-200">Vault results</p>
            <p className="text-xs text-stone-500">Newest first</p>
          </div>

          {overview.documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/40 px-4 py-8 text-center">
              <p className="text-sm text-stone-300">No documents match this vault filter.</p>
              <p className="mt-1 text-xs text-stone-500">
                Try a different search, reset the filter, or upload a new batch.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-stone-100">
                          {document.title}
                        </p>
                        <Badge variant="default">{formatLabel(document.documentType)}</Badge>
                        {document.entityType && (
                          <Badge variant="info">{formatLabel(document.entityType)}</Badge>
                        )}
                        {document.extractionStatus === 'completed' && (
                          <Badge variant="success">Text ready</Badge>
                        )}
                        {document.canEnhancePreview && (
                          <Badge variant="info">Enhanced preview available</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {document.originalFilename ?? document.sourceFilename ?? 'Unnamed file'} -{' '}
                        {formatBytes(document.fileSizeBytes)} -{' '}
                        {format(new Date(document.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                      {document.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {document.tags.slice(0, 6).map((tag) => (
                            <Badge key={tag} variant="default">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {document.viewUrl && (
                      <div className="flex gap-2">
                        {document.enhancedViewUrl && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            href={document.enhancedViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Enhanced Preview
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          href={document.viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Original
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          href={`${document.viewUrl}?download=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
