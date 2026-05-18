import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Knowledge Base | ChefFlow' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
