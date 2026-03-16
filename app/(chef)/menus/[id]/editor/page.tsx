// Menu Doc Editor Page
// Google Doc-style menu editor with event context sidebar.
// Protected: chef-only via layout.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getEditorContext } from '@/lib/menus/editor-actions'
import { notFound } from 'next/navigation'
import { MenuDocEditor } from '@/components/menus/menu-doc-editor'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const context = await getEditorContext(id)
  return {
    title: context ? `Edit: ${context.menu.name} | ChefFlow` : 'Menu Editor | ChefFlow',
  }
}

export default async function MenuEditorPage({ params }: Props) {
  await requireChef()
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
    />
  )
}
