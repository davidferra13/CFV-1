import { redirect } from 'next/navigation'

export default function SafetyBackupChefRedirect() {
  redirect('/settings/compliance/backup')
}
