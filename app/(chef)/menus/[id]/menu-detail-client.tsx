'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils/currency'
import { updateMenu, deleteMenu, duplicateMenu, transitionMenu } from '@/lib/menus/actions'
import {
  searchRecipes,
  linkRecipeToComponent,
  unlinkRecipeFromComponent,
} from '@/lib/recipes/actions'
import { format } from 'date-fns'
import Link from 'next/link'
import { PrepTimelineView } from '@/components/menus/prep-timeline-view'
import { MenuGeneratorUI } from '@/components/menus/menuGeneratorUI'

type RecipeInfo = {
  id: string
  name: string
  category: string
}

type Component = {
  id: string
  name: string
  description: string | null
  category: string | null
  sort_order: number
  recipe_id?: string | null
  [key: string]: unknown
}

type Dish = {
  id: string
  course_name: string
  description: string | null
  course_number: number
  sort_order: number
  dietary_tags: string[]
  allergen_flags: string[]
  components: Component[]
  [key: string]: unknown
}

type Menu = {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'shared' | 'locked' | 'archived'
  service_style: string | null
  cuisine_type: string | null
  target_guest_count: number | null
  notes: string | null
  is_template: boolean
  created_at: string
  dishes: Dish[]
  [key: string]: unknown
}

type Event = {
  id: string
  occasion: string | null
  event_date: string
  status: string
  quoted_price_cents: number | null
  clients?: { full_name?: string } | null
} | null

type MenuCostSummary = {
  menu_id: string
  total_component_count: number | null
  total_recipe_cost_cents: number | null
  cost_per_guest_cents: number | null
  food_cost_percentage: number | null
  has_all_recipe_costs: boolean | null
}

type Props = {
  menu: Menu
  event: Event
  recipeMap?: Record<string, RecipeInfo>
  costSummary?: MenuCostSummary | null
}

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'info' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  shared: { label: 'Shared', variant: 'info' },
  locked: { label: 'Locked', variant: 'warning' },
  archived: { label: 'Archived', variant: 'default' },
}

export function MenuDetailClient({ menu: initialMenu, event, recipeMap = {}, costSummary }: Props) {
  const router = useRouter()
  const [menu] = useState(initialMenu)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Recipe link modal state
  const [linkingComponentId, setLinkingComponentId] = useState<string | null>(null)
  const [recipeSearch, setRecipeSearch] = useState('')
  const [recipeResults, setRecipeResults] = useState<
    { id: string; name: string; category: string }[]
  >([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Edit form state
  const [name, setName] = useState(menu.name)
  const [description, setDescription] = useState(menu.description || '')

  const handleEdit = () => {
    setIsEditing(true)
    setName(menu.name)
    setDescription(menu.description || '')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError('')
  }

  const handleSave = async () => {
    setError('')
    setLoading(true)

    try {
      if (!name.trim()) {
        throw new Error('Menu name is required')
      }

      await updateMenu(menu.id, {
        name,
        description: description || undefined,
      })

      router.refresh()
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update menu')
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicate = async () => {
    setLoading(true)
    try {
      const result = await duplicateMenu(menu.id)
      router.push(`/menus/${result.menu.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate menu')
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this menu? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await deleteMenu(menu.id)
      router.push('/menus')
    } catch (err: any) {
      setError(err.message || 'Failed to delete menu')
      setLoading(false)
    }
  }

  const handleArchiveToggle = async () => {
    setLoading(true)
    setError('')
    try {
      const nextStatus = menu.status === 'archived' ? 'draft' : 'archived'
      await transitionMenu(menu.id, nextStatus, 'Updated from back-of-house menu screen')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update menu status')
      setLoading(false)
    }
  }

  const handlePrintBackOfHouse = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const rows: string[][] = [
      [
        'Menu Name',
        'Course #',
        'Course Name',
        'Component',
        'Category',
        'Recipe Name',
        'Dietary Tags',
        'Allergens',
        'Prep Day Offset',
        'Prep Time',
      ],
    ]

    for (const dish of menu.dishes) {
      if (dish.components.length === 0) {
        rows.push([
          menu.name,
          String(dish.course_number),
          dish.course_name,
          '',
          '',
          '',
          (dish.dietary_tags || []).join('|'),
          (dish.allergen_flags || []).join('|'),
          '',
          '',
        ])
        continue
      }

      for (const component of dish.components) {
        const linkedRecipe = component.recipe_id ? recipeMap[component.recipe_id] : null
        rows.push([
          menu.name,
          String(dish.course_number),
          dish.course_name,
          component.name,
          String(component.category || ''),
          linkedRecipe?.name || '',
          (dish.dietary_tags || []).join('|'),
          (dish.allergen_flags || []).join('|'),
          String((component as any).prep_day_offset ?? ''),
          String((component as any).prep_time_of_day ?? ''),
        ])
      }
    }

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${menu.name.replaceAll(/\s+/g, '-').toLowerCase()}-back-of-house.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleExportExcel = () => {
    // Use CSV content for Excel compatibility without introducing a new dependency.
    handleExportCSV()
  }

  const handleRecipeSearch = async (query: string) => {
    setRecipeSearch(query)
    if (query.length < 2) {
      setRecipeResults([])
      return
    }
    setSearchLoading(true)
    try {
      const results = await searchRecipes(query)
      setRecipeResults(results)
    } catch {
      setRecipeResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleLinkRecipe = async (recipeId: string, componentId: string) => {
    setLoading(true)
    try {
      await linkRecipeToComponent(recipeId, componentId)
      setLinkingComponentId(null)
      setRecipeSearch('')
      setRecipeResults([])
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to link recipe')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkRecipe = async (componentId: string) => {
    setLoading(true)
    try {
      await unlinkRecipeFromComponent(componentId)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to unlink recipe')
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = STATUS_BADGE[menu.status] || STATUS_BADGE.draft

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">{menu.name}</h1>
          <p className="mt-1 text-stone-400">Back-of-house operational view</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            {menu.is_template && <Badge variant="info">Template</Badge>}
            {menu.cuisine_type && <Badge variant="default">{menu.cuisine_type}</Badge>}
            {menu.target_guest_count && (
              <Badge variant="default">{menu.target_guest_count} guests</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {menu.status === 'locked' && (
            <MenuGeneratorUI
              menuId={menu.id}
              menuStatus={menu.status}
              defaultHostName={event?.clients?.full_name ?? null}
            />
          )}
          <Button variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
          {event && (
            <Button
              variant="secondary"
              onClick={() =>
                window.open(`/api/documents/${event.id}?type=foh`, '_blank', 'noopener,noreferrer')
              }
            >
              View FOH PDF
            </Button>
          )}
          <Button variant="secondary" onClick={handlePrintBackOfHouse}>
            Print BOH
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={handleExportExcel}>
            Export Excel
          </Button>
          <Button variant="primary" onClick={() => router.push(`/menus/${menu.id}/editor`)}>
            Open Editor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wider text-stone-500">Courses</p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">{menu.dishes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wider text-stone-500">Components</p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">
              {costSummary?.total_component_count ??
                menu.dishes.reduce((acc, dish) => acc + dish.components.length, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wider text-stone-500">Cost / Guest</p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">
              {costSummary?.cost_per_guest_cents != null
                ? formatCurrency(costSummary.cost_per_guest_cents)
                : 'Pending'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wider text-stone-500">Food Cost %</p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">
              {costSummary?.food_cost_percentage != null
                ? `${costSummary.food_cost_percentage.toFixed(1)}%`
                : 'Pending'}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!isEditing ? (
        <>
          {/* View Mode */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>Menu Information</CardTitle>
                <div className="flex gap-2">
                  {menu.status === 'draft' && (
                    <Button size="sm" variant="secondary" onClick={handleEdit}>
                      Edit Menu
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleDuplicate}
                    disabled={loading}
                  >
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleArchiveToggle}
                    disabled={loading}
                  >
                    {menu.status === 'archived' ? 'Restore' : 'Archive'}
                  </Button>
                  {!event && menu.status === 'draft' && (
                    <Button size="sm" variant="danger" onClick={handleDelete} disabled={loading}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-500">Name</label>
                <p className="text-stone-100 mt-1">{menu.name}</p>
              </div>

              {menu.description && (
                <div>
                  <label className="text-sm font-medium text-stone-500">Description</label>
                  <p className="text-stone-100 mt-1">{menu.description}</p>
                </div>
              )}

              {menu.cuisine_type && (
                <div>
                  <label className="text-sm font-medium text-stone-500">Cuisine Type</label>
                  <p className="text-stone-100 mt-1">{menu.cuisine_type}</p>
                </div>
              )}

              {menu.service_style && (
                <div>
                  <label className="text-sm font-medium text-stone-500">Service Style</label>
                  <p className="text-stone-100 mt-1 capitalize">
                    {menu.service_style.replace('_', ' ')}
                  </p>
                </div>
              )}

              {menu.notes && (
                <div>
                  <label className="text-sm font-medium text-stone-500">Staff Notes</label>
                  <p className="mt-1 whitespace-pre-wrap text-stone-100">{menu.notes}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-stone-500">Status</label>
                <div className="mt-1">
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  {menu.is_template && (
                    <Badge variant="info" className="ml-2">
                      Template
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dishes */}
          <Card>
            <CardHeader>
              <CardTitle>Dishes ({menu.dishes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {menu.dishes.length === 0 ? (
                <p className="text-stone-500 text-center py-4">No dishes added yet.</p>
              ) : (
                <div className="space-y-4">
                  {menu.dishes.map((dish) => (
                    <div key={dish.id} className="border border-stone-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-stone-100">{dish.course_name}</h4>
                      </div>
                      {dish.description && (
                        <p className="text-sm text-stone-400 mt-1">{dish.description}</p>
                      )}
                      {dish.dietary_tags && dish.dietary_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {dish.dietary_tags.map((tag: string) => (
                            <Badge key={tag} variant="info">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-stone-500">
                        Complexity:{' '}
                        <span className="font-medium text-stone-300">
                          {dish.components.length >= 8
                            ? 'High'
                            : dish.components.length >= 4
                              ? 'Medium'
                              : 'Low'}
                        </span>
                      </p>
                      {(dish as any).chef_notes && (
                        <p className="text-sm text-stone-400 mt-1">
                          <span className="font-medium text-stone-300">Staff note:</span>{' '}
                          {(dish as any).chef_notes}
                        </p>
                      )}
                      {(dish as any).beverage_pairing && (
                        <p className="text-sm text-purple-400 mt-2">
                          <span className="font-medium text-purple-300">Pairing:</span>{' '}
                          {(dish as any).beverage_pairing}
                        </p>
                      )}
                      {(dish as any).plating_instructions && (
                        <p className="text-sm text-stone-400 mt-1">
                          <span className="font-medium text-stone-300">Plating:</span>{' '}
                          {(dish as any).plating_instructions}
                        </p>
                      )}
                      {dish.components.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-stone-800">
                          <p className="text-xs font-medium text-stone-500 mb-1">Components:</p>
                          {dish.components.map((comp) => {
                            const linkedRecipe = comp.recipe_id ? recipeMap[comp.recipe_id] : null
                            return (
                              <div key={comp.id} className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-stone-400">
                                    {comp.name}
                                    {comp.category && (
                                      <span className="text-stone-400 ml-1">({comp.category})</span>
                                    )}
                                  </span>
                                  {(comp as any).portion_quantity && (comp as any).portion_unit && (
                                    <span className="text-xs text-stone-500">
                                      {(comp as any).portion_quantity}
                                      {(comp as any).portion_unit}/plate
                                    </span>
                                  )}
                                  {(comp as any).prep_day_offset != null &&
                                    (comp as any).prep_day_offset !== 0 && (
                                      <span className="text-xs text-amber-500">
                                        D
                                        {(comp as any).prep_day_offset < 0
                                          ? (comp as any).prep_day_offset
                                          : `+${(comp as any).prep_day_offset}`}
                                      </span>
                                    )}
                                  {linkedRecipe ? (
                                    <Link
                                      href={`/recipes/${linkedRecipe.id}`}
                                      className="text-xs text-emerald-600 hover:underline"
                                    >
                                      Recipe
                                    </Link>
                                  ) : (
                                    <span className="text-xs text-stone-400">No recipe</span>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  {linkedRecipe ? (
                                    <button
                                      type="button"
                                      onClick={() => handleUnlinkRecipe(comp.id)}
                                      className="text-xs text-stone-400 hover:text-red-500"
                                      disabled={loading}
                                    >
                                      Unlink
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLinkingComponentId(
                                            linkingComponentId === comp.id ? null : comp.id
                                          )
                                          setRecipeSearch('')
                                          setRecipeResults([])
                                        }}
                                        className="text-xs text-brand-600 hover:underline"
                                      >
                                        Link Recipe
                                      </button>
                                      <Link
                                        href={`/recipes/new?component=${comp.id}&componentName=${encodeURIComponent(comp.name)}&componentCategory=${encodeURIComponent(comp.category || 'other')}`}
                                        className="text-xs text-brand-600 hover:underline ml-1"
                                      >
                                        Create
                                      </Link>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}

                          {/* Recipe search modal (inline) */}
                          {linkingComponentId &&
                            dish.components.some((c) => c.id === linkingComponentId) && (
                              <div className="mt-2 p-3 bg-stone-800 rounded-md border border-stone-700">
                                <Input
                                  type="text"
                                  placeholder="Search recipes by name..."
                                  value={recipeSearch}
                                  onChange={(e) => handleRecipeSearch(e.target.value)}
                                  autoFocus
                                />
                                {searchLoading && (
                                  <p className="text-xs text-stone-400 mt-1">Searching...</p>
                                )}
                                {recipeResults.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {recipeResults.map((recipe) => (
                                      <button
                                        type="button"
                                        key={recipe.id}
                                        onClick={() =>
                                          handleLinkRecipe(recipe.id, linkingComponentId)
                                        }
                                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-brand-950 rounded flex justify-between items-center"
                                        disabled={loading}
                                      >
                                        <span>{recipe.name}</span>
                                        <Badge variant="default">{recipe.category}</Badge>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {recipeSearch.length >= 2 &&
                                  recipeResults.length === 0 &&
                                  !searchLoading && (
                                    <p className="text-xs text-stone-400 mt-1">No recipes found</p>
                                  )}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Event */}
          {event && (
            <Card>
              <CardHeader>
                <CardTitle>Linked Event</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/events/${event.id}`}
                  className="block border border-stone-700 rounded-lg p-3 hover:border-brand-600 hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-stone-100">
                        {event.occasion || 'Untitled Event'}
                      </h4>
                      <p className="text-sm text-stone-500">
                        {format(new Date(event.event_date), 'PPP')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge>{event.status}</Badge>
                      {event.quoted_price_cents != null && (
                        <p className="text-sm font-medium text-stone-100 mt-1">
                          {formatCurrency(event.quoted_price_cents)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Prep Timeline */}
          {menu.id && <PrepTimelineView menuId={menu.id} />}
        </>
      ) : (
        <>
          {/* Edit Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Menu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Menu Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
