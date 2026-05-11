// Data Quality: Duplicate Detection Engine
// Finds potential duplicate clients, ingredients, and recipes by name similarity.
// Uses Levenshtein distance for fuzzy matching and normalized comparison.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── String Similarity ──────────────────────────────────────────────────────

/**
 * Levenshtein distance between two strings.
 * Returns the minimum number of single-character edits needed to transform a into b.
 */
function levenshteinDistance(a: string, b: string): number {
  const la = a.length
  const lb = b.length
  if (la === 0) return lb
  if (lb === 0) return la

  // Use single-row optimization for memory efficiency
  let prev = Array.from({ length: lb + 1 }, (_, i) => i)
  let curr = new Array<number>(lb + 1)

  for (let i = 1; i <= la; i++) {
    curr[0] = i
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[lb]
}

/**
 * Calculate similarity between two strings as a normalized 0-1 score.
 * 1.0 = identical, 0.0 = completely different.
 */
function calculateSimilarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0
  if (na.length === 0 || nb.length === 0) return 0.0

  const maxLen = Math.max(na.length, nb.length)
  const dist = levenshteinDistance(na, nb)
  return 1 - dist / maxLen
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize an ingredient name for comparison.
 * Strips common prefixes/suffixes that create false negatives:
 * "Extra Virgin Olive Oil" vs "Olive Oil", "Fresh Basil" vs "Basil"
 */
function normalizeIngredientName(s: string): string {
  let n = normalize(s)
  // Strip common qualifiers that create false duplicates
  const prefixes = [
    'fresh ',
    'dried ',
    'frozen ',
    'organic ',
    'extra virgin ',
    'virgin ',
    'raw ',
    'whole ',
    'ground ',
    'chopped ',
    'diced ',
    'sliced ',
    'minced ',
    'crushed ',
    'roasted ',
    'toasted ',
    'smoked ',
    'canned ',
    'cooked ',
    'blanched ',
    'pickled ',
    'fermented ',
    'unsalted ',
    'salted ',
    'sweetened ',
    'unsweetened ',
  ]
  for (const prefix of prefixes) {
    if (n.startsWith(prefix)) {
      n = n.slice(prefix.length)
    }
  }
  return n
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DuplicateMatch<T> {
  item1: T
  item2: T
  similarity: number
  matchReason: string
}

export interface ClientDuplicateItem {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  status: string
  total_events_count: number
}

export interface IngredientDuplicateItem {
  id: string
  name: string
  category: string
  default_unit: string
  recipe_count: number
}

export interface RecipeDuplicateItem {
  id: string
  name: string
  category: string
  times_cooked: number
  ingredient_count: number
}

export interface DuplicateSummary {
  clients: number
  ingredients: number
  recipes: number
}

// ─── Dismissed Duplicates Cache ─────────────────────────────────────────────

async function getDismissedPairs(
  db: any,
  tenantId: string,
  entityType: string
): Promise<Set<string>> {
  const { data } = await db
    .from('dismissed_duplicates')
    .select('entity_id_1, entity_id_2')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)

  const set = new Set<string>()
  if (data) {
    for (const row of data) {
      set.add(pairKey(row.entity_id_1, row.entity_id_2))
    }
  }
  return set
}

function pairKey(id1: string, id2: string): string {
  return [id1, id2].sort().join('|')
}

// ─── Client Duplicates ──────────────────────────────────────────────────────

const CLIENT_SIMILARITY_THRESHOLD = 0.75

export async function findDuplicateClients(): Promise<DuplicateMatch<ClientDuplicateItem>[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, email, phone, status, total_events_count')
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .order('created_at', { ascending: true })

  if (!clients || clients.length < 2) return []

  const dismissed = await getDismissedPairs(db, tenantId, 'client')
  const pairs: DuplicateMatch<ClientDuplicateItem>[] = []

  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const c1 = clients[i]
      const c2 = clients[j]
      const pk = pairKey(c1.id, c2.id)
      if (dismissed.has(pk)) continue

      // Check email match (highest confidence)
      if (c1.email && c2.email) {
        const e1 = normalize(c1.email)
        const e2 = normalize(c2.email)
        if (e1 && e2 && e1 === e2) {
          pairs.push({
            item1: c1,
            item2: c2,
            similarity: 1.0,
            matchReason: 'Same email address',
          })
          continue
        }
      }

      // Check phone match
      if (c1.phone && c2.phone) {
        const p1 = c1.phone.replace(/\D/g, '')
        const p2 = c2.phone.replace(/\D/g, '')
        if (p1.length >= 7 && p2.length >= 7) {
          const t1 = p1.length > 10 ? p1.slice(-10) : p1
          const t2 = p2.length > 10 ? p2.slice(-10) : p2
          if (t1 === t2) {
            pairs.push({
              item1: c1,
              item2: c2,
              similarity: 0.95,
              matchReason: 'Same phone number',
            })
            continue
          }
        }
      }

      // Name similarity
      if (c1.full_name && c2.full_name) {
        const sim = calculateSimilarity(c1.full_name, c2.full_name)
        if (sim >= CLIENT_SIMILARITY_THRESHOLD) {
          pairs.push({
            item1: c1,
            item2: c2,
            similarity: sim,
            matchReason:
              sim === 1.0 ? 'Identical name' : sim >= 0.9 ? 'Very similar name' : 'Similar name',
          })
        }
      }
    }
  }

  // Sort by similarity descending
  pairs.sort((a, b) => b.similarity - a.similarity)
  return pairs.slice(0, 50)
}

// ─── Ingredient Duplicates ──────────────────────────────────────────────────

const INGREDIENT_SIMILARITY_THRESHOLD = 0.7

export async function findDuplicateIngredients(): Promise<
  DuplicateMatch<IngredientDuplicateItem>[]
> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, category, default_unit')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('name', { ascending: true })

  if (!ingredients || ingredients.length < 2) return []

  // Get recipe counts per ingredient
  const { data: recipeCounts } = await db
    .from('recipe_ingredients')
    .select('ingredient_id')
    .in(
      'ingredient_id',
      ingredients.map((i: any) => i.id)
    )

  const countMap = new Map<string, number>()
  if (recipeCounts) {
    for (const rc of recipeCounts) {
      countMap.set(rc.ingredient_id, (countMap.get(rc.ingredient_id) || 0) + 1)
    }
  }

  const dismissed = await getDismissedPairs(db, tenantId, 'ingredient')
  const pairs: DuplicateMatch<IngredientDuplicateItem>[] = []

  for (let i = 0; i < ingredients.length; i++) {
    for (let j = i + 1; j < ingredients.length; j++) {
      const a = ingredients[i]
      const b = ingredients[j]
      const pk = pairKey(a.id, b.id)
      if (dismissed.has(pk)) continue

      // First check with normalized ingredient names (strips qualifiers)
      const normA = normalizeIngredientName(a.name)
      const normB = normalizeIngredientName(b.name)

      let sim: number
      let reason: string

      if (normA === normB) {
        // After stripping qualifiers they are identical:
        // "Fresh Basil" vs "Basil", "Extra Virgin Olive Oil" vs "Olive Oil"
        sim = 0.95
        reason = 'Same ingredient (different qualifier)'
      } else {
        sim = calculateSimilarity(a.name, b.name)
        if (sim < INGREDIENT_SIMILARITY_THRESHOLD) continue
        reason = sim === 1.0 ? 'Identical name' : sim >= 0.9 ? 'Very similar name' : 'Similar name'
      }

      // Also check if one name contains the other
      const la = normalize(a.name)
      const lb = normalize(b.name)
      if (la.includes(lb) || lb.includes(la)) {
        sim = Math.max(sim, 0.85)
        reason = 'One name contains the other'
      }

      pairs.push({
        item1: { ...a, recipe_count: countMap.get(a.id) || 0 },
        item2: { ...b, recipe_count: countMap.get(b.id) || 0 },
        similarity: sim,
        matchReason: reason,
      })
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity)
  return pairs.slice(0, 50)
}

// ─── Recipe Duplicates ──────────────────────────────────────────────────────

const RECIPE_SIMILARITY_THRESHOLD = 0.75

export async function findDuplicateRecipes(): Promise<DuplicateMatch<RecipeDuplicateItem>[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: recipes } = await db
    .from('recipes')
    .select('id, name, category, times_cooked')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('name', { ascending: true })

  if (!recipes || recipes.length < 2) return []

  // Get ingredient lists per recipe for overlap detection
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id')
    .in(
      'recipe_id',
      recipes.map((r: any) => r.id)
    )

  const ingredientMap = new Map<string, Set<string>>()
  if (recipeIngredients) {
    for (const ri of recipeIngredients) {
      if (!ingredientMap.has(ri.recipe_id)) {
        ingredientMap.set(ri.recipe_id, new Set())
      }
      ingredientMap.get(ri.recipe_id)!.add(ri.ingredient_id)
    }
  }

  const dismissed = await getDismissedPairs(db, tenantId, 'recipe')
  const pairs: DuplicateMatch<RecipeDuplicateItem>[] = []

  for (let i = 0; i < recipes.length; i++) {
    for (let j = i + 1; j < recipes.length; j++) {
      const a = recipes[i]
      const b = recipes[j]
      const pk = pairKey(a.id, b.id)
      if (dismissed.has(pk)) continue

      const nameSim = calculateSimilarity(a.name, b.name)

      // Check ingredient overlap
      const ingredsA = ingredientMap.get(a.id) || new Set()
      const ingredsB = ingredientMap.get(b.id) || new Set()
      let ingredientOverlap = 0
      if (ingredsA.size > 0 && ingredsB.size > 0) {
        let shared = 0
        for (const id of ingredsA) {
          if (ingredsB.has(id)) shared++
        }
        ingredientOverlap = (2 * shared) / (ingredsA.size + ingredsB.size) // Dice coefficient
      }

      // Combine signals: strong name match or very high ingredient overlap with moderate name match
      let similarity = nameSim
      let reason = ''

      if (nameSim >= RECIPE_SIMILARITY_THRESHOLD) {
        reason =
          nameSim === 1.0 ? 'Identical name' : nameSim >= 0.9 ? 'Very similar name' : 'Similar name'
        if (ingredientOverlap >= 0.7) {
          similarity = Math.max(similarity, (nameSim + ingredientOverlap) / 2)
          reason += ' + shared ingredients'
        }
      } else if (ingredientOverlap >= 0.85 && nameSim >= 0.5) {
        // Low name similarity but nearly identical ingredient lists
        similarity = ingredientOverlap
        reason = 'Nearly identical ingredient list'
      } else {
        continue
      }

      pairs.push({
        item1: { ...a, ingredient_count: ingredsA.size },
        item2: { ...b, ingredient_count: ingredsB.size },
        similarity,
        matchReason: reason,
      })
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity)
  return pairs.slice(0, 50)
}

// ─── Summary ────────────────────────────────────────────────────────────────

export async function getDuplicateSummary(): Promise<DuplicateSummary> {
  const [clients, ingredients, recipes] = await Promise.all([
    findDuplicateClients().catch(() => []),
    findDuplicateIngredients().catch(() => []),
    findDuplicateRecipes().catch(() => []),
  ])

  return {
    clients: clients.length,
    ingredients: ingredients.length,
    recipes: recipes.length,
  }
}
