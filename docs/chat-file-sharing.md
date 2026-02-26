# Chat File Sharing Enhancement

**Date:** 2026-02-20
**Branch:** `feature/chat-file-sharing`
**Phase:** 1 of 5 (Messaging & Households Epic)

---

## What Changed

The chat system previously only supported image sharing (JPEG, PNG, WebP, HEIC). This enhancement expands it to support full document sharing including PDFs, Word documents, Excel spreadsheets, CSV files, and plain text files.

## Why

Clients and chefs need to share more than just photos. Common use cases:

- Clients sending event contracts, guest lists (Excel/CSV), or venue layouts (PDF)
- Chefs sharing menus (PDF/Word), cost breakdowns (Excel), or prep lists
- Both parties sharing any reference documents relevant to events

## Changes

### Database

**Migration:** `supabase/migrations/20260220000001_chat_file_sharing.sql`

- Added `'file'` value to the `chat_message_type` enum (additive, safe)
- Updated `update_conversation_last_message()` trigger to generate proper inbox previews for file messages: `[File: document.pdf]`

### Server Actions

**Modified:** `lib/chat/actions.ts`

- Added document type constants: PDF, DOCX, XLSX, CSV, TXT
- Images: 10MB max (unchanged)
- Documents: 25MB max (new)
- New `sendFileMessage()` action: unified upload handler that auto-detects image vs document by MIME type
- Renamed `getChatImageUrl()` to `getChatAttachmentUrl()` (old name kept as deprecated alias)

### Types

**Modified:** `lib/chat/types.ts`

- Added `'file'` to `ChatMessageType` union

### Components

**Created:** `components/chat/chat-file-upload.tsx`

- Generalized upload component replacing the image-only uploader
- Drag-and-drop support
- Image preview for photos, file icon + metadata for documents
- Type-specific file icons (red for PDF, blue for Word, green for Excel)
- Size-appropriate labels and validation

**Modified:** `components/chat/chat-message-bubble.tsx`

- Added `FileContent` renderer: displays file icon, filename, size, and download button
- Download uses signed URLs (1-hour expiry, same as images)
- Added helper functions: `getDocIcon()`, `formatBytes()`

**Modified:** `components/chat/chat-input-bar.tsx`

- Renamed `onSendImage` to `onAttach` (backward-compatible)
- Updated button title to "Attach file"

**Modified:** `components/chat/chat-view.tsx`

- Replaced `ChatImageUpload` with `ChatFileUpload`
- Updated state/handlers: `showFileUpload`, `handleSendFile`
- Uses new `sendFileMessage` action

## How It Connects

This is the foundation for the full messaging enhancement epic:

- **Phase 1 (this):** File sharing
- **Phase 2:** Client messaging UX (Message Chef button, quick replies, read receipts)
- **Phase 3:** Chef quick notes
- **Phase 4:** AI-powered chat insights
- **Phase 5:** Household linking

All files go through the same `chat-attachments` Supabase Storage bucket with tenant/conversation scoping. The existing RLS policies on `chat_messages` enforce participant-only access to all attachment types.

## Supported File Types

| Type   | Extensions            | Max Size |
| ------ | --------------------- | -------- |
| Images | JPEG, PNG, WebP, HEIC | 10MB     |
| PDF    | .pdf                  | 25MB     |
| Word   | .doc, .docx           | 25MB     |
| Excel  | .xls, .xlsx           | 25MB     |
| CSV    | .csv                  | 25MB     |
| Text   | .txt                  | 25MB     |
