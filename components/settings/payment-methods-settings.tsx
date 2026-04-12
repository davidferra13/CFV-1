'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Building2 } from '@/components/ui/icons'
import { updatePaymentMethodSettings } from '@/lib/integrations/payments/payment-method-settings'
import { toast } from 'sonner'

export function PaymentMethodsSettings({
  applePayEnabled: initialApplePay,
  googlePayEnabled: initialGooglePay,
  achEnabled: initialAch,
}: {
  applePayEnabled: boolean
  googlePayEnabled: boolean
  achEnabled: boolean
}) {
  const [applePay, setApplePay] = useState(initialApplePay)
  const [googlePay, setGooglePay] = useState(initialGooglePay)
  const [ach, setAch] = useState(initialAch)
  const [isPending, startTransition] = useTransition()

  function handleToggle(method: 'apple' | 'google' | 'ach') {
    const prevApple = applePay
    const prevGoogle = googlePay
    const prevAch = ach

    if (method === 'apple') setApplePay(!applePay)
    if (method === 'google') setGooglePay(!googlePay)
    if (method === 'ach') setAch(!ach)

    startTransition(async () => {
      try {
        if (method === 'apple') {
          await updatePaymentMethodSettings({ applePayEnabled: !prevApple })
          toast.success(`Apple Pay ${!prevApple ? 'enabled' : 'disabled'}`)
        } else if (method === 'google') {
          await updatePaymentMethodSettings({ googlePayEnabled: !prevGoogle })
          toast.success(`Google Pay ${!prevGoogle ? 'enabled' : 'disabled'}`)
        } else {
          await updatePaymentMethodSettings({ achEnabled: !prevAch })
          toast.success(`ACH bank transfer ${!prevAch ? 'enabled' : 'disabled'}`)
        }
      } catch {
        setApplePay(prevApple)
        setGooglePay(prevGoogle)
        setAch(prevAch)
        toast.error('Failed to update payment method settings')
      }
    })
  }

  return (
    <div className="space-y-4">
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-brand-400" />
            <CardTitle>Bank Transfer (ACH)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-stone-400">
            ACH bank transfers have no processing fee for you and are ideal for larger invoices.
            Clients pay directly from their US bank account. Funds typically arrive in 3-5 business
            days.
          </p>

          <button
            type="button"
            onClick={() => handleToggle('ach')}
            disabled={isPending}
            className="flex w-full items-center justify-between rounded-lg border border-stone-700 px-4 py-3 transition hover:border-stone-600"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">$</span>
              <div className="text-left">
                <p className="font-medium text-stone-100">ACH Bank Transfer</p>
                <p className="text-xs text-stone-500">
                  US bank accounts only. Lower cost than cards for large payments.
                </p>
              </div>
            </div>
            <Badge variant={ach ? 'success' : 'default'}>{ach ? 'On' : 'Off'}</Badge>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
