import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { trySurfaceInstantAnswer } from '@/app/api/remy/surface-runtime-utils'

const ROOT = join(__dirname, '..', '..')

function readRepoFile(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('public Remy single provider routing', () => {
  it('keeps all Remy runtime routes off the removed public cloud gateway', () => {
    const files = [
      'lib/ai/parse-ollama.ts',
      'app/api/remy/stream/route.ts',
      'app/api/remy/client/route.ts',
      'app/api/remy/public/route.ts',
      'app/api/remy/landing/route.ts',
    ]

    for (const file of files) {
      const content = readRepoFile(file)

      assert.doesNotMatch(content, new RegExp(['public', 'cloud', 'gateway'].join('-')), file)
      assert.doesNotMatch(content, /GR[O]Q|Gr[o]q|gr[o]q/, file)
    }
  })

  it('routes public and landing Remy through the Ollama-compatible runtime', () => {
    const publicRoute = readRepoFile('app/api/remy/public/route.ts')
    const landingRoute = readRepoFile('app/api/remy/landing/route.ts')

    assert.match(publicRoute, /new Ollama/)
    assert.match(publicRoute, /ollama\.chat/)
    assert.match(landingRoute, /new Ollama/)
    assert.match(landingRoute, /ollama\.chat/)
  })

  it('keeps deterministic instant answers for common public questions', () => {
    const pricing = trySurfaceInstantAnswer('landing', 'How much does ChefFlow cost?')
    assert.ok(pricing)
    assert.match(pricing.text, /starts free/)

    const booking = trySurfaceInstantAnswer('public', 'Can I book this chef?', {
      businessName: 'Harbor Hearth',
    })
    assert.ok(booking)
    assert.match(booking.text, /inquiry form/)
  })
})
