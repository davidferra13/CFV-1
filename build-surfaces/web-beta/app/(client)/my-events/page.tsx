import { redirect } from 'next/navigation'

export const metadata = {
  title: 'My Events | ChefFlow Beta',
}

export default function WebBetaClientEventsPage() {
  redirect('/my-profile')
}
