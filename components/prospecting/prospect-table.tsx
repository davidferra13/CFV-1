'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, ExternalLink, User, Building2 } from 'lucide-react'
import type { Prospect } from '@/lib/prospecting/types'
import { PROSPECT_CATEGORY_LABELS, PROSPECT_STATUS_COLORS } from '@/lib/prospecting/constants'
import type { ProspectCategory, ProspectStatus } from '@/lib/prospecting/constants'

interface ProspectTableProps {
  prospects: Prospect[]
}

export function ProspectTable({ prospects }: ProspectTableProps) {
  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-lg font-medium">No prospects yet</p>
        <p className="text-sm mt-1">Run an AI scrub to start building your prospect database.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-700 text-left text-stone-500">
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
          {prospects.map((p) => (
            <tr
              key={p.id}
              className="border-b border-stone-800 hover:bg-stone-800 transition-colors"
            >
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
                  variant={(PROSPECT_STATUS_COLORS[p.status as ProspectStatus] as any) ?? 'default'}
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
                    <a href={p.website} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
