import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CHEF_SHELL_LOCAL_STORAGE_KEYS,
  readChefShellPresentationState,
  resetChefShellLocalState,
} from '@/lib/chef/shell-state'
import { DEFAULT_PALETTE_ID, PALETTE_STORAGE_KEY } from '@/lib/themes/color-palettes'

class MemoryStorage {
  private readonly data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null
  }

  setItem(key: string, value: string) {
    this.data.set(key, value)
  }

  removeItem(key: string) {
    this.data.delete(key)
  }
}

describe('chef shell local state', () => {
  it('clears only shell-local presentation keys', () => {
    const storage = new MemoryStorage()
    for (const key of CHEF_SHELL_LOCAL_STORAGE_KEYS) {
      storage.setItem(key, `value-for-${key}`)
    }
    storage.setItem('cf:recent-pages', 'keep-history')
    storage.setItem('chef-mobile-tab-hrefs', 'keep-server-backed-prefs')

    resetChefShellLocalState(storage)

    for (const key of CHEF_SHELL_LOCAL_STORAGE_KEYS) {
      assert.equal(storage.getItem(key), null, `${key} should be cleared`)
    }
    assert.equal(storage.getItem('cf:recent-pages'), 'keep-history')
    assert.equal(storage.getItem('chef-mobile-tab-hrefs'), 'keep-server-backed-prefs')
  })

  it('reports default diagnostics when local storage is empty', () => {
    const storage = new MemoryStorage()

    assert.deepEqual(readChefShellPresentationState(storage), {
      sidebarCollapsed: false,
      paletteId: DEFAULT_PALETTE_ID,
      recentPagesCollapsed: false,
      allFeaturesCollapsed: true,
    })
  })

  it('reads stored sidebar, palette, and nav section state', () => {
    const storage = new MemoryStorage()
    storage.setItem('chef-sidebar-collapsed', 'true')
    storage.setItem(PALETTE_STORAGE_KEY, 'plum')
    storage.setItem('cf:recent-collapsed', 'true')
    storage.setItem('chef-all-features-collapsed', 'false')

    assert.deepEqual(readChefShellPresentationState(storage), {
      sidebarCollapsed: true,
      paletteId: 'plum',
      recentPagesCollapsed: true,
      allFeaturesCollapsed: false,
    })
  })
})
