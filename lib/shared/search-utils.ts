import { type ReactNode, createElement } from 'react'

/**
 * Highlight matched substrings in text. Returns an array of React nodes
 * with matched portions wrapped in <mark> elements.
 *
 * If query is empty or not found, returns the original text as-is.
 */
export function highlightMatch(text: string, query: string): ReactNode {
  if (!query || !text) return text

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  if (parts.length === 1) return text

  return parts.map((part, i) =>
    regex.test(part)
      ? createElement(
          'mark',
          {
            key: i,
            className: 'bg-brand-500/30 text-brand-200 rounded-sm px-0.5',
          },
          part
        )
      : part
  )
}

/**
 * Simple fuzzy match: checks if all characters of the query appear
 * in order within the text. Case-insensitive.
 *
 * "brsl" matches "Brussels Sprouts"
 */
export function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true
  if (!text) return false

  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  let ti = 0

  for (let qi = 0; qi < q.length; qi++) {
    const found = lower.indexOf(q[qi], ti)
    if (found === -1) return false
    ti = found + 1
  }

  return true
}

/**
 * Search across multiple fields of an object. Returns true if any
 * field contains the query (case-insensitive substring match).
 *
 * @example
 * searchFields(recipe, ['name', 'method', 'category'], 'chicken')
 */
export function searchFields<T extends Record<string, unknown>>(
  item: T,
  fields: (keyof T)[],
  query: string
): boolean {
  if (!query) return true

  const q = query.toLowerCase()

  return fields.some((field) => {
    const val = item[field]
    if (val == null) return false
    return String(val).toLowerCase().includes(q)
  })
}

/**
 * Normalize a search query: trim, collapse whitespace, lowercase.
 */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase()
}
