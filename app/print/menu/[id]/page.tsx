// Print Menu - Front-of-House View
// Uses the canonical FrontOfHouseMenu component with customization controls.

import { getFOHMenuData } from '@/lib/menus/foh-menu-actions'
import { notFound } from 'next/navigation'
import { PrintMenuClient } from './print-menu-client'

type Props = {
  params: Promise<{ id: string }>
}

export default async function PrintMenuPage({ params }: Props) {
  const { id } = await params
  const data = await getFOHMenuData(id)

  if (!data) notFound()

  return <PrintMenuClient data={data} />
}
