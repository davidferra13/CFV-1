'use client'

import { useCallback } from 'react'
import { PhoneNumberManager, type PhoneNumber } from '@/components/phone/phone-number-manager'
import {
  addPhoneNumber,
  removePhoneNumber,
  setPrimaryPhone,
  toggleCanText,
  resendVerificationCode,
  verifyPhoneNumber,
  getPhoneNumbers,
} from '@/lib/phone/actions'

interface SecurityPhoneSectionProps {
  entityId: string
  entityType: 'user' | 'client' | 'vendor'
  initialPhones: PhoneNumber[]
}

/**
 * Thin wrapper that adapts lib/phone/actions.ts server actions
 * to the interface expected by PhoneNumberManager.
 */
export function SecurityPhoneSection({
  entityId,
  entityType,
  initialPhones,
}: SecurityPhoneSectionProps) {
  // Map 'user' entityType to 'chef' for the DB layer
  const dbEntityType = entityType === 'user' ? 'chef' : entityType

  // addPhoneAction: server returns { success, phoneNumberId } but component
  // expects { success, phoneNumber }. After adding, re-fetch to get the full object.
  const addPhoneAction = useCallback(
    async (data: {
      entityId: string
      entityType: string
      phone: string
      label: string
      type: string
    }) => {
      const mappedType = data.entityType === 'user' ? 'chef' : data.entityType
      const result = await addPhoneNumber({
        entityType: mappedType as 'chef' | 'client' | 'staff' | 'vendor' | 'venue',
        entityId: data.entityId,
        phone: data.phone,
        label: data.label,
        type: data.type as 'primary' | 'secondary' | 'emergency',
      })

      if (!result.success) {
        return { success: false, error: result.error }
      }

      // Re-fetch to get the full phone object for the component state
      const refreshed = await getPhoneNumbers(mappedType, data.entityId)
      const added = refreshed.data?.find((p) => p.id === result.phoneNumberId)

      if (!added) {
        return { success: true } // Added but could not retrieve; component will lack local state
      }

      const phoneNumber: PhoneNumber = {
        id: added.id,
        phone_e164: added.phoneE164,
        phone_display: added.phoneDisplay,
        label: added.label ?? 'mobile',
        type: added.type ?? 'primary',
        is_primary: added.type === 'primary',
        can_text: added.canText ?? false,
        verified_at: added.verifiedAt,
      }

      return { success: true, phoneNumber }
    },
    []
  )

  const removePhoneAction = useCallback(async (phoneNumberId: string) => {
    return removePhoneNumber(phoneNumberId)
  }, [])

  const setPrimaryAction = useCallback(async (phoneNumberId: string) => {
    return setPrimaryPhone(phoneNumberId)
  }, [])

  const toggleCanTextAction = useCallback(async (phoneNumberId: string, canText: boolean) => {
    return toggleCanText(phoneNumberId, canText)
  }, [])

  // sendVerificationCodeAction: component passes phoneE164,
  // but resendVerificationCode expects phoneNumberId.
  // Look up the ID from initialPhones (or rely on the local state matching).
  const sendVerificationCodeAction = useCallback(
    async (phoneE164: string) => {
      // Find the phone record by E164 to get its ID
      const phonesResult = await getPhoneNumbers(dbEntityType, entityId)
      const match = phonesResult.data?.find((p) => p.phoneE164 === phoneE164)
      if (!match) {
        return { success: false, error: 'Phone number not found' }
      }
      return resendVerificationCode(match.id)
    },
    [entityId, dbEntityType]
  )

  // verifyCodeAction: component passes (phoneE164, code) and expects { valid },
  // but verifyPhoneNumber expects (phoneNumberId, code) and returns { success }.
  const verifyCodeAction = useCallback(
    async (phoneE164: string, code: string) => {
      const phonesResult = await getPhoneNumbers(dbEntityType, entityId)
      const match = phonesResult.data?.find((p) => p.phoneE164 === phoneE164)
      if (!match) {
        return { valid: false, error: 'Phone number not found' }
      }
      const result = await verifyPhoneNumber(match.id, code)
      return { valid: result.success, error: result.error }
    },
    [entityId, dbEntityType]
  )

  return (
    <PhoneNumberManager
      entityId={entityId}
      entityType={entityType}
      phoneNumbers={initialPhones}
      addPhoneAction={addPhoneAction}
      removePhoneAction={removePhoneAction}
      setPrimaryAction={setPrimaryAction}
      toggleCanTextAction={toggleCanTextAction}
      sendVerificationCodeAction={sendVerificationCodeAction}
      verifyCodeAction={verifyCodeAction}
    />
  )
}
