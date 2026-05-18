import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Services | ChefFlow' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
