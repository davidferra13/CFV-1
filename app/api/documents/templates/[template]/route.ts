import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { getDocumentTemplateBySlug } from '@/lib/documents/template-catalog'

export async function GET(_: Request, { params }: { params: { template: string } }) {
  try {
    await requireChef()

    const template = getDocumentTemplateBySlug(params.template)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const absolutePath = path.join(process.cwd(), template.sourcePath)
    const contents = await readFile(absolutePath, 'utf8')

    return new NextResponse(contents, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${template.downloadName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Template download failed'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Template download failed' }, { status: 500 })
  }
}
