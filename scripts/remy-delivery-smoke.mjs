#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const checks = [
  {
    name: 'Lint (Remy delivery files)',
    command:
      'npx eslint lib/ai/remy-significant-approval.ts lib/ai/command-orchestrator.ts lib/hooks/use-remy-send.ts components/ai/agent-confirmation-card.tsx components/ai/remy-task-card.tsx components/ai/command-result-card.tsx components/ai/remy-wrapper.tsx components/ai/remy-drawer.tsx "app/(chef)/settings/remy/remy-control-client.tsx"',
  },
  {
    name: 'Unit tests (approval + policy + audit)',
    command:
      'node --test --import tsx tests/unit/remy-significant-approval.test.ts tests/unit/remy-approval-policy-actions.test.ts tests/unit/remy-action-audit-actions.test.ts',
  },
  {
    name: 'Typecheck',
    command: 'npx tsc --noEmit --pretty false -p tsconfig.remy-delivery.json',
  },
]

let failed = false

for (const check of checks) {
  process.stdout.write(`\n[remy-delivery-smoke] ${check.name}\n`)
  const result = spawnSync(check.command, {
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0) {
    failed = true
    process.stdout.write(`[remy-delivery-smoke] FAILED: ${check.name}\n`)
    break
  }
  process.stdout.write(`[remy-delivery-smoke] PASSED: ${check.name}\n`)
}

if (failed) {
  process.exit(1)
}

process.stdout.write('\n[remy-delivery-smoke] All checks passed.\n')
