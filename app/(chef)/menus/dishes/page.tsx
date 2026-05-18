import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

// Old dish index page - redirect to the new location

export const metadata: Metadata = { title: 'Dishes | ChefFlow' }

export default function OldDishIndexRedirect() {
  redirect('/culinary/dish-index')
}
