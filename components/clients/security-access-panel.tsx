'use client'

import { useState } from 'react'
import { updateClient } from '@/lib/clients/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type Props = {
  clientId: string
  gateCode: string | null
  wifiPassword: string | null
  securityNotes: string | null
  parkingInstructions: string | null
  accessInstructions: string | null
  houseRules: string | null
}

export function SecurityAccessPanel({ clientId, ...initial }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showSensitive, setShowSensitive] = useState(false)
  const [gateCode, setGateCode] = useState(initial.gateCode || '')
  const [wifiPassword, setWifiPassword] = useState(initial.wifiPassword || '')
  const [securityNotes, setSecurityNotes] = useState(initial.securityNotes || '')
  const [parking, setParking] = useState(initial.parkingInstructions || '')
  const [access, setAccess] = useState(initial.accessInstructions || '')
  const [houseRules, setHouseRules] = useState(initial.houseRules || '')

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await updateClient(clientId, {
        gate_code: gateCode || undefined,
        wifi_password: wifiPassword || undefined,
        security_notes: securityNotes || undefined,
        parking_instructions: parking || undefined,
        access_instructions: access || undefined,
        house_rules: houseRules || undefined,
      })
      setEditing(false)
    } catch (err) {
      console.error('Failed to update security/access:', err)
      setSaveError('Could not save security & access details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const hasData = gateCode || wifiPassword || securityNotes || parking || access || houseRules
  const mask = (val: string) => (showSensitive ? val : '••••••')

  if (!editing) {
    return (
      <div className="rounded-lg border border-stone-700 overflow-hidden">
        <div className="px-4 py-3 bg-stone-800 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-stone-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h3 className="font-medium text-stone-200">Security & Access</h3>
            <span className="text-xxs px-1.5 py-0.5 rounded-full bg-amber-900 text-amber-700 font-medium">
              Sensitive
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasData && (
              <button
                type="button"
                onClick={() => setShowSensitive(!showSensitive)}
                className="text-xs text-stone-500 hover:text-stone-300"
              >
                {showSensitive ? 'Hide' : 'Show'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-brand-500 hover:text-brand-600"
            >
              Edit
            </button>
          </div>
        </div>
        {hasData ? (
          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {gateCode && (
              <>
                <span className="text-stone-500">Gate Code</span>
                <span className="text-stone-200 font-mono">{mask(gateCode)}</span>
              </>
            )}
            {wifiPassword && (
              <>
                <span className="text-stone-500">WiFi Password</span>
                <span className="text-stone-200 font-mono">{mask(wifiPassword)}</span>
              </>
            )}
            {securityNotes && (
              <>
                <span className="text-stone-500">Security</span>
                <span className="text-stone-200">{securityNotes}</span>
              </>
            )}
            {parking && (
              <>
                <span className="text-stone-500">Parking</span>
                <span className="text-stone-200">{parking}</span>
              </>
            )}
            {access && (
              <>
                <span className="text-stone-500">Access</span>
                <span className="text-stone-200">{access}</span>
              </>
            )}
            {houseRules && (
              <>
                <span className="text-stone-500">House Rules</span>
                <span className="text-stone-200">{houseRules}</span>
              </>
            )}
          </div>
        ) : (
          <div className="px-4 py-4 text-center text-stone-400 text-sm">
            No access information recorded
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-brand-700 overflow-hidden">
      <div className="px-4 py-3 bg-brand-950 border-b border-brand-700">
        <h3 className="font-medium text-stone-200">Security & Access</h3>
      </div>
      <div className="p-4 space-y-4">
        {saveError && (
          <div
            className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {saveError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Gate Code"
            value={gateCode}
            onChange={(e) => setGateCode(e.target.value)}
            placeholder="Gate or entry code"
          />
          <Input
            label="WiFi Password"
            value={wifiPassword}
            onChange={(e) => setWifiPassword(e.target.value)}
            placeholder="For timers, recipes, music"
          />
        </div>
        <Textarea
          label="Security Notes"
          value={securityNotes}
          onChange={(e) => setSecurityNotes(e.target.value)}
          placeholder="Alarm system, cameras, doorman"
        />
        <Textarea
          label="Parking Instructions"
          value={parking}
          onChange={(e) => setParking(e.target.value)}
          placeholder="Where to park"
        />
        <Textarea
          label="Access Instructions"
          value={access}
          onChange={(e) => setAccess(e.target.value)}
          placeholder="Which door, doorbell, etc."
        />
        <Textarea
          label="House Rules"
          value={houseRules}
          onChange={(e) => setHouseRules(e.target.value)}
          placeholder="Shoes off, noise level, etc."
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} loading={saving}>
            Save
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSaveError(null)
              setEditing(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
