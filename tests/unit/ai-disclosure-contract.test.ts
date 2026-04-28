import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BYOAI_BROWSER_EXPLAINED,
  BYOAI_BROWSER_ONELINER,
  BYOAI_BROWSER_SPEED,
  BYOAI_LOCAL_EXPLAINED,
  BYOAI_LOCAL_ONELINER,
  BYOAI_LOCAL_SPEED,
  getPrivacyExplained,
  getPrivacyOneliner,
  PRIVATE_AI_EXPLAINED,
  PRIVACY_ONELINER,
  REMY_BYOAI_SELF_KNOWLEDGE,
} from '../../lib/ai/privacy-narrative'

const ROOT = join(__dirname, '..', '..')
const disclosureSources = [
  readFileSync(join(ROOT, 'lib', 'ai', 'privacy-narrative.ts'), 'utf-8'),
  readFileSync(join(ROOT, 'lib', 'ai', 'scheduled', 'jobs.ts'), 'utf-8'),
].join('\n')

const forbiddenDisclosurePatterns = [
  /start\s+Ollama/i,
  /Requires\s+Ollama/i,
  /browser[-\s]?only/i,
  /local[-\s]?only/i,
  /data\s+never\s+leaves\s+(this\s+device|your\s+machine|your\s+network)/i,
  /nothing\s+leaves\s+your\s+machine/i,
  /running\s+(entirely\s+)?(in\s+your\s+browser|on\s+your\s+machine)/i,
  /local\s+machine/i,
]

test('AI disclosure copy does not expose development runtime instructions or local-only claims', () => {
  for (const pattern of forbiddenDisclosurePatterns) {
    assert.doesNotMatch(disclosureSources, pattern)
  }
})

test('legacy privacy provider labels resolve to the ChefFlow runtime narrative', () => {
  assert.equal(BYOAI_BROWSER_ONELINER, PRIVACY_ONELINER)
  assert.equal(BYOAI_LOCAL_ONELINER, PRIVACY_ONELINER)
  assert.equal(BYOAI_BROWSER_EXPLAINED, PRIVATE_AI_EXPLAINED)
  assert.equal(BYOAI_LOCAL_EXPLAINED, PRIVATE_AI_EXPLAINED)
  assert.equal(getPrivacyOneliner('chrome_ai'), PRIVACY_ONELINER)
  assert.equal(getPrivacyOneliner('webllm'), PRIVACY_ONELINER)
  assert.equal(getPrivacyOneliner('ollama'), PRIVACY_ONELINER)
  assert.equal(getPrivacyExplained('chrome_ai'), PRIVATE_AI_EXPLAINED)
  assert.equal(getPrivacyExplained('webllm'), PRIVATE_AI_EXPLAINED)
  assert.equal(getPrivacyExplained('ollama'), PRIVATE_AI_EXPLAINED)
})

test('legacy Remy self-knowledge names the ChefFlow runtime without fallback claims', () => {
  assert.match(REMY_BYOAI_SELF_KNOWLEDGE, /ChefFlow's own private AI/)
  assert.match(REMY_BYOAI_SELF_KNOWLEDGE, /not on third-party services/)
  assert.doesNotMatch(REMY_BYOAI_SELF_KNOWLEDGE, /OpenAI\/Google\/Anthropic fallback/i)
  assert.equal(BYOAI_BROWSER_SPEED, 'Private AI. Your data stays yours.')
  assert.equal(BYOAI_LOCAL_SPEED, 'Private AI. Your data stays yours.')
})
