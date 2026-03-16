// Product Catalog Page - list, search, manage products
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { listProducts } from '@/lib/commerce/product-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from '@/components/ui/icons'
import { ProductCatalog } from '@/components/commerce/product-catalog'

export const metadata: Metadata = { title: 'Products | ChefFlow' }

export default async function ProductsPage() {
  await requireChef()
  await requirePro('commerce')

  const { products, total } = await listProducts({ activeOnly: false })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-stone-100">Products</h1>
          <Badge variant="default">{total}</Badge>
        </div>
        <Link href="/commerce/products/new">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            New Product
          </Button>
        </Link>
      </div>

      <ProductCatalog products={products} />
    </div>
  )
}
