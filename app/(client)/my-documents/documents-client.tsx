'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { FileText, FileCheck, Receipt, ScrollText } from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ClientDocument } from '@/lib/documents/client-document-actions'

const TABS = ['all', 'contract', 'invoice', 'proposal'] as const
type TabKey = (typeof TABS)[number]

const TAB_LABELS: Record<TabKey, string> = {
  all: 'All',
  contract: 'Contracts',
  invoice: 'Invoices',
  proposal: 'Proposals',
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  contract: FileCheck,
  invoice: Receipt,
  proposal: ScrollText,
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  Signed: 'success',
  Paid: 'success',
  Approved: 'success',
  Sent: 'info',
  Viewed: 'info',
  'Awaiting Signature': 'warning',
  Pending: 'warning',
  Draft: 'warning',
  Partial: 'warning',
  Due: 'warning',
  Expired: 'error',
  Declined: 'error',
  Voided: 'error',
}

export function DocumentsClient({ documents }: { documents: ClientDocument[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const filtered = activeTab === 'all' ? documents : documents.filter((d) => d.type === activeTab)

  const counts = {
    all: documents.length,
    contract: documents.filter((d) => d.type === 'contract').length,
    invoice: documents.filter((d) => d.type === 'invoice').length,
    proposal: documents.filter((d) => d.type === 'proposal').length,
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-stone-800/50 rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-stone-700 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {TAB_LABELS[tab]}
            {counts[tab] > 0 && (
              <span className="ml-1.5 text-xs text-stone-500">({counts[tab]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-400">
              No documents yet. Documents from your events will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const Icon = TYPE_ICONS[doc.type] || FileText
            const variant = STATUS_VARIANT[doc.status] || 'default'
            return (
              <Link key={doc.id} href={doc.viewUrl}>
                <Card className="hover:bg-stone-800/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-stone-800">
                      <Icon className="w-5 h-5 text-stone-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-100 truncate">{doc.title}</p>
                      <p className="text-xs text-stone-500 truncate">{doc.eventTitle}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-stone-500 hidden sm:block">
                        {format(new Date(doc.date), 'MMM d, yyyy')}
                      </span>
                      <Badge variant={variant}>{doc.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
