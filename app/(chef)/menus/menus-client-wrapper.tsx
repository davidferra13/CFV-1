'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import Link from 'next/link'

type Menu = {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'shared' | 'locked' | 'archived'
  created_at: string
  cuisine_type: string | null
  target_guest_count: number | null
  is_template: boolean
}

type Props = {
  menus: Menu[]
}

export function MenusClientWrapper({ menus }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('created_at')

  // Filter and sort menus
  const filteredMenus = useMemo(() => {
    let filtered = menus.filter((menu) =>
      menu.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return filtered
  }, [menus, searchTerm, sortBy])

  const truncate = (text: string | null, length: number) => {
    if (!text) return ''
    return text.length > length ? text.substring(0, length) + '...' : text
  }

  return (
    <>
      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search menus by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            className="w-full px-3 py-2 border border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at')}
          >
            <option value="created_at">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Menus Grid */}
      {filteredMenus.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500">
              {searchTerm
                ? 'No menus match your search.'
                : 'No menus yet. Create your first menu template!'}
            </p>
            {!searchTerm && (
              <Link
                href="/menus/new"
                className="text-brand-600 hover:text-brand-400 mt-2 inline-block"
              >
                Create Menu
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenus.map((menu) => (
            <Link key={menu.id} href={`/menus/${menu.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-stone-100 mb-2">{menu.name}</h3>
                  <p className="text-sm text-stone-400 mb-4 min-h-[40px]">
                    {truncate(menu.description, 100)}
                  </p>
                  <div className="space-y-2 text-sm">
                    {menu.cuisine_type && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Cuisine:</span>
                        <span className="font-medium text-stone-100">{menu.cuisine_type}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-stone-500">Status:</span>
                      <span className="font-medium text-stone-100 capitalize">{menu.status}</span>
                    </div>
                    {menu.is_template && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-brand-900 text-brand-400 rounded">
                          Template
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
