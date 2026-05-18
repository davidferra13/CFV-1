import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Payments | ChefFlow' }

export default function PaymentsRedirect() {
  redirect('/finance/payments')
}
