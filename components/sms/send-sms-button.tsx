'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Send } from '@/components/ui/icons'
import {
  sendOrderReadyNotification,
  sendTableReadyNotification,
  sendDeliveryETANotification,
  sendReservationConfirmation,
  sendFeedbackRequest,
  sendCustomSMS,
} from '@/lib/sms/sms-actions'

type MessageType =
  | 'order_ready'
  | 'table_ready'
  | 'delivery_eta'
  | 'reservation_confirm'
  | 'feedback_request'
  | 'custom'

type EntityType = 'event' | 'bakery_order' | 'reservation' | 'preorder' | 'delivery'

type SendSMSButtonProps = {
  phone: string
  customerName: string
  messageType: MessageType
  entityType?: EntityType
  entityId?: string
  // Extra props for specific message types
  orderDetails?: string
  partySize?: number
  eta?: number
  date?: string
  time?: string
  feedbackUrl?: string
  customMessage?: string
  className?: string
  size?: 'sm' | 'md'
}

export function SendSMSButton({
  phone,
  customerName,
  messageType,
  entityType,
  entityId,
  orderDetails,
  partySize,
  eta,
  date,
  time,
  feedbackUrl,
  customMessage,
  className = '',
  size = 'sm',
}: SendSMSButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [sending, startSend] = useTransition()

  function handleClick() {
    if (!confirming) {
      setConfirming(true)
      // Auto-dismiss confirmation after 3 seconds
      setTimeout(() => setConfirming(false), 3000)
      return
    }

    setConfirming(false)
    startSend(async () => {
      try {
        let result: { success: boolean; error?: string | null }

        switch (messageType) {
          case 'order_ready':
            result = await sendOrderReadyNotification(
              phone,
              customerName,
              orderDetails || '',
              entityType,
              entityId
            )
            break
          case 'table_ready':
            result = await sendTableReadyNotification(phone, customerName, partySize || 2, entityId)
            break
          case 'delivery_eta':
            result = await sendDeliveryETANotification(phone, customerName, eta || 30, entityId)
            break
          case 'reservation_confirm':
            result = await sendReservationConfirmation(
              phone,
              customerName,
              date || '',
              time || '',
              partySize || 2,
              entityId
            )
            break
          case 'feedback_request':
            result = await sendFeedbackRequest(
              phone,
              customerName,
              feedbackUrl || '',
              entityType,
              entityId
            )
            break
          case 'custom':
            result = await sendCustomSMS(phone, customMessage || '', entityType, entityId)
            break
          default:
            result = { success: false, error: 'Unknown message type' }
        }

        if (result.success) {
          toast.success(`SMS sent to ${customerName}`)
        } else {
          toast.error(result.error || 'Failed to send SMS')
        }
      } catch {
        toast.error('Failed to send SMS')
      }
    })
  }

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'

  return (
    <button
      onClick={handleClick}
      disabled={sending || !phone}
      className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-md font-medium transition-colors disabled:opacity-50 ${
        confirming
          ? 'bg-amber-600 hover:bg-amber-500 text-white'
          : 'bg-stone-700 hover:bg-stone-600 text-stone-300'
      } ${className}`}
      title={!phone ? 'No phone number available' : undefined}
    >
      <Send className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {sending ? 'Sending...' : confirming ? 'Click to confirm' : 'Send SMS'}
    </button>
  )
}
