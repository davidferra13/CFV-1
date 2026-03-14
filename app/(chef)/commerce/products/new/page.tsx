// New Product Page
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { ProductForm } from '@/components/commerce/product-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'New Product — ChefFlow' }

export default async function NewProductPage() {
  await requireChef()
  await requirePro('commerce')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/commerce/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Products
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">New Product</h1>
      </div>
      <ProductForm />
    </div>
  )
}
