import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  cloneDefaultClientDashboardWidgets,
  getClientDashboardWidgetsFromUnknown,
  sanitizeClientDashboardWidgets,
} from '@/lib/client-dashboard/preferences'

describe('client dashboard preferences', () => {
  it('returns defaults when unknown value is invalid', () => {
    const widgets = getClientDashboardWidgetsFromUnknown(null)
    const defaults = cloneDefaultClientDashboardWidgets()
    assert.deepEqual(widgets, defaults)
  })

  it('dedupes duplicate widgets and preserves first occurrence', () => {
    const widgets = sanitizeClientDashboardWidgets([
      { id: 'messages', enabled: true },
      { id: 'messages', enabled: false },
      { id: 'rewards', enabled: false },
    ])

    const firstMessages = widgets.find((widget) => widget.id === 'messages')
    assert.ok(firstMessages)
    assert.equal(firstMessages.enabled, true)
  })

  it('fills missing widgets with default fallback order', () => {
    const widgets = sanitizeClientDashboardWidgets([{ id: 'book_again', enabled: true }])

    assert.equal(widgets[0].id, 'book_again')
    assert.ok(widgets.length > 1)
    const hasActionRequired = widgets.some((widget) => widget.id === 'action_required')
    assert.equal(hasActionRequired, true)
  })

  it('filters malformed unknown entries and keeps valid rows', () => {
    const widgets = getClientDashboardWidgetsFromUnknown([
      { id: 'messages', enabled: true },
      { id: 'not_real', enabled: true },
      { id: 'quotes', enabled: 'yes' },
    ])

    const message = widgets.find((widget) => widget.id === 'messages')
    assert.ok(message)
    assert.equal(message.enabled, true)
    const notReal = widgets.find((widget) => widget.id === ('not_real' as any))
    assert.equal(notReal, undefined)
  })

  it('revalidates the client dashboard after profile preference saves', () => {
    const actionsSource = readFileSync(
      join(process.cwd(), 'lib/client-dashboard/actions.ts'),
      'utf8'
    )
    const profileFormSource = readFileSync(
      join(process.cwd(), 'app/(client)/my-profile/client-profile-form.tsx'),
      'utf8'
    )

    assert.match(actionsSource, /async function revalidateClientDashboardProfileState\(\)/)
    assert.match(actionsSource, /await requireClient\(\)/)
    assert.match(actionsSource, /revalidatePath\('\/my-events'\)/)
    assert.match(actionsSource, /revalidatePath\('\/my-profile'\)/)
    assert.match(profileFormSource, /await updateMyProfile\(input\)/)
    assert.match(
      profileFormSource,
      /try\s+{\s+await revalidateClientDashboardProfileState\(\)\s+}\s+catch \(cacheErr\)/
    )
  })

  it('scopes dashboard preference persistence by client and tenant', () => {
    const actionsSource = readFileSync(
      join(process.cwd(), 'lib/client-dashboard/actions.ts'),
      'utf8'
    )

    const clientScopedQueries = actionsSource.match(/\.eq\('client_id', user\.entityId\)/g) ?? []
    const tenantScopedQueries = actionsSource.match(/\.eq\('tenant_id', user\.tenantId!\)/g) ?? []

    assert.ok(clientScopedQueries.length >= 3)
    assert.ok(tenantScopedQueries.length >= clientScopedQueries.length)
  })
})
