'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createSupplier } from '@/lib/procurement/actions'
import type { SupplierDirectoryEntry } from '@/lib/procurement/types'

type Props = {
  initialSuppliers: SupplierDirectoryEntry[]
}

export function SupplierDirectory({ initialSuppliers }: Props) {
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [name, setName] = useState('')
  const [vendorType, setVendorType] = useState('grocery')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isPreferred, setIsPreferred] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addSupplier() {
    if (!name.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        await createSupplier({
          name: name.trim(),
          vendorType,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          isPreferred,
        })

        setSuppliers((prev) => [
          {
            id: `local-${Date.now()}`,
            name: name.trim(),
            vendorType,
            phone: phone || null,
            email: email || null,
            address: null,
            isPreferred,
            itemCount: 0,
            openOrderCount: 0,
          },
          ...prev,
        ])

        setName('')
        setVendorType('grocery')
        setPhone('')
        setEmail('')
        setIsPreferred(false)
      } catch (err: any) {
        setError(err?.message || 'Failed to add supplier')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SupplierDirectory</CardTitle>
        <p className="text-sm text-stone-500">
          Supplier CRM with contact details, preferred status, and purchasing context.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[1fr_130px_140px_1fr_120px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Supplier name"
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          />
          <select
            value={vendorType}
            onChange={(e) => setVendorType(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          >
            <option value="grocery">Grocery</option>
            <option value="specialty">Specialty</option>
            <option value="farm">Farm</option>
            <option value="bakery">Bakery</option>
            <option value="seafood">Seafood</option>
            <option value="meat">Meat</option>
            <option value="equipment">Equipment</option>
          </select>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          />
          <Button onClick={addSupplier} disabled={isPending || !name.trim()}>
            Add
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-400">
          <input
            type="checkbox"
            checked={isPreferred}
            onChange={(e) => setIsPreferred(e.target.checked)}
          />
          Preferred supplier
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          {suppliers.length === 0 ? (
            <p className="text-sm text-stone-500">No suppliers yet.</p>
          ) : (
            suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-lg border border-stone-700 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-stone-100">{supplier.name}</p>
                    <p className="text-xs text-stone-500">
                      {supplier.vendorType} · {supplier.phone || '--'} · {supplier.email || '--'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {supplier.isPreferred && <Badge variant="success">Preferred</Badge>}
                    <Badge variant="default">{supplier.itemCount} linked items</Badge>
                    <Badge variant="info">{supplier.openOrderCount} open orders</Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
