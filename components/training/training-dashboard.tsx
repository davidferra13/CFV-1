'use client'

import { useState } from 'react'
import type { SOP, ComplianceRow, SOPCategory } from '@/lib/training/sop-actions'
import { SOP_CATEGORY_LABELS } from '@/lib/training/sop-actions'

type Props = {
  sops: SOP[]
  rows: ComplianceRow[]
  stats: {
    totalSOPs: number
    activeSOPs: number
    completionRate: number
    mostOverdue: string | null
  }
}

export function TrainingDashboard({ sops, rows, stats }: Props) {
  const [filterCategory, setFilterCategory] = useState<SOPCategory | ''>('')

  const filteredSOPs = filterCategory ? sops.filter((s) => s.category === filterCategory) : sops

  const statusIcon = {
    complete: (
      <span className="text-green-400 text-sm" title="Complete">
        OK
      </span>
    ),
    outdated: (
      <span className="text-yellow-400 text-sm" title="Outdated version">
        !!
      </span>
    ),
    pending: (
      <span className="text-red-400 text-sm" title="Not completed">
        --
      </span>
    ),
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="text-2xl font-bold text-white">{stats.activeSOPs}</div>
          <div className="text-xs text-zinc-400">Active SOPs</div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="text-2xl font-bold text-white">{rows.length}</div>
          <div className="text-xs text-zinc-400">Staff Members</div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="text-2xl font-bold text-white">{stats.completionRate}%</div>
          <div className="text-xs text-zinc-400">Completion Rate</div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="text-sm font-medium text-white truncate">
            {stats.mostOverdue || 'None'}
          </div>
          <div className="text-xs text-zinc-400">Most Overdue SOP</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400">Filter:</span>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as SOPCategory | '')}
          className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Categories</option>
          {Object.entries(SOP_CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Compliance Matrix */}
      {rows.length === 0 || filteredSOPs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
          {rows.length === 0
            ? 'No staff members to show. Add staff first.'
            : 'No SOPs match the current filter.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-800/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 sticky left-0 bg-zinc-800/50 z-10">
                  Staff Member
                </th>
                {filteredSOPs.map((sop) => (
                  <th
                    key={sop.id}
                    className="px-2 py-2 text-center text-[10px] font-medium text-zinc-400 max-w-[80px]"
                    title={sop.title}
                  >
                    <div className="truncate">{sop.title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.staff_member_id}
                  className="border-b border-zinc-700/50 hover:bg-zinc-800/30"
                >
                  <td className="px-3 py-2 text-sm text-white sticky left-0 bg-zinc-900 z-10">
                    {row.staff_name}
                  </td>
                  {filteredSOPs.map((sop) => (
                    <td key={sop.id} className="px-2 py-2 text-center">
                      {statusIcon[row.statuses[sop.id] || 'pending']}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-zinc-400">
        <span>
          <span className="text-green-400">OK</span> = Current version completed
        </span>
        <span>
          <span className="text-yellow-400">!!</span> = Completed older version
        </span>
        <span>
          <span className="text-red-400">--</span> = Not completed
        </span>
      </div>
    </div>
  )
}
