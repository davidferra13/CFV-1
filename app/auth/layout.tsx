// Auth Layout - Provides metadata template for auth pages

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s - ChefFlow',
    default: 'Authentication - ChefFlow',
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
