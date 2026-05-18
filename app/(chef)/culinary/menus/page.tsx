// Consolidated: /culinary/menus now redirects to the canonical menu hub at /menus.
// Sub-routes (/culinary/menus/engineering, /culinary/menus/templates, etc.) remain at their original paths.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Culinary Menus | ChefFlow' }

export default function CulinaryMenusRedirect() {
  redirect('/menus')
}
