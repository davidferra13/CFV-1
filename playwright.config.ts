// Adapted from legacy patterns for Next.js + PostgreSQL
//
// Default base URL is http://localhost:3100.
// Override via PLAYWRIGHT_BASE_URL / PLAYWRIGHT_WEB_SERVER_COMMAND when isolation is needed.
//
// Projects:
//   smoke              — unauthenticated, no globalSetup dependency (tests/smoke/)
//   chef               — chef role, uses .auth/chef.json (tests/e2e/01-13)
//   client             — client role, uses .auth/client.json (tests/e2e/14)
//   public             — no auth, public-facing pages (tests/e2e/15)
//   interactions-chef  — Phase 1-4 chef interaction tests (files 01-38 excl admin)
//   interactions-admin — Admin panel interaction tests (file 37)
//   interactions-client — Client-role interaction tests
//   interactions-public — Unauthenticated interaction tests
//   isolation-tests    — Multi-tenant security tests (SECURITY CRITICAL)
//   coverage-*         — Full URL coverage by role

import { defineConfig } from '@playwright/test'

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const WEB_SERVER_COMMAND =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'node scripts/run-playwright-dev-server.mjs'
const RUN_ID = process.env.PLAYWRIGHT_RUN_ID || `pw-${process.pid}-${Date.now()}`
const OUTPUT_DIR = process.env.PLAYWRIGHT_OUTPUT_DIR || `test-results/${RUN_ID}`
const DEV_DIST_DIR = process.env.NEXT_DIST_DIR || `.next-dev-${RUN_ID}`
const REUSE_EXISTING_SERVER = envFlag(process.env.PLAYWRIGHT_REUSE_SERVER, true)

export default defineConfig({
  testDir: './tests',
  outputDir: OUTPUT_DIR,
  testMatch: ['**/*.spec.ts'],
  // Single worker — prevents state leaks between tenant-scoped tests
  workers: 1,
  // Sequential — ensures tests run in deterministic order
  fullyParallel: false,
  // Runs once before all tests: seeds data, logs in, saves auth state
  globalSetup: './tests/helpers/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // Smoke tests — no auth required, no dependency on seed data
    // Run these first: npm run test:e2e:smoke
    {
      name: 'smoke',
      testMatch: ['**/smoke/**/*.spec.ts'],
    },
    // Chef portal tests — authenticated as test chef
    {
      name: 'chef',
      testMatch: ['**/e2e/0[1-9]-*.spec.ts', '**/e2e/1[0-3]-*.spec.ts'],
      use: {
        storageState: '.auth/chef.json',
      },
    },
    // Client portal tests — authenticated as test client
    {
      name: 'client',
      testMatch: ['**/e2e/14-*.spec.ts'],
      use: {
        storageState: '.auth/client.json',
      },
    },
    {
      name: 'cross-portal',
      testMatch: ['**/e2e/chef_client_golden_path.spec.ts', '**/e2e/client_rls_negative.spec.ts'],
    },
    // Public pages — no auth
    {
      name: 'public',
      testMatch: ['**/e2e/15-*.spec.ts'],
    },
    // Whole-site mobile audit — route harvest + visual/layout checks.
    // Modes:
    //   quick (default): core viewport set + capped routes/role
    //   full: all harvested routes + full viewport matrix
    // Scope:
    //   all (default): public + chef + client + admin
    //   public: public routes only
    {
      name: 'mobile-audit',
      testMatch: ['**/mobile/mobile-visual-audit.spec.ts'],
      timeout: 120_000,
    },
    // ── Coverage Layer ────────────────────────────────────────────────────────
    // Visits every single URL for every role. Read-only GET requests only.
    // Run: npm run test:coverage
    {
      name: 'coverage-public',
      testMatch: ['**/coverage/01-public-routes.spec.ts'],
      timeout: 120_000,
      // No storageState — unauthenticated
    },
    {
      name: 'coverage-chef',
      testMatch: ['**/coverage/02-chef-routes.spec.ts'],
      timeout: 120_000,
      use: { storageState: '.auth/chef.json' },
    },
    {
      name: 'coverage-client',
      testMatch: ['**/coverage/03-client-routes.spec.ts'],
      timeout: 120_000,
      use: { storageState: '.auth/client.json' },
    },
    {
      name: 'coverage-admin',
      testMatch: ['**/coverage/04-admin-routes.spec.ts'],
      timeout: 120_000,
      use: { storageState: '.auth/admin.json' },
    },
    {
      name: 'coverage-auth-boundaries',
      testMatch: ['**/coverage/05-auth-boundaries.spec.ts'],
      timeout: 120_000,
      // No default storageState — tests manage their own auth per-test
    },
    {
      name: 'coverage-api',
      testMatch: ['**/coverage/06-api-routes.spec.ts'],
      timeout: 120_000,
      use: { storageState: '.auth/chef.json' },
    },
    // ── Interaction Layer ─────────────────────────────────────────────────────
    // Tests forms, buttons, FSM transitions, and state mutations.
    // Sequential (workers: 1) to prevent tenant state leaks.
    // Run: npm run test:interactions
    {
      name: 'interactions-chef',
      testMatch: [
        // Phase 1 — core interactions
        '**/interactions/01-create-flows.spec.ts',
        '**/interactions/02-fsm-transitions.spec.ts',
        '**/interactions/03-quote-flows.spec.ts',
        '**/interactions/04-forms-validation.spec.ts',
        '**/interactions/05-settings-flows.spec.ts',
        // Phase 2 — gap closure (all chef-authenticated flows)
        '**/interactions/06-close-out-wizard.spec.ts',
        '**/interactions/07-dop-and-kds.spec.ts',
        '**/interactions/08-chat-and-activity.spec.ts',
        '**/interactions/09-calendar-and-schedule.spec.ts',
        '**/interactions/10-aar-and-debrief.spec.ts',
        '**/interactions/11-onboarding-wizard.spec.ts',
        '**/interactions/14-inquiry-pipeline.spec.ts',
        '**/interactions/15-search-and-filter.spec.ts',
        '**/interactions/16-export-and-reports.spec.ts',
        '**/interactions/17-mobile-viewports.spec.ts',
        '**/interactions/18-data-persistence.spec.ts',
        '**/interactions/19-error-handling.spec.ts',
        '**/interactions/20-navigation-completeness.spec.ts',
        // Phase 3 — untested feature areas + mutation verification
        '**/interactions/21-staff-management.spec.ts',
        '**/interactions/22-menus-deep.spec.ts',
        '**/interactions/23-grocery-quote.spec.ts',
        '**/interactions/24-inventory-waste-costing.spec.ts',
        '**/interactions/25-loyalty-program.spec.ts',
        '**/interactions/26-proposals-goals-partners.spec.ts',
        '**/interactions/27-marketing-campaigns.spec.ts',
        '**/interactions/28-waitlist-surveys-wix.spec.ts',
        '**/interactions/29-mutation-verification.spec.ts',
        // Phase 4 — remaining routes: analytics, finance, culinary, clients, leads, social, partners
        '**/interactions/31-analytics-deep.spec.ts',
        '**/interactions/32-finance-deep.spec.ts',
        '**/interactions/33-culinary-deep.spec.ts',
        '**/interactions/34-client-subsections.spec.ts',
        '**/interactions/35-leads-calls-inbox.spec.ts',
        '**/interactions/36-social-network-community.spec.ts',
        '**/interactions/38-partners-deep.spec.ts',
        // Phase 5 — missing mutation verification + core flow completions
        '**/interactions/39-mutation-verification-phase4.spec.ts',
        '**/interactions/40-core-flow-completions.spec.ts',
        // Phase 6 — remaining routes not yet reached by files 01-40
        '**/interactions/41-remaining-routes.spec.ts',
        // Phase 7 — inquiry filters + POS concurrency integrity
        '**/interactions/42-inquiry-pipeline-filters.spec.ts',
        '**/interactions/42-pos-register-concurrency.spec.ts',
      ],
      use: { storageState: '.auth/chef.json' },
    },
    // Admin interaction tests — authenticated as test admin
    // Run: npm run test:interactions:admin
    {
      name: 'interactions-admin',
      testMatch: ['**/interactions/37-admin-panel.spec.ts'],
      use: { storageState: '.auth/admin.json' },
    },
    // Multi-tenant isolation — Chef A session attempts to access Chef B's data
    // SECURITY CRITICAL: a failure here means a real tenant data leak
    // Run: npm run test:isolation
    {
      name: 'isolation-tests',
      testMatch: ['**/interactions/30-multi-tenant-isolation.spec.ts'],
      use: { storageState: '.auth/chef.json' }, // Chef A session intentionally
    },
    // Client-role interaction tests (quote accept/reject, menu approval, payment)
    {
      name: 'interactions-client',
      testMatch: ['**/interactions/12-client-portal-deep.spec.ts'],
      use: { storageState: '.auth/client.json' },
    },
    // Staff-role interaction tests
    {
      name: 'interactions-staff',
      testMatch: ['**/interactions/50-staff-portal-theme.spec.ts'],
      use: { storageState: '.auth/staff.json' },
    },
    // Unauthenticated interaction tests (auth signup pages, public flows)
    {
      name: 'interactions-public',
      testMatch: ['**/interactions/13-auth-signup-flows.spec.ts'],
      // No storageState — unauthenticated
    },
    // ── Launch Readiness Audit ──────────────────────────────────────────────────
    // Targeted end-to-end flow tests: every input, every output, every core feature.
    // Run: npx playwright test -p launch-chef
    //      npx playwright test -p launch-client
    //      npx playwright test -p launch-public
    //      npx playwright test -p launch-mobile
    {
      name: 'launch-chef',
      testMatch: [
        '**/launch/01-auth-and-security.spec.ts',
        '**/launch/03-empty-states.spec.ts',
        '**/launch/04-inquiry-to-event.spec.ts',
        '**/launch/05-quote-flow.spec.ts',
        '**/launch/06-event-lifecycle.spec.ts',
        '**/launch/07-payments-and-finance.spec.ts',
        '**/launch/08-client-management.spec.ts',
        '**/launch/09-staff-and-tasks.spec.ts',
        '**/launch/10-vendor-comparison.spec.ts',
        '**/launch/11-culinary.spec.ts',
        '**/launch/12-calendar-and-schedule.spec.ts',
        '**/launch/15-settings-and-modules.spec.ts',
      ],
      use: { storageState: '.auth/chef.json' },
    },
    {
      name: 'launch-client',
      testMatch: ['**/launch/05-quote-flow.spec.ts', '**/launch/13-client-portal.spec.ts'],
      use: { storageState: '.auth/client.json' },
    },
    {
      name: 'launch-public',
      testMatch: ['**/launch/02-public-pages.spec.ts', '**/launch/14-public-inquiry-form.spec.ts'],
      timeout: 120_000,
      // No storageState — unauthenticated
    },
    {
      name: 'launch-mobile',
      testMatch: ['**/launch/16-mobile-viewport.spec.ts'],
      use: {
        storageState: '.auth/chef.json',
        viewport: { width: 375, height: 812 },
      },
    },
    // ── Journey Tests ─────────────────────────────────────────────────────────────
    // Remy Journey Suite — 335 scenarios covering everything a chef would do
    // in their first month. Tests UI and features directly (no LLM invocation).
    // Run: npm run test:journey
    {
      name: 'journey-chef',
      testMatch: ['**/journey/[0-2][0-9]-*.spec.ts'],
      timeout: 60_000,
      use: { storageState: '.auth/chef.json' },
    },
    // ── Diagnostic Tests ────────────────────────────────────────────────────────
    // Systematic test-diagnose-fix suites for every untested feature area.
    // Run: npx playwright test -p diagnostic
    {
      name: 'diagnostic',
      testMatch: ['**/diagnostic/*.spec.ts'],
      use: { storageState: '.auth/chef.json' },
    },
    // ── Soak Tests ──────────────────────────────────────────────────────────────
    // Software aging detection — uses separate config: playwright.soak.config.ts
    // Run: npm run test:soak (full) or npm run test:soak:quick (10 iterations)
    // Soak tests use a production build (next start) instead of dev server.
    // ── Stress Tests ─────────────────────────────────────────────────────────────
    // AI queue concurrency testing — verifies backpressure under load
    // Run: npm run test:stress:ollama (basic)
    //      npm run test:stress:ollama:high (high load)
    //      npm run test:stress:ollama:sustained (2 hours)
    //      npm run test:stress:ollama:failure (Ollama dies mid-test)
    {
      name: 'stress',
      testMatch: ['**/stress/**/*.spec.ts'],
      use: { storageState: '.auth/agent.json' },
      timeout: 30_000, // Per-test timeout (will be overridden by individual test durations)
      workers: 1, // Sequential to avoid concurrent Ollama stress
    },
    // ── Six Pillars Walkthrough ───────────────────────────────────────────────
    // V1 exit criterion: all 6 pillars pass a happy-path walkthrough
    // Runs against the PROD build (port 3000) - pre-compiled, no lazy-compilation delays.
    // Run: npx playwright test tests/six-pillars-walkthrough.spec.ts --project=six-pillars
    {
      name: 'six-pillars',
      testMatch: ['**/six-pillars-walkthrough.spec.ts'],
      // No storageState - test authenticates via /api/e2e/auth directly
    },
  ],
  webServer: {
    command: WEB_SERVER_COMMAND,
    url: BASE_URL,
    reuseExistingServer: REUSE_EXISTING_SERVER,
    timeout: 120_000,
    env: {
      ...process.env,
      DISABLE_AUTH_RATE_LIMIT_FOR_E2E: 'true',
      NEXT_DIST_DIR: DEV_DIST_DIR,
    },
  },
})
