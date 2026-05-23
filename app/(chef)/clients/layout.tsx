import type { ReactNode } from 'react'
import { ClientsHubNav } from './clients-hub-nav'

export default function ClientsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-x-hidden">
      <ClientsHubNav />
      {children}
    </div>
  )
}
