// Automation Rule Card
// Shows a single preset rule with toggle + expandable config.
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { togglePresetRule, updatePresetRuleConfig } from '@/lib/automations/preset-actions'
import { PRESET_RULE_DEFINITIONS } from '@/lib/automations/rules'
import type { PresetRuleType, PresetRuleConfig } from '@/lib/automations/types'

interface AutomationRuleCardProps {
  rule: PresetRuleConfig
}

export function AutomationRuleCard({ rule }: AutomationRuleCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [localConfig, setLocalConfig] = useState<Record<string, number | string | boolean>>(
    rule.config
  )

  const definition = PRESET_RULE_DEFINITIONS.find((d) => d.type === rule.type)
  if (!definition) return null

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await togglePresetRule(rule.type, !rule.enabled)
        router.refresh()
      } catch (err) {
        toast.error("Couldn't change that rule")
        console.error(err)
      }
    })
  }

  const handleSaveConfig = () => {
    startTransition(async () => {
      try {
        await updatePresetRuleConfig(rule.type, localConfig)
        toast.success('Settings saved')
        router.refresh()
      } catch (err) {
        toast.error('Failed to save settings')
        console.error(err)
      }
    })
  }

  const handleConfigChange = (key: string, value: number | string | boolean) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        rule.enabled ? 'border-stone-700 bg-stone-900' : 'border-stone-800 bg-stone-800'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={rule.enabled}
          onClick={handleToggle}
          disabled={isPending}
          className={`mt-0.5 relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:opacity-50 ${
            rule.enabled ? 'bg-brand-600' : 'bg-stone-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-stone-900 shadow ring-0 transition duration-200 ease-in-out ${
              rule.enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-sm font-medium ${rule.enabled ? 'text-stone-200' : 'text-stone-400'}`}
            >
              {definition.name}
            </p>
            {rule.last_triggered_at && (
              <span className="text-[10px] bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded shrink-0">
                Last: {new Date(rule.last_triggered_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 ${rule.enabled ? 'text-stone-500' : 'text-stone-400'}`}>
            {definition.description}
          </p>

          {/* Expand/collapse config */}
          {rule.enabled && definition.configFields.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-brand-500 hover:text-brand-400 mt-1.5"
            >
              {expanded ? 'Hide settings' : 'Configure'}
            </button>
          )}

          {/* Config fields */}
          {expanded && rule.enabled && (
            <div className="mt-3 space-y-3 border-t border-stone-800 pt-3">
              {definition.configFields.map((field) => (
                <ConfigField
                  key={field.key}
                  field={field}
                  value={localConfig[field.key]}
                  onChange={(v) => handleConfigChange(field.key, v)}
                />
              ))}
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isPending}
                className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1 rounded disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// -------- Config Field Renderer --------

function ConfigField({
  field,
  value,
  onChange,
}: {
  field: {
    key: string
    label: string
    type: 'number' | 'boolean'
    min?: number
    max?: number
    suffix?: string
  }
  value: number | string | boolean
  onChange: (v: number | string | boolean) => void
}) {
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-stone-600 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
        />
        {field.label}
      </label>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-stone-400">
      <span>{field.label}</span>
      <input
        type="number"
        value={Number(value)}
        min={field.min}
        max={field.max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!isNaN(n) && (!field.min || n >= field.min) && (!field.max || n <= field.max)) {
            onChange(n)
          }
        }}
        className="w-16 border border-stone-600 rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {field.suffix && <span>{field.suffix}</span>}
    </div>
  )
}
