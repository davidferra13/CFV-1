import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Dashboard | ChefFlow Beta',
}

export default function WebBetaChefDashboardPage() {
  redirect('/onboarding')
}
