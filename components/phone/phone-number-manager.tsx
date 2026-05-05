// Phone Number Manager Component
// Full CRUD for phone numbers: add, remove, set primary, verify, toggle can_text.
// Uses server actions from lib/phone/actions.ts (Phase 1 agent builds these).
'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PhoneVerificationInline } from '@/components/phone/phone-verification-inline'

// Types matching the phone_numbers table (Phase 1)
export interface PhoneNumber {
  id: string
  phone_e164: string
  phone_display: string
  label: string
  type: string
  is_primary: boolean
  can_text: boolean
  verified_at: string | null
}

interface PhoneNumberManagerProps {
  entityId: string
  entityType: 'user' | 'client' | 'vendor'
  phoneNumbers: PhoneNumber[]
  // Server actions from Phase 1 (lib/phone/actions.ts)
  addPhoneAction: (data: {
    entityId: string
    entityType: string
    phone: string
    label: string
    type: string
  }) => Promise<{ success: boolean; error?: string; phoneNumber?: PhoneNumber }>
  removePhoneAction: (phoneNumberId: string) => Promise<{ success: boolean; error?: string }>
  setPrimaryAction: (phoneNumberId: string) => Promise<{ success: boolean; error?: string }>
  toggleCanTextAction: (
    phoneNumberId: string,
    canText: boolean
  ) => Promise<{ success: boolean; error?: string }>
  // Verification actions (lib/phone/verification.ts via server action wrapper)
  sendVerificationCodeAction: (phoneE164: string) => Promise<{ success: boolean; error?: string }>
  verifyCodeAction: (phoneE164: string, code: string) => Promise<{ valid: boolean; error?: string }>
}

const LABEL_OPTIONS = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
]

const TYPE_OPTIONS = [
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Business' },
]

export function PhoneNumberManager({
  entityId,
  entityType,
  phoneNumbers: initialPhones,
  addPhoneAction,
  removePhoneAction,
  setPrimaryAction,
  toggleCanTextAction,
  sendVerificationCodeAction,
  verifyCodeAction,
}: PhoneNumberManagerProps) {
  const [phones, setPhones] = useState<PhoneNumber[]>(initialPhones)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [newLabel, setNewLabel] = useState('mobile')
  const [newType, setNewType] = useState('personal')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAdd = useCallback(async () => {
    if (!newPhone.trim()) return

    setAddLoading(true)
    setAddError(null)

    try {
      const result = await addPhoneAction({
        entityId,
        entityType,
        phone: newPhone.trim(),
        label: newLabel,
        type: newType,
      })

      if (result.success && result.phoneNumber) {
        setPhones((prev) => [...prev, result.phoneNumber!])
        setNewPhone('')
        setShowAddForm(false)
      } else {
        setAddError(result.error || 'Failed to add phone number.')
      }
    } catch {
      setAddError('Failed to add phone number.')
    } finally {
      setAddLoading(false)
    }
  }, [entityId, entityType, newPhone, newLabel, newType, addPhoneAction])

  const handleRemove = useCallback(
    async (phoneId: string) => {
      setActionLoading(phoneId)

      try {
        const result = await removePhoneAction(phoneId)
        if (result.success) {
          setPhones((prev) => prev.filter((p) => p.id !== phoneId))
        }
      } catch {
        // Silent failure, phone stays in list
      } finally {
        setActionLoading(null)
        setRemoveConfirm(null)
      }
    },
    [removePhoneAction]
  )

  const handleSetPrimary = useCallback(
    async (phoneId: string) => {
      setActionLoading(phoneId)

      try {
        const result = await setPrimaryAction(phoneId)
        if (result.success) {
          setPhones((prev) => prev.map((p) => ({ ...p, is_primary: p.id === phoneId })))
        }
      } catch {
        // Silent failure
      } finally {
        setActionLoading(null)
      }
    },
    [setPrimaryAction]
  )

  const handleToggleCanText = useCallback(
    async (phoneId: string, current: boolean) => {
      setActionLoading(phoneId)

      try {
        const result = await toggleCanTextAction(phoneId, !current)
        if (result.success) {
          setPhones((prev) =>
            prev.map((p) => (p.id === phoneId ? { ...p, can_text: !current } : p))
          )
        }
      } catch {
        // Silent failure
      } finally {
        setActionLoading(null)
      }
    },
    [toggleCanTextAction]
  )

  const handleVerified = useCallback((phoneId: string) => {
    setPhones((prev) =>
      prev.map((p) => (p.id === phoneId ? { ...p, verified_at: new Date().toISOString() } : p))
    )
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-200">Phone Numbers</h3>
        {!showAddForm && (
          <Button variant="ghost" size="sm" onClick={() => setShowAddForm(true)}>
            + Add
          </Button>
        )}
      </div>

      {/* Phone list */}
      {phones.length === 0 && !showAddForm && (
        <p className="text-sm text-stone-500">No phone numbers added.</p>
      )}

      <div className="space-y-3">
        {phones.map((phone) => (
          <div
            key={phone.id}
            className="flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2"
          >
            {/* Phone info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-100 font-mono">
                  {phone.phone_display || phone.phone_e164}
                </span>
                {phone.is_primary && <Badge variant="info">Primary</Badge>}
                <Badge variant={phone.verified_at ? 'success' : 'warning'}>
                  {phone.verified_at ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-stone-400">
                <span>{phone.label}</span>
                <span className="text-stone-600">|</span>
                <span>{phone.type}</span>
                {phone.can_text && (
                  <>
                    <span className="text-stone-600">|</span>
                    <span className="text-emerald-400">SMS enabled</span>
                  </>
                )}
              </div>
            </div>

            {/* Verification */}
            {!phone.verified_at && (
              <PhoneVerificationInline
                phoneE164={phone.phone_e164}
                isVerified={false}
                onVerified={() => handleVerified(phone.id)}
                sendCodeAction={sendVerificationCodeAction}
                verifyCodeAction={verifyCodeAction}
              />
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Toggle can_text */}
              <button
                type="button"
                onClick={() => handleToggleCanText(phone.id, phone.can_text)}
                disabled={actionLoading === phone.id}
                className="p-1.5 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                title={phone.can_text ? 'Disable SMS' : 'Enable SMS'}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                  />
                </svg>
              </button>

              {/* Set primary */}
              {!phone.is_primary && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(phone.id)}
                  disabled={actionLoading === phone.id}
                  className="p-1.5 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                  title="Set as primary"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                </button>
              )}

              {/* Remove */}
              {removeConfirm === phone.id ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemove(phone.id)}
                    loading={actionLoading === phone.id}
                  >
                    Remove
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRemoveConfirm(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRemoveConfirm(phone.id)}
                  className="p-1.5 rounded text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors"
                  title="Remove"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-3">
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 (978) 555-1234"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Label"
              options={LABEL_OPTIONS}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Select
              label="Type"
              options={TYPE_OPTIONS}
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            />
          </div>
          {addError && <p className="text-xs text-red-400">{addError}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setNewPhone('')
                setAddError(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              loading={addLoading}
              disabled={!newPhone.trim()}
            >
              Add Number
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
