# Storage

**What:** Local filesystem storage with signed URLs. No cloud storage dependency.

**Key files:** `lib/storage/index.ts`, `app/api/storage/[...path]/route.ts`, `app/api/storage/public/[...path]/route.ts`
**Status:** DONE

## What's Here

- Local filesystem: `./storage/{bucket}/{path}`
- Signed URLs via HMAC-SHA256
- API routes for authenticated and public file access
- Buckets: client-photos, event-documents, receipts, recipe-photos, etc.
- Upload, download, signed URL generation

## Open Items

None. Fully functional.
