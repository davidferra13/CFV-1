'use client'

// Related Documents Panel
// Shows all documents linked to a specific event, client, or inquiry.
// Lightweight list view with document type badges and links.

import { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getDocumentsForEvent,
  getDocumentsForClient,
  getDocumentsForInquiry,
  type LinkedDocument,
} from '@/lib/documents/link-actions'
import { format } from 'date-fns'

type Props = {
  entityType: 'event' | 'client' | 'inquiry'
  entityId: string
  /** Optional label override. Defaults to "Related Documents". */
  label?: string
}

function DocTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    receipt: 'bg-emerald-900 text-emerald-400',
    contract: 'bg-blue-900 text-blue-400',
    policy: 'bg-purple-900 text-purple-400',
    checklist: 'bg-amber-900 text-amber-400',
    template: 'bg-sky-900 text-sky-400',
    note: 'bg-stone-800 text-stone-400',
    general: 'bg-stone-800 text-stone-400',
  }

  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[type] ?? colors.general}`}
    >
      {type}
    </span>
  )
}

export function RelatedDocumentsPanel({ entityType, entityId, label }: Props) {
  const [documents, setDocuments] = useState<LinkedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        let docs: LinkedDocument[]
        switch (entityType) {
          case 'event':
            docs = await getDocumentsForEvent(entityId)
            break
          case 'client':
            docs = await getDocumentsForClient(entityId)
            break
          case 'inquiry':
            docs = await getDocumentsForInquiry(entityId)
            break
        }
        if (!cancelled) setDocuments(docs)
      } catch (err) {
        if (!cancelled) setError('Failed to load documents')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [entityType, entityId])

  if (loading) {
    return (
      <Card className="p-4 bg-stone-900 border-stone-700">
        <p className="text-xs text-stone-500 animate-pulse">Loading documents...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4 bg-stone-900 border-stone-700">
        <p className="text-xs text-red-400">{error}</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 bg-stone-900 border-stone-700 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">{label ?? 'Related Documents'}</h3>
        {documents.length > 0 && <span className="text-xs text-stone-500">{documents.length}</span>}
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-stone-500">No documents linked to this {entityType}.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-2 py-1.5 border-b border-stone-800 last:border-0"
            >
              <DocTypeBadge type={doc.documentType} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-200 truncate">{doc.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-stone-500">
                  <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                  {doc.folderName && <span>in {doc.folderName}</span>}
                </div>
                {doc.summary && (
                  <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">{doc.summary}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Button size="sm" variant="ghost" href="/documents" className="text-xs">
        View all documents
      </Button>
    </Card>
  )
}
