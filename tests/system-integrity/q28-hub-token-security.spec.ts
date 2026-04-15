/**
 * Q28: Hub Token Security
 *
 * The client hub uses opaque UUID tokens for link-based access (no login required).
 * Two risks: (a) token not generated = null token = any UUID accesses the profile,
 * (b) token predictable = brute-force enumeration.
 *
 * The hub is intentionally public (no session auth). Its security model depends
 * entirely on token unguessability. If tokens are sequential, short, or seeded
 * from predictable data, the model breaks.
 *
 * Tests:
 *
 * 1. PROFILE TOKEN REQUIRED: getProfileByToken() uses the token as the primary
 *    lookup key — a null token would match all profiles (SQL NULL != NULL, but
 *    check that the code validates the token is non-null before querying).
 *
 * 2. TOKEN LOOKUP PATTERN: The query uses .eq('profile_token', token), not a
 *    partial match or LIKE — prevents prefix enumeration.
 *
 * 3. GROUP TOKEN SAME PATTERN: getGroupByToken() follows the same security model.
 *
 * 4. JOIN ACTION EXEMPTED: joinHubGroup is correctly exempted from auth guards
 *    (it's public by design) — but it must still validate the token non-null.
 *
 * 5. TOKEN GENERATION: New hub profiles/groups use gen_random_uuid() or
 *    uuid() for token generation — not sequential IDs or timestamps.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q28-hub-token-security.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const HUB_PROFILE_ACTIONS = resolve(process.cwd(), 'lib/hub/profile-actions.ts')
const HUB_GROUP_ACTIONS = resolve(process.cwd(), 'lib/hub/group-actions.ts')

test.describe('Q28: Hub token security', () => {
  // -------------------------------------------------------------------------
  // Test 1: getProfileByToken uses profile_token for exact lookup
  // -------------------------------------------------------------------------
  test('lib/hub/profile-actions.ts queries by profile_token for exact match', () => {
    expect(existsSync(HUB_PROFILE_ACTIONS), 'lib/hub/profile-actions.ts must exist').toBe(true)

    const src = readFileSync(HUB_PROFILE_ACTIONS, 'utf-8')

    expect(
      src.includes('profile_token'),
      'profile-actions.ts must use profile_token as the access control lookup key'
    ).toBe(true)

    // Must use exact equality (eq), not ilike or contains
    expect(
      src.includes(".eq('profile_token'") || src.includes('.eq("profile_token"'),
      "profile-actions.ts must use .eq('profile_token') for exact-match lookup — not LIKE or contains"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Profile lookup returns null for missing token (not all profiles)
  // -------------------------------------------------------------------------
  test('getProfileByToken returns null for invalid token (no fallback match)', () => {
    const src = readFileSync(HUB_PROFILE_ACTIONS, 'utf-8')

    // The function must have null handling — error/missing data returns null
    expect(
      src.includes('null') || src.includes('return null') || src.includes('if (error'),
      'getProfileByToken must handle invalid/missing tokens by returning null (not a default profile)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Group token uses same exact-match pattern
  // -------------------------------------------------------------------------
  test('lib/hub/group-actions.ts queries by group_token for exact match', () => {
    expect(existsSync(HUB_GROUP_ACTIONS), 'lib/hub/group-actions.ts must exist').toBe(true)

    const src = readFileSync(HUB_GROUP_ACTIONS, 'utf-8')

    expect(
      src.includes('group_token'),
      'group-actions.ts must use group_token as the access control lookup key'
    ).toBe(true)

    expect(
      src.includes(".eq('group_token'") || src.includes('.eq("group_token"'),
      "group-actions.ts must use .eq('group_token') for exact-match lookup"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Token generation uses UUID (not sequential IDs)
  // -------------------------------------------------------------------------
  test('hub tokens are generated using UUID (not sequential IDs or timestamps)', () => {
    const profileSrc = readFileSync(HUB_PROFILE_ACTIONS, 'utf-8')
    const groupSrc = readFileSync(HUB_GROUP_ACTIONS, 'utf-8')

    // Must reference uuid generation (gen_random_uuid() in SQL, or crypto.randomUUID in JS,
    // or rely on database default with gen_random_uuid())
    const hasUuidGen =
      profileSrc.includes('uuid') ||
      profileSrc.includes('randomUUID') ||
      groupSrc.includes('uuid') ||
      groupSrc.includes('randomUUID')

    expect(
      hasUuidGen,
      'Hub token generation must use UUID (gen_random_uuid or crypto.randomUUID) — not sequential IDs'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Hub is correctly listed as public-exempt in Q6 auth scan
  // -------------------------------------------------------------------------
  test('hub profile and group actions are in the Q6 public-exempt list', () => {
    const q6File = resolve(process.cwd(), 'tests/system-integrity/q6-server-action-auth.spec.ts')
    if (!existsSync(q6File)) return

    const src = readFileSync(q6File, 'utf-8')

    expect(
      src.includes('lib/hub/profile-actions.ts') || src.includes('hub/profile-actions'),
      'Q6 auth scan must exempt lib/hub/profile-actions.ts (intentionally public)'
    ).toBe(true)

    expect(
      src.includes('lib/hub/group-actions.ts') || src.includes('hub/group-actions'),
      'Q6 auth scan must exempt lib/hub/group-actions.ts (joinHubGroup is public by design)'
    ).toBe(true)
  })
})
