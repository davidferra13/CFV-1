/**
 * Q31: Onboarding Integrity
 *
 * CLAUDE.md has a permanent rule: no forced onboarding gates in the chef
 * layout. This rule exists because the forced redirect was added, "fixed,"
 * and re-added multiple times - trapping users on the onboarding page and
 * making the app unusable. These tests verify the constraint is structurally
 * enforced, not just currently absent.
 *
 * Tests:
 *
 * 1. NO LAYOUT REDIRECT: app/(chef)/layout.tsx must not contain
 *    redirect('/onboarding') or redirect to any onboarding path.
 *
 * 2. NO FULLPAGE GATE: The layout must not return an ArchetypeSelector or
 *    any full-page component that replaces the normal page render.
 *
 * 3. AUTH ONLY GUARD: The layout's only gate is requireChef() for
 *    authentication. No profile-completeness or onboarding-status gate.
 *
 * 4. CHILDREN ALWAYS RENDERED: The layout passes children through once
 *    authenticated. No conditional that withholds children based on
 *    onboarding state.
 *
 * 5. ONBOARDING BANNER IS OPTIONAL: If an onboarding nudge exists, it must
 *    be a non-blocking banner (not a modal or fullscreen overlay that
 *    prevents navigation).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q31-onboarding-integrity.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const CHEF_LAYOUT = resolve(process.cwd(), 'app/(chef)/layout.tsx')

test.describe('Q31: Onboarding integrity', () => {
  // -------------------------------------------------------------------------
  // Test 1: No redirect to /onboarding in chef layout
  // -------------------------------------------------------------------------
  test('chef layout does not redirect to /onboarding', () => {
    expect(existsSync(CHEF_LAYOUT), 'app/(chef)/layout.tsx must exist').toBe(true)

    const src = readFileSync(CHEF_LAYOUT, 'utf-8')

    expect(
      !src.includes("redirect('/onboarding") && !src.includes('redirect("/onboarding'),
      'chef layout must not contain redirect to /onboarding (CLAUDE.md permanent rule)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: No full-page component returned in layout based on onboarding
  // -------------------------------------------------------------------------
  test('chef layout does not return a full-page onboarding gate component', () => {
    const src = readFileSync(CHEF_LAYOUT, 'utf-8')

    // Must not replace the layout with an archetype selector or onboarding screen
    const blockedPatterns = [
      'ArchetypeSelector',
      'OnboardingGate',
      'OnboardingWall',
      'return <Archetype',
      'return <Onboarding',
    ]

    for (const pattern of blockedPatterns) {
      expect(
        !src.includes(pattern),
        `chef layout must not render ${pattern} (blocked by CLAUDE.md permanent rule)`
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 3: Auth is the only server-side gate
  // -------------------------------------------------------------------------
  test('chef layout auth gate uses requireChef() only, not onboarding status', () => {
    const src = readFileSync(CHEF_LAYOUT, 'utf-8')

    // Must call requireChef for auth
    expect(
      src.includes('requireChef'),
      'chef layout must call requireChef() as its auth gate'
    ).toBe(true)

    // Must NOT check onboarding_complete, archetype_selected, or profile_complete
    const forbiddenChecks = [
      'onboarding_complete',
      'archetype_selected',
      'profile_complete',
      'onboardingComplete',
      'archetypeSelected',
    ]

    for (const check of forbiddenChecks) {
      expect(
        !src.includes(check),
        `chef layout must not gate on ${check} - that would force onboarding`
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 4: Children rendered unconditionally after auth
  // -------------------------------------------------------------------------
  test('chef layout renders children after auth without onboarding condition', () => {
    const src = readFileSync(CHEF_LAYOUT, 'utf-8')

    // The layout must include {children} in its JSX
    expect(
      src.includes('{children}'),
      'chef layout must render {children} (not withhold them behind onboarding gate)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Any onboarding nudge is a banner, not a blocking overlay
  // -------------------------------------------------------------------------
  test('onboarding nudge (if present) is a non-blocking banner component', () => {
    const src = readFileSync(CHEF_LAYOUT, 'utf-8')

    // If the layout references onboarding UI at all, it should be a banner or
    // toast-style component, not a modal or overlay that covers the screen.
    if (src.includes('onboarding') || src.includes('Onboarding')) {
      // Blocking patterns not allowed
      expect(
        !src.includes('modal') && !src.includes('overlay') && !src.includes('fullscreen'),
        'onboarding nudge in layout must not be a modal or overlay (must be a dismissible banner)'
      ).toBe(true)
    }
    // If no onboarding reference, the test trivially passes
  })
})
