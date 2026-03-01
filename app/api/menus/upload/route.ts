// API route for menu file upload processing
// Accepts FormData (file upload) or JSON (pasted text)

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  createUploadJob,
  processUploadJob,
  processFromPastedText,
  checkDuplicateUpload,
} from '@/lib/menus/upload-actions'

const MENU_UPLOADS_BUCKET = 'menu-uploads'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB (reduced from 50 MB to limit DoS via large file processing)

// Allowed file extensions for menu uploads — reject everything else
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'txt',
  'rtf', // documents
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic', // images (for OCR)
  'csv',
  'xls',
  'xlsx', // spreadsheets
])

export async function POST(request: NextRequest) {
  // Rate limit: 10 uploads per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`menu-upload:${ip}`, 10, 60_000)
  } catch {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const contentType = request.headers.get('content-type') || ''

    // JSON body = pasted text mode
    if (contentType.includes('application/json')) {
      const body = await request.json()

      if (!body.pastedText) {
        return NextResponse.json({ error: 'No pasted text provided' }, { status: 400 })
      }

      const result = await processFromPastedText(body.pastedText, {
        event_date: body.eventDate,
        event_type: body.eventType,
        client_name: body.clientName,
        notes: body.notes,
      })
      return NextResponse.json(result)
    }

    // FormData = file upload mode
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.` },
        { status: 400 }
      )
    }

    // Validate file extension — reject executable, script, and unknown file types
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `File type ".${ext}" is not allowed. Accepted: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Read file into buffer early — needed for hash and processing
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Compute SHA-256 hash for duplicate detection
    const fileHash = createHash('sha256').update(buffer).digest('hex')

    // Check for duplicate upload
    const duplicate = await checkDuplicateUpload(fileHash)
    if (duplicate) {
      return NextResponse.json(
        {
          error: `This file was already uploaded on ${new Date(duplicate.created_at).toLocaleDateString()} ("${duplicate.file_name}"). Status: ${duplicate.status}.`,
          duplicate: true,
          existingJobId: duplicate.id,
        },
        { status: 409 }
      )
    }

    // Sanitize filename to prevent path traversal (e.g., "../../etc/passwd")
    // Strip directory components, control chars, and non-printable characters
    const rawName = file.name
    const baseName = rawName.split(/[\\/]/).pop() || 'upload' // strip directory separators
    const fileName =
      baseName
        .replace(/\.\./g, '') // strip parent-dir traversal
        .replace(/[^\w.\-\s]/g, '_') // keep only safe chars
        .slice(0, 200) || // cap length
      'upload'
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'bin'

    // Create the upload job record with file hash
    const job = await createUploadJob({
      file_name: fileName,
      file_type: fileExt,
      file_hash: fileHash,
      event_date: (formData.get('eventDate') as string) || undefined,
      event_type: (formData.get('eventType') as string) || undefined,
      client_name: (formData.get('clientName') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    })

    // Store the original file in Supabase Storage
    const supabase: any = createServerClient()
    const storagePath = `${tenantId}/${job.id}/${fileName}`

    const { error: storageError } = await supabase.storage
      .from(MENU_UPLOADS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (storageError) {
      console.error('[menu-upload] Storage upload failed:', storageError)
      // Non-blocking — processing can still work from the buffer
    } else {
      // Save the storage path to the job record
      await supabase
        .from('menu_upload_jobs')
        .update({ file_storage_path: storagePath })
        .eq('id', job.id)
        .eq('tenant_id', tenantId)
    }

    // Process the file (extract text → parse → save)
    await processUploadJob(job.id, buffer, fileName)

    return NextResponse.json({
      jobId: job.id,
      status: 'review',
    })
  } catch (err) {
    console.error('[menu-upload] Error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
