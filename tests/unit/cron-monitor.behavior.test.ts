import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const state = vi.hoisted(() => ({
  verifyAuth: vi.fn(), report: vi.fn(), alerts: vi.fn(),
  heartbeat: vi.fn(), error: vi.fn(), summary: vi.fn((value) => value),
}))
vi.mock('@/lib/auth/cron-auth', () => ({ verifyCronAuth: state.verifyAuth }))
vi.mock('@/lib/cron/monitor', () => ({
  buildCronHealthReport: state.report, sendCronHealthAlerts: state.alerts,
  summarizeCronResult: state.summary,
}))
vi.mock('@/lib/cron/heartbeat', () => ({
  recordCronHeartbeat: state.heartbeat, recordCronError: state.error,
}))
import { GET, POST } from '@/app/api/scheduled/monitor/route'

const unhealthy = {
  healthy: false, summary: 'missing heartbeat', staleCrons: [], missingCrons: ['test-job'],
  warningCrons: [], criticalCrons: ['test-job'],
}
beforeEach(() => {
  vi.clearAllMocks()
  state.verifyAuth.mockReturnValue(null)
  state.report.mockResolvedValue(unhealthy)
  state.alerts.mockResolvedValue(undefined)
  state.heartbeat.mockResolvedValue(undefined)
  state.error.mockResolvedValue(undefined)
})
describe('cron monitor HTTP behavior', () => {
  it.each([GET, POST])('returns 503 for strict unhealthy checks without notifications', async handle => {
    const response = await handle(new NextRequest('https://example.test/api/scheduled/monitor?strict=1&notify=0'))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual(unhealthy)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(state.alerts).not.toHaveBeenCalled()
    expect(state.heartbeat).toHaveBeenCalledOnce()
  })
  it('returns 200 when healthy even in strict mode', async () => {
    state.report.mockResolvedValue({ ...unhealthy, healthy: true })
    expect((await GET(new NextRequest('https://example.test/api/scheduled/monitor?strict=1&notify=0'))).status).toBe(200)
  })
  it('preserves non-strict report access and the existing notification behavior', async () => {
    const response = await GET(new NextRequest('https://example.test/api/scheduled/monitor'))
    expect(response.status).toBe(200)
    expect(state.alerts).toHaveBeenCalledWith(unhealthy)
  })
  it('rejects unauthorized requests before any data access', async () => {
    state.verifyAuth.mockReturnValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const response = await GET(new NextRequest('https://example.test/api/scheduled/monitor?strict=1'))
    expect(response.status).toBe(401)
    expect(state.report).not.toHaveBeenCalled()
    expect(state.alerts).not.toHaveBeenCalled()
    expect(state.heartbeat).not.toHaveBeenCalled()
  })
  it('records report failures and returns 500', async () => {
    state.report.mockRejectedValue(new Error('test report failure'))
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const response = await GET(new NextRequest('https://example.test/api/scheduled/monitor?strict=1&notify=0'))
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Monitor report failed' })
      expect(state.error).toHaveBeenCalledWith('monitor', 'test report failure', expect.any(Number))
      expect(state.heartbeat).not.toHaveBeenCalled()
    } finally { errorLog.mockRestore() }
  })
})
