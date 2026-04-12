// Menu Doc Editor Page
// Google Doc-style menu editor with event context sidebar.
// Protected: chef-only via layout.

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'
import { getEditorContext } from '@/lib/menus/editor-actions'
import { notFound } from 'next/navigation'

const MenuDocEditor = dynamic(
  () => import('@/components/menus/menu-doc-editor').then((m) => m.MenuDocEditor),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-brand-500" />
      </div>
    ),
  }
)

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const context = await getEditorContext(id)
  return {
    title: context ? `Edit: ${context.menu.name}` : 'Menu Editor',
  }
}

export default async function MenuEditorPage({ params }: Props) {
  const user = await requireChef()
  const { id } = await params

  const context = await getEditorContext(id)

  if (!context) {
    notFound()
  }

  return (
    <MenuDocEditor
      menu={context.menu}
      event={context.event}
      previousMenus={context.previousMenus}
      chefId={user.entityId}
      directClient={context.directClient ?? null}
    />
  )
}
