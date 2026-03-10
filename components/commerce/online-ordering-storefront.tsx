// Online Ordering Storefront - public menu browsing + cart + checkout
'use client'

import { useState } from 'react'
import type {
  OnlineMenuCategory,
  OnlineMenuItem,
  RestaurantInfo,
} from '@/lib/commerce/online-order-actions'
import { OnlineMenu } from './online-menu'
import { OnlineCart, type CartItem } from './online-cart'

type Props = {
  chefSlug: string
  restaurant: RestaurantInfo
  menu: OnlineMenuCategory[]
}

export function OnlineOrderingStorefront({ chefSlug, restaurant, menu }: Props) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  function addToCart(
    item: OnlineMenuItem,
    quantity: number,
    selectedModifiers?: Array<{ name: string; option: string; priceDeltaCents: number }>,
    notes?: string
  ) {
    setCartItems((prev) => {
      // Check if the exact same item + modifiers combo exists
      const existingIdx = prev.findIndex(
        (c) =>
          c.productId === item.id &&
          JSON.stringify(c.modifiers) === JSON.stringify(selectedModifiers ?? []) &&
          c.notes === (notes ?? '')
      )

      if (existingIdx >= 0) {
        const updated = [...prev]
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity,
        }
        return updated
      }

      return [
        ...prev,
        {
          productId: item.id,
          name: item.name,
          unitPriceCents: item.price_cents,
          quantity,
          modifiers: selectedModifiers ?? [],
          notes: notes ?? '',
        },
      ]
    })

    setCartOpen(true)
  }

  function updateQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      removeItem(index)
      return
    }
    setCartItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], quantity }
      return updated
    })
  }

  function removeItem(index: number) {
    setCartItems((prev) => prev.filter((_, i) => i !== index))
  }

  function clearCart() {
    setCartItems([])
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.profileImageUrl && (
              <img
                src={restaurant.profileImageUrl}
                alt={restaurant.businessName}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-stone-900">{restaurant.businessName}</h1>
              {restaurant.address && <p className="text-sm text-stone-500">{restaurant.address}</p>}
            </div>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            Cart
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 py-6">
        {menu.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-500 text-lg">No menu items available right now.</p>
            <p className="text-stone-400 text-sm mt-2">Check back soon!</p>
          </div>
        ) : (
          <OnlineMenu categories={menu} onAddToCart={addToCart} />
        )}
      </div>

      {/* Cart Drawer */}
      <OnlineCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        chefSlug={chefSlug}
        restaurantName={restaurant.businessName}
      />
    </div>
  )
}
