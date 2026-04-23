'use client'

import { useState, useTransition } from 'react'
import { purchasePassiveProductAction } from '@/lib/passive-store/server-actions'
import { formatCurrency } from '@/lib/utils/currency'

type Props = {
  chefSlug: string
  productId: string
  productTitle: string
  productPrice: number
  requiresRecipient: boolean
}

export function PassiveCheckoutForm({
  chefSlug,
  productId,
  productTitle,
  productPrice,
  requiresRecipient,
}: Props) {
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!buyerName.trim() || !buyerEmail.trim()) {
      setError('Name and email are required.')
      return
    }

    if (requiresRecipient && recipientEmail.trim() && !recipientName.trim()) {
      setError('Add a recipient name or leave the recipient fields blank.')
      return
    }

    startTransition(async () => {
      try {
        const result = await purchasePassiveProductAction({
          chefSlug,
          productId,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          recipientName: recipientName.trim() || null,
          recipientEmail: recipientEmail.trim() || null,
        })
        window.location.href = result.orderUrl
      } catch (purchaseError: any) {
        setError(purchaseError?.message || 'Unable to complete the purchase.')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.6rem] border border-stone-800 bg-stone-950/70 p-5 sm:p-6"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
          Lightweight Checkout
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-100">{productTitle}</h2>
        <p className="mt-2 text-sm text-stone-400">
          Mock checkout for the MVP. Completing this order instantly fulfills the product in-app.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-stone-300">Your name</span>
          <input
            type="text"
            value={buyerName}
            onChange={(event) => setBuyerName(event.target.value)}
            className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-brand-400"
            placeholder="Alex Morgan"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-stone-300">Your email</span>
          <input
            type="email"
            value={buyerEmail}
            onChange={(event) => setBuyerEmail(event.target.value)}
            className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-brand-400"
            placeholder="alex@example.com"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-stone-300">Recipient name</span>
          <input
            type="text"
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-brand-400"
            placeholder="Optional"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-stone-300">Recipient email</span>
          <input
            type="email"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-brand-400"
            placeholder="Optional"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Completing order...' : `Complete purchase for ${formatCurrency(productPrice)}`}
      </button>
    </form>
  )
}
