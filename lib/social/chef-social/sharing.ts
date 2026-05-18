'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// SHARING / SAVES
// ============================================================

export async function toggleSavePost(postId: string) {
  const user = await requireChef()
  z.string().uuid().parse(postId)
  const db = createServerClient({ admin: true })

  const { data: existing } = await db
    .from('chef_post_saves')
    .select('id')
    .eq('post_id', postId)
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (existing) {
    await db
      .from('chef_post_saves')
      .delete()
      .eq('id', (existing as any).id)
    revalidatePath('/network')
    return { saved: false }
  } else {
    await db.from('chef_post_saves').insert({ post_id: postId, chef_id: user.entityId })
    revalidatePath('/network')
    return { saved: true }
  }
}
