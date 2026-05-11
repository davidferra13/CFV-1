import { CulinaryHubNav } from './culinary-hub-nav'

export default function CulinaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <CulinaryHubNav />
      {children}
    </div>
  )
}
