'use client'

// MenuAssemblyBrowser - Phase 2: Tabbed source browser for assembling menus
// from templates, past menus, recipe bible, or quick-add
// Click-to-add with course position selector, deep copy with scale adjustment

import { useEffect, useState, useTransition, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getAssemblySources,
  getDishesFromMenu,
  addDishFromSource,
  addRecipeAsComponent,
  quickAddDish,
  type AssemblySource,
  type AssemblyDish,
} from '@/lib/menus/menu-intelligence-actions'
import { getNextCourseNumber } from '@/lib/menus/course-utils'
import { searchRecipes } from '@/lib/recipes/actions'
import { useRouter } from 'next/navigation'

type TabId = 'templates' | 'past_menus' | 'recipes' | 'quick_add'

interface MenuAssemblyBrowserProps {
  menuId: string
  menuStatus: string
  existingCourses: Array<{ courseNumber: number; courseName: string }>
  className?: string
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'templates', label: 'Templates' },
  { id: 'past_menus', label: 'Past Menus' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'quick_add', label: 'Quick Add' },
]

export function MenuAssemblyBrowser({
  menuId,
  menuStatus,
  existingCourses,
  className = '',
}: MenuAssemblyBrowserProps) {
  const [activeTab, setActiveTab] = useState<TabId>('templates')
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  if (menuStatus === 'locked') return null

  return (
    <div className={`bg-stone-900 border border-stone-700 rounded-lg ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">+</span>
          Add from Sources
        </span>
        <span className="text-stone-500 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-stone-700">
          {/* Tab bar */}
          <div className="flex border-b border-stone-700 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-violet-400 border-b-2 border-violet-500 bg-stone-800/50'
                    : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-3 max-h-[500px] overflow-y-auto">
            {activeTab === 'templates' && (
              <SourceBrowser menuId={menuId} type="template" existingCourses={existingCourses} />
            )}
            {activeTab === 'past_menus' && (
              <SourceBrowser menuId={menuId} type="past_menu" existingCourses={existingCourses} />
            )}
            {activeTab === 'recipes' && <RecipeBrowser menuId={menuId} />}
            {activeTab === 'quick_add' && (
              <QuickAddPanel menuId={menuId} existingCourses={existingCourses} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Source Browser (Templates & Past Menus)
// ============================================

function SourceBrowser({
  menuId,
  type,
  existingCourses,
}: {
  menuId: string
  type: 'template' | 'past_menu'
  existingCourses: Array<{ courseNumber: number; courseName: string }>
}) {
  const [isPending, startTransition] = useTransition()
  const [sources, setSources] = useState<AssemblySource[]>([])
  const [search, setSearch] = useState('')
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSources = useCallback(
    (searchTerm: string) => {
      startTransition(async () => {
        try {
          const data = await getAssemblySources({
            type,
            search: searchTerm || undefined,
          })
          setSources(data)
          setError(null)
        } catch (err) {
          setError('Failed to load sources')
          setSources([])
        }
      })
    },
    [type]
  )

  useEffect(() => {
    loadSources('')
  }, [loadSources])

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value)
      loadSources(value)
    },
    [loadSources]
  )

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder={`Search ${type === 'template' ? 'templates' : 'past menus'}...`}
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {isPending && sources.length === 0 && (
        <p className="text-stone-500 text-sm animate-pulse">Loading...</p>
      )}

      {!isPending && sources.length === 0 && !error && (
        <p className="text-stone-500 text-sm">
          {type === 'template'
            ? 'No templates found. Save a menu as a template to see it here.'
            : 'No past menus found.'}
        </p>
      )}

      {sources.map((source) => (
        <SourceCard
          key={source.id}
          source={source}
          menuId={menuId}
          existingCourses={existingCourses}
          isExpanded={expandedSourceId === source.id}
          onToggle={() => setExpandedSourceId(expandedSourceId === source.id ? null : source.id)}
        />
      ))}
    </div>
  )
}

function SourceCard({
  source,
  menuId,
  existingCourses,
  isExpanded,
  onToggle,
}: {
  source: AssemblySource
  menuId: string
  existingCourses: Array<{ courseNumber: number; courseName: string }>
  isExpanded: boolean
  onToggle: () => void
}) {
  const [dishes, setDishes] = useState<AssemblyDish[]>([])
  const [loadingDishes, startDishTransition] = useTransition()

  useEffect(() => {
    if (isExpanded && dishes.length === 0) {
      startDishTransition(async () => {
        try {
          const data = await getDishesFromMenu(source.id)
          setDishes(data)
        } catch {
          // Non-critical, dishes just won't show
        }
      })
    }
  }, [isExpanded, source.id, dishes.length])

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between px-3 py-2.5 text-left hover:bg-stone-750 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-200 truncate">{source.name}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {source.serviceStyle && (
              <Badge variant="default">{source.serviceStyle.replace('_', ' ')}</Badge>
            )}
            {source.guestCount && <Badge variant="info">{source.guestCount} guests</Badge>}
            {source.clientName && (
              <span className="text-xs text-stone-500">{source.clientName}</span>
            )}
            {source.eventDate && (
              <span className="text-xs text-stone-500">
                {new Date(source.eventDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <span className="text-xs text-stone-500">{source.dishCount} dishes</span>
          <span className="text-stone-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-stone-700 px-3 py-2 space-y-1.5">
          {loadingDishes && dishes.length === 0 && (
            <p className="text-stone-500 text-xs animate-pulse">Loading dishes...</p>
          )}
          {dishes.length === 0 && !loadingDishes && (
            <p className="text-stone-500 text-xs">No dishes in this menu</p>
          )}
          {dishes.map((dish) => (
            <DishRow key={dish.id} dish={dish} menuId={menuId} existingCourses={existingCourses} />
          ))}
        </div>
      )}
    </div>
  )
}

function DishRow({
  dish,
  menuId,
  existingCourses,
}: {
  dish: AssemblyDish
  menuId: string
  existingCourses: Array<{ courseNumber: number; courseName: string }>
}) {
  const [isAdding, startAddTransition] = useTransition()
  const [added, setAdded] = useState(false)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const targetCourseNumber = getNextCourseNumber(
    existingCourses.map((course) => course.courseNumber)
  )

  const handleAdd = (courseNumber: number, courseName: string) => {
    startAddTransition(async () => {
      try {
        await addDishFromSource(menuId, dish.id, courseNumber, courseName)
        setAdded(true)
        setError(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add course from source')
      }
    })
  }

  if (added) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 bg-green-900/20 rounded text-xs text-green-400">
        ✓ Added "{dish.name || dish.courseName}"
      </div>
    )
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-700/50 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-300 truncate">
            {dish.name || `${dish.courseName} (unnamed)`}
          </p>
          <div className="flex gap-1.5 mt-0.5">
            <span className="text-xs text-stone-500">{dish.courseName}</span>
            <span className="text-xs text-stone-500">Copies as Course {targetCourseNumber}</span>
            {dish.componentCount > 0 && (
              <span className="text-xs text-stone-500">
                {dish.componentCount} component{dish.componentCount !== 1 ? 's' : ''}
              </span>
            )}
            {dish.hasRecipe && <Badge variant="info">recipe</Badge>}
            {dish.dietaryTags.map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAdd(targetCourseNumber, dish.courseName)}
          disabled={isAdding}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
        >
          {isAdding ? '...' : '+ Add'}
        </Button>
      </div>

      {error && <p className="px-2 pb-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ============================================
// Recipe Browser
// ============================================

function RecipeBrowser({ menuId }: { menuId: string }) {
  const [search, setSearch] = useState('')
  const [recipes, setRecipes] = useState<Array<{ id: string; name: string; category: string }>>([])
  const [isPending, startTransition] = useTransition()
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null)

  // We need existing dishes for the "add to dish" selector
  const [existingDishes, setExistingDishes] = useState<
    Array<{ id: string; name: string | null; courseName: string }>
  >([])

  useEffect(() => {
    // Load existing dishes for this menu
    startTransition(async () => {
      try {
        const dishes = await getDishesFromMenu(menuId)
        setExistingDishes(dishes.map((d) => ({ id: d.id, name: d.name, courseName: d.courseName })))
      } catch {
        // Non-critical
      }
    })
  }, [menuId])

  const handleSearch = (value: string) => {
    setSearch(value)
    if (value.length >= 2) {
      startTransition(async () => {
        try {
          const data = await searchRecipes(value)
          setRecipes(data)
        } catch {
          setRecipes([])
        }
      })
    } else {
      setRecipes([])
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search your recipes (min 2 characters)..."
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />

      {isPending && recipes.length === 0 && search.length >= 2 && (
        <p className="text-stone-500 text-sm animate-pulse">Searching...</p>
      )}

      {search.length >= 2 && recipes.length === 0 && !isPending && (
        <p className="text-stone-500 text-sm">No recipes found for "{search}"</p>
      )}

      {search.length < 2 && (
        <p className="text-stone-500 text-xs">
          Type at least 2 characters to search your recipe bible.
        </p>
      )}

      {recipes.map((recipe) => (
        <RecipeRow
          key={recipe.id}
          recipe={recipe}
          menuId={menuId}
          existingDishes={existingDishes}
        />
      ))}
    </div>
  )
}

function RecipeRow({
  recipe,
  menuId,
  existingDishes,
}: {
  recipe: { id: string; name: string; category: string }
  menuId: string
  existingDishes: Array<{ id: string; name: string | null; courseName: string }>
}) {
  const [isAdding, startAddTransition] = useTransition()
  const [added, setAdded] = useState(false)
  const [showDishSelect, setShowDishSelect] = useState(false)
  const router = useRouter()

  const handleAdd = (dishId: string) => {
    startAddTransition(async () => {
      try {
        await addRecipeAsComponent(menuId, dishId, recipe.id)
        setAdded(true)
        setShowDishSelect(false)
        router.refresh()
      } catch {
        // Error handled by server action
      }
    })
  }

  if (added) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 bg-green-900/20 rounded text-xs text-green-400">
        ✓ Added "{recipe.name}" as component
      </div>
    )
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-700/50 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-300 truncate">{recipe.name}</p>
          <Badge variant="default">{recipe.category}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDishSelect(!showDishSelect)}
          disabled={isAdding || existingDishes.length === 0}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
        >
          {isAdding ? '...' : '+ Add'}
        </Button>
      </div>

      {showDishSelect && (
        <div className="ml-4 mt-1 mb-2 space-y-1">
          <p className="text-xs text-stone-500 mb-1">Add to which dish?</p>
          {existingDishes.length === 0 && (
            <p className="text-xs text-amber-400">
              Add a dish to the menu first, then add recipes as components.
            </p>
          )}
          {existingDishes.map((d) => (
            <button
              key={d.id}
              onClick={() => handleAdd(d.id)}
              disabled={isAdding}
              className="block w-full text-left px-2 py-1 text-xs text-stone-300 hover:bg-stone-700 rounded transition-colors"
            >
              {d.name || `${d.courseName} (unnamed)`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Quick Add Panel
// ============================================

function QuickAddPanel({
  menuId,
  existingCourses,
}: {
  menuId: string
  existingCourses: Array<{ courseNumber: number; courseName: string }>
}) {
  const [dishName, setDishName] = useState('')
  const [courseName, setCourseName] = useState(existingCourses.length === 0 ? 'Main Course' : '')
  const [isAdding, startTransition] = useTransition()
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const nextCourseNumber = getNextCourseNumber(existingCourses.map((course) => course.courseNumber))

  const handleAdd = () => {
    if (!dishName.trim()) return

    startTransition(async () => {
      try {
        await quickAddDish(menuId, dishName.trim(), nextCourseNumber, courseName.trim())
        setLastAdded(dishName.trim())
        setDishName('')
        setError(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add course')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-stone-400 block mb-1">Dish Name</label>
        <input
          type="text"
          placeholder="e.g. Seared Scallops"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="text-xs text-stone-400 block mb-1">New Course</label>
        <div className="mb-2 rounded border border-stone-700 bg-stone-800/60 px-3 py-2 text-xs text-stone-400">
          This creates Course {nextCourseNumber}. Use the Recipes tab to add components to an
          existing course.
        </div>
        <input
          type="text"
          placeholder="e.g. Appetizer, Main Course, Dessert"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={handleAdd}
        disabled={isAdding || !dishName.trim() || !courseName.trim()}
        className="w-full"
      >
        {isAdding ? 'Adding...' : `Add Course ${nextCourseNumber}`}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {lastAdded && <p className="text-xs text-green-400">✓ Added "{lastAdded}"</p>}
    </div>
  )
}
