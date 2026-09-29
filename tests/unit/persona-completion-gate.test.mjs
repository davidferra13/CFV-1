// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildInteractionSet,
  classifyChangedFiles,
  selectReports,
} from '../../devtools/persona-completion-gate.mjs';

test('classifies product changes into persona categories and roles', () => {
  const result = classifyChangedFiles([
    'lib/dietary/allergen-check.ts',
    'components/messages/client-thread.tsx',
    'docs/specs/persona.md',
  ]);

  assert.deepEqual(result.relevantFiles, [
    'lib/dietary/allergen-check.ts',
    'components/messages/client-thread.tsx',
  ]);
  assert.ok(result.categories.includes('dietary-medical'));
  assert.ok(result.categories.includes('communication'));
  assert.ok(result.roles.includes('Chef'));
  assert.ok(result.roles.includes('Client'));
  assert.ok(result.roles.includes('Guest'));
  assert.ok(result.roles.includes('Staff'));
});

test('unknown product surfaces still receive general workflow coverage', () => {
  const result = classifyChangedFiles(['lib/new-domain/engine.ts']);
  assert.deepEqual(result.categories, ['general-workflow']);
  assert.deepEqual(result.roles, ['Chef', 'Client']);
});

test('internal tooling changes do not trigger end-user persona execution', () => {
  const result = classifyChangedFiles([
    'scripts/regression-firewall.mjs',
    'devtools/persona-completion-gate.mjs',
    'tests/unit/persona-completion-gate.test.mjs',
  ]);
  assert.deepEqual(result.relevantFiles, []);
  assert.deepEqual(result.categories, []);
});

test('selects a small category-matched and role-diverse persona set', () => {
  const reports = [
    { slug: 'chef-a', type: 'Chef', score: 70, categories: ['dietary-medical'], partial: false },
    { slug: 'guest-a', type: 'Guest', score: 65, categories: ['dietary-medical'], partial: false },
    { slug: 'client-a', type: 'Client', score: 80, categories: ['communication'], partial: false },
    { slug: 'chef-b', type: 'Chef', score: 90, categories: ['communication'], partial: false },
  ];

  const selected = selectReports(
    reports,
    ['dietary-medical', 'communication'],
    ['Chef', 'Client', 'Guest'],
    3,
  );

  assert.equal(selected.length, 3);
  assert.ok(selected.some((item) => item.categories.includes('dietary-medical')));
  assert.ok(selected.some((item) => item.categories.includes('communication')));
  assert.ok(new Set(selected.map((item) => item.type)).size >= 2);
});

test('builds pair and triad interaction coverage from three selected personas', () => {
  const selected = [
    { slug: 'chef-a', type: 'Chef' },
    { slug: 'client-a', type: 'Client' },
    { slug: 'guest-a', type: 'Guest' },
  ];

  const interactions = buildInteractionSet(selected);
  assert.equal(interactions.filter((item) => item.status === 'selected-pair').length, 3);
  assert.equal(interactions.filter((item) => item.status === 'selected-triad').length, 1);
});
