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

test('chef dictionary page exposes operational command surfaces', () => {
  assert.match(pageSource, /DictionaryCommandCenter/)
  assert.match(pageSource, /LanguageAuditorPanel/)
  assert.match(pageSource, /DictionarySidePanel/)
  assert.match(pageSource, /selectedTermParam/)
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
