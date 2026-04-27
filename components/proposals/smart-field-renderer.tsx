'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { saveSmartField } from '@/lib/proposals/smart-field-actions'
import { Braces, Plus } from '@/components/ui/icons'
import { toast } from 'sonner'

type SmartField = {
  fieldKey: string
  fieldValue: string
}

type Props = {
  fields: SmartField[]
  previewTemplate?: string
  context?: { clientName?: string; eventDate?: string; guestCount?: number }
}

export function SmartFieldRenderer({ fields, previewTemplate, context }: Props) {
  const [fieldList, setFieldList] = useState(fields)
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Render template with field substitutions
  function renderPreview(template: string): string {
    let result = template
    // Replace context tokens
    if (context?.clientName) result = result.replace(/\{client\.name\}/g, context.clientName)
    if (context?.eventDate) result = result.replace(/\{event\.date\}/g, context.eventDate)
    if (context?.guestCount)
      result = result.replace(/\{event\.guest_count\}/g, String(context.guestCount))
    // Replace custom fields
    for (const f of fieldList) {
      result = result.replace(new RegExp(`\\{${f.fieldKey}\\}`, 'g'), f.fieldValue)
    }
    return result
  }

  function handleSave(key: string, value: string) {
    startTransition(async () => {
      try {
        await saveSmartField(key, value)
        setFieldList((prev) => {
          const existing = prev.find((f) => f.fieldKey === key)
          if (existing)
            return prev.map((f) => (f.fieldKey === key ? { ...f, fieldValue: value } : f))
          return [...prev, { fieldKey: key, fieldValue: value }]
        })
        setShowAdd(false)
        setEditingKey(null)
        setNewKey('')
        setNewValue('')
        setEditValue('')
      } catch (err) {
        toast.error('Failed to save smart field')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Available Tokens */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Braces className="h-4 w-4 text-stone-400" />
            Smart Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{'{client.name}'}</Badge>
            <Badge variant="info">{'{event.date}'}</Badge>
            <Badge variant="info">{'{event.guest_count}'}</Badge>
            {fieldList.map((f) => (
              <Badge key={f.fieldKey} variant="default">{`{${f.fieldKey}}`}</Badge>
            ))}
          </div>

          {/* Custom Fields */}
          <div className="space-y-2">
            {fieldList.map((f) => (
              <div key={f.fieldKey} className="flex items-center gap-2">
                <code className="text-xs bg-stone-800 px-2 py-1 rounded">{`{${f.fieldKey}}`}</code>
                {editingKey === f.fieldKey ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 rounded border border-stone-600 px-2 py-1 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSave(f.fieldKey, editValue)}
                      loading={isPending}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-sm text-stone-400 flex-1">{f.fieldValue}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingKey(f.fieldKey)
                        setEditValue(f.fieldValue)
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAdd ? (
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <Input
                label="Field Key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.replace(/\s/g, '_').toLowerCase())}
                placeholder="e.g., chef_name"
              />
              <Input
                label="Default Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="e.g., Chef Maria"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSave(newKey, newValue)}
                  loading={isPending}
                  disabled={!newKey}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />
              Add Custom Field
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Template Preview */}
      {previewTemplate && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-stone-300 bg-stone-800 rounded-lg p-4">
              {renderPreview(previewTemplate)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
