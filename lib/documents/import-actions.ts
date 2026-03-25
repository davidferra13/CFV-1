// Document Import Server Actions
// Chef-only: Create documents from AI-parsed data

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { ParsedDocument } from '@/lib/ai/parse-document-text'

/**
 * Import a parsed document into the chef_documents table
 */
export async function importDocument(
  parsed: ParsedDocument,
  sourceType: string = 'text_import',
  sourceFilename?: string
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_documents')
    .insert({
      tenant_id: user.tenantId!,
      title: parsed.title,
      document_type: parsed.document_type,
      content_text: parsed.content_text,
      summary: parsed.summary,
      key_terms: parsed.key_terms as any,
      tags: parsed.tags,
      source_type: sourceType,
      source_filename: sourceFilename || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[importDocument] Error:', error)
    throw new Error('Failed to import document')
  }

  revalidatePath('/import')
  return { success: true, document: data }
}
