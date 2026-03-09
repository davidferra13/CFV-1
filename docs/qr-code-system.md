# QR Code System

## Overview

QR codes bridge printed materials (invoices, contracts, prep lists, business cards) to live app pages. The chef or client scans with their phone camera and lands directly on the relevant page. No typing URLs, no navigating menus.

## Architecture

### Two Generation Modes

1. **Local (for PDFs):** Uses the `qrcode` npm package. Zero network calls, runs server-side. Outputs PNG buffers (PDFKit) or base64 data URLs (jsPDF).
2. **URL-based (for browser `<img>` tags):** Uses goqr.me API. Free, no key required. Returns an image URL for direct rendering.

**Rule:** PDFs always use local generation. If the external API is down, invoices and contracts still generate perfectly. Browser-rendered QR codes (settings page, briefing panel) use the URL-based approach since they're already in a browser with network access.

### Core Utility

**`lib/qr/qr-code.ts`** contains everything:

| Function                           | Use Case                             |
| ---------------------------------- | ------------------------------------ |
| `generateQrBuffer(url, size)`      | PDFKit PDFs (returns PNG Buffer)     |
| `generateQrDataUrl(url, size)`     | jsPDF PDFs (returns base64 data URL) |
| `getQrCodeUrl(data, size, format)` | Browser `<img>` tags                 |
| `getInvoicePageUrl(eventId)`       | Invoice QR destination               |
| `getClientPortalUrl(eventId)`      | Client portal QR destination         |
| `getContractPageUrl(eventId)`      | Contract QR destination              |
| `getEventPageUrl(eventId)`         | Event detail QR destination          |
| `getInquiryFormUrl(chefId)`        | Inquiry form QR destination          |
| `getEventShareUrl(token)`          | Public event share QR destination    |
| `getGuestPortalUrl(eventId, token)`| Private guest RSVP QR destination    |
| `getHubGroupUrl(groupToken)`       | Dinner circle QR destination         |
| `getGuestFeedbackUrl(token)`       | Guest feedback QR destination        |
| `getChefProfileUrl(slug)`          | Public chef profile QR destination   |
| `getChefConnectUrl(chefId)`        | Chef network connect QR destination  |
| `getGiftCardStoreUrl(slug)`        | Gift card store QR destination       |

### PDFLayout Integration

`PDFLayout` (jsPDF wrapper) has a `qrCode()` method that any document can call:

```ts
pdf.qrCode(qrDataUrl, 22, 'Scan to view online', 'right')
```

Parameters: data URL, size in mm, optional label, alignment (left/right/center). If the data URL is null (generation failed), it renders nothing. Non-blocking by design.

## Where QR Codes Appear

### Currently Implemented

| Document                  | QR Points To                    | Method                                            |
| ------------------------- | ------------------------------- | ------------------------------------------------- |
| Invoice PDF (PDFKit)      | `/my-events/[eventId]/invoice`  | `generateQrBuffer` embedded via `doc.image()`     |
| Contract PDF (jsPDF)      | `/my-events/[eventId]/contract` | `generateQrDataUrl` embedded via `pdf.qrCode()`   |
| Staff Briefing Panel      | `/events/[eventId]`             | `getQrCodeUrl` via `<img>` tag                    |
| Settings > Website Widget | `/embed/inquiry/[chefId]`       | `getQrCodeUrl` via `<img>` tag + download links   |
| Settings > Website Widget | `/chef/[slug]`                  | `DownloadableQrCard` public profile QR             |
| Settings > Public Profile | `/chef/[slug]`                  | `DownloadableQrCard` public profile QR             |
| Event detail > Client Portal | `/my-events/[eventId]`       | `DownloadableQrCard` client portal QR              |
| Event detail > Share QR   | `/share/[token]`                | `DownloadableQrCard` public guest share QR         |
| Event detail > Guest Invite QR | `/event/[eventId]/guest/[token]` | `QrLinkSelector` guest-specific RSVP QR      |
| Event detail > Guest Feedback QR | `/guest-feedback/[token]` | `QrLinkSelector` guest testimonial QR              |
| Event detail > Dinner Circle | `/hub/g/[groupToken]`         | `DownloadableQrCard` circle join QR                |
| Chef Community > Connections | `/network/connect/[chefId]`  | `DownloadableQrCard` chef connect QR               |
| Clients > Gift Cards      | `/chef/[slug]/gift-cards`       | `DownloadableQrCard` gift storefront QR            |
| FOH Menu PDF (jsPDF)      | `/events/[eventId]`             | `generateQrDataUrl` embedded via `doc.addImage()` | 

### Non-Blocking Design

All QR code generation is wrapped in try/catch. If QR generation fails for any reason, the document still generates normally, just without the QR. No crashes, no missing documents.

## Future Expansion

Adding QR to any new document:

**For PDFKit documents:**

```ts
import { generateQrBuffer } from '@/lib/qr/qr-code'
const qrBuffer = await generateQrBuffer('https://app.cheflowhq.com/some-path')
if (qrBuffer) doc.image(qrBuffer, x, y, { width: 64 })
```

**For jsPDF documents (via PDFLayout):**

```ts
import { generateQrDataUrl } from '@/lib/qr/qr-code'
const qrDataUrl = await generateQrDataUrl('https://app.cheflowhq.com/some-path')
pdf.qrCode(qrDataUrl, 22, 'Scan to view', 'right')
```

**For browser components:**

```tsx
import { getQrCodeUrl } from '@/lib/qr/qr-code'
;<img src={getQrCodeUrl('https://app.cheflowhq.com/some-path', 200)} />
```

## Potential Next Steps

- Post-event referral cards (QR to inquiry form with referral tracking)
- Menu cards at events (QR to event menu page with allergen info)
- Feedback collection (QR to post-event rating form, when built)
- Printable prep list with QR to event recipes
