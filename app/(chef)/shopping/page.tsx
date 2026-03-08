// Shopping Lists Overview
// Shows active and completed shopping lists with progress indicators

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getActiveShoppingLists } from '@/lib/shopping/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { ShoppingCart, Plus, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { CreateFromEventButton } from './shopping-list-client'

export const metadata: Metadata = { title: 'Shopping Lists - ChefFlow' }

export default async function ShoppingListsPage() {
  await requireChef()

  let lists: Awaited<ReturnType<typeof getActiveShoppingLists>> = []
  let fetchError = false

  try {
    lists = await getActiveShoppingLists()
  } catch {
    fetchError = true
  }

  if (fetchError) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Shopping Lists</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Could not load shopping lists. Please try again.
        </div>
      </div>
    )
  }

  const activeLists = lists.filter((l) => l.status === 'active')
  const completedLists = lists.filter((l) => l.status === 'completed')

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold">Shopping Lists</h1>
        </div>
        <div className="flex gap-2">
          <CreateFromEventButton />
          <Link href="/shopping/new">
            <Button variant="primary" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              New List
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Lists */}
      {activeLists.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Active
          </h2>
          <div className="space-y-3">
            {activeLists.map((list) => {
              const checkedCount = list.items.filter((i) => i.checked).length
              const totalCount = list.items.length
              const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

              return (
                <Link key={list.id} href={`/shopping/${list.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg truncate pr-2">{list.name}</h3>
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {checkedCount}/{totalCount} items
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(list.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {list.total_estimated_cents ? (
                        <span>Est. {formatCurrency(list.total_estimated_cents)}</span>
                      ) : null}
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed Lists */}
      {completedLists.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Completed
          </h2>
          <div className="space-y-3">
            {completedLists.map((list) => (
              <Link key={list.id} href={`/shopping/${list.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer opacity-75">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <h3 className="font-medium truncate pr-2">{list.name}</h3>
                    </div>
                    <span className="text-sm text-gray-500">
                      {list.items.length} items
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {list.completed_at
                        ? new Date(list.completed_at).toLocaleDateString()
                        : ''}
                    </span>
                    <span>
                      {list.total_actual_cents
                        ? `Spent ${formatCurrency(list.total_actual_cents)}`
                        : list.total_estimated_cents
                          ? `Est. ${formatCurrency(list.total_estimated_cents)}`
                          : ''}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {lists.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No shopping lists yet</h3>
          <p className="text-gray-500 mb-6">
            Create a new list or generate one from an event&apos;s menu.
          </p>
          <Link href="/shopping/new">
            <Button variant="primary">Create Your First List</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
