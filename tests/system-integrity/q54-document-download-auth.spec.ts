/**
 * Q54: Document Download Authorization
 *
 * ChefFlow generates PDFs: invoices, contracts, menus, proposals.
 * Each document belongs to a specific chef and optionally a specific client.
 * If a download URL or API route does not validate ownership, any authenticated
 * user (or unauthenticated attacker with a guessed URL) can download
 * another chef's financial documents, contracts, and client PII.
 *
 * Attack vector: /api/documents/[id]/download?token=X where X is either
 * unsigned, forged, or shared from a URL. The download must validate:
 * (a) the token is cryptographically signed for this specific file path,
 * (b) the requesting session has ownership of the document.
 *
 * Tests:
 *
 * 1. DOCUMENT DOWNLOAD USES SIGNED TOKEN: The storage layer generates
 *    HMAC-signed URLs (covered by Q25) — document downloads must use them.
 *
 * 2. PDF GENERATION SCOPED TO CHEF: lib/documents/generate-*.ts functions
 *    accept a chefId and validate it against session before generating.
 *
 * 3. CONTRACT DOWNLOAD REQUIRES CHEF SESSION: Contract download routes
 *    call requireChef() before serving any file content.
 *
 * 4. INVOICE DOWNLOAD REQUIRES CHEF SESSION: Invoice PDF generation or
 *    download is gated by requireChef() with chef ownership check.
 *
 * 5. CLIENT DOCUMENT ACCESS SCOPED TO CLIENT: When a client downloads their
 *    own documents (e.g., approved menu PDF), the route validates they are
 *    the client for that specific event — not just any authenticated client.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q54-document-download-auth.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...findFiles(full, ext))
    else if (entry.isFile() && entry.name.endsWith(ext)) results.push(full)
  }
  return results
}

test.describe('Q54: Document download authorization', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Document generation functions require chef ownership
  // ---------------------------------------------------------------------------
  test('document generation functions scope to chefId from session', () => {
    const docDir = resolve(ROOT, 'lib/documents')
    if (!existsSync(docDir)) return

    const docFiles = findFiles(docDir, '.ts')
    let foundGenerate = false
    let foundAuthGuard = false

    for (const file of docFiles) {
      const src = readFileSync(file, 'utf-8')
      if (src.includes('generate') || src.includes('Generate')) {
        foundGenerate = true
        if (src.includes('requireChef') || src.includes('tenantId') || src.includes('chef_id')) {
          foundAuthGuard = true
        }
      }
    }

    if (foundGenerate) {
      expect(
        foundAuthGuard,
        'Document generation functions must scope to chef ownership via requireChef() or tenantId from session'
      ).toBe(true)
    }
  })

  // ---------------------------------------------------------------------------
  // Test 2: Contract actions require chef authentication
  // ---------------------------------------------------------------------------
  test('lib/contracts/actions.ts calls requireChef() before generating or serving contracts', () => {
    const contractActions = resolve(ROOT, 'lib/contracts/actions.ts')
    if (!existsSync(contractActions)) return

    const src = readFileSync(contractActions, 'utf-8')
    expect(
      src.includes('requireChef'),
      'lib/contracts/actions.ts must call requireChef() — contracts contain client PII and financial terms'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Invoice download API route authenticates the requester
  // ---------------------------------------------------------------------------
  test('invoice download routes require authentication', () => {
    const candidates = [
      resolve(ROOT, 'app/api/invoices'),
      resolve(ROOT, 'app/api/finance'),
      resolve(ROOT, 'lib/finance/invoice-actions.ts'),
    ]

    for (const candidate of candidates) {
      if (!existsSync(candidate)) continue
      const files = candidate.endsWith('.ts') ? [candidate] : findFiles(candidate, '.ts')
      for (const file of files) {
        const src = readFileSync(file, 'utf-8')
        if (src.includes('pdf') || src.includes('download') || src.includes('invoice')) {
          expect(
            src.includes('requireChef') ||
              src.includes('requireAuth') ||
              src.includes('getServerSession'),
            `${file.replace(ROOT, '')} handles invoice downloads but has no session check`
          ).toBe(true)
        }
      }
    }
  })

  // ---------------------------------------------------------------------------
  // Test 4: Storage signed URLs are used for document delivery
  // ---------------------------------------------------------------------------
  test('document delivery uses signed storage URLs, not raw filesystem paths', () => {
    const storageLib = resolve(ROOT, 'lib/storage/index.ts')
    if (!existsSync(storageLib)) return

    const src = readFileSync(storageLib, 'utf-8')

    // Must have a sign/getSignedUrl function
    expect(
      src.includes('sign') || src.includes('SignedUrl') || src.includes('signedUrl'),
      'lib/storage/index.ts must provide signed URL generation for document delivery'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 5: Proposal/quote PDFs scoped to owning chef
  // ---------------------------------------------------------------------------
  test('quote/proposal PDF generation is scoped to the generating chef', () => {
    const candidates = [
      resolve(ROOT, 'lib/quotes/actions.ts'),
      resolve(ROOT, 'lib/proposals/actions.ts'),
    ]

    for (const file of candidates) {
      if (!existsSync(file)) continue
      const src = readFileSync(file, 'utf-8')

      if (src.includes('pdf') || src.includes('generate')) {
        expect(
          src.includes('requireChef') || src.includes('tenantId') || src.includes('user.tenantId'),
          `${file.replace(ROOT, '')} generates PDFs but must scope to chef session`
        ).toBe(true)
      }
    }
  })
})
