import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync('app/(chef)/culinary/dictionary/page.tsx', 'utf8')
const commandCenterSource = readFileSync(
  'components/culinary-dictionary/dictionary-command-center.tsx',
  'utf8'
)
const auditorSource = readFileSync(
  'components/culinary-dictionary/language-auditor-panel.tsx',
  'utf8'
)
const sidePanelSource = readFileSync(
  'components/culinary-dictionary/dictionary-side-panel.tsx',
  'utf8'
)
const outcomesSource = readFileSync(
  'components/culinary-dictionary/dictionary-outcomes-workbench.tsx',
  'utf8'
)
const operationsSource = readFileSync(
  'components/culinary-dictionary/dictionary-operations-panel.tsx',
  'utf8'
)

test('chef dictionary page exposes operational command surfaces', () => {
  assert.match(pageSource, /DictionaryCommandCenter/)
  assert.match(pageSource, /DictionaryOutcomesWorkbench/)
  assert.match(pageSource, /DictionaryOperationsPanel/)
  assert.match(pageSource, /LanguageAuditorPanel/)
  assert.match(pageSource, /DictionarySidePanel/)
  assert.match(pageSource, /selectedTermParam/)
  assert.match(pageSource, /createDictionarySearchReviewCandidateForm/)
})

test('command center uses deterministic intelligence and standards modules', () => {
  assert.match(commandCenterSource, /summarizeDictionaryCoverage/)
  assert.match(commandCenterSource, /detectAliasConflicts/)
  assert.match(commandCenterSource, /buildRelatedTermsGraph/)
  assert.match(commandCenterSource, /buildChefVocabularyStandards/)
})

test('language auditor is explicit that it does not generate copy', () => {
  assert.match(auditorSource, /does not\s+generate copy/)
  assert.match(auditorSource, /auditCulinaryLanguage/)
  assert.match(auditorSource, /staff_prep/)
})

test('side panel shows term impact and publication gate', () => {
  assert.match(sidePanelSource, /getDictionaryTermImpact/)
  assert.match(sidePanelSource, /evaluateVocabularyPublicationGate/)
  assert.match(sidePanelSource, /Publication gate/)
})

test('outcomes workbench connects dictionary terms to publish and prep outcomes', () => {
  assert.match(outcomesSource, /analyzeDictionaryTextSurface/)
  assert.match(outcomesSource, /buildMenuPublishPreflight/)
  assert.match(outcomesSource, /guardPublicInternalLanguage/)
  assert.match(outcomesSource, /buildPrepSpecificityChecklist/)
  assert.match(outcomesSource, /does not generate recipes/)
})

test('operations panel exposes safety, batch review, conflict, and history surfaces', () => {
  assert.match(operationsSource, /buildDictionarySurfaceImpactDrilldown/)
  assert.match(operationsSource, /buildSafetyCoverageBoard/)
  assert.match(operationsSource, /buildBatchReviewGroups/)
  assert.match(operationsSource, /buildAliasConflictResolutionOptions/)
  assert.match(operationsSource, /buildTermHistoryTimeline/)
})
