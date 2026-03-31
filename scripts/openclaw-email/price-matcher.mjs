/**
 * Price Matcher
 * Matches extracted product names to canonical ingredients
 * in the SQLite database using fuzzy keyword matching.
 */

import { createRequire } from 'module'
import path from 'path'
import os from 'os'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const DB_PATH = path.join(os.homedir(), 'openclaw-prices', 'data', 'prices.db')

/**
 * Match a product name to a canonical ingredient.
 * Returns { id, name, confidence } or null.
 */
export function matchToCanonical(productName) {
  const db = new Database(DB_PATH, { readonly: true })

  try {
    const normalized = normalizeProductName(productName)
    const keywords = normalized.split(/\s+/).filter(w => w.length >= 3)

    if (keywords.length === 0) return null

    // Try exact match first
    const exact = db.prepare(
      'SELECT id, name FROM canonical_ingredients WHERE lower(name) = ?'
    ).get(normalized)

    if (exact) return { id: exact.id, name: exact.name, confidence: 1.0 }

    // Try keyword matching: score by how many keywords match
    // Build a WHERE clause that checks for each keyword using LIKE
    let bestMatch = null
    let bestScore = 0

    // Get candidates that match at least the first keyword
    const candidates = db.prepare(
      'SELECT id, name FROM canonical_ingredients WHERE lower(name) LIKE ?'
    ).all(`%${keywords[0]}%`)

    for (const candidate of candidates) {
      const candLower = candidate.name.toLowerCase()
      let matchCount = 0

      for (const kw of keywords) {
        if (candLower.includes(kw)) matchCount++
      }

      const score = matchCount / keywords.length

      if (score > bestScore) {
        bestScore = score
        bestMatch = candidate
      }
    }

    if (bestMatch && bestScore >= 0.5) {
      return { id: bestMatch.id, name: bestMatch.name, confidence: bestScore }
    }

    return null
  } finally {
    db.close()
  }
}

/**
 * Match an array of extracted products in bulk.
 * Returns array with matched results.
 */
export function matchBulk(products) {
  return products.map(p => ({
    ...p,
    match: matchToCanonical(p.product)
  }))
}

function normalizeProductName(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(fresh|frozen|organic|natural|premium|grade\s*a|usda|choice|prime|select)\b/g, '')
    .replace(/\b(approx|approximately|avg|average|about)\b/g, '')
    .replace(/\b(\d+\s*(lb|oz|ct|pk|pc|ea))\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
