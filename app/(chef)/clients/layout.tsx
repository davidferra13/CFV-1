import type { ReactNode } from 'react'
import { ClientsHubNav } from './clients-hub-nav'

export default function ClientsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <ClientsHubNav />
      {children}
    </div>
  )
}
