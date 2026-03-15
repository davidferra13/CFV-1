'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  updatePackage,
  deletePackage,
  type ExperiencePackageRow,
} from '@/lib/packages/package-actions'
import { formatPriceRange } from '@/lib/packages/pricing-calculator'

type PackageListProps = {
  packages: ExperiencePackageRow[]
}

const TYPE_LABELS: Record<string, string> = {
  dinner_party: 'Dinner Party',
  meal_prep: 'Meal Prep',
  cooking_class: 'Cooking Class',
  tasting_menu: 'Tasting Menu',
  custom: 'Custom',
}

const TYPE_BADGE_MAP: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  dinner_party: 'default',
  meal_prep: 'info',
  cooking_class: 'success',
  tasting_menu: 'warning',
  custom: 'default',
}

export function PackageList({ packages }: PackageListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  function handleToggleActive(pkg: ExperiencePackageRow) {
    setActionError(null)
    startTransition(async () => {
      try {
        await updatePackage(pkg.id, { is_active: !pkg.is_active })
        router.refresh()
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Failed to update package')
      }
    })
  }

  function handleDelete(id: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await deletePackage(id)
        router.refresh()
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Failed to delete package')
      }
    })
  }

  function handleMoveUp(pkg: ExperiencePackageRow, idx: number) {
    if (idx === 0) return
    setActionError(null)
    const prev = packages[idx - 1]
    startTransition(async () => {
      try {
        await updatePackage(pkg.id, { sort_order: prev.sort_order })
        await updatePackage(prev.id, { sort_order: pkg.sort_order })
        router.refresh()
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Failed to reorder')
      }
    })
  }

  function handleMoveDown(pkg: ExperiencePackageRow, idx: number) {
    if (idx === packages.length - 1) return
    setActionError(null)
    const next = packages[idx + 1]
    startTransition(async () => {
      try {
        await updatePackage(pkg.id, { sort_order: next.sort_order })
        await updatePackage(next.id, { sort_order: pkg.sort_order })
        router.refresh()
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Failed to reorder')
      }
    })
  }

  if (packages.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500 mb-4">No packages yet. Create your first experience package.</p>
        <Button variant="primary" onClick={() => router.push('/packages/new')}>
          Create Package
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg, idx) => (
          <Card key={pkg.id} className={`p-5 ${!pkg.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-base">{pkg.name}</h3>
                <Badge variant={TYPE_BADGE_MAP[pkg.package_type] ?? 'default'}>
                  {TYPE_LABELS[pkg.package_type] ?? pkg.package_type}
                </Badge>
              </div>
              {!pkg.is_active && <Badge variant="error">Inactive</Badge>}
            </div>

            {pkg.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>
            )}

            <div className="space-y-1 text-sm text-gray-700 mb-4">
              <p className="font-medium">
                {formatPriceRange(pkg.base_price_cents, pkg.min_guests, pkg.max_guests)}
              </p>
              {pkg.duration_hours && <p>{pkg.duration_hours}h duration</p>}
              <p>
                {pkg.min_guests}
                {pkg.max_guests ? ` - ${pkg.max_guests}` : '+'} guests
              </p>
              {pkg.includes.length > 0 && (
                <p className="text-xs text-gray-500">
                  Includes: {pkg.includes.slice(0, 3).join(', ')}
                  {pkg.includes.length > 3 ? ` +${pkg.includes.length - 3} more` : ''}
                </p>
              )}
              {pkg.add_ons.length > 0 && (
                <p className="text-xs text-gray-500">
                  {pkg.add_ons.length} add-on{pkg.add_ons.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                onClick={() => router.push(`/packages/${pkg.id}`)}
                disabled={isPending}
              >
                Edit
              </Button>
              <Button variant="ghost" onClick={() => handleToggleActive(pkg)} disabled={isPending}>
                {pkg.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <div className="flex gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => handleMoveUp(pkg, idx)}
                  disabled={isPending || idx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm px-1"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(pkg, idx)}
                  disabled={isPending || idx === packages.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm px-1"
                  title="Move down"
                >
                  ▼
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
