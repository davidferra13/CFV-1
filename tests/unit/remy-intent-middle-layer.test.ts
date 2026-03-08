import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { trySimilarityClassify } from '../../lib/ai/remy-intent-middle-layer'

describe('Remy intent middle layer', () => {
  it('classifies ambiguous action requests as commands without Ollama', () => {
    const result = trySimilarityClassify("Need Sarah's allergies before I finalize the menu")
    assert.ok(result)
    assert.equal(result?.intent, 'command')
    assert.ok((result?.confidence ?? 0) >= 0.58)
  })

  it('classifies ambiguous advisory requests as questions', () => {
    const result = trySimilarityClassify('Thoughts on pricing a 20 person brunch this spring?')
    assert.ok(result)
    assert.equal(result?.intent, 'question')
  })

  it('splits mixed requests into question and command parts', () => {
    const result = trySimilarityClassify(
      "What's my revenue this month and draft a follow-up for Sarah"
    )
    assert.ok(result)
    assert.equal(result?.intent, 'mixed')
    assert.match(result?.questionPart ?? '', /revenue/i)
    assert.match(result?.commandPart ?? '', /draft/i)
  })

  it('returns null when the message is too short to classify safely', () => {
    const result = trySimilarityClassify('maybe later')
    assert.equal(result, null)
  })
})
