// Document Comment Server Actions
// Chef-only: Add, resolve, and list comments on documents (menus, quotes, recipes, etc.)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const DocumentTypeEnum = z.enum(['menu', 'quote', 'recipe', 'contract', 'prep_sheet'])

const AddCommentSchema = z.object({
  documentType: DocumentTypeEnum,
  entityId: z.string().uuid('Entity ID must be a valid UUID'),
  authorName: z.string().min(1, 'Author name is required'),
  commentText: z.string().min(1, 'Comment text is required'),
})

export type AddCommentInput = z.infer<typeof AddCommentSchema>
export type DocumentType = z.infer<typeof DocumentTypeEnum>

// ============================================
// RETURN TYPES
// ============================================

export type DocumentComment = {
  id: string
  documentType: DocumentType
  entityId: string
  authorName: string
  commentText: string
  resolved: boolean
  createdAt: string
}

// ============================================
// HELPERS
// ============================================

function mapDocumentComment(row: any): DocumentComment {
  return {
    id: row.id,
    documentType: row.document_type,
    entityId: row.entity_id,
    authorName: row.author_name,
    commentText: row.comment_text,
    resolved: row.resolved ?? false,
    createdAt: row.created_at,
  }
}

// ============================================
// ACTIONS
// ============================================

/**
 * Add a comment to a document (menu, quote, recipe, contract, or prep sheet).
 */
export async function addComment(input: AddCommentInput) {
  const user = await requireChef()
  const validated = AddCommentSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('document_comments')
    .insert({
      chef_id: user.tenantId!,
      document_type: validated.documentType,
      entity_id: validated.entityId,
      author_name: validated.authorName,
      comment_text: validated.commentText,
    })
    .select()
    .single()

  if (error) {
    console.error('[addComment] Error:', error)
    throw new Error('Failed to add comment')
  }

  revalidatePath(`/events`)
  return { success: true, comment: mapDocumentComment(data) }
}

/**
 * Resolve a comment by setting resolved = true.
 */
export async function resolveComment(commentId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('document_comments')
    .update({ resolved: true })
    .eq('id', commentId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[resolveComment] Error:', error)
    throw new Error('Failed to resolve comment')
  }

  revalidatePath(`/events`)
  return { success: true, comment: mapDocumentComment(data) }
}

/**
 * Get all comments for a document, ordered by creation time (oldest first).
 */
export async function getComments(
  documentType: DocumentType,
  entityId: string
): Promise<DocumentComment[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('document_comments')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('document_type', documentType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getComments] Error:', error)
    throw new Error('Failed to fetch comments')
  }

  return (data ?? []).map(mapDocumentComment)
}
