'use client'

import { useState } from 'react'

export default function DemoControlPanel() {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSwitch(target: 'chef' | 'client') {
    setLoading(`switch-${target}`)
    setMessage(null)
    try {
      const res = await fetch('/api/demo/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      // Redirect to the appropriate portal
      window.location.href = target === 'chef' ? '/dashboard' : '/my-events'
    } catch (err: unknown) {
      setMessage(`Failed to switch: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoading(null)
    }
  }

  async function handleTier(tier: 'pro' | 'free') {
    setLoading(`tier-${tier}`)
    setMessage(null)
    try {
      const res = await fetch('/api/demo/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMessage(`Switched to ${tier.toUpperCase()} tier`)
    } catch (err: unknown) {
      setMessage(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(null)
    }
  }

  async function handleData(action: 'load' | 'clear') {
    setLoading(`data-${action}`)
    setMessage(null)
    try {
      const res = await fetch('/api/demo/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      setMessage(result.message)
    } catch (err: unknown) {
      setMessage(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1c1917', margin: '0 0 8px' }}>
          ChefFlow Demo Control Panel
        </h1>
        <p style={{ color: '#78716c', fontSize: 14, margin: 0 }}>
          Switch accounts, manage demo data, toggle tiers
        </p>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 24,
            borderRadius: 8,
            background: message.startsWith('Failed') ? '#fef2f2' : '#f0fdf4',
            color: message.startsWith('Failed') ? '#991b1b' : '#166534',
            fontSize: 14,
            border: `1px solid ${message.startsWith('Failed') ? '#fecaca' : '#bbf7d0'}`,
          }}
        >
          {message}
        </div>
      )}

      {/* Demo Accounts */}
      <Section title="Demo Accounts" subtitle="Log in as a demo user to explore the portal">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ActionButton
            label="Log in as Demo Chef"
            sublabel="demo@chefflow.test → /dashboard"
            onClick={() => handleSwitch('chef')}
            loading={loading === 'switch-chef'}
            color="#c76f30"
          />
          <ActionButton
            label="Log in as Demo Client"
            sublabel="demo-client@chefflow.test → /my-events"
            onClick={() => handleSwitch('client')}
            loading={loading === 'switch-client'}
            color="#2563eb"
          />
        </div>
        <a
          href="/chef/chef-demo-showcase"
          target="_blank"
          rel="noopener"
          style={{
            display: 'block',
            marginTop: 12,
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid #d6d3d1',
            textDecoration: 'none',
            color: '#44403c',
            fontSize: 14,
            textAlign: 'center',
            background: '#fff',
          }}
        >
          View Public Profile → /chef/chef-demo-showcase
        </a>
      </Section>

      {/* Data State */}
      <Section title="Demo Data" subtitle="Load or clear sample data for the demo tenant">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ActionButton
            label="Load Demo Data"
            sublabel="10 clients, 18 events, menus, recipes, financials"
            onClick={() => handleData('load')}
            loading={loading === 'data-load'}
            color="#16a34a"
          />
          <ActionButton
            label="Clear All Data"
            sublabel="Remove all demo data (preserves accounts)"
            onClick={() => handleData('clear')}
            loading={loading === 'data-clear'}
            color="#dc2626"
          />
        </div>
      </Section>

      {/* Tier Toggle */}
      <Section
        title="Subscription Tier"
        subtitle="Switch between Pro and Free to demo both experiences"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ActionButton
            label="Pro Mode"
            sublabel="All features unlocked"
            onClick={() => handleTier('pro')}
            loading={loading === 'tier-pro'}
            color="#7c3aed"
          />
          <ActionButton
            label="Free Mode"
            sublabel="Basic features only, upgrade prompts visible"
            onClick={() => handleTier('free')}
            loading={loading === 'tier-free'}
            color="#78716c"
          />
        </div>
      </Section>

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: '#a8a29e' }}>
        This page is only visible when DEMO_MODE_ENABLED=true
      </div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        marginBottom: 24,
        padding: 24,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e7e5e4',
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1c1917', margin: '0 0 4px' }}>
        {title}
      </h2>
      <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 16px' }}>{subtitle}</p>
      {children}
    </div>
  )
}

function ActionButton({
  label,
  sublabel,
  onClick,
  loading,
  color,
}: {
  label: string
  sublabel: string
  onClick: () => void
  loading: boolean
  color: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '14px 16px',
        borderRadius: 8,
        border: 'none',
        background: loading ? '#d6d3d1' : color,
        color: '#fff',
        cursor: loading ? 'wait' : 'pointer',
        textAlign: 'left',
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>{loading ? 'Working...' : label}</div>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>{sublabel}</div>
    </button>
  )
}
