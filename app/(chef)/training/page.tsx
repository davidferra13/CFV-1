'use client'

import { useState, useEffect } from 'react'
import { SOPLibrary } from '@/components/training/sop-library'
import { TrainingDashboard } from '@/components/training/training-dashboard'
import { SOPViewer } from '@/components/training/sop-viewer'
import {
  getSOPs,
  getSOPComplianceMatrix,
  getSOPStats,
  type SOP,
  type ComplianceRow,
} from '@/lib/training/sop-actions'

type Tab = 'library' | 'dashboard'

export default function TrainingPage() {
  const [tab, setTab] = useState<Tab>('library')
  const [sops, setSOPs] = useState<SOP[]>([])
  const [matrixSOPs, setMatrixSOPs] = useState<SOP[]>([])
  const [rows, setRows] = useState<ComplianceRow[]>([])
  const [stats, setStats] = useState({
    totalSOPs: 0,
    activeSOPs: 0,
    completionRate: 0,
    mostOverdue: null as string | null,
  })
  const [viewingSOP, setViewingSOP] = useState<SOP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [sopsResult, matrixResult, statsResult] = await Promise.all([
          getSOPs(),
          getSOPComplianceMatrix(),
          getSOPStats(),
        ])

        if (sopsResult.error) {
          setError(sopsResult.error)
          return
        }

        setSOPs(sopsResult.sops)
        setMatrixSOPs(matrixResult.sops)
        setRows(matrixResult.rows)
        setStats({
          totalSOPs: statsResult.totalSOPs,
          activeSOPs: statsResult.activeSOPs,
          completionRate: statsResult.completionRate,
          mostOverdue: statsResult.mostOverdue,
        })
      } catch {
        setError('Failed to load training data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (viewingSOP) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <SOPViewer sop={viewingSOP} onBack={() => setViewingSOP(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Staff Training &amp; SOPs</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Create standard operating procedures, assign to staff, and track completion.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-zinc-800/50 p-1 w-fit">
        <button
          onClick={() => setTab('library')}
          className={`rounded-md px-4 py-2 text-sm transition-colors ${
            tab === 'library' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          SOP Library
        </button>
        <button
          onClick={() => setTab('dashboard')}
          className={`rounded-md px-4 py-2 text-sm transition-colors ${
            tab === 'dashboard' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Training Dashboard
        </button>
      </div>

      {error ? (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          Could not load training data: {error}
        </div>
      ) : loading ? (
        <div className="text-sm text-zinc-400">Loading...</div>
      ) : tab === 'library' ? (
        <SOPLibrary initialSOPs={sops} onViewSOP={setViewingSOP} />
      ) : (
        <TrainingDashboard sops={matrixSOPs} rows={rows} stats={stats} />
      )}
    </div>
  )
}
