'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Info, Users2 } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { updateMyPassport, type ClientPassport } from '@/lib/passport/client-passport-actions'

const COMMUNICATION_MODES = [
  { value: 'direct', label: 'Direct', desc: 'Chef contacts you directly' },
  {
    value: 'delegate_preferred',
    label: 'Delegate Preferred',
    desc: 'Chef contacts your delegate first',
  },
  {
    value: 'delegate_only',
    label: 'Delegate Only',
    desc: 'All communication through your delegate',
  },
]

const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'Text/SMS' },
  { value: 'phone', label: 'Phone' },
  { value: 'circle', label: 'Circle Chat' },
]

const AUTONOMY_LEVELS = [
  { value: 'full', label: 'Full', desc: 'Chef makes all decisions, no approval needed' },
  { value: 'high', label: 'High', desc: 'Chef decides most things, checks on big changes' },
  { value: 'moderate', label: 'Moderate', desc: 'Chef proposes, you approve' },
  { value: 'low', label: 'Low', desc: 'You decide everything, chef executes' },
]

const SERVICE_STYLES = [
  { value: '', label: 'No preference' },
  { value: 'formal_plated', label: 'Formal Plated' },
  { value: 'family_style', label: 'Family Style' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'tasting_menu', label: 'Tasting Menu' },
]

export function PassportClient({ initialPassport }: { initialPassport: ClientPassport }) {
  const [passport, setPassport] = useState(initialPassport)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function update(field: keyof ClientPassport, value: any) {
    setPassport((p) => ({ ...p, [field]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateMyPassport(passport)
        toast.success('Passport saved')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to save')
      }
    })
  }

  const showDelegate = passport.communicationMode !== 'direct'

  return (
    <div className="space-y-6">
      <Alert variant="info" className="flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          These settings tell your chef how you like to work together. Changes apply to all future
          interactions.
        </span>
      </Alert>

      {/* Communication Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {COMMUNICATION_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => update('communicationMode', mode.value)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                passport.communicationMode === mode.value
                  ? 'border-brand-600 bg-brand-950/30'
                  : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
              }`}
            >
              <p className="text-sm font-medium text-stone-100">{mode.label}</p>
              <p className="text-xs text-stone-500 mt-0.5">{mode.desc}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Delegate Info */}
      {showDelegate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="w-4 h-4" />
              Delegate Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-stone-500">Name</label>
              <input
                type="text"
                value={passport.delegateName || ''}
                onChange={(e) => update('delegateName', e.target.value || null)}
                className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="e.g. Jane Smith"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500">Email</label>
                <input
                  type="email"
                  value={passport.delegateEmail || ''}
                  onChange={(e) => update('delegateEmail', e.target.value || null)}
                  className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="delegate@email.com"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">Phone</label>
                <input
                  type="tel"
                  value={passport.delegatePhone || ''}
                  onChange={(e) => update('delegatePhone', e.target.value || null)}
                  className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Method */}
      <Card>
        <CardHeader>
          <CardTitle>Preferred Contact Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CONTACT_METHODS.map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => update('preferredContactMethod', method.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  passport.preferredContactMethod === method.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chef Autonomy */}
      <Card>
        <CardHeader>
          <CardTitle>Chef Autonomy Level</CardTitle>
          <p className="text-xs text-stone-500 mt-1">
            How much freedom should your chef have in making decisions?
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {AUTONOMY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => update('chefAutonomyLevel', level.value)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                passport.chefAutonomyLevel === level.value
                  ? 'border-brand-600 bg-brand-950/30'
                  : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
              }`}
            >
              <p className="text-sm font-medium text-stone-100">{level.label}</p>
              <p className="text-xs text-stone-500 mt-0.5">{level.desc}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Event Defaults</CardTitle>
          <p className="text-xs text-stone-500 mt-1">
            Pre-fill these values when booking new events
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-stone-500">Default Guest Count</label>
              <input
                type="number"
                min={1}
                max={200}
                value={passport.defaultGuestCount}
                onChange={(e) => update('defaultGuestCount', parseInt(e.target.value) || 2)}
                className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500">Min Budget</label>
              <input
                type="number"
                min={0}
                step={100}
                value={passport.budgetRangeMinCents ? passport.budgetRangeMinCents / 100 : ''}
                onChange={(e) =>
                  update(
                    'budgetRangeMinCents',
                    e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null
                  )
                }
                className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="$"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500">Max Budget</label>
              <input
                type="number"
                min={0}
                step={100}
                value={passport.budgetRangeMaxCents ? passport.budgetRangeMaxCents / 100 : ''}
                onChange={(e) =>
                  update(
                    'budgetRangeMaxCents',
                    e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null
                  )
                }
                className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="$"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-500">Preferred Service Style</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SERVICE_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => update('serviceStyle', style.value || null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    (passport.serviceStyle || '') === style.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Standing Instructions</CardTitle>
          <p className="text-xs text-stone-500 mt-1">Notes your chef should always keep in mind</p>
        </CardHeader>
        <CardContent>
          <textarea
            value={passport.standingInstructions || ''}
            onChange={(e) => update('standingInstructions', e.target.value || null)}
            rows={4}
            className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
            placeholder="e.g. Always use organic produce when available. No shellfish for my daughter. We prefer dinner served at 7pm."
          />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Saving...' : 'Save Passport'}
        </button>
      </div>
    </div>
  )
}
