'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  Leaf,
  ChefHat,
  Heart,
  Lightbulb,
  Palette,
  LayoutGrid,
  Shuffle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  AlertTriangle,
  Star,
  Sparkles,
  Utensils,
} from 'lucide-react'
import { getMuseData, type MuseData } from '@/lib/games/menu-muse-actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never cooked'
  const d = new Date(dateStr)
  const now = new Date()
  const months = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (months < 1) return 'This month'
  if (months === 1) return '1 month ago'
  if (months < 12) return `${months} months ago`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

const CATEGORY_EMOJI: Record<string, string> = {
  sauce: '\u{1F372}',
  protein: '\u{1F969}',
  starch: '\u{1F35A}',
  vegetable: '\u{1F966}',
  fruit: '\u{1F34E}',
  dessert: '\u{1F370}',
  bread: '\u{1F35E}',
  pasta: '\u{1F35D}',
  soup: '\u{1F35C}',
  salad: '\u{1F957}',
  appetizer: '\u{1F960}',
  condiment: '\u{1F9C2}',
  beverage: '\u{2615}',
  other: '\u{1F37D}\uFE0F',
}

const WORD_CATEGORY_COLORS: Record<string, string> = {
  texture: 'bg-amber-900 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  flavor: 'bg-red-900 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  temperature: 'bg-blue-900 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  mouthfeel: 'bg-purple-900 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  aroma: 'bg-green-900 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  technique: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
  visual: 'bg-pink-900 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  composition: 'bg-indigo-900 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  emotion: 'bg-rose-900 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  sauce: 'bg-orange-900 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  action: 'bg-teal-900 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
}

// ---------------------------------------------------------------------------
// Collapsible Panel
// ---------------------------------------------------------------------------

function Panel({
  title,
  icon: Icon,
  children,
  onShuffle,
  defaultOpen = true,
  empty,
  emptyLink,
  emptyLinkLabel,
  accent = 'brand',
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  onShuffle?: () => void
  defaultOpen?: boolean
  empty?: string
  emptyLink?: string
  emptyLinkLabel?: string
  accent?: 'brand' | 'green' | 'blue' | 'purple' | 'rose' | 'amber' | 'indigo'
}) {
  const [open, setOpen] = useState(defaultOpen)

  const accentClasses: Record<string, string> = {
    brand: 'border-brand-500/30 bg-brand-9500/5',
    green: 'border-green-500/30 bg-green-9500/5',
    blue: 'border-blue-500/30 bg-blue-9500/5',
    purple: 'border-purple-500/30 bg-purple-9500/5',
    rose: 'border-rose-500/30 bg-rose-9500/5',
    amber: 'border-amber-500/30 bg-amber-9500/5',
    indigo: 'border-indigo-500/30 bg-indigo-9500/5',
  }

  const iconAccent: Record<string, string> = {
    brand: 'text-brand-500',
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    indigo: 'text-indigo-600',
  }

  const showEmpty = empty && (!children || (Array.isArray(children) && children.length === 0))

  return (
    <div className={`rounded-xl border ${accentClasses[accent]} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${iconAccent[accent]}`} />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {onShuffle && open && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShuffle()
              }}
              className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-stone-800/10 transition-colors"
              title="Shuffle"
            >
              <Shuffle className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5">
          {showEmpty ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">{empty}</p>
              {emptyLink && emptyLinkLabel && (
                <Link
                  href={emptyLink}
                  className="mt-2 inline-block text-sm font-medium text-brand-500 hover:underline"
                >
                  {emptyLinkLabel} &rarr;
                </Link>
              )}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components for each panel
// ---------------------------------------------------------------------------

function RecipeCard({ recipe }: { recipe: MuseData['recipes']['forgotten'][0] }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-brand-500/50 hover:bg-brand-9500/5"
    >
      <span className="text-2xl">{CATEGORY_EMOJI[recipe.category] || '\u{1F37D}\uFE0F'}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{recipe.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="capitalize">{recipe.category}</span>
          {recipe.times_cooked > 0 && (
            <span className="flex items-center gap-1">
              <Utensils className="h-3 w-3" /> {recipe.times_cooked}x
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {timeAgo(recipe.last_cooked_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}

function SeasonalItem({ item }: { item: { name: string; category: string; note?: string } }) {
  return (
    <div className="group relative rounded-lg border bg-card px-3 py-2 text-sm" title={item.note}>
      <span className="font-medium">{item.name}</span>
      {item.note && <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>}
    </div>
  )
}

function MicroWindowCard({ mw }: { mw: MuseData['seasonal']['active_micro_windows'][0] }) {
  const isUrgent = mw.days_remaining !== undefined && mw.days_remaining <= 7
  return (
    <div
      className={`rounded-lg border p-3 ${
        isUrgent ? 'border-amber-500/50 bg-amber-9500/10' : 'bg-card'
      }`}
    >
      <div className="flex items-center gap-2">
        {isUrgent && <AlertTriangle className="h-4 w-4 text-amber-600" />}
        <span className="font-medium">{mw.ingredient}</span>
        {mw.days_remaining !== undefined && (
          <span className="ml-auto text-xs font-medium text-amber-600">
            {mw.days_remaining} days left
          </span>
        )}
      </div>
      {mw.notes && <p className="mt-1 text-xs text-muted-foreground">{mw.notes}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MenuMusePage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId') ?? undefined

  const [data, setData] = useState<MuseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Shuffle seeds for randomizable panels
  const [forgottenSeed, setForgottenSeed] = useState(0)
  const [produceSeed, setProduceSeed] = useState(0)
  const [wordSeed, setWordSeed] = useState(0)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getMuseData(eventId)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Shuffled views derived from data + seed
  const forgottenRecipes = data ? shuffleArray(data.recipes.forgotten).slice(0, 8) : []
  // eslint-disable-next-line react-hooks/exhaustive-deps
  void forgottenSeed // force re-derive on shuffle

  const shuffledProduce = data ? shuffleArray(data.seasonal.peak_produce).slice(0, 16) : []
  void produceSeed

  const shuffledWords = data ? shuffleArray(data.culinaryWords).slice(0, 30) : []
  void wordSeed

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Link href="/games" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold">Menu Muse</h1>
        </div>
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
          <p className="text-muted-foreground">Gathering your creative resources...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Link href="/games" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold">Menu Muse</h1>
        </div>
        <div className="mt-12 rounded-xl border border-red-500/30 bg-red-9500/5 p-6 text-center">
          <p className="text-red-600">{error || 'Something went wrong'}</p>
          <button
            onClick={loadData}
            className="mt-3 rounded-lg bg-brand-9500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const hasRecipes = data.recipes.forgotten.length > 0 || data.recipes.trusted.length > 0
  const hasSeasonal = data.seasonal.peak_produce.length > 0
  const hasChefs = data.favoriteChefs.length > 0
  const hasIdeas =
    data.ideas.backlog.length > 0 ||
    data.ideas.testing.length > 0 ||
    data.ideas.dishesToExplore.length > 0
  const hasWords = data.culinaryWords.length > 0
  const hasMenus = data.menuPatterns.templates.length > 0 || data.menuPatterns.recent.length > 0

  // Determine active recipe tab
  const [recipeView, setRecipeView] = useState<'forgotten' | 'trusted' | 'category'>('forgotten')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categoryKeys = Object.keys(data.recipes.byCategory).sort()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <Link href="/games" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Menu Muse</h1>
      </div>
      <p className="mb-8 text-muted-foreground">
        Your recipes. Your heroes. Your season. Your spark.
      </p>

      {/* Event context banner */}
      {data.clientContext && (
        <div className="mb-6 rounded-xl border border-brand-500/30 bg-brand-9500/5 p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-brand-600">
              Building for: {data.clientContext.client_name}
            </span>
            {data.clientContext.event_occasion && (
              <span className="rounded-full bg-brand-9500/10 px-3 py-0.5 text-brand-600">
                {data.clientContext.event_occasion}
              </span>
            )}
            {data.clientContext.event_date && (
              <span className="text-muted-foreground">{data.clientContext.event_date}</span>
            )}
            {data.clientContext.guest_count && (
              <span className="text-muted-foreground">{data.clientContext.guest_count} guests</span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel 1: Recipe Bible */}
        <Panel
          title="Your Recipe Bible"
          icon={BookOpen}
          accent="brand"
          onShuffle={recipeView === 'forgotten' ? () => setForgottenSeed((s) => s + 1) : undefined}
          empty={!hasRecipes ? 'No recipes in your bible yet.' : undefined}
          emptyLink="/recipes"
          emptyLinkLabel="Start your recipe collection"
        >
          {hasRecipes && (
            <>
              <div className="mb-3 flex gap-1 rounded-lg bg-muted/50 p-1">
                {(['forgotten', 'trusted', 'category'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setRecipeView(view)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      recipeView === view
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {view === 'forgotten'
                      ? 'Forgotten Gems'
                      : view === 'trusted'
                        ? 'Most Trusted'
                        : 'By Category'}
                  </button>
                ))}
              </div>

              {recipeView === 'category' && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {categoryKeys.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-brand-9500 text-white'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {CATEGORY_EMOJI[cat] || ''} {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-2">
                {recipeView === 'forgotten' &&
                  forgottenRecipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
                {recipeView === 'trusted' &&
                  data.recipes.trusted.map((r) => <RecipeCard key={r.id} recipe={r} />)}
                {recipeView === 'category' &&
                  (selectedCategory ? (
                    (data.recipes.byCategory[selectedCategory] || [])
                      .slice(0, 12)
                      .map((r) => <RecipeCard key={r.id} recipe={r} />)
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Pick a category above
                    </p>
                  ))}
              </div>
            </>
          )}
        </Panel>

        {/* Panel 2: What's In Season */}
        <Panel
          title={`In Season: ${data.seasonal.season_label}`}
          icon={Leaf}
          accent="green"
          onShuffle={() => setProduceSeed((s) => s + 1)}
        >
          {data.seasonal.sensory_anchor && (
            <p className="mb-3 rounded-lg bg-green-9500/10 px-3 py-2 text-sm italic text-green-700 dark:text-green-400">
              &ldquo;{data.seasonal.sensory_anchor}&rdquo;
            </p>
          )}

          {/* Micro-windows (urgent) */}
          {data.seasonal.ending_micro_windows.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Closing Soon
              </h3>
              <div className="grid gap-2">
                {data.seasonal.ending_micro_windows.map((mw, i) => (
                  <MicroWindowCard key={i} mw={mw} />
                ))}
              </div>
            </div>
          )}

          {/* Active micro-windows */}
          {data.seasonal.active_micro_windows.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-green-700 dark:text-green-400">
                Active Windows
              </h3>
              <div className="grid gap-2">
                {data.seasonal.active_micro_windows.map((mw, i) => (
                  <MicroWindowCard key={i} mw={mw} />
                ))}
              </div>
            </div>
          )}

          {/* Proven wins */}
          {data.seasonal.proven_wins.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Star className="h-4 w-4 text-amber-500" /> Proven Wins This Season
              </h3>
              <div className="grid gap-2">
                {data.seasonal.proven_wins.map((pw, i) => (
                  <div key={i} className="rounded-lg border bg-card p-3">
                    <p className="font-medium">{pw.dish_name}</p>
                    {pw.notes && <p className="mt-0.5 text-xs text-muted-foreground">{pw.notes}</p>}
                    {pw.recipe_id && (
                      <Link
                        href={`/recipes/${pw.recipe_id}`}
                        className="mt-1 inline-block text-xs font-medium text-brand-500 hover:underline"
                      >
                        View recipe &rarr;
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peak produce */}
          {hasSeasonal && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Peak Ingredients</h3>
              <div className="flex flex-wrap gap-2">
                {shuffledProduce.map((item, i) => (
                  <SeasonalItem key={i} item={item} />
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Panel 3: Culinary Heroes */}
        <Panel
          title="Your Culinary Heroes"
          icon={Heart}
          accent="rose"
          empty={!hasChefs ? 'No favorite chefs saved yet.' : undefined}
          emptyLink="/settings"
          emptyLinkLabel="Add your culinary heroes"
        >
          {hasChefs && (
            <div className="grid gap-3">
              {data.favoriteChefs.map((chef, i) => (
                <div key={i} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{chef.chef_name}</p>
                      {chef.reason && (
                        <p className="mt-1 text-sm text-muted-foreground">{chef.reason}</p>
                      )}
                    </div>
                    {chef.website_url && (
                      <a
                        href={chef.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-9500/5 transition-colors"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Panel 4: Client Intelligence (event-contextual) */}
        {data.clientContext && (
          <Panel title={`Client: ${data.clientContext.client_name}`} icon={ChefHat} accent="blue">
            <div className="space-y-4">
              {/* Safety: allergies first */}
              {data.clientContext.allergies.length > 0 && (
                <div className="rounded-lg border border-red-500/30 bg-red-9500/5 p-3">
                  <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-red-600">
                    <AlertTriangle className="h-4 w-4" /> Allergies
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.clientContext.allergies.map((a, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-red-9500/10 px-2.5 py-0.5 text-xs font-medium text-red-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary restrictions */}
              {data.clientContext.dietary_restrictions.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">Dietary Restrictions</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.clientContext.dietary_restrictions.map((d, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-amber-9500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Favorites */}
              {data.clientContext.favorite_dishes.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">Favorite Dishes</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.clientContext.favorite_dishes.map((d, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-green-9500/10 px-2.5 py-0.5 text-xs font-medium text-green-700"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.clientContext.favorite_cuisines.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">Favorite Cuisines</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.clientContext.favorite_cuisines.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-blue-9500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dislikes */}
              {data.clientContext.dislikes.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">Dislikes (Avoid)</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.clientContext.dislikes.map((d, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-600 line-through"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Special requests */}
              {data.clientContext.special_requests && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">Special Requests</h3>
                  <p className="text-sm text-muted-foreground">
                    {data.clientContext.special_requests}
                  </p>
                </div>
              )}

              {/* Past menus */}
              {data.clientContext.past_menus.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Past Menus for This Client</h3>
                  <div className="grid gap-2">
                    {data.clientContext.past_menus.map((m) => (
                      <Link
                        key={m.id}
                        href={`/menus/${m.id}/editor`}
                        className="rounded-lg border bg-card p-3 transition-colors hover:border-brand-500/50"
                      >
                        <p className="font-medium">{m.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {m.cuisine_type && <span>{m.cuisine_type}</span>}
                          <span>{m.course_count} courses</span>
                          {m.courses.length > 0 && (
                            <span className="truncate">{m.courses.join(' \u2022 ')}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Panel 5: Idea Pipeline */}
        <Panel
          title="Your Idea Pipeline"
          icon={Lightbulb}
          accent="amber"
          empty={
            !hasIdeas
              ? 'No ideas saved yet. Start a culinary journey to build your pipeline.'
              : undefined
          }
          emptyLink="/journeys"
          emptyLinkLabel="Start a culinary journey"
        >
          {hasIdeas && (
            <div className="space-y-4">
              {data.ideas.testing.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Currently Testing
                  </h3>
                  <div className="grid gap-2">
                    {data.ideas.testing.map((idea) => (
                      <div key={idea.id} className="rounded-lg border bg-card p-3">
                        <p className="font-medium">{idea.title}</p>
                        {idea.concept_notes && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {idea.concept_notes}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{idea.application_area}</span>
                          {idea.journey_title && <span>from {idea.journey_title}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.ideas.backlog.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Backlog</h3>
                  <div className="grid gap-2">
                    {data.ideas.backlog.slice(0, 8).map((idea) => (
                      <div key={idea.id} className="rounded-lg border bg-card p-3">
                        <p className="font-medium">{idea.title}</p>
                        {idea.concept_notes && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {idea.concept_notes}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{idea.application_area}</span>
                          {idea.journey_title && <span>from {idea.journey_title}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.ideas.dishesToExplore.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Dishes to Explore</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.ideas.dishesToExplore.map((dish, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-amber-9500/10 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400"
                      >
                        {dish}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Panel 6: Flavor Language */}
        <Panel
          title="Your Flavor Language"
          icon={Palette}
          accent="purple"
          onShuffle={() => setWordSeed((s) => s + 1)}
          empty={!hasWords ? 'No culinary words saved yet.' : undefined}
          emptyLink="/culinary-words"
          emptyLinkLabel="Build your vocabulary"
        >
          {hasWords && (
            <div>
              <p className="mb-3 text-xs text-muted-foreground">
                What should this dish feel like? Let your own words guide you.
              </p>
              <div className="flex flex-wrap gap-2">
                {shuffledWords.map((w, i) => (
                  <span
                    key={i}
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      WORD_CATEGORY_COLORS[w.category] || 'bg-muted text-foreground'
                    }`}
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Panel 7: Menu Patterns */}
        <Panel
          title="Menu Patterns & Templates"
          icon={LayoutGrid}
          accent="indigo"
          empty={!hasMenus ? 'No menus created yet.' : undefined}
          emptyLink="/menus/new"
          emptyLinkLabel="Create your first menu"
        >
          {hasMenus && (
            <div className="space-y-4">
              {data.menuPatterns.templates.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Saved Templates</h3>
                  <div className="grid gap-2">
                    {data.menuPatterns.templates.map((m) => (
                      <Link
                        key={m.id}
                        href={`/menus/${m.id}/editor`}
                        className="rounded-lg border bg-card p-3 transition-colors hover:border-brand-500/50"
                      >
                        <p className="font-medium">{m.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {m.cuisine_type && <span>{m.cuisine_type}</span>}
                          {m.service_style && (
                            <span className="capitalize">{m.service_style.replace('_', ' ')}</span>
                          )}
                          <span>{m.course_count} courses</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {data.menuPatterns.sameSeasonLastYear.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Same Season Last Year</h3>
                  <div className="grid gap-2">
                    {data.menuPatterns.sameSeasonLastYear.map((m) => (
                      <Link
                        key={m.id}
                        href={`/menus/${m.id}/editor`}
                        className="rounded-lg border bg-card p-3 transition-colors hover:border-brand-500/50"
                      >
                        <p className="font-medium">{m.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {m.cuisine_type && <span>{m.cuisine_type}</span>}
                          <span>{m.course_count} courses</span>
                          {m.courses.length > 0 && (
                            <span className="truncate">{m.courses.join(' \u2022 ')}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {data.menuPatterns.recent.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Recent Menus</h3>
                  <div className="grid gap-2">
                    {data.menuPatterns.recent.slice(0, 6).map((m) => (
                      <Link
                        key={m.id}
                        href={`/menus/${m.id}/editor`}
                        className="rounded-lg border bg-card p-3 transition-colors hover:border-brand-500/50"
                      >
                        <p className="font-medium">{m.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {m.cuisine_type && <span>{m.cuisine_type}</span>}
                          <span>{m.course_count} courses</span>
                          {m.courses.length > 0 && (
                            <span className="truncate">{m.courses.join(' \u2022 ')}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
