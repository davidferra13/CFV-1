// API route for menu file upload processing
// Accepts file data (base64) or pasted text, processes through the pipeline

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import {
  createUploadJob,
  processUploadJob,
  processFromPastedText,
} from '@/lib/menus/upload-actions'

export async function POST(request: NextRequest) {
  try {
    await requireChef()
    const body = await request.json()

    // Pasted text mode
    if (body.pastedText) {
      const result = await processFromPastedText(body.pastedText, {
        event_date: body.eventDate,
        event_type: body.eventType,
        client_name: body.clientName,
        notes: body.notes,
      })
      return NextResponse.json(result)
    }

    // File upload mode
    if (body.fileName && body.fileData) {
      // Create job record
      const job = await createUploadJob({
        file_name: body.fileName,
        file_type: body.fileType || 'unknown',
        event_date: body.eventDate,
        event_type: body.eventType,
        client_name: body.clientName,
        notes: body.notes,
      })

      // Decode base64 to buffer
      const buffer = Buffer.from(body.fileData, 'base64')

      // Process the file
      await processUploadJob(job.id, buffer, body.fileName)

      return NextResponse.json({
        jobId: job.id,
        status: 'review',
      })
    }

    return NextResponse.json({ error: 'No file data or text provided' }, { status: 400 })
  } catch (err) {
    console.error('[menu-upload] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
