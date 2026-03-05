'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, ExternalLink, User, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Prospect } from '@/lib/prospecting/types'
import { PROSPECT_CATEGORY_LABELS, PROSPECT_STATUS_COLORS } from '@/lib/prospecting/constants'
import type { ProspectCategory, ProspectStatus } from '@/lib/prospecting/constants'
import { BulkActionBar } from './bulk-action-bar'

const PAGE_SIZE = 25

interface ProspectTableProps {
  prospects: Prospect[]
}

export function ProspectTable({ prospects }: ProspectTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(0)

  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-lg font-medium">No prospects yet</p>
        <p className="text-sm mt-1">Run an AI scrub to start building your prospect database.</p>
      </div>
    )
  }

  const totalPages = Math.ceil(prospects.length / PAGE_SIZE)
  const pageStart = currentPage * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, prospects.length)
  const pageProspects = prospects.slice(pageStart, pageEnd)

  const allPageSelected =
    pageProspects.length > 0 && pageProspects.every((p) => selectedIds.has(p.id))

  function toggleAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const p of pageProspects) next.delete(p.id)
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const p of pageProspects) next.add(p.id)
        return next
      })
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-3">
      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 text-left text-stone-500">
              <th className="py-3 px-2 w-8" aria-label="Select all">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAll}
                  title="Select all on this page"
                  className="rounded border-stone-600"
                />
              </th>
              <th className="py-3 px-3 font-medium">Prospect</th>
              <th className="py-3 px-3 font-medium">Score</th>
              <th className="py-3 px-3 font-medium">Category</th>
              <th className="py-3 px-3 font-medium">Location</th>
              <th className="py-3 px-3 font-medium">Contact</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-3 font-medium">Calls</th>
              <th className="py-3 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageProspects.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-stone-800 hover:bg-stone-800 transition-colors ${
                  selectedIds.has(p.id) ? 'bg-brand-950/30' : ''
                }`}
              >
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    title={`Select ${p.name}`}
                    className="rounded border-stone-600"
                  />
                </td>
                <td className="py-3 px-3">
                  <Link
                    href={`/prospecting/${p.id}`}
                    className="hover:underline font-medium text-stone-100 flex items-center gap-1.5"
                  >
                    {p.prospect_type === 'individual' ? (
                      <User className="h-3.5 w-3.5 text-stone-400" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 text-stone-400" />
                    )}
                    {p.name}
                  </Link>
                  {p.description && (
                    <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{p.description}</p>
                  )}
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block min-w-[2rem] text-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.lead_score >= 70
                        ? 'bg-green-950 text-green-400'
                        : p.lead_score >= 40
                          ? 'bg-amber-950 text-amber-400'
                          : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {p.lead_score}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-xs text-stone-400">
                    {PROSPECT_CATEGORY_LABELS[p.category as ProspectCategory] ?? p.category}
                  </span>
                </td>
                <td className="py-3 px-3 text-stone-400">
                  {[p.city, p.state].filter(Boolean).join(', ') || p.region || '—'}
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-col gap-0.5">
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="text-brand-600 hover:underline text-xs flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {p.phone}
                      </a>
                    )}
                    {p.contact_person && (
                      <span className="text-xs text-stone-500">Ask for: {p.contact_person}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <Badge
                    variant={
                      (PROSPECT_STATUS_COLORS[p.status as ProspectStatus] as any) ?? 'default'
                    }
                  >
                    {p.status.replace('_', ' ')}
                  </Badge>
                  {p.priority === 'high' && (
                    <Badge variant="warning" className="ml-1">
                      High
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-3 text-stone-400">
                  {p.call_count > 0 ? (
                    <span className="text-xs">{p.call_count}x</span>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-1">
                    <Link href={`/prospecting/${p.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    {p.website && (
                      <Button
                        variant="ghost"
                        size="sm"
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Visit ${p.name} website`}
                        aria-label={`Visit ${p.name} website`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-stone-500">
            Showing {pageStart + 1}–{pageEnd} of {prospects.length}
            {selectedIds.size > 0 && (
              <span className="text-brand-400 ml-2">({selectedIds.size} selected)</span>
            )}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={i === currentPage ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage(i)}
                className="h-7 w-7 p-0 text-xs"
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
