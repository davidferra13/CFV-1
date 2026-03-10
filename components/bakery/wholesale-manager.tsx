'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  createWholesaleAccount,
  updateWholesaleAccount,
  deleteWholesaleAccount,
  createWholesaleOrder,
  updateWholesaleOrder,
  generateInvoice,
  type WholesaleAccount,
  type WholesaleOrder,
  type WholesaleOrderItem,
} from '@/lib/bakery/wholesale-actions'

type Tab = 'accounts' | 'orders'

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  net_7: 'Net 7',
  net_15: 'Net 15',
  net_30: 'Net 30',
}

const ORDER_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  producing: 'info',
  ready: 'success',
  delivered: 'success',
  invoiced: 'warning',
  paid: 'success',
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function WholesaleManager({
  initialAccounts,
  initialOrders,
  initialBalances,
}: {
  initialAccounts: WholesaleAccount[]
  initialOrders: WholesaleOrder[]
  initialBalances: Array<{
    id: string
    business_name: string
    payment_terms: string
    outstanding_cents: number
  }>
}) {
  const [tab, setTab] = useState<Tab>('accounts')
  const [accounts, setAccounts] = useState(initialAccounts)
  const [orders, setOrders] = useState(initialOrders)
  const [balances, setBalances] = useState(initialBalances)
  const [isPending, startTransition] = useTransition()

  // Account form state
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountForm, setAccountForm] = useState({
    business_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    payment_terms: 'cod',
    discount_percent: 0,
    notes: '',
  })

  // Order form state
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderForm, setOrderForm] = useState({
    account_id: '',
    delivery_date: '',
    notes: '',
  })
  const [orderItems, setOrderItems] = useState<WholesaleOrderItem[]>([
    { product_name: '', quantity: 1, unit_price_cents: 0 },
  ])

  // ============================================================
  // Account handlers
  // ============================================================

  function handleCreateAccount() {
    if (!accountForm.business_name.trim()) {
      toast.error('Business name is required')
      return
    }

    const previous = [...accounts]
    startTransition(async () => {
      try {
        const account = await createWholesaleAccount({
          business_name: accountForm.business_name,
          contact_name: accountForm.contact_name || null,
          contact_email: accountForm.contact_email || null,
          contact_phone: accountForm.contact_phone || null,
          address: accountForm.address || null,
          payment_terms: accountForm.payment_terms,
          discount_percent: accountForm.discount_percent,
          notes: accountForm.notes || null,
        })
        setAccounts([...accounts, account as WholesaleAccount])
        setShowAccountForm(false)
        setAccountForm({
          business_name: '',
          contact_name: '',
          contact_email: '',
          contact_phone: '',
          address: '',
          payment_terms: 'cod',
          discount_percent: 0,
          notes: '',
        })
        toast.success('Account created')
      } catch (err) {
        setAccounts(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to create account')
      }
    })
  }

  function handleToggleAccount(account: WholesaleAccount) {
    const previous = [...accounts]
    const updated = accounts.map((a) =>
      a.id === account.id ? { ...a, is_active: !a.is_active } : a
    )
    setAccounts(updated)

    startTransition(async () => {
      try {
        await updateWholesaleAccount(account.id, { is_active: !account.is_active })
        toast.success(account.is_active ? 'Account deactivated' : 'Account reactivated')
      } catch (err) {
        setAccounts(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to update account')
      }
    })
  }

  function handleDeleteAccount(id: string) {
    if (!confirm('Delete this wholesale account? This cannot be undone.')) return

    const previous = [...accounts]
    setAccounts(accounts.filter((a) => a.id !== id))

    startTransition(async () => {
      try {
        await deleteWholesaleAccount(id)
        toast.success('Account deleted')
      } catch (err) {
        setAccounts(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to delete account')
      }
    })
  }

  // ============================================================
  // Order handlers
  // ============================================================

  function handleCreateOrder() {
    if (!orderForm.account_id) {
      toast.error('Select an account')
      return
    }
    if (!orderForm.delivery_date) {
      toast.error('Delivery date is required')
      return
    }
    const validItems = orderItems.filter((i) => i.product_name.trim() && i.quantity > 0)
    if (validItems.length === 0) {
      toast.error('Add at least one item')
      return
    }

    startTransition(async () => {
      try {
        const order = await createWholesaleOrder({
          account_id: orderForm.account_id,
          order_date: new Date().toISOString().split('T')[0],
          delivery_date: orderForm.delivery_date,
          items: validItems,
          notes: orderForm.notes || null,
        })
        setOrders([order as WholesaleOrder, ...orders])
        setShowOrderForm(false)
        setOrderForm({ account_id: '', delivery_date: '', notes: '' })
        setOrderItems([{ product_name: '', quantity: 1, unit_price_cents: 0 }])
        toast.success('Order created')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create order')
      }
    })
  }

  function handleUpdateOrderStatus(orderId: string, status: string) {
    const previous = [...orders]
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status } : o)))

    startTransition(async () => {
      try {
        await updateWholesaleOrder(orderId, { status })
        toast.success(`Status updated to ${status}`)
      } catch (err) {
        setOrders(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  function handleGenerateInvoice(orderId: string) {
    startTransition(async () => {
      try {
        const updated = await generateInvoice(orderId)
        setOrders(
          orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: 'invoiced',
                  invoice_number: (updated as WholesaleOrder).invoice_number,
                }
              : o
          )
        )
        toast.success(`Invoice generated: ${(updated as WholesaleOrder).invoice_number}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to generate invoice')
      }
    })
  }

  function addOrderItem() {
    setOrderItems([...orderItems, { product_name: '', quantity: 1, unit_price_cents: 0 }])
  }

  function removeOrderItem(index: number) {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  function updateOrderItem(index: number, field: keyof WholesaleOrderItem, value: string | number) {
    const updated = [...orderItems]
    if (field === 'product_name') {
      updated[index] = { ...updated[index], product_name: value as string }
    } else if (field === 'quantity') {
      updated[index] = { ...updated[index], quantity: Number(value) || 0 }
    } else if (field === 'unit_price_cents') {
      updated[index] = { ...updated[index], unit_price_cents: Math.round(Number(value) * 100) }
    }
    setOrderItems(updated)
  }

  const orderSubtotal = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0
  )
  const selectedAccount = accounts.find((a) => a.id === orderForm.account_id)
  const orderDiscount = selectedAccount
    ? Math.round(orderSubtotal * (selectedAccount.discount_percent / 100))
    : 0
  const orderTotal = orderSubtotal - orderDiscount

  const totalOutstanding = balances.reduce((sum, b) => sum + b.outstanding_cents, 0)

  return (
    <div className="space-y-6">
      {/* Outstanding Balance Summary */}
      {totalOutstanding > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold">{formatCents(totalOutstanding)}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {balances.filter((b) => b.outstanding_cents > 0).length} accounts with balances
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'accounts' ? 'primary' : 'ghost'}
          onClick={() => setTab('accounts')}
        >
          Accounts
        </Button>
        <Button variant={tab === 'orders' ? 'primary' : 'ghost'} onClick={() => setTab('orders')}>
          Orders
        </Button>
      </div>

      {/* ============================================================ */}
      {/* Accounts Tab */}
      {/* ============================================================ */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Wholesale Accounts</h2>
            <Button variant="primary" onClick={() => setShowAccountForm(!showAccountForm)}>
              {showAccountForm ? 'Cancel' : 'New Account'}
            </Button>
          </div>

          {/* New Account Form */}
          {showAccountForm && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Business Name *</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={accountForm.business_name}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, business_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Name</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={accountForm.contact_name}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, contact_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={accountForm.contact_email}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, contact_email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={accountForm.contact_phone}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, contact_phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={accountForm.address}
                      onChange={(e) => setAccountForm({ ...accountForm, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Terms</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={accountForm.payment_terms}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, payment_terms: e.target.value })
                      }
                    >
                      <option value="cod">Cash on Delivery</option>
                      <option value="net_7">Net 7</option>
                      <option value="net_15">Net 15</option>
                      <option value="net_30">Net 30</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Discount %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={accountForm.discount_percent}
                      onChange={(e) =>
                        setAccountForm({
                          ...accountForm,
                          discount_percent: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                    value={accountForm.notes}
                    onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleCreateAccount} disabled={isPending}>
                    {isPending ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account List */}
          {accounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No wholesale accounts yet. Create one to start managing B2B orders.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const balance = balances.find((b) => b.id === account.id)
                return (
                  <Card key={account.id} className={!account.is_active ? 'opacity-60' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{account.business_name}</h3>
                            {!account.is_active && <Badge variant="default">Inactive</Badge>}
                            <Badge variant="info">
                              {PAYMENT_TERMS_LABELS[account.payment_terms]}
                            </Badge>
                            {account.discount_percent > 0 && (
                              <Badge variant="success">{account.discount_percent}% off</Badge>
                            )}
                          </div>
                          {account.contact_name && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {account.contact_name}
                              {account.contact_email && ` - ${account.contact_email}`}
                              {account.contact_phone && ` - ${account.contact_phone}`}
                            </p>
                          )}
                          {balance && balance.outstanding_cents > 0 && (
                            <p className="text-sm text-orange-500 mt-1">
                              Outstanding: {formatCents(balance.outstanding_cents)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => handleToggleAccount(account)}
                            disabled={isPending}
                          >
                            {account.is_active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleDeleteAccount(account.id)}
                            disabled={isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Orders Tab */}
      {/* ============================================================ */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Wholesale Orders</h2>
            <Button variant="primary" onClick={() => setShowOrderForm(!showOrderForm)}>
              {showOrderForm ? 'Cancel' : 'New Order'}
            </Button>
          </div>

          {/* New Order Form */}
          {showOrderForm && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Account *</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={orderForm.account_id}
                      onChange={(e) => setOrderForm({ ...orderForm, account_id: e.target.value })}
                    >
                      <option value="">Select account...</option>
                      {accounts
                        .filter((a) => a.is_active)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.business_name}
                            {a.discount_percent > 0 ? ` (${a.discount_percent}% discount)` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Delivery Date *</label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={orderForm.delivery_date}
                      onChange={(e) =>
                        setOrderForm({ ...orderForm, delivery_date: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <label className="block text-sm font-medium mb-2">Items</label>
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Product name"
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={item.product_name}
                        onChange={(e) => updateOrderItem(idx, 'product_name', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        min={1}
                        className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(idx, 'quantity', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Price ($)"
                        step="0.01"
                        min={0}
                        className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={
                          item.unit_price_cents > 0 ? (item.unit_price_cents / 100).toFixed(2) : ''
                        }
                        onChange={(e) => updateOrderItem(idx, 'unit_price_cents', e.target.value)}
                      />
                      {orderItems.length > 1 && (
                        <Button variant="ghost" onClick={() => removeOrderItem(idx)}>
                          x
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="ghost" onClick={addOrderItem}>
                    + Add Item
                  </Button>
                </div>

                {/* Order Totals */}
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCents(orderSubtotal)}</span>
                  </div>
                  {orderDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({selectedAccount?.discount_percent}%)</span>
                      <span>-{formatCents(orderDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCents(orderTotal)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleCreateOrder} disabled={isPending}>
                    {isPending ? 'Creating...' : 'Create Order'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order List */}
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No wholesale orders yet. Create one from an active account.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const items = order.items as WholesaleOrderItem[]
                const accountName = order.wholesale_accounts?.business_name || 'Unknown Account'
                return (
                  <Card key={order.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{accountName}</h3>
                            <Badge variant={ORDER_STATUS_VARIANT[order.status] || 'default'}>
                              {order.status}
                            </Badge>
                            {order.invoice_number && (
                              <Badge variant="info">{order.invoice_number}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Delivery: {order.delivery_date}
                          </p>
                          <p className="text-sm mt-1">
                            {Array.isArray(items) ? items.length : 0} items -{' '}
                            {formatCents(order.total_cents)}
                            {order.discount_cents > 0 && (
                              <span className="text-green-600 ml-2">
                                (saved {formatCents(order.discount_cents)})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <Button
                              variant="primary"
                              onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                              disabled={isPending}
                            >
                              Confirm
                            </Button>
                          )}
                          {order.status === 'confirmed' && (
                            <Button
                              variant="primary"
                              onClick={() => handleUpdateOrderStatus(order.id, 'producing')}
                              disabled={isPending}
                            >
                              Start Production
                            </Button>
                          )}
                          {order.status === 'producing' && (
                            <Button
                              variant="primary"
                              onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                              disabled={isPending}
                            >
                              Mark Ready
                            </Button>
                          )}
                          {order.status === 'ready' && (
                            <Button
                              variant="primary"
                              onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                              disabled={isPending}
                            >
                              Mark Delivered
                            </Button>
                          )}
                          {order.status === 'delivered' && (
                            <Button
                              variant="secondary"
                              onClick={() => handleGenerateInvoice(order.id)}
                              disabled={isPending}
                            >
                              Generate Invoice
                            </Button>
                          )}
                          {order.status === 'invoiced' && (
                            <Button
                              variant="primary"
                              onClick={() => handleUpdateOrderStatus(order.id, 'paid')}
                              disabled={isPending}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
