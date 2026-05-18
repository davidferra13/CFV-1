import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Consulting | ChefFlow' }

export default function ConsultingRedirect() {
  redirect('/quotes/calculator')
}
