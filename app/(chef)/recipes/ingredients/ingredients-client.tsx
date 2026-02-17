'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { updateIngredient } from '@/lib/recipes/actions'

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'protein', label: 'Protein' },
  { value: 'produce', label: 'Produce' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'spice', label: 'Spice' },
  { value: 'oil', label: 'Oil' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'baking', label: 'Baking' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'canned', label: 'Canned' },
  { value: 'fresh_herb', label: 'Fresh Herb' },
  { value: 'dry_herb', label: 'Dry Herb' },
  { value: 'condiment', label: 'Condiment' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'specialty', label: 'Specialty' },
  { value: 'other', label: 'Other' },
]

type Ingredient = {
  id: string
  name: string
  category: string
  default_unit: string
  average_price_cents: number | null
  is_staple: boolean
  usage_count: number
  [key: string]: unknown
}

type Props = {
  ingredients: Ingredient[]
}

export function IngredientsClient({ ingredients }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentCategory = searchParams.get('category') || ''

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/recipes/ingredients?${params.toString()}`)
  }

  const handleSearch = () => {
    updateFilters('search', search)
  }

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id)
    setEditName(ing.name)
    setEditCategory(ing.category)
    setEditUnit(ing.default_unit)
    setEditPrice(ing.average_price_cents ? (ing.average_price_cents / 100).toFixed(2) : '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError('')
  }

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return

    setLoading(true)
    setError('')

    try {
      await updateIngredient(editingId, {
        name: editName.trim(),
        category: editCategory as any,
        default_unit: editUnit,
        average_price_cents: editPrice ? Math.round(parseFloat(editPrice) * 100) : null,
      })
      setEditingId(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update ingredient')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Ingredient Library</h1>
          <p className="text-stone-600 mt-1">
            {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/recipes">
          <Button variant="ghost">Back to Recipes</Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            type="text"
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="secondary" onClick={handleSearch}>Search</Button>
        </div>
        <select
          value={currentCategory}
          onChange={(e) => updateFilters('category', e.target.value)}
          className="border border-stone-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Ingredients Table */}
      <Card>
        <CardContent className="p-0">
          {ingredients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-stone-500">No ingredients found.</p>
              <p className="text-sm text-stone-400 mt-1">Ingredients are created automatically when you add them to recipes.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Default Unit</TableHead>
                  <TableHead>Avg. Price</TableHead>
                  <TableHead>Used In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map((ing) => (
                  <TableRow key={ing.id}>
                    {editingId === ing.id ? (
                      <>
                        <TableCell>
                          <Input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="border border-stone-300 rounded-md px-2 py-1 text-sm bg-white w-full"
                          >
                            {CATEGORY_OPTIONS.filter(o => o.value).map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input type="text" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} step="0.01" placeholder="0.00" />
                        </TableCell>
                        <TableCell>{ing.usage_count} recipe{ing.usage_count !== 1 ? 's' : ''}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={saveEdit} disabled={loading}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={loading}>Cancel</Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{ing.name}</TableCell>
                        <TableCell>
                          <Badge variant="default">{ing.category.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>{ing.default_unit}</TableCell>
                        <TableCell>
                          {ing.average_price_cents != null
                            ? `$${(ing.average_price_cents / 100).toFixed(2)}`
                            : <span className="text-stone-400">--</span>
                          }
                        </TableCell>
                        <TableCell>{ing.usage_count} recipe{ing.usage_count !== 1 ? 's' : ''}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(ing)}>Edit</Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
