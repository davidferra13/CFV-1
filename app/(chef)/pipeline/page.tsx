import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Pipeline | ChefFlow' }

export default function PipelineRedirect() {
  redirect('/quotes')
}
