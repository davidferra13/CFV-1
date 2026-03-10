'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'
import {
  issueGiftCard,
  bulkIssueGiftCards,
  cancelGiftCard,
  getGiftCardTransactions,
  type GiftCard,
  type GiftCardStats,
  type GiftCardTransaction,
} from '@/lib/commerce/gift-card-actions'

// ── Issue Form ─────────────────────────────────────────────────────────────

function IssueGiftCardForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [valueDollars, setValueDollars] = useState('')
  const [purchaserName, setPurchaserName] = useState('')
  const [purchaserEmail, setPurchaserEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(valueDollars) * 100)
    if (!cents || cents <= 0) {
      toast.error('Enter a valid dollar amount')
      return
    }

    startTransition(async () => {
      try {
        const card = await issueGiftCard({
          valueCents: cents,
          purchaserName: purchaserName || undefined,
          purchaserEmail: purchaserEmail || undefined,
          recipientName: recipientName || undefined,
          recipientEmail: recipientEmail || undefined,
          message: message || undefined,
          expiresAt: expiresAt || undefined,
        })
        toast.success(`Gift card issued: ${card.code}`)
        onClose()
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to issue gift card')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Value ($)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={valueDollars}
          onChange={(e) => setValueDollars(e.target.value)}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          placeholder="50.00"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Purchaser Name</label>
          <input
            type="text"
            value={purchaserName}
            onChange={(e) => setPurchaserName(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Purchaser Email</label>
          <input
            type="email"
            value={purchaserEmail}
            onChange={(e) => setPurchaserEmail(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Recipient Name</label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Recipient Email</label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Gift Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
          placeholder="Enjoy your private chef experience!"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">
          Expiration Date (optional)
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Issuing...' : 'Issue Gift Card'}
        </Button>
      </div>
    </form>
  )
}

// ── Bulk Issue Form ────────────────────────────────────────────────────────

function BulkIssueForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [count, setCount] = useState('5')
  const [valueDollars, setValueDollars] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(valueDollars) * 100)
    const qty = parseInt(count)
    if (!cents || cents <= 0 || !qty || qty <= 0 || qty > 100) {
      toast.error('Enter valid count (1-100) and value')
      return
    }

    startTransition(async () => {
      try {
        const cards = await bulkIssueGiftCards(qty, cents)
        toast.success(`${cards.length} gift cards issued`)
        onClose()
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to issue gift cards')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Count</label>
          <input
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Value Each ($)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={valueDollars}
            onChange={(e) => setValueDollars(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
            placeholder="25.00"
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Issuing...' : 'Issue Bulk Cards'}
        </Button>
      </div>
    </form>
  )
}

// ── Transaction History Modal ──────────────────────────────────────────────

function TransactionHistory({ card, onClose }: { card: GiftCard; onClose: () => void }) {
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([])
  const [loaded, setLoaded] = useState(false)

  if (!loaded) {
    getGiftCardTransactions(card.id).then((txns) => {
      setTransactions(txns)
      setLoaded(true)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-stone-900 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
          <h2 className="text-lg font-semibold text-stone-100">Transactions for {card.code}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">
          <div className="mb-4 text-sm text-stone-400">
            Initial: {formatCurrency(card.initialValueCents)} | Current:{' '}
            {formatCurrency(card.currentBalanceCents)}
          </div>
          {!loaded ? (
            <p className="text-stone-500 text-sm py-4 text-center">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-stone-500 text-sm py-4 text-center">No transactions found</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between py-2 border-b border-stone-800"
                >
                  <div>
                    <span className="text-sm capitalize text-stone-300">{txn.transactionType}</span>
                    {txn.description && (
                      <p className="text-xs text-stone-500 mt-0.5">{txn.description}</p>
                    )}
                    <p className="text-xs text-stone-600">
                      {new Date(txn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-medium ${
                        txn.amountCents >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {txn.amountCents >= 0 ? '+' : ''}
                      {formatCurrency(Math.abs(txn.amountCents))}
                    </span>
                    <p className="text-xs text-stone-500">
                      Balance: {formatCurrency(txn.balanceAfterCents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Search Bar ─────────────────────────────────────────────────────────────

function CodeSearch({
  cards,
  onSelect,
}: {
  cards: GiftCard[]
  onSelect: (card: GiftCard) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? cards.filter((c) => c.code.toLowerCase().includes(query.toLowerCase().trim()))
    : []

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by code..."
        className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
      />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-stone-800 border border-stone-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {filtered.map((card) => (
            <button
              key={card.id}
              onClick={() => {
                onSelect(card)
                setQuery('')
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-200 hover:bg-stone-700 flex items-center justify-between"
            >
              <span className="font-mono">{card.code}</span>
              <span className="text-stone-400">{formatCurrency(card.currentBalanceCents)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function GiftCardManager({
  initialCards,
  initialStats,
}: {
  initialCards: GiftCard[]
  initialStats: GiftCardStats
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null)

  function handleCancel(cardId: string) {
    startTransition(async () => {
      try {
        await cancelGiftCard(cardId)
        toast.success('Gift card cancelled')
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to cancel gift card')
      }
    })
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'redeemed':
        return 'info'
      case 'expired':
        return 'warning'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">
              {formatCurrency(initialStats.outstandingLiabilityCents)}
            </div>
            <div className="text-sm text-stone-500 mt-0.5">Outstanding (Liability)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">
              {formatCurrency(initialStats.totalIssuedCents)}
            </div>
            <div className="text-sm text-stone-500 mt-0.5">Total Issued</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">
              {formatCurrency(initialStats.totalRedeemedCents)}
            </div>
            <div className="text-sm text-stone-500 mt-0.5">Total Redeemed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">{initialStats.activeCount}</div>
            <div className="text-sm text-stone-500 mt-0.5">Active Cards</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <CodeSearch cards={initialCards} onSelect={setSelectedCard} />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBulkForm(true)}>
            Bulk Issue
          </Button>
          <Button variant="primary" onClick={() => setShowIssueForm(true)}>
            + Issue Gift Card
          </Button>
        </div>
      </div>

      {/* Card list */}
      <Card>
        <CardHeader>
          <CardTitle>Gift Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {initialCards.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              No gift cards yet. Issue your first one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Code
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Balance
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Purchaser
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Recipient
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Issued
                    </th>
                    <th className="text-right py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {initialCards.map((card) => (
                    <tr key={card.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                      <td className="py-3 pr-4">
                        <span className="font-mono text-xs bg-stone-800 px-2 py-0.5 rounded text-stone-200">
                          {card.code}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-stone-300">
                        {formatCurrency(card.currentBalanceCents)}
                        <span className="text-stone-600 text-xs ml-1">
                          / {formatCurrency(card.initialValueCents)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-stone-300 text-xs">
                        {card.purchaserName || card.purchaserEmail || '-'}
                      </td>
                      <td className="py-3 pr-4 text-stone-300 text-xs">
                        {card.recipientName || card.recipientEmail || '-'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusVariant(card.status) as any}>{card.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-stone-500 text-xs whitespace-nowrap">
                        {new Date(card.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedCard(card)}
                            className="text-xs text-brand-600 hover:text-brand-400 font-medium"
                          >
                            History
                          </button>
                          {card.status === 'active' && (
                            <button
                              onClick={() => handleCancel(card.id)}
                              disabled={pending}
                              className="text-xs text-stone-400 hover:text-red-500 font-medium"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showIssueForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-stone-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
              <h2 className="text-lg font-semibold text-stone-100">Issue Gift Card</h2>
              <button
                onClick={() => setShowIssueForm(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <IssueGiftCardForm onClose={() => setShowIssueForm(false)} />
            </div>
          </div>
        </div>
      )}

      {showBulkForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-stone-900 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
              <h2 className="text-lg font-semibold text-stone-100">Bulk Issue Gift Cards</h2>
              <button
                onClick={() => setShowBulkForm(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <BulkIssueForm onClose={() => setShowBulkForm(false)} />
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <TransactionHistory card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  )
}
