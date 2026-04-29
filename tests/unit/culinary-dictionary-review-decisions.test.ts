import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionSource = readFileSync('lib/culinary-dictionary/actions.ts', 'utf8')
const componentSource = readFileSync(
  'components/culinary-dictionary/dictionary-review-queue.tsx',
  'utf8'
)

test('review decision form action remains usable directly by server forms', () => {
  assert.match(
    actionSource,
    /export async function resolveDictionaryReviewItemForm\(formData: FormData\): Promise<void>/
  )
  assert.match(componentSource, /action=\{resolveDictionaryReviewItemForm\}/)
})

test('review decisions preserve existing statuses and record explicit resolution actions', () => {
  assert.match(actionSource, /decision: z\.enum\(\['approved', 'rejected', 'dismissed'\]\)/)
  assert.match(
    actionSource,
    /'approve_new_private_term', 'add_alias_to_existing_term', 'reject', 'dismiss'/
  )
  assert.match(actionSource, /status =[\s\S]*'rejected'[\s\S]*'dismissed'[\s\S]*'approved'/)
  assert.match(actionSource, /resolution = \{[\s\S]*action: resolutionAction/)
  assert.match(actionSource, /resolution,/)
})

test('review resolution reads and writes only chef-owned pending queue items', () => {
  assert.match(actionSource, /\.eq\('id', parsed\.data\.reviewId\)/)
  assert.match(actionSource, /\.eq\('chef_id', user\.entityId\)/)
  assert.match(actionSource, /reviewItem\.status !== 'pending'/)
  assert.match(actionSource, /\.eq\('status', 'pending'\)/)
})

test('new private term approval uses review JSON without schema changes', () => {
  assert.match(componentSource, /value="approve_new_private_term"/)
  assert.match(componentSource, /name="canonicalName"/)
  assert.match(componentSource, /name="termType"/)
  assert.match(actionSource, /suggestedTermId = null/)
  assert.match(actionSource, /canonicalSlug = slugifyCulinaryTerm\(canonicalName\)/)
  assert.match(actionSource, /termType/)
})

test('alias approval is available only when a suggested term is present', () => {
  assert.match(componentSource, /\{item\.suggestedTermId && \(/)
  assert.match(componentSource, /value="add_alias_to_existing_term"/)
  assert.match(componentSource, /name="alias"/)
  assert.match(componentSource, /name="aliasKind"/)
  assert.match(
    actionSource,
    /if \(!termId\) return \{ success: false, error: 'Suggested term is required for alias approval' \}/
  )
  assert.match(actionSource, /suggestedTermId = termId/)
  assert.match(actionSource, /normalizedAlias = normalizeDictionaryAlias\(alias\)/)
})

test('reject and dismiss remain functional decisions', () => {
  assert.match(componentSource, /value=\{decision === 'rejected' \? 'reject' : 'dismiss'\}/)
  assert.match(componentSource, /variant=\{decision === 'rejected' \? 'danger' : 'ghost'\}/)
  assert.match(
    actionSource,
    /reason: resolutionAction === 'reject' \? 'Rejected by chef' : 'Dismissed by chef'/
  )
})
