import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getUploadJobs } from '@/lib/menus/upload-actions'
import { MenuUploadClient } from './upload-client'

export const metadata: Metadata = { title: 'Upload Menus' }

export default async function MenuUploadPage() {
  await requireChef()
  const jobs = await getUploadJobs()

  return <MenuUploadClient initialJobs={jobs} />
}
