import { requireChef } from '@/lib/auth/get-user'
import { requireCannabisAgreementSigned } from '@/lib/chef/cannabis-access-guards'
import { getDosingPacketData } from '@/lib/cannabis/dosing-packet-data'
import { CannabisDosingPacketPrint } from '@/components/print/cannabis-dosing-packet-print'

type Props = {
  params: Promise<{ eventId: string }>
  searchParams?: Promise<{ snapshot?: string }>
}

export default async function CannabisDosingPacketPage({ params, searchParams }: Props) {
  const user = await requireChef()
  await requireCannabisAgreementSigned(user.id)

  const { eventId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const data = await getDosingPacketData(eventId, resolvedSearchParams?.snapshot ?? null)

  return <CannabisDosingPacketPrint data={data} />
}
