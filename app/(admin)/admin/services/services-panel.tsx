'use client'

import { useState, useEffect, useCallback } from 'react'

type ServiceState = 'running' | 'stopped' | 'unknown'

interface ServiceInfo {
  name: string
  label: string
  description: string
  essential: boolean
  state: ServiceState
}

function parseStatus(output: string): ServiceInfo[] {
  const services: ServiceInfo[] = [
    {
      name: 'postgres',
      label: 'PostgreSQL',
      description: 'Database (Docker)',
      essential: true,
      state: 'unknown',
    },
    {
      name: 'prod',
      label: 'Production Server',
      description: 'Port 3000',
      essential: true,
      state: 'unknown',
    },
    {
      name: 'dev',
      label: 'Dev Server',
      description: 'Port 3100 (15-20GB RAM)',
      essential: false,
      state: 'unknown',
    },
    {
      name: 'ollama',
      label: 'Ollama',
      description: 'Local AI (Port 11434)',
      essential: false,
      state: 'unknown',
    },
    {
      name: 'openclaw',
      label: 'OpenClaw Engine',
      description: 'Docker container',
      essential: false,
      state: 'unknown',
    },
    {
      name: 'anythingllm',
      label: 'AnythingLLM',
      description: 'Docker container',
      essential: false,
      state: 'unknown',
    },
  ]

  for (const svc of services) {
    if (svc.name === 'postgres') {
      svc.state =
        output.includes('PostgreSQL') && output.includes('running') ? 'running' : 'stopped'
    } else if (svc.name === 'prod') {
      svc.state =
        output.includes('Production server') && output.includes('running') ? 'running' : 'stopped'
    } else if (svc.name === 'dev') {
      svc.state =
        output.includes('Dev server') && output.includes('running') ? 'running' : 'stopped'
    } else if (svc.name === 'ollama') {
      svc.state = output.includes('Ollama') && output.includes('running') ? 'running' : 'stopped'
    } else if (svc.name === 'openclaw') {
      svc.state = output.includes('OpenClaw') && output.includes('running') ? 'running' : 'stopped'
    } else if (svc.name === 'anythingllm') {
      svc.state =
        output.includes('AnythingLLM') && output.includes('running') ? 'running' : 'stopped'
    }
  }

  return services
}

export function ServicesPanel() {
  const [services, setServices] = useState<ServiceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [log, setLog] = useState<string>('')

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/services')
      const data = await res.json()
      setServices(parseStatus(data.output))
      setLog(data.output)
    } catch (err) {
      setLog('Failed to fetch status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function runAction(action: string, service?: string) {
    setActionLoading(service || action)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, service }),
      })
      const data = await res.json()
      setLog(data.output)
      await refresh()
    } catch (err) {
      setLog('Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="text-stone-500 text-sm animate-pulse">Loading service status...</div>
  }

  return (
    <div className="space-y-6">
      {/* Master Controls */}
      <div className="flex gap-3">
        <button
          onClick={() => runAction('up')}
          disabled={actionLoading !== null}
          className="rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 px-6 py-3 text-sm font-bold text-white transition-all"
        >
          {actionLoading === 'up' ? 'Starting...' : 'ON'}
        </button>
        <button
          onClick={() => runAction('down')}
          disabled={actionLoading !== null}
          className="rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 px-6 py-3 text-sm font-bold text-white transition-all"
        >
          {actionLoading === 'down' ? 'Stopping...' : 'OFF'}
        </button>
        <button
          onClick={() => runAction('clean')}
          disabled={actionLoading !== null}
          className="rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-50 px-4 py-3 text-sm font-medium text-stone-300 transition-all"
        >
          {actionLoading === 'clean' ? 'Cleaning...' : 'Clean'}
        </button>
        <button
          onClick={refresh}
          disabled={actionLoading !== null}
          className="rounded-lg border border-stone-600 hover:bg-stone-800 disabled:opacity-50 px-4 py-3 text-sm font-medium text-stone-400 transition-all ml-auto"
        >
          Refresh
        </button>
      </div>

      {/* Service Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <div
            key={svc.name}
            className={`rounded-xl border p-4 ${
              svc.state === 'running'
                ? 'border-green-800 bg-green-950/30'
                : 'border-stone-700 bg-stone-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    svc.state === 'running' ? 'bg-green-500' : 'bg-stone-600'
                  }`}
                />
                <span className="text-sm font-semibold text-stone-200">{svc.label}</span>
              </div>
              {svc.essential && (
                <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">
                  Required
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mb-3">{svc.description}</p>
            <div className="flex gap-2">
              {svc.state === 'running' ? (
                <button
                  onClick={() => runAction('stop', svc.name)}
                  disabled={actionLoading !== null}
                  className="rounded-md bg-red-900 hover:bg-red-800 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-red-200 transition-all"
                >
                  {actionLoading === svc.name ? '...' : 'Stop'}
                </button>
              ) : (
                <button
                  onClick={() => runAction('start', svc.name)}
                  disabled={actionLoading !== null}
                  className="rounded-md bg-green-900 hover:bg-green-800 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-green-200 transition-all"
                >
                  {actionLoading === svc.name ? '...' : 'Start'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Log Output */}
      <div className="rounded-xl border border-stone-700 bg-stone-950 p-4">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
          Output
        </h3>
        <pre className="text-xs text-stone-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
          {log || 'No output yet'}
        </pre>
      </div>
    </div>
  )
}
