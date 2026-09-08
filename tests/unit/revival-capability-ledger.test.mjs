import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildLedger,
  classifyTrackedFiles,
  renderMarkdown,
  stableJson,
} from '../../scripts/revival/build-capability-ledger.mjs'

test('classifies tracked files as candidate evidence without claiming they work', () => {
  const capabilities = classifyTrackedFiles([
    'app/inquiries/page.tsx',
    'lib/stripe/payment.ts',
    'docs/menu-costing.md',
  ])
  assert.equal(capabilities.find((item) => item.id === 'inquiry-intake').evidence_state, 'candidate-evidence')
  assert.equal(capabilities.find((item) => item.id === 'payment-ledger').matched_file_count, 1)
  assert.equal(capabilities.find((item) => item.id === 'schedule-travel').evidence_state, 'no-tracked-evidence')
})

test('keeps projects with unknown paths visibly unresolved', () => {
  const ledger = buildLedger({
    schema_version: 1,
    decision_id: 'test-decision',
    projects: [
      {
        id: 'platform',
        name: 'Platform',
        role: 'canonical-platform',
        path_status: 'role-defined-path-unresolved',
        integration_rule: 'Own the platform.',
        scan_path: null,
      },
    ],
  })
  assert.equal(ledger.projects[0].inspection_state, 'unresolved')
  assert.equal(ledger.projects[0].capabilities[0].evidence_state, 'unresolved')
})

test('rejects duplicate product identities', () => {
  assert.throws(() => buildLedger({
    schema_version: 1,
    decision_id: 'test-decision',
    projects: [
      { id: 'chef-flow', name: 'ChefFlow', role: 'canonical-platform', path_status: 'role-defined-path-unresolved', integration_rule: 'Own it.', scan_path: null },
      { id: 'chef-flow', name: 'Another ChefFlow', role: 'platform', path_status: 'role-defined-path-unresolved', integration_rule: 'Duplicate it.', scan_path: null },
    ],
  }), /unique/)
})

test('renders deterministic JSON and Markdown', () => {
  const ledger = buildLedger({
    schema_version: 1,
    decision_id: 'test-decision',
    projects: [{ id: 'collect', name: 'Chef Collect', role: 'canonical-platform', path_status: 'role-defined-path-unresolved', integration_rule: 'Test.', scan_path: null }],
  })
  assert.equal(stableJson(ledger), stableJson(ledger))
  assert.equal(renderMarkdown(ledger), renderMarkdown(ledger))
  assert.match(renderMarkdown(ledger), /candidate evidence/i)
})
