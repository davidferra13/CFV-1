'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard } from 'lucide-react'
import { updatePaymentMethodSettings } from '@/lib/integrations/payments/payment-method-settings'
import { toast } from 'sonner'

export function PaymentMethodsSettings({
  applePayEnabled: initialApplePay,
  googlePayEnabled: initialGooglePay,
}: {
  applePayEnabled: boolean
  googlePayEnabled: boolean
}) {
  const [applePay, setApplePay] = useState(initialApplePay)
  const [googlePay, setGooglePay] = useState(initialGooglePay)
  const [isPending, startTransition] = useTransition()

  function handleToggle(method: 'apple' | 'google') {
    const prevApple = applePay
    const prevGoogle = googlePay

    if (method === 'apple') setApplePay(!applePay)
    if (method === 'google') setGooglePay(!googlePay)

    startTransition(async () => {
      try {
        await updatePaymentMethodSettings(
          method === 'apple' ? { applePayEnabled: !prevApple } : { googlePayEnabled: !prevGoogle }
        )
        toast.success(
          `${method === 'apple' ? 'Apple Pay' : 'Google Pay'} ${method === 'apple' ? (!prevApple ? 'enabled' : 'disabled') : !prevGoogle ? 'enabled' : 'disabled'}`
        )
      } catch {
        setApplePay(prevApple)
        setGooglePay(prevGoogle)
        toast.error('Failed to update payment method settings')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-brand-400" />
          <CardTitle>Digital Wallets</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-stone-400">
          Control which digital wallet payment methods your clients can use at checkout. These are
          handled through Stripe and require no additional setup.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleToggle('apple')}
            disabled={isPending}
            className="flex w-full items-center justify-between rounded-lg border border-stone-700 px-4 py-3 transition hover:border-stone-600"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg"> </span>
              <div className="text-left">
                <p className="font-medium text-stone-100">Apple Pay</p>
                <p className="text-xs text-stone-500">
                  Accept payments from iPhone, iPad, Mac, and Apple Watch
                </p>
              </div>
            </div>
            <Badge variant={applePay ? 'success' : 'default'}>{applePay ? 'On' : 'Off'}</Badge>
          </button>

          <button
            type="button"
            onClick={() => handleToggle('google')}
            disabled={isPending}
            className="flex w-full items-center justify-between rounded-lg border border-stone-700 px-4 py-3 transition hover:border-stone-600"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">G</span>
              <div className="text-left">
                <p className="font-medium text-stone-100">Google Pay</p>
                <p className="text-xs text-stone-500">
                  Accept payments from Android devices and Chrome
                </p>
              </div>
            </div>
            <Badge variant={googlePay ? 'success' : 'default'}>{googlePay ? 'On' : 'Off'}</Badge>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
