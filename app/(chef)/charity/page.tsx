import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Charity | ChefFlow' }

export default function CharityRedirect() {
  redirect('/events/charity')
}
