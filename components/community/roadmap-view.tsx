'use client'

import { useState, useTransition } from 'react'
import { getRoadmap, type FeatureRequest } from '@/lib/community/feature-voting-actions'

const CATEGORY_LABELS: Record<string, string> = {
  core_ops: 'Core Operations',
  clients: 'Clients',
  finance: 'Finance',
  scheduling: 'Scheduling',
  marketing: 'Marketing',
  recipes: 'Recipes',
  team: 'Team',
  integrations: 'Integrations',
  other: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  core_ops: 'bg-brand-50 text-brand-700',
  clients: 'bg-pink-50 text-pink-700',
  finance: 'bg-emerald-50 text-emerald-700',
  scheduling: 'bg-orange-50 text-orange-700',
  marketing: 'bg-brand-50 text-brand-700',
  recipes: 'bg-amber-50 text-amber-700',
  team: 'bg-violet-50 text-violet-700',
  integrations: 'bg-teal-50 text-teal-700',
  other: 'bg-gray-50 text-gray-600',
}

function RoadmapCard({ feature }: { feature: FeatureRequest }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
        <span className="ml-2 flex items-center gap-1 text-xs text-gray-500">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          {feature.vote_count}
        </span>
      </div>
      {feature.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-3">{feature.description}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[feature.category] ?? 'bg-gray-50 text-gray-600'}`}
        >
          {CATEGORY_LABELS[feature.category] ?? feature.category}
        </span>
        {feature.shipped_at && (
          <span className="text-xs text-gray-400">
            Shipped {new Date(feature.shipped_at).toLocaleDateString()}
          </span>
        )}
      </div>
      {feature.admin_response && (
        <div className="mt-2 rounded-md bg-brand-50 px-3 py-2 text-xs text-brand-700">
          {feature.admin_response}
        </div>
      )}
    </div>
  )
}

function RoadmapColumn({
  title,
  features,
  accentColor,
  icon,
}: {
  title: string
  features: FeatureRequest[]
  accentColor: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex-1 min-w-[280px]">
      <div className={`mb-4 flex items-center gap-2 border-b-2 ${accentColor} pb-2`}>
        {icon}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {features.length}
        </span>
      </div>
      <div className="space-y-3">
        {features.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">Nothing here yet</p>
        )}
        {features.map((f) => (
          <RoadmapCard key={f.id} feature={f} />
        ))}
      </div>
    </div>
  )
}

export function RoadmapView({
  initialData,
}: {
  initialData: {
    planned: FeatureRequest[]
    in_progress: FeatureRequest[]
    shipped: FeatureRequest[]
  }
}) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    startTransition(async () => {
      try {
        const updated = await getRoadmap()
        setData(updated)
        setError(null)
      } catch {
        setError('Failed to refresh roadmap')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Product Roadmap</h2>
          <p className="mt-1 text-sm text-gray-500">
            See what we are building, what is coming next, and what just shipped.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isPending}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-6 overflow-x-auto pb-4">
        <RoadmapColumn
          title="Planned"
          features={data.planned}
          accentColor="border-brand-500"
          icon={
            <svg
              className="h-5 w-5 text-brand-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />
        <RoadmapColumn
          title="In Progress"
          features={data.in_progress}
          accentColor="border-purple-500"
          icon={
            <svg
              className="h-5 w-5 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <RoadmapColumn
          title="Shipped"
          features={data.shipped}
          accentColor="border-green-500"
          icon={
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      </div>
    </div>
  )
}
