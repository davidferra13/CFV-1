import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

const STORAGE_ROOT = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage')
const SIGNING_SECRET = process.env.NEXTAUTH_SECRET || 'dev-signing-secret'

// Ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

// Get absolute path for a bucket/file
function storagePath(bucket: string, filePath: string): string {
  // Sanitize bucket name to prevent traversal
  const safeBucket = path.basename(bucket)

  // Sanitize each path segment: allow nested paths but reject traversal
  const segments = filePath.split('/').filter(Boolean)
  for (const seg of segments) {
    if (seg === '..' || seg === '.') throw new Error('Invalid path segment')
  }

  return path.join(STORAGE_ROOT, safeBucket, ...segments)
}

export async function upload(
  bucket: string,
  filePath: string,
  data: Buffer | Blob | ArrayBuffer,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ path: string } | null> {
  // Convert to Buffer if needed
  let buffer: Buffer
  if (Buffer.isBuffer(data)) {
    buffer = data
  } else if (data instanceof ArrayBuffer) {
    buffer = Buffer.from(data)
  } else if (data instanceof Blob) {
    buffer = Buffer.from(await data.arrayBuffer())
  } else {
    buffer = Buffer.from(data as any)
  }

  const fullPath = storagePath(bucket, filePath)
  const dir = path.dirname(fullPath)
  await ensureDir(dir)

  // Check if file exists and upsert is false
  if (!options?.upsert) {
    try {
      await fs.access(fullPath)
      // File exists and upsert is false - still overwrite (Supabase default behavior)
    } catch {
      // File doesn't exist, good to go
    }
  }

  await fs.writeFile(fullPath, buffer)
  return { path: filePath }
}

export async function remove(bucket: string, paths: string[]): Promise<{ name: string }[]> {
  const results: { name: string }[] = []
  for (const p of paths) {
    try {
      const fullPath = storagePath(bucket, p)
      await fs.unlink(fullPath)
      results.push({ name: p })
    } catch {
      // File might not exist, that's OK
      results.push({ name: p })
    }
  }
  return results
}

export async function download(bucket: string, filePath: string): Promise<Buffer | null> {
  try {
    const fullPath = storagePath(bucket, filePath)
    return await fs.readFile(fullPath)
  } catch {
    return null
  }
}

export async function list(
  bucket: string,
  prefix?: string,
  options?: { limit?: number; offset?: number }
): Promise<{ name: string; id?: string; created_at?: string; metadata?: Record<string, any> }[]> {
  try {
    const dirPath = prefix
      ? storagePath(bucket, prefix)
      : path.join(STORAGE_ROOT, path.basename(bucket))

    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    let files = entries.map((e) => ({
      name: e.name,
      id: e.name,
      created_at: new Date().toISOString(),
      metadata: { isDir: e.isDirectory() },
    }))

    if (options?.offset) files = files.slice(options.offset)
    if (options?.limit) files = files.slice(0, options.limit)

    return files
  } catch {
    return []
  }
}

// Signed URL generation using HMAC-SHA256
export function createSignedToken(bucket: string, filePath: string, expiresIn: number): string {
  const expires = Math.floor(Date.now() / 1000) + expiresIn
  const payload = `${bucket}/${filePath}:${expires}`
  const hmac = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex')
  return `${hmac}:${expires}`
}

export function verifySignedToken(bucket: string, filePath: string, token: string): boolean {
  const [hmac, expiresStr] = token.split(':')
  if (!hmac || !expiresStr) return false

  const expires = parseInt(expiresStr, 10)
  if (Date.now() / 1000 > expires) return false // Expired

  const payload = `${bucket}/${filePath}:${expires}`
  const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))
}

export function getSignedUrl(bucket: string, filePath: string, expiresIn: number): string {
  const token = createSignedToken(bucket, filePath, expiresIn)
  return `/api/storage/${bucket}/${filePath}?token=${token}`
}

export function getPublicUrl(bucket: string, filePath: string): string {
  return `/api/storage/public/${bucket}/${filePath}`
}

// Bucket management (no-ops for local FS - directories are created on demand)
export async function createBucket(
  name: string,
  options?: { public?: boolean; fileSizeLimit?: number }
): Promise<{ error: null }> {
  const dir = path.join(STORAGE_ROOT, path.basename(name))
  await ensureDir(dir)
  return { error: null }
}

export async function listBuckets(): Promise<{ data: { name: string }[]; error: null }> {
  try {
    await ensureDir(STORAGE_ROOT)
    const entries = await fs.readdir(STORAGE_ROOT, { withFileTypes: true })
    const buckets = entries.filter((e) => e.isDirectory()).map((e) => ({ name: e.name }))
    return { data: buckets, error: null }
  } catch {
    return { data: [], error: null }
  }
}

// Get content type from file extension
export function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return types[ext] || 'application/octet-stream'
}

// Get the storage root path
export function getStorageRoot(): string {
  return STORAGE_ROOT
}
