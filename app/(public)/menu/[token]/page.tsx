import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getFOHMenuDataByToken } from '@/lib/menus/foh-public-actions'
import { FrontOfHouseMenu } from '@/components/menus/front-of-house-menu'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const data = await getFOHMenuDataByToken(token)

  if (!data) {
    return { title: 'Menu Not Found' }
  }

  const courseCount = data.courses.length
  const description = data.chefName
    ? `${courseCount} course${courseCount !== 1 ? 's' : ''} by ${data.chefName}`
    : `${courseCount} course menu`

  return {
    title: data.title,
    description,
    openGraph: {
      title: data.title,
      description,
      images: [`/api/menu-image/${data.menuId}`],
      type: 'article',
    },
  }
}

export default async function PublicMenuPage({ params }: Props) {
  const { token } = await params
  const data = await getFOHMenuDataByToken(token)

  if (!data) {
    notFound()
  }

  return <FrontOfHouseMenu data={data} showControls={false} />
}
