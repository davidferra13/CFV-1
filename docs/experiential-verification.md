# Experiential Verification Suite

A Playwright test suite that walks critical user journeys end-to-end, screenshotting every transition point. Catches blank screens, missing loading states, broken layouts, and disconnected UX signals that type checks and builds cannot detect.

## Why This Exists

On March 20, 2026, the sign-in flow had a blank screen gap between auth success and dashboard render. The transition overlay ("Loading your workspace...") existed as a component but was never wired into the sign-in page. Four commits touched the sign-in page over five days without anyone noticing. Type checks passed. Builds passed. The user saw nothing for 2 seconds on every single sign-in.

This suite exists to catch that class of problem. It does not check whether code compiles. It checks whether the user sees something at every moment.

## What It Tests

### 01 - Chef Sign-In Flow

- Sign-in page renders immediately (no blank on commit)
- Button shows loading state on submit
- Transition overlay appears after auth success ("Signing you in...")
- Dashboard shows loading skeleton or content (never blank)
- Invalid credentials show inline error

### 02 - Client Sign-In Flow

- Same checkpoints as chef, targeting client portal (/my-events)

### 03 - Chef Navigation

- Every major chef portal route (20+ routes)
- Each shows content or loading state, never blank

### 04 - Inquiry to Event

- Inquiry list, detail, event creation form, event detail
- Click-through navigation has no blank gaps

### 05 - Event Lifecycle

- Events board/kanban view
- Calendar view
- Event detail tabs
- AAR page

### 06 - Client Portal

- Every client route (my-events, my-quotes, my-chat, my-profile, etc.)
- Event detail page

### 07 - Cross-Boundary Transitions

- Public to auth boundary (homepage to sign-in)
- Unauthenticated access redirects (chef dashboard, client portal)
- Public page accessibility
- Invalid token pages show error, not blank

### 08 - Loading State Audit

- Every data-fetching route polled at 100ms intervals
- Detects whether a loading indicator appeared before content
- Reports routes missing loading states

### 09 - Error State Audit

- Nonexistent event/client/recipe IDs
- Invalid UUIDs in paths
- 404 routes
- Deeply nested nonexistent routes

## Running

```bash
# All experiential tests
npm run test:experiential

# With browser visible
npm run test:experiential:headed

# Specific suites
npm run test:experiential:auth        # Sign-in flows only
npm run test:experiential:nav         # Chef navigation only
npm run test:experiential:boundaries  # Cross-boundary transitions
npm run test:experiential:loading     # Loading state audit
npm run test:experiential:errors      # Error state audit
```

## Prerequisites

- Dev server running on port 3100
- `.auth/agent.json` exists (run `npm run agent:setup` if not)
- `.auth/seed-ids.json` exists for some tests (run globalSetup if not)
- `.auth/chef.json` and `.auth/client.json` for authenticated tests

## Output

- Screenshots at every checkpoint (attached to test report)
- Markdown reports summarizing results
- Video on failure (retained automatically)
- Traces on failure (for debugging)

View results: `npx playwright show-report`

## Core Assertion

The primary assertion is `assertNotBlank()`: at no point during any user journey should the page be empty. Either content is visible, or a loading indicator is visible. Blank means broken.

## When to Run

- After any change to auth flow, middleware, or layout files
- After any change to loading.tsx files
- After touching navigation or routing
- After multi-agent parallel work sessions (highest risk of experiential drift)
- Before merging to main (part of health checks)

## Architecture

```
tests/experiential/
  helpers/
    experiential-utils.ts   - Core utilities (blank detection, checkpoint capture)
  01-signin-chef.spec.ts    - Chef auth flow
  02-signin-client.spec.ts  - Client auth flow
  03-chef-navigation.spec.ts - All chef portal routes
  04-inquiry-to-event.spec.ts - Pipeline flow
  05-event-lifecycle.spec.ts  - Event views and tabs
  06-client-portal.spec.ts    - Client portal routes
  07-cross-boundary-transitions.spec.ts - Route group boundaries
  08-loading-state-audit.spec.ts - Loading indicator verification
  09-error-state-audit.spec.ts  - Error state verification

playwright.experiential.config.ts - Dedicated config (separate from main tests)
```
