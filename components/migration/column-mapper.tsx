'use client'

import { useEffect } from 'react'
import { type ColumnMapping } from '@/lib/migration/csv-import-actions'
import { CLIENT_FIELDS, RECIPE_FIELDS, EVENT_FIELDS } from '@/lib/migration/csv-import-constants'

type TargetType = 'clients' | 'recipes' | 'events'

type ColumnMapperProps = {
  headers: string[]
  sampleRows: string[][]
  targetType: TargetType
  mappings: ColumnMapping[]
  onMappingsChange: (mappings: ColumnMapping[]) => void
}

// Auto-detect mappings from common column name patterns
const AUTO_DETECT_MAP: Record<string, Record<string, string>> = {
  clients: {
    name: 'full_name',
    full_name: 'full_name',
    fullname: 'full_name',
    'full name': 'full_name',
    'client name': 'full_name',
    client_name: 'full_name',
    email: 'email',
    'email address': 'email',
    'e-mail': 'email',
    phone: 'phone',
    telephone: 'phone',
    'phone number': 'phone',
    address: 'address',
    'street address': 'address',
    nickname: 'preferred_name',
    preferred_name: 'preferred_name',
    'preferred name': 'preferred_name',
    partner: 'partner_name',
    partner_name: 'partner_name',
    'partner name': 'partner_name',
    allergies: 'allergies',
    'dietary restrictions': 'dietary_restrictions',
    dietary_restrictions: 'dietary_restrictions',
    dietary: 'dietary_restrictions',
    'kitchen size': 'kitchen_size',
    kitchen_size: 'kitchen_size',
    notes: 'notes',
  },
  recipes: {
    name: 'name',
    'recipe name': 'name',
    recipe_name: 'name',
    title: 'name',
    category: 'category',
    type: 'category',
    method: 'method',
    instructions: 'method',
    directions: 'method',
    description: 'description',
    'prep time': 'prep_time_minutes',
    prep_time: 'prep_time_minutes',
    prep_time_minutes: 'prep_time_minutes',
    'cook time': 'cook_time_minutes',
    cook_time: 'cook_time_minutes',
    cook_time_minutes: 'cook_time_minutes',
    servings: 'yield_quantity',
    yield: 'yield_quantity',
    yield_quantity: 'yield_quantity',
    yield_unit: 'yield_unit',
    yield_description: 'yield_description',
    'dietary tags': 'dietary_tags',
    dietary_tags: 'dietary_tags',
    tags: 'dietary_tags',
    notes: 'notes',
  },
  events: {
    date: 'event_date',
    event_date: 'event_date',
    'event date': 'event_date',
    guests: 'guest_count',
    guest_count: 'guest_count',
    'guest count': 'guest_count',
    'number of guests': 'guest_count',
    occasion: 'occasion',
    event_type: 'occasion',
    address: 'location_address',
    location: 'location_address',
    location_address: 'location_address',
    city: 'location_city',
    location_city: 'location_city',
    state: 'location_state',
    location_state: 'location_state',
    zip: 'location_zip',
    zipcode: 'location_zip',
    location_zip: 'location_zip',
    'kitchen notes': 'kitchen_notes',
    kitchen_notes: 'kitchen_notes',
    'dietary restrictions': 'dietary_restrictions',
    dietary_restrictions: 'dietary_restrictions',
    allergies: 'allergies',
  },
}

function getTargetFields(targetType: TargetType): readonly string[] {
  switch (targetType) {
    case 'clients':
      return CLIENT_FIELDS
    case 'recipes':
      return RECIPE_FIELDS
    case 'events':
      return EVENT_FIELDS
  }
}

const REQUIRED_FIELDS: Record<TargetType, string[]> = {
  clients: ['full_name', 'email'],
  recipes: ['name'],
  events: ['event_date', 'guest_count'],
}

export default function ColumnMapper({
  headers,
  sampleRows,
  targetType,
  mappings,
  onMappingsChange,
}: ColumnMapperProps) {
  const targetFields = getTargetFields(targetType)
  const requiredFields = REQUIRED_FIELDS[targetType]

  // Auto-detect on mount if no mappings exist
  useEffect(() => {
    if (mappings.length > 0) return

    const autoMap = AUTO_DETECT_MAP[targetType] || {}
    const detected: ColumnMapping[] = headers.map((header) => {
      const normalized = header.toLowerCase().trim()
      const match = autoMap[normalized]
      return {
        sourceColumn: header,
        targetField: match || '__skip__',
      }
    })

    onMappingsChange(detected)
  }, [headers, targetType]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMappingChange(sourceColumn: string, targetField: string) {
    const updated = mappings.map((m) =>
      m.sourceColumn === sourceColumn ? { ...m, targetField } : m
    )
    onMappingsChange(updated)
  }

  // Track which target fields are already mapped
  const usedTargetFields = new Set(
    mappings.filter((m) => m.targetField !== '__skip__').map((m) => m.targetField)
  )

  // Check which required fields are mapped
  const missingRequired = requiredFields.filter((f) => !usedTargetFields.has(f))

  return (
    <div className="space-y-4">
      {missingRequired.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <strong>Missing required fields:</strong> {missingRequired.join(', ')}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2 font-medium">Source Column</th>
              <th className="text-left p-2 font-medium">Sample Data</th>
              <th className="text-left p-2 font-medium">Map To</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header, idx) => {
              const currentMapping = mappings.find((m) => m.sourceColumn === header)
              const currentTarget = currentMapping?.targetField || '__skip__'

              // Get sample values for this column
              const samples = sampleRows
                .slice(0, 3)
                .map((row) => row[idx] || '')
                .filter(Boolean)

              return (
                <tr key={header} className="border-b">
                  <td className="p-2 font-mono text-xs">{header}</td>
                  <td className="p-2 text-xs text-gray-500 max-w-[200px] truncate">
                    {samples.join(', ') || '(empty)'}
                  </td>
                  <td className="p-2">
                    <select
                      value={currentTarget}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className={`w-full rounded border px-2 py-1 text-sm ${
                        currentTarget === '__skip__' ? 'text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      <option value="__skip__">Skip this column</option>
                      {targetFields.map((field) => {
                        const isUsed = usedTargetFields.has(field) && currentTarget !== field
                        const isRequired = requiredFields.includes(field)
                        return (
                          <option key={field} value={field} disabled={isUsed}>
                            {field}
                            {isRequired ? ' *' : ''}
                            {isUsed ? ' (already mapped)' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Fields marked with * are required. Each target field can only be mapped once.
      </p>
    </div>
  )
}
