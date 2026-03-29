'use client'

import { useState, useTransition, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from '@/components/ui/icons'
import {
  getOpenClawLeads,
  importOpenClawLead,
  bulkImportOpenClawLeads,
  type OpenClawLead,
  type OpenClawLeadFilters,
} from '@/lib/prospecting/openclaw-import'
import { toast } from 'sonner'

type Props = {
  initialLeads: OpenClawLead[]
  initialTotal: number
}

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]

function relevanceBadge(rel: string | null) {
  if (rel === 'high') return <Badge variant="success">High</Badge>
  if (rel === 'medium') return <Badge variant="warning">Medium</Badge>
  if (rel === 'low') return <Badge variant="default">Low</Badge>
  return null
}

export function OpenClawLeadsBrowser({ initialLeads, initialTotal }: Props) {
  const [leads, setLeads] = useState(initialLeads)
  const [total, setTotal] = useState(initialTotal)
  const [filters, setFilters] = useState<OpenClawLeadFilters>({ page: 1, limit: 25 })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set())
  const [pending, startTransition] = useTransition()
  const [bulkPending, startBulkTransition] = useTransition()

  const totalPages = Math.ceil(total / (filters.limit ?? 25))

  const fetchLeads = useCallback((newFilters: OpenClawLeadFilters) => {
    setFilters(newFilters)
    startTransition(async () => {
      try {
        const result = await getOpenClawLeads(newFilters)
        setLeads(result.leads)
        setTotal(result.total)
      } catch {
        toast.error('Failed to load leads')
      }
    })
  }, [])

  const updateFilter = (key: string, value: string | number) => {
    const updated = { ...filters, [key]: value, page: 1 }
    fetchLeads(updated)
  }

  const handleImport = (lead: OpenClawLead) => {
    startTransition(async () => {
      try {
        const result = await importOpenClawLead(lead.id)
        if (result.success) {
          setImportedIds((prev) => new Set([...prev, lead.id]))
          toast.success(`Imported "${lead.name}" as a new prospect`)
        } else if (result.duplicate) {
          toast.error(result.error ?? 'Possible duplicate')
        } else {
          toast.error(result.error ?? 'Failed to import')
        }
      } catch {
        toast.error('Failed to import lead')
      }
    })
  }

  const handleBulkImport = () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    startBulkTransition(async () => {
      try {
        const result = await bulkImportOpenClawLeads(ids)
        setImportedIds((prev) => {
          const next = new Set(prev)
          ids.forEach((id) => next.add(id))
          return next
        })
        setSelected(new Set())
        if (result.imported > 0) {
          toast.success(`Imported ${result.imported} prospect${result.imported !== 1 ? 's' : ''}`)
        }
        if (result.duplicates.length > 0) {
          toast.warning(
            `Skipped ${result.duplicates.length} duplicate${result.duplicates.length !== 1 ? 's' : ''}`
          )
        }
      } catch {
        toast.error('Bulk import failed')
      }
    })
  }

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l) => l.id)))
    }
  }

  if (total === 0 && !filters.state && !filters.search && !filters.source) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-stone-400">
            No OpenClaw leads found. Leads appear after the lead-engine cartridge runs its first
            scrape on the Pi.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search by name..."
              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm flex-1 min-w-[180px] text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateFilter('search', (e.target as HTMLInputElement).value)
              }}
              onBlur={(e) => {
                if (e.target.value !== (filters.search ?? ''))
                  updateFilter('search', e.target.value)
              }}
              defaultValue={filters.search ?? ''}
            />
            <select
              value={filters.state ?? ''}
              onChange={(e) => updateFilter('state', e.target.value)}
              aria-label="Filter by state"
              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-300"
            >
              <option value="">All States</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filters.source ?? ''}
              onChange={(e) => updateFilter('source', e.target.value)}
              aria-label="Filter by source"
              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-300"
            >
              <option value="">All Sources</option>
              <option value="lead-engine:yelp">Yelp</option>
              <option value="lead-engine:google_maps">Google Maps</option>
              <option value="lead-engine:sos_ma">MA Registry</option>
              <option value="lead-engine:sos_nh">NH Registry</option>
              <option value="osm">OpenStreetMap</option>
            </select>
            <select
              value={filters.minScore ?? 0}
              onChange={(e) => updateFilter('minScore', Number(e.target.value))}
              aria-label="Minimum score"
              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-300"
            >
              <option value={0}>Any Score</option>
              <option value={25}>25+</option>
              <option value={50}>50+</option>
              <option value={75}>75+</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3">
          <Button onClick={handleBulkImport} disabled={bulkPending}>
            {bulkPending ? `Importing ${selected.size}...` : `Import Selected (${selected.size})`}
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            Clear Selection
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {total > 0 ? `${total.toLocaleString()} leads` : 'No matching leads'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-center text-stone-500 py-8">
              No leads match your filters. Try broadening your search.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700 text-left text-xs text-stone-400">
                    <th className="pb-2 pr-2">
                      <input
                        type="checkbox"
                        checked={selected.size === leads.length && leads.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-stone-600"
                      />
                    </th>
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2 pr-3">Location</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Score</th>
                    <th className="pb-2 pr-3">Relevance</th>
                    <th className="pb-2 pr-3">Rating</th>
                    <th className="pb-2 pr-3">Contact</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const isImported = importedIds.has(lead.id)
                    return (
                      <tr key={lead.id} className="border-b border-stone-800 hover:bg-stone-900/50">
                        <td className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={selected.has(lead.id)}
                            onChange={() => toggleSelect(lead.id)}
                            disabled={isImported}
                            className="rounded border-stone-600"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-stone-200">{lead.name}</span>
                            {lead.source_url && (
                              <a
                                href={lead.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-stone-500 hover:text-stone-300"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {lead.owner_name && (
                            <p className="text-xs text-stone-500">{lead.owner_name}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-stone-400">
                          {[lead.city, lead.state].filter(Boolean).join(', ') || '-'}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="text-xs text-stone-400">
                            {lead.business_type?.replace(/_/g, ' ') ?? '-'}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`text-xs font-medium ${
                              lead.lead_score >= 70
                                ? 'text-green-400'
                                : lead.lead_score >= 40
                                  ? 'text-amber-400'
                                  : 'text-stone-400'
                            }`}
                          >
                            {lead.lead_score}
                          </span>
                        </td>
                        <td className="py-2 pr-3">{relevanceBadge(lead.chef_relevance)}</td>
                        <td className="py-2 pr-3 text-stone-400">
                          {lead.rating != null ? (
                            <span>
                              {Number(lead.rating).toFixed(1)}
                              {lead.review_count ? (
                                <span className="text-xs text-stone-500">
                                  {' '}
                                  ({lead.review_count})
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-col gap-0.5 text-xs">
                            {lead.phone && <span className="text-stone-400">{lead.phone}</span>}
                            {lead.email && (
                              <a
                                href={`mailto:${lead.email}`}
                                className="text-brand-400 hover:underline"
                              >
                                {lead.email}
                              </a>
                            )}
                            {!lead.phone && !lead.email && (
                              <span className="text-stone-600">No contact</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2">
                          {isImported ? (
                            <Badge variant="default">Imported</Badge>
                          ) : (
                            <Button size="sm" onClick={() => handleImport(lead)} disabled={pending}>
                              Import
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-800">
              <p className="text-xs text-stone-500">
                Page {filters.page ?? 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!filters.page || filters.page <= 1 || pending}
                  onClick={() => fetchLeads({ ...filters, page: (filters.page ?? 1) - 1 })}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(filters.page ?? 1) >= totalPages || pending}
                  onClick={() => fetchLeads({ ...filters, page: (filters.page ?? 1) + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
