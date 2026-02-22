import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'
import { getUserCulinaryWords } from '@/lib/culinary-words/actions'
import { CulinaryBoard } from '@/components/culinary/culinary-board'

export const metadata: Metadata = {
  title: 'Culinary Board - ChefFlow',
  description:
    'The ultimate culinary composition cheat sheet — every word to inspire your next dish.',
}

/** Google Fonts for the artistic board view (handwritten chalk styles) */
const BOARD_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Permanent+Marker&family=Patrick+Hand&family=Indie+Flower&family=Rock+Salt&family=Shadows+Into+Light+Two&display=swap'

export default async function CulinaryBoardPage() {
  const user = await requireChef()
  const [userWords, admin] = await Promise.all([getUserCulinaryWords(), isAdmin()])

  return (
    <>
      {/* Load handwritten fonts for the board view */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={BOARD_FONTS_URL} />

      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-stone-900">Culinary Board</h1>
        <CulinaryBoard userWords={userWords} isAdmin={admin} />
      </div>
    </>
  )
}
