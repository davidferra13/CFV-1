import { redirect } from 'next/navigation'

export default function HubOverviewRedirect() {
  redirect('/circles/admin')
}
