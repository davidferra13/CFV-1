export const COMMANDS = {
  status: {
    summary: 'Read-only branch, dirty tree, env, migration, and runtime snapshot.',
    mode: 'read-only',
  },
  doctor: {
    summary: 'Runs the local static health bundle across status, guard, route, truth, ai-gate, and db.',
    mode: 'read-only',
  },
  cockpit: {
    summary: 'Operator dashboard combining status, claims, migration, guard, and scan summaries.',
    mode: 'read-only',
  },
  next: {
    summary: 'Suggests the next safest agent action from branch, dirty files, claims, validation, and push readiness.',
    mode: 'read-only',
  },
  explain: {
    summary: 'Explains a ChefFlow CLI command, safety profile, and related underlying scripts.',
    mode: 'read-only',
  },
  guard: {
    summary: 'Blocks unsafe commands before they run: main pushes, deploys, destructive SQL, drizzle push, and server restarts.',
    mode: 'read-only',
  },
  claims: {
    summary: 'Shows active agent claims, stale claims, dirty files, and likely ownership conflicts.',
    mode: 'read-only',
  },
  owned: {
    summary: 'Classifies dirty files as owned, unowned, or claim-overlapping for swarm-safe closeout.',
    mode: 'read-only',
  },
  'push-check': {
    summary: 'Predicts whether the current branch can push cleanly and separates owned blockers from repo blockers.',
    mode: 'read-only',
  },
  validate: {
    summary: 'Selects the smallest honest validation commands for changed or owned files.',
    mode: 'read-only',
  },
  policy: {
    summary: 'Scans command text, staged diffs, or local files for restricted platform and hard-stop violations.',
    mode: 'read-only',
  },
  deps: {
    summary: 'Checks package and lockfile truth for missing referenced dependencies and package drift.',
    mode: 'read-only',
  },
  continuity: {
    summary: 'Shows canonical surface matches, duplicate risk, and attachment decision from continuity reports.',
    mode: 'read-only',
  },
  evidence: {
    summary: 'Builds a closeout evidence pack. Writes only when --write is passed.',
    mode: 'read-only',
  },
  migrate: {
    summary: 'Migration planner. Lists existing migrations, picks a safe next timestamp, and scans proposed SQL.',
    mode: 'read-only',
  },
  truth: {
    summary: 'Zero hallucination scan for empty catches, no-op handlers, fake money, and optimistic updates without rollback hints.',
    mode: 'read-only',
  },
  money: {
    summary: 'Money and ledger static audit: cents naming, append-only surfaces, hardcoded currency, and known audit commands.',
    mode: 'read-only',
  },
  route: {
    summary: 'Route and action protection scan for admin-only prospecting, auth starts, and tenant scoping hints.',
    mode: 'read-only',
  },
  'ai-gate': {
    summary: 'AI policy verifier for parseWithOllama routing, recipe-generation bans, and fallback-provider drift.',
    mode: 'read-only',
  },
  closeout: {
    summary: 'Agent closeout readiness and guarded owned-file commit/push when explicitly requested.',
    mode: 'read-only unless --commit or --push is passed',
  },
  task: {
    summary: 'Task entry briefing for Codex agents: status, continuity, claims, owned files, risk, and next action.',
    mode: 'read-only',
  },
  risk: {
    summary: 'Severity-ranked policy, truth, route, AI, money, dependency, migration, and ownership risk report.',
    mode: 'read-only',
  },
  review: {
    summary: 'ChefFlow code-review scan for owned files using auth, tenancy, cache, UI truth, money, and admin rules.',
    mode: 'read-only',
  },
  claim: {
    summary: 'Create, release, and inspect Codex agent file claims.',
    mode: 'writes only system/agent-claims on create/release',
  },
  pr: {
    summary: 'Generate PR-ready owned-diff, validation, risk, and commit summary.',
    mode: 'read-only',
  },
  handoff: {
    summary: 'Create a swarm-safe handoff packet for the next Codex agent.',
    mode: 'read-only unless --write is passed',
  },
  stale: {
    summary: 'Find stale claims, reports, captures, and local branches that may need review.',
    mode: 'read-only',
  },
  scope: {
    summary: 'Classify files before editing as safe, conflict, generated, database-risk, server-action-risk, or unknown.',
    mode: 'read-only',
  },
  'undo-plan': {
    summary: 'Generate a non-destructive rollback plan for owned diffs without executing it.',
    mode: 'read-only',
  },
  'test-map': {
    summary: 'Map changed files to the most relevant targeted validation commands.',
    mode: 'read-only',
  },
  'server-action': {
    summary: 'Dedicated audit for use-server auth, tenancy, validation, cache, and export rules.',
    mode: 'read-only',
  },
  'ui-truth': {
    summary: 'Dedicated audit for no-op UI, fake values, optimistic rollback, and disabled-control truth.',
    mode: 'read-only',
  },
  'route-owner': {
    summary: 'Find likely canonical owner, duplicate risk, and recent commits for a route or domain.',
    mode: 'read-only',
  },
  branch: {
    summary: 'Branch drift and upstream doctor for Codex closeout safety.',
    mode: 'read-only',
  },
  push: {
    summary: 'Diagnose failed push output and suggest exact repair commands.',
    mode: 'read-only',
  },
  db: {
    summary: 'Database command center. Read-only checks plus safe script references.',
    mode: 'read-only',
  },
  ledger: {
    summary: 'Ledger command center. Static invariants plus existing reconciliation scripts.',
    mode: 'read-only',
  },
  event: {
    summary: 'Event command center. FSM and packet/reconciliation script references.',
    mode: 'read-only',
  },
  pricing: {
    summary: 'Pricing pipeline command center. Freshness, coverage, and sync script references.',
    mode: 'read-only',
  },
  ai: {
    summary: 'AI command center. Ollama and central gateway checks.',
    mode: 'read-only',
  },
  persona: {
    summary: 'Persona pipeline command center wrapping inbox, validate, synthesize, saturation, and prompt generation.',
    mode: 'read-only',
  },
  agent: {
    summary: 'Agent swarm command center wrapping claims, routing, preflight, and finish tools.',
    mode: 'read-only',
  },
  qa: {
    summary: 'QA command center listing safe targeted validation commands.',
    mode: 'read-only',
  },
  ops: {
    summary: 'Host and runtime ops view for ports, topology, watchdogs, and safe diagnostics.',
    mode: 'read-only',
  },
  docs: {
    summary: 'Documentation hygiene command center for user manual, app audit, and generated reports.',
    mode: 'read-only',
  },
}

export const COMMAND_GROUPS = {
  db: [
    'npm run audit:db:contract:json',
    'npm run audit:db',
    'npm run verify:secrets',
    'npm run db:fk-cache',
  ],
  ledger: [
    'npm run test:unit:financial',
    'node scripts/reconcile-event-financials.mjs',
    'node scripts/event-annual-budget-rollup.mjs',
  ],
  event: [
    'npm run test:unit:fsm',
    'node scripts/create-event-packet.mjs',
    'node scripts/create-event-task-board.mjs',
    'node scripts/reconcile-event-financials.mjs',
  ],
  pricing: [
    'npm run sync:audit',
    'npm run sync:prices',
    'node scripts/validate-price-engine.mjs',
    'node scripts/price-stress-test.mjs',
  ],
  ai: [
    'npm run ollama',
    'npm run qa:remy:delivery',
    'npm run test:remy-quality:hallucination',
  ],
  persona: [
    'npm run personas:inbox',
    'npm run personas:validate',
    'npm run personas:synthesize',
    'npm run personas:saturation',
    'node devtools/persona-codex-prompter.mjs --dry-run',
  ],
  agent: [
    'npm run agent:claim:check',
    'npm run agent:swarm',
    'node devtools/agent-preflight.mjs --prompt "<task>"',
    'node devtools/agent-finish.mjs --record <record> --owned <paths>',
  ],
  qa: [
    'npm run typecheck',
    'npm run test:unit',
    'npm run test:critical',
    'npm run verify:release',
  ],
  ops: [
    'node scripts/audit-runtime-topology.mjs',
    'npm run api:health',
    'npm run mcp:check',
    'node scripts/openclaw-health-check.mjs',
  ],
  docs: [
    'npm run audit:completeness',
    'node scripts/feature-docs-audit.cjs',
    'npm run docs:render:template-pack',
  ],
}
