import assert from 'node:assert/strict'
import test from 'node:test'
import {
  auditCulinaryLanguage,
  getDictionarySearchHref,
} from '@/lib/culinary-dictionary/language-auditor'
import type { CulinaryDictionaryTerm } from '@/lib/culinary-dictionary/types'

const dictionaryTerms: CulinaryDictionaryTerm[] = [
  makeTerm('texture-crispy', 'Crispy', 'texture', ['crisp']),
  makeTerm('flavor-smoky', 'Smoky', 'flavor', ['smoked']),
  makeTerm('temperature-chilled', 'Chilled', 'service', ['cold']),
  makeTerm('cut-brunoise', 'Brunoise', 'cut'),
  makeTerm('technique-confit', 'Confit', 'technique'),
]

test('flags repeated adjectives and vague menu words without drafting replacement copy', () => {
  const result = auditCulinaryLanguage({
    text: 'Fresh market salad with fresh herbs and delicious smoky dressing served chilled.',
    dictionaryTerms,
    surface: 'menu',
  })

  assert.equal(result.surface, 'menu')
  assert.ok(result.findings.some((finding) => finding.type === 'repeated_adjective'))
  assert.ok(
    result.findings.some(
      (finding) => finding.type === 'vague_word' && finding.evidence === 'delicious',
    ),
  )
  assert.ok(result.findings.every((finding) => !finding.hint.includes('try saying')))
  assert.ok(result.matchedTerms.some((term) => term.canonicalName === 'Smoky'))
  assert.ok(result.matchedTerms.some((term) => term.canonicalName === 'Chilled'))
})

test('flags unresolved culinary vocabulary with dictionary search hrefs', () => {
  const result = auditCulinaryLanguage({
    text: 'Crispy "kimchi aioli" with smoky potatoes served warm.',
    dictionaryTerms,
  })

  const unresolved = result.findings.filter((finding) => finding.type === 'unresolved_term')
  assert.ok(unresolved.some((finding) => finding.evidence === 'kimchi aioli'))
  assert.ok(unresolved.some((finding) => finding.evidence === 'kimchi'))
  assert.ok(
    unresolved.every((finding) => finding.href?.startsWith('/culinary/dictionary?q=')),
  )
})

test('reports missing texture, flavor, and temperature signals independently', () => {
  const result = auditCulinaryLanguage({
    text: 'Local vegetable plate.',
    dictionaryTerms,
    requiredSignals: ['texture', 'flavor', 'temperature'],
  })

  assert.deepEqual(
    result.findings
      .filter((finding) => finding.type === 'missing_signal')
      .map((finding) => finding.termType)
      .sort(),
    ['flavor', 'temperature', 'texture'],
  )
})

test('does not report missing signals when controlled vocabulary covers them', () => {
  const result = auditCulinaryLanguage({
    text: 'Crispy smoky vegetables served cold.',
    dictionaryTerms,
  })

  assert.equal(
    result.findings.some((finding) => finding.type === 'missing_signal'),
    false,
  )
})

test('flags staff prep ambiguity only on staff prep surfaces', () => {
  const text = 'Prep vegetables as needed, cut herbs, and cook until done.'
  const menuResult = auditCulinaryLanguage({
    text,
    dictionaryTerms,
    surface: 'menu',
  })
  const staffResult = auditCulinaryLanguage({
    text,
    dictionaryTerms,
    surface: 'staff_prep',
  })

  assert.equal(
    menuResult.findings.some((finding) => finding.type === 'staff_prep_ambiguity'),
    false,
  )
  assert.ok(
    staffResult.findings.some(
      (finding) =>
        finding.type === 'staff_prep_ambiguity' && finding.evidence === 'open quantity',
    ),
  )
  assert.ok(
    staffResult.findings.some(
      (finding) =>
        finding.type === 'staff_prep_ambiguity' && finding.evidence === 'unclear doneness',
    ),
  )
})

test('dictionary search hrefs are deterministic and encoded', () => {
  assert.equal(getDictionarySearchHref('kimchi aioli'), '/culinary/dictionary?q=kimchi%20aioli')
})

function makeTerm(
  id: string,
  canonicalName: string,
  termType: CulinaryDictionaryTerm['termType'],
  aliases: string[] = [],
): CulinaryDictionaryTerm {
  return {
    id,
    canonicalSlug: canonicalName.toLowerCase().replace(/\s+/g, '-'),
    canonicalName,
    termType,
    category: null,
    shortDefinition: null,
    longDefinition: null,
    publicSafe: true,
    source: 'system',
    confidence: 1,
    needsReview: false,
    aliases: aliases.map((alias, index) => ({
      id: `${id}-alias-${index}`,
      termId: id,
      alias,
      normalizedAlias: alias.toLowerCase(),
      aliasKind: 'synonym',
      confidence: 1,
      source: 'system',
      needsReview: false,
    })),
    safetyFlags: [],
  }
}
