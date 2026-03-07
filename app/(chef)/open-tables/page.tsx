// Chef Open Tables Dashboard - View open tables, review join requests
import { requireChef } from '@/lib/auth/get-user'
import { OpenTablesChefDashboard } from './open-tables-dashboard'

export const metadata = {
  title: 'Open Tables | ChefFlow',
  description: 'Manage open tables and review join requests',
}

export default async function OpenTablesPage() {
  await requireChef()
  return <OpenTablesChefDashboard />
}
