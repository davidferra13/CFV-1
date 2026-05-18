import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Backup Chef | ChefFlow' }

export default function SafetyBackupChefRedirect() {
  redirect('/settings/compliance/backup')
}
