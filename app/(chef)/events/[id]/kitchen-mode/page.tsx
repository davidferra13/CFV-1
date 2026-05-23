// Kitchen Mode Page: Full-screen service execution UI
// Server component loads event data, passes to interactive client view.

import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getKitchenModeData } from '@/lib/kitchen/kitchen-mode-actions'
import { KitchenModeView } from '@/components/kitchen/kitchen-mode-view'

export const metadata = {
  title: 'Kitchen Mode | ChefFlow',
}

export default async function KitchenModePage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()
  const { data, error } = await getKitchenModeData(params.id)

  if (error || !data) {
    notFound()
  }

  return <KitchenModeView data={data} />
}
