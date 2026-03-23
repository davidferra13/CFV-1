/**
 * Menu Breakdown - Culinary Truth Unit Tests
 *
 * Validates that ChefFlow's breakdown logic produces correct output
 * when given canonically correct menus from culinary education standards.
 *
 * These tests are pure logic - no DB, no browser, no network.
 * They test the same computations that run inside MenuBreakdownPanel.
 *
 * Run: npm run test:culinary-truth
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_CANONICAL_MENUS,
  escoffierClassicalFrench,
  ciaModernAmericanTasting,
  veganWellnessDinner,
  corporateCocktailReception,
  holidayFamilyDinner,
  weddingTastingMenu,
  type CanonicalMenu,
  type CanonicalCourse,
} from '../culinary/canonical-menus.js'

// ─── Logic extracted from MenuBreakdownPanel (must stay in sync) ──────────────
// If you change these constants in the component, update them here too.

const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting Menu',
  other: 'Other',
}

const DIETARY_TAG_LABELS: Record<string, string> = {
  GF: 'Gluten-Free',
  DF: 'Dairy-Free',
  V: 'Vegetarian',
  VG: 'Vegan',
  NF: 'Nut-Free',
  SF: 'Shellfish-Free',
  EF: 'Egg-Free',
  KO: 'Kosher',
  HA: 'Halal',
}

function aggregateDietaryTags(courses: CanonicalCourse[]): string[] {
  return Array.from(new Set(courses.flatMap((c) => c.dietary_tags)))
}

function sortCoursesByNumber(courses: CanonicalCourse[]): CanonicalCourse[] {
  return [...courses].sort((_, __) => 0) // order is preserved as-is (course_number = index + 1)
}

function buildTagLine(menu: CanonicalMenu): string {
  return [
    `${menu.courses.length}-course`,
    SERVICE_STYLE_LABELS[menu.service_style] || menu.service_style,
    menu.cuisine_type || null,
    menu.scene_type || null,
    menu.guest_count ? `${menu.guest_count} guests` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function runFixture(fixture: CanonicalMenu) {
  const { expected } = fixture

  // 1. Course count
  const actualCount = fixture.courses.length
  assert.equal(
    actualCount,
    expected.course_count,
    `[${fixture.name}] Course count: expected ${expected.course_count}, got ${actualCount}`
  )

  // 2. Dietary flag aggregation - all expected flags present
  const actualTags = aggregateDietaryTags(fixture.courses)
  for (const expectedTag of expected.dietary_flags) {
    assert.ok(
      actualTags.includes(expectedTag),
      `[${fixture.name}] Expected dietary tag "${expectedTag}" missing from aggregated tags: [${actualTags.join(', ')}]`
    )
  }

  // 3. No unexpected tags
  for (const actualTag of actualTags) {
    assert.ok(
      expected.dietary_flags.includes(actualTag),
      `[${fixture.name}] Unexpected dietary tag "${actualTag}" found. Not in expected: [${expected.dietary_flags.join(', ')}]`
    )
  }

  // 4. Course label sequence
  const actualLabels = fixture.courses.map((c) => c.course_label)
  assert.deepEqual(
    actualLabels,
    expected.course_labels_in_order,
    `[${fixture.name}] Course label sequence mismatch`
  )

  // 5. Tagline contains all expected parts
  const tagLine = buildTagLine(fixture)
  for (const part of expected.tagline_parts) {
    assert.ok(
      tagLine.includes(part),
      `[${fixture.name}] Tagline "${tagLine}" missing expected part "${part}"`
    )
  }

  // 6. All dietary tags have known labels (no unmapped codes shown raw)
  const allTagsInMenu = new Set(fixture.courses.flatMap((c) => c.dietary_tags))
  for (const tag of allTagsInMenu) {
    assert.ok(
      tag in DIETARY_TAG_LABELS,
      `[${fixture.name}] Tag "${tag}" has no label in DIETARY_TAG_LABELS - it will render as raw code`
    )
  }

  // 7. Service style has a known label
  assert.ok(
    fixture.service_style in SERVICE_STYLE_LABELS,
    `[${fixture.name}] Service style "${fixture.service_style}" has no label - tagline will render raw code`
  )

  // 8. All dishes have names (breakdown requires dish names for recipe matching)
  for (const course of fixture.courses) {
    assert.ok(
      course.dish_name && course.dish_name.trim().length > 0,
      `[${fixture.name}] Course "${course.course_label}" has no dish name`
    )
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('Escoffier Classical French Dinner (8 courses)', () => {
  runFixture(escoffierClassicalFrench)
})

test('CIA Modern American Tasting (7 courses)', () => {
  runFixture(ciaModernAmericanTasting)
})

test('Vegan Wellness Dinner - all dietary flags aggregate correctly', () => {
  runFixture(veganWellnessDinner)

  // Additional assertion: every single course must carry VG and GF
  for (const course of veganWellnessDinner.courses) {
    assert.ok(
      course.dietary_tags.includes('VG'),
      `Vegan menu: course "${course.dish_name}" missing VG tag`
    )
    assert.ok(
      course.dietary_tags.includes('GF'),
      `Vegan menu: course "${course.dish_name}" missing GF tag`
    )
  }
})

test('Corporate Cocktail Reception - all items share the same course label', () => {
  runFixture(corporateCocktailReception)

  const labels = new Set(corporateCocktailReception.courses.map((c) => c.course_label))
  assert.equal(
    labels.size,
    1,
    `Cocktail reception: expected all courses to share the same label, got: [${[...labels].join(', ')}]`
  )
})

test('Holiday Family Dinner (4 courses)', () => {
  runFixture(holidayFamilyDinner)
})

test('Spring Wedding Tasting Menu - SF tag absent when only fish served', () => {
  runFixture(weddingTastingMenu)

  // Critical: sea bass is fish, not shellfish. SF must NOT appear.
  const allTags = aggregateDietaryTags(weddingTastingMenu.courses)
  assert.ok(
    !allTags.includes('SF'),
    `Wedding menu: SF (shellfish-free) tag should not be present when only fish is served, but found: [${allTags.join(', ')}]`
  )
})

test('All canonical menus pass structural validation', () => {
  for (const menu of ALL_CANONICAL_MENUS) {
    // At least 1 course
    assert.ok(menu.courses.length >= 1, `${menu.name}: must have at least 1 course`)

    // Required metadata fields
    assert.ok(menu.name.trim().length > 0, `${menu.name}: name required`)
    assert.ok(menu.service_style.trim().length > 0, `${menu.name}: service_style required`)

    // Guest count positive
    assert.ok(menu.guest_count > 0, `${menu.name}: guest_count must be > 0`)

    // Source citation present
    assert.ok(menu.source.trim().length > 0, `${menu.name}: academic source required`)
  }
})

test('Tagline format: course count always leads', () => {
  for (const menu of ALL_CANONICAL_MENUS) {
    const tagLine = buildTagLine(menu)
    assert.ok(
      tagLine.startsWith(`${menu.courses.length}-course`),
      `${menu.name}: tagline must start with course count, got: "${tagLine}"`
    )
  }
})

test('Dietary tag labels cover all tags used across all canonical menus', () => {
  const allUsedTags = new Set(
    ALL_CANONICAL_MENUS.flatMap((m) => m.courses.flatMap((c) => c.dietary_tags))
  )
  const unmapped: string[] = []
  for (const tag of allUsedTags) {
    if (!(tag in DIETARY_TAG_LABELS)) unmapped.push(tag)
  }
  assert.deepEqual(
    unmapped,
    [],
    `Tags used in canonical menus but missing from DIETARY_TAG_LABELS: [${unmapped.join(', ')}]`
  )
})

test('Course count matches expected.course_count for every fixture', () => {
  for (const menu of ALL_CANONICAL_MENUS) {
    assert.equal(
      menu.courses.length,
      menu.expected.course_count,
      `${menu.name}: courses.length (${menu.courses.length}) != expected.course_count (${menu.expected.course_count})`
    )
  }
})

test('Classical French progression respects Escoffier sequence', () => {
  const labels = escoffierClassicalFrench.courses.map((c) => c.course_label)

  // Escoffier rule: Amuse-Bouche always first
  assert.equal(labels[0], 'Amuse-Bouche', 'Classical French: Amuse-Bouche must be first')

  // Soup before fish
  const soupIdx = labels.indexOf('Soup')
  const fishIdx = labels.indexOf('Fish Course')
  assert.ok(soupIdx < fishIdx, 'Classical French: Soup must come before Fish Course')

  // Fish before main
  const mainIdx = labels.indexOf('Main Course')
  assert.ok(fishIdx < mainIdx, 'Classical French: Fish Course must come before Main Course')

  // Intermezzo before main (palate cleanser)
  const intermezzoIdx = labels.indexOf('Intermezzo')
  assert.ok(intermezzoIdx < mainIdx, 'Classical French: Intermezzo must come before Main Course')

  // Cheese after main (European tradition)
  const cheeseIdx = labels.indexOf('Cheese Course')
  assert.ok(cheeseIdx > mainIdx, 'Classical French: Cheese Course must come after Main Course')

  // Dessert always last
  assert.equal(labels[labels.length - 1], 'Dessert', 'Classical French: Dessert must be last')
})

test('CIA tasting menu respects modern American progression', () => {
  const labels = ciaModernAmericanTasting.courses.map((c) => c.course_label)

  // Modern American: Amuse-Bouche first
  assert.equal(labels[0], 'Amuse-Bouche', 'CIA: Amuse-Bouche must be first')

  // Intermezzo is mid-menu
  const intermezzoIdx = labels.indexOf('Intermezzo')
  const mainIdx = labels.indexOf('Main Course')
  assert.ok(
    intermezzoIdx > 0 && intermezzoIdx < mainIdx,
    'CIA: Intermezzo must be mid-menu, before main'
  )

  // Dessert last
  assert.equal(labels[labels.length - 1], 'Dessert', 'CIA: Dessert must be last')
})
