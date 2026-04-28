import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getDependencyCatalog,
  type DependencyImportance,
  type DependencyCatalogItem,
} from '@/lib/dependencies/catalog'

export const metadata: Metadata = { title: 'Dependency Map' }

const importanceStyles: Record<DependencyImportance, string> = {
  critical: 'border-red-500/40 bg-red-950/40 text-red-200',
  high: 'border-amber-500/40 bg-amber-950/40 text-amber-100',
  medium: 'border-sky-500/40 bg-sky-950/40 text-sky-100',
  low: 'border-stone-500/40 bg-stone-900 text-stone-200',
}

function ImportanceBadge({ importance }: { importance: DependencyImportance }) {
  return (
    <span
      className={`inline-flex min-w-20 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${importanceStyles[importance]}`}
    >
      {importance}
    </span>
  )
}
function DetailSection({ dependency }: { dependency: DependencyCatalogItem }) {
  return (
    <section
      id={dependency.id}
      className="scroll-mt-24 rounded-lg border border-stone-800 bg-stone-950/40 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">{dependency.service}</h2>
          <p className="mt-1 text-sm text-stone-400">{dependency.summary}</p>
        </div>
        <ImportanceBadge importance={dependency.importance} />
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Provider</dt>
          <dd className="mt-1 text-stone-200">{dependency.provider}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Category</dt>
          <dd className="mt-1 text-stone-200">{dependency.usageCategory}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Operator note
          </dt>
          <dd className="mt-1 text-stone-200">{dependency.operationalNotes}</dd>
        </div>
      </dl>
    </section>
  )
}

export default async function DependenciesPage() {
  await requireChef()
  const dependencies = getDependencyCatalog()
  const criticalCount = dependencies.filter((dependency) => dependency.importance === 'critical').length
  const highCount = dependencies.filter((dependency) => dependency.importance === 'high').length

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Operations readiness
        </p>
        <h1 className="text-3xl font-bold text-stone-100">Critical Dependency Map</h1>
        <p className="max-w-3xl text-sm text-stone-400">
          Read-only inventory of external systems ChefFlow depends on. This page uses safe service
          names only and does not display environment values, connection strings, or vendor console
          links.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Dependencies</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">{dependencies.length}</p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-300">Critical</p>
          <p className="mt-2 text-2xl font-semibold text-red-100">{criticalCount}</p>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-300">High</p>
          <p className="mt-2 text-2xl font-semibold text-amber-100">{highCount}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-stone-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-800 text-left text-sm">
            <thead className="bg-stone-950">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-stone-300">
                  Service
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-stone-300">
                  Provider
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-stone-300">
                  Usage category
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-stone-300">
                  Importance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 bg-stone-950/30">
              {dependencies.map((dependency) => (
                <tr key={dependency.id}>
                  <td className="px-4 py-3 font-medium">
                    <a
                      href={`#${dependency.id}`}
                      className="text-stone-100 underline decoration-stone-600 underline-offset-4 hover:text-white"
                    >
                      {dependency.service}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-stone-300">{dependency.provider}</td>
                  <td className="px-4 py-3 text-stone-300">{dependency.usageCategory}</td>
                  <td className="px-4 py-3">
                    <ImportanceBadge importance={dependency.importance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-4">
        {dependencies.map((dependency) => (
          <DetailSection key={dependency.id} dependency={dependency} />
        ))}
      </div>
    </main>
  )
}
