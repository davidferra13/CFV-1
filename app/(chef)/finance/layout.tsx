import { FinanceHubNav } from './finance-hub-nav'

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <FinanceHubNav />
      {children}
    </div>
  )
}
