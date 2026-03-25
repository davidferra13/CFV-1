# Phase 3: Local Filesystem Storage (Replaces local file storage)

## What Changed

All file storage operations (upload, download, signed URLs, public URLs) now use the local filesystem instead of local file storage. Files are stored at `./storage/{bucket}/{path}` on disk.

## Files Created

| File                                        | Purpose                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `lib/storage/index.ts`                      | Core storage module: upload, download, remove, list, signed URLs, public URLs |
| `app/api/storage/[...path]/route.ts`        | Serves private files with HMAC-signed token verification                      |
| `app/api/storage/public/[...path]/route.ts` | Serves public files (chef logos, etc.) without auth                           |

## Files Modified

| File                                         | Change                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `lib/db/compat.ts`                           | `StorageBucketCompat` now delegates to `lib/storage/` instead of logging warnings |
| `lib/db/compat.ts`                           | `StorageCompat` now has `createBucket()` and `listBuckets()` methods              |
| `components/inquiries/inquiry-note-form.tsx` | Converted from browser database client to server action                           |
| `components/hub/hub-photo-gallery.tsx`       | Converted from browser database client to server action                           |
| `components/hub/hub-file-share.tsx`          | Converted from browser `@database/ssr` to server action                           |
| `lib/inquiries/note-actions.ts`              | Added `uploadInquiryNoteAttachment()` server action                               |
| `lib/hub/media-actions.ts`                   | Added `uploadHubMediaFile()` server action                                        |
| `.gitignore`                                 | Added `/storage/` directory                                                       |

## Architecture

```
Client Component
  |
  v
Server Action (FormData with file)
  |
  v
CompatClient.storage.from('bucket').upload(path, buffer)
  |
  v
lib/storage/index.ts -> fs.writeFile(STORAGE_ROOT/bucket/path)
```

For serving files:

```
Browser requests /api/storage/{bucket}/{path}?token={hmac}:{expires}
  |
  v
API route verifies HMAC-SHA256 token + expiry
  |
  v
fs.readFile(STORAGE_ROOT/bucket/path) -> Response with Content-Type
```

## Signed URLs

- HMAC-SHA256 with `NEXTAUTH_SECRET` as signing key
- Format: `/api/storage/{bucket}/{path}?token={hmac}:{expires}`
- Default expiry: 1 hour (3600 seconds)
- `verifySignedToken()` uses `crypto.timingSafeEqual` to prevent timing attacks

## Public URLs

- Format: `/api/storage/public/{bucket}/{path}`
- No token required
- Used for public buckets (chef-logos, etc.)
- Cached: `Cache-Control: public, max-age=86400`

## Storage Path

- Default: `./storage/` relative to project root
- Override: `STORAGE_PATH` environment variable
- Structure: `{STORAGE_ROOT}/{bucket}/{tenantId}/{resourceId}/{filename}`
- Directory traversal prevention: `..` and `.` segments rejected, bucket names sanitized

## Bucket Management

- `createBucket()` creates directory on disk (no-op if exists)
- `listBuckets()` lists subdirectories of storage root
- Bucket config (fileSizeLimit, allowedMimeTypes) is informational only (validated at application layer)

## What Still Uses database SDK (Browser)

The browser database client (`lib/database/client.ts`) is still imported by files that use SSE realtime. These will be migrated in Phase 3b (SSE). No browser-side storage operations remain.

## Migration for Existing Data

Existing files in local file storage Docker volumes can be copied to the local `storage/` directory:

```bash
# Copy from PostgreSQL Docker volume to local storage
docker cp database_storage:/var/lib/storage/ ./storage/
```

Or use the migration script (Phase 4 task) to pull files via the local file storage API.
