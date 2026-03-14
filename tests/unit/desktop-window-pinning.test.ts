import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DESKTOP_WINDOW_PIN_STORAGE_KEY,
  parseWindowPinPreference,
  readWindowPinPreference,
  writeWindowPinPreference,
} from '@/lib/desktop/window-pinning'

describe('desktop window pinning preferences', () => {
  it('parses persisted enabled states', () => {
    assert.equal(parseWindowPinPreference('1'), true)
    assert.equal(parseWindowPinPreference('true'), true)
  })

  it('parses persisted disabled states', () => {
    assert.equal(parseWindowPinPreference('0'), false)
    assert.equal(parseWindowPinPreference('false'), false)
  })

  it('returns null for missing or malformed values', () => {
    assert.equal(parseWindowPinPreference(null), null)
    assert.equal(parseWindowPinPreference('yes'), null)
  })

  it('reads and writes the storage key consistently', () => {
    const storage = new Map<string, string>()

    writeWindowPinPreference(
      {
        setItem(key, value) {
          storage.set(key, value)
        },
      },
      true
    )

    assert.equal(storage.get(DESKTOP_WINDOW_PIN_STORAGE_KEY), '1')
    assert.equal(
      readWindowPinPreference({
        getItem(key) {
          return storage.get(key) ?? null
        },
      }),
      true
    )
  })
})
