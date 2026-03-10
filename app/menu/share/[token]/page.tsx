// Public shareable menu view
// No auth required - accessed via unique share token
// Shows the front-of-house menu HTML, optionally with pricing

import { getSharedMenuByToken } from '@/lib/scaling/shareable-menu'
import { notFound } from 'next/navigation'

export default async function SharedMenuPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const menu = await getSharedMenuByToken(token)

  if (!menu) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Render the FOH menu HTML */}
        <div dangerouslySetInnerHTML={{ __html: menu.html }} className="foh-menu-content" />

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Powered by ChefFlow</p>
        </div>
      </div>
    </div>
  )
}
