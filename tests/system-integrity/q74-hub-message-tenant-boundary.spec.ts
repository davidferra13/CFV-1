/**
 * Q74: Hub Message Tenant Boundary
 *
 * Hub message queries must scope by group membership or profile token
 * ownership. No cross-tenant message visibility should be possible.
 * Client A must never see Client B's private messages to the chef.
 *
 * The hub uses opaque profile tokens (UUIDs) for authentication on public
 * pages. Message posting validates sender membership in the group.
 * Message listing filters by the authenticated user's accessible groups.
 *
 * Tests:
 *
 * 1. POST VALIDATES PROFILE TOKEN: postHubMessage resolves profile from
 *    profile_token before inserting (no raw user input as author_profile_id).
 *
 * 2. POST VALIDATES MEMBERSHIP: postHubMessage checks hub_group_members
 *    for the resolved profile before allowing message insertion.
 *
 * 3. MEMBERSHIP PERMISSION CHECK: postHubMessage checks can_post permission
 *    on the membership record (not just existence).
 *
 * 4. GET MESSAGES SCOPED BY GROUP: getHubMessages filters by group_id
 *    (messages from other groups are never returned).
 *
 * 5. PROFILE TOKENS ARE UUIDs: Profile token inputs are validated as UUIDs
 *    (not arbitrary strings that could be enumerated).
 *
 * 6. RATE LIMITING ON POST: postHubMessage has rate limiting to prevent
 *    spam and enumeration attacks.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q74-hub-message-tenant-boundary.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const MESSAGE_ACTIONS = resolve(ROOT, 'lib/hub/message-actions.ts')
const GROUP_ACTIONS = resolve(ROOT, 'lib/hub/group-actions.ts')

test.describe('Q74: Hub message tenant boundary', () => {
  // ---------------------------------------------------------------------------
  // Test 1: postHubMessage resolves profile from profile_token
  // ---------------------------------------------------------------------------
  test('postHubMessage resolves profile from profile_token before inserting', () => {
    expect(existsSync(MESSAGE_ACTIONS), 'lib/hub/message-actions.ts must exist').toBe(true)

    const src = readFileSync(MESSAGE_ACTIONS, 'utf-8')

    // The function must look up the profile by token, not trust client-provided profile_id
    expect(
      src.includes('profile_token') && src.includes('hub_guest_profiles'),
      'postHubMessage must resolve profile from profile_token via hub_guest_profiles lookup (not trust raw input)'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: postHubMessage validates group membership before insert
  // ---------------------------------------------------------------------------
  test('postHubMessage validates membership in hub_group_members before inserting', () => {
    const src = readFileSync(MESSAGE_ACTIONS, 'utf-8')

    // Must query hub_group_members to verify the profile is a member of the group
    expect(
      src.includes('hub_group_members') &&
        (src.includes('group_id') || src.includes('groupId')) &&
        (src.includes('profile_id') || src.includes('profileId')),
      'postHubMessage must verify membership via hub_group_members (group_id + profile_id)'
    ).toBe(true)

    // Must throw or reject if not a member
    expect(
      src.includes('Not a member') || src.includes('not a member') || src.includes('membership'),
      'postHubMessage must reject messages from non-members'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Membership check includes can_post permission
  // ---------------------------------------------------------------------------
  test('postHubMessage checks can_post permission on membership record', () => {
    const src = readFileSync(MESSAGE_ACTIONS, 'utf-8')

    expect(
      src.includes('can_post'),
      'postHubMessage must check can_post field on hub_group_members (not just membership existence)'
    ).toBe(true)

    // Must throw if can_post is false
    expect(
      src.includes('permission to post') ||
        src.includes('cannot post') ||
        src.includes('!membership.can_post'),
      'postHubMessage must reject messages when can_post is false'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 4: getHubMessages scopes by group_id
  // ---------------------------------------------------------------------------
  test('getHubMessages filters messages by group_id', () => {
    const src = readFileSync(MESSAGE_ACTIONS, 'utf-8')

    // The getHubMessages function must include group_id in its query filter
    // to ensure messages from other groups are never returned
    const getMessagesMatch = src.match(
      /(?:getHubMessages|getGroupMessages|listMessages)[\s\S]{0,500}\.eq\(['"]group_id['"]/
    )

    expect(
      getMessagesMatch !== null,
      'getHubMessages must filter by .eq("group_id", ...) to prevent cross-group message visibility'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 5: Profile tokens validated as UUIDs (not arbitrary strings)
  // ---------------------------------------------------------------------------
  test('profile token inputs are validated as UUIDs via Zod schema', () => {
    const src = readFileSync(MESSAGE_ACTIONS, 'utf-8')

    // The schema must validate profileToken as a UUID
    expect(
      src.includes('z.string().uuid()') && src.includes('profileToken'),
      'profileToken input must be validated as z.string().uuid() (prevents enumeration of non-UUID tokens)'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 6: Rate limiting on message posting
  // ---------------------------------------------------------------------------
  test('postHubMessage has rate limiting to prevent spam and enumeration', () => {
    const src = readFileSync(MESSAGE_ACTIONS, 'utf-8')

    expect(
      src.includes('checkRateLimit') || src.includes('rateLimit') || src.includes('rate_limit'),
      'postHubMessage must include rate limiting (checkRateLimit or equivalent) to prevent spam'
    ).toBe(true)
  })
})
