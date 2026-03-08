// PDF Layout Helper — wraps jsPDF with a position-tracked, one-page-aware API
// All documents MUST fit on one US Letter page (215.9mm × 279.4mm)
// Font sizes and spacing auto-compact to enforce the single-page constraint

import { jsPDF } from 'jspdf'
import type { ChefBrand } from '@/lib/chef/brand'

const LETTER_WIDTH = 215.9 // mm
const LETTER_HEIGHT = 279.4 // mm
const MARGIN_X = 12 // mm
const MARGIN_TOP = 12 // mm
const MARGIN_BOTTOM = 10 // mm
const CONTENT_WIDTH = LETTER_WIDTH - 2 * MARGIN_X
const MAX_Y = LETTER_HEIGHT - MARGIN_BOTTOM

export class PDFLayout {
  doc: jsPDF
  y: number
  private fontScale: number

  constructor() {
    this.doc = new jsPDF({ unit: 'mm', format: 'letter' })
    this.y = MARGIN_TOP
    this.fontScale = 1
  }

  /** Set a global font scale factor (0.7–1.0) to shrink content to fit */
  setFontScale(scale: number) {
    this.fontScale = Math.max(0.6, Math.min(1, scale))
  }

  private scaledSize(size: number): number {
    return Math.round(size * this.fontScale * 10) / 10
  }

  /** Line height in mm for a given font size (pt) */
  private lineHeight(fontSize: number): number {
    return this.scaledSize(fontSize) * 0.38
  }

  /** How much vertical space remains before hitting the bottom margin */
  remaining(): number {
    return MAX_Y - this.y
  }

  /** Would overflow if we added this many mm? */
  wouldOverflow(mm: number): boolean {
    return this.y + mm > MAX_Y
  }

  /** Add vertical space */
  space(mm: number = 2) {
    this.y += mm * this.fontScale
  }

  /** Document title — large, bold, centered */
  title(text: string, size: number = 14) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, LETTER_WIDTH / 2, this.y, { align: 'center' })
    this.y += this.lineHeight(size) + 1
  }

  /** Section header — bold, full width, with optional separator line */
  sectionHeader(text: string, size: number = 11, withLine: boolean = true) {
    if (withLine) {
      this.doc.setDrawColor(60, 60, 60)
      this.doc.setLineWidth(0.4)
      this.doc.line(MARGIN_X, this.y, LETTER_WIDTH - MARGIN_X, this.y)
      this.y += 2
    }
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, MARGIN_X, this.y)
    this.y += this.lineHeight(size) + 1
  }

  /** Course header — bold, slightly smaller than section header */
  courseHeader(text: string, size: number = 10) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, MARGIN_X + 2, this.y)
    this.y += this.lineHeight(size) + 0.5
  }

  /** Key-value pair on one line: "Label: Value" */
  keyValue(label: string, value: string, size: number = 9) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(label + ':', MARGIN_X, this.y)
    const labelWidth = this.doc.getTextWidth(label + ': ')
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(value, MARGIN_X + labelWidth, this.y)
    this.y += this.lineHeight(size)
  }

  /** Compact header info bar — multiple key-value pairs on one line */
  headerBar(pairs: Array<[string, string]>, size: number = 8) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    let x = MARGIN_X
    for (const [label, value] of pairs) {
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(label + ':', x, this.y)
      const lw = this.doc.getTextWidth(label + ': ')
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(value, x + lw, this.y)
      const vw = this.doc.getTextWidth(value)
      x += lw + vw + 6
    }
    this.y += this.lineHeight(size) + 0.5
  }

  /** Body text — wraps to content width */
  text(
    text: string,
    size: number = 9,
    style: 'normal' | 'bold' | 'italic' = 'normal',
    indent: number = 0
  ) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', style)
    const maxW = CONTENT_WIDTH - indent
    const lines = this.doc.splitTextToSize(text, maxW) as string[]
    const lh = this.lineHeight(size)
    for (const line of lines) {
      if (!this.wouldOverflow(lh)) {
        this.doc.text(line, MARGIN_X + indent, this.y)
      }
      this.y += lh
    }
  }

  /** Bullet point — indented with bullet character */
  bullet(text: string, size: number = 9, indent: number = 4) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('\u2022', MARGIN_X + indent, this.y)
    const bulletW = 3
    const maxW = CONTENT_WIDTH - indent - bulletW
    const lines = this.doc.splitTextToSize(text, maxW) as string[]
    const lh = this.lineHeight(size)
    for (let i = 0; i < lines.length; i++) {
      if (!this.wouldOverflow(lh)) {
        this.doc.text(lines[i], MARGIN_X + indent + bulletW, this.y)
      }
      this.y += lh
    }
  }

  /** Checkbox row — square box + text (for checklist) */
  checkbox(text: string, size: number = 10, extraInfo?: string, preChecked?: boolean) {
    const s = this.scaledSize(size)
    const boxSize = s * 0.38
    const lh = this.lineHeight(size) + 1

    // Draw checkbox
    this.doc.setDrawColor(40, 40, 40)
    this.doc.setLineWidth(0.3)
    this.doc.rect(MARGIN_X + 2, this.y - boxSize + 0.5, boxSize, boxSize)

    // Pre-checked: draw a check mark inside the box
    if (preChecked) {
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(s * 0.9)
      this.doc.text('✓', MARGIN_X + 2 + boxSize * 0.1, this.y - boxSize * 0.05)
    }

    // Checkbox text
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(text, MARGIN_X + 2 + boxSize + 2, this.y)

    // Extra info (e.g., "forgotten 3x") in gray italic
    if (extraInfo) {
      const textW = this.doc.getTextWidth(text + '  ')
      this.doc.setFont('helvetica', 'italic')
      this.doc.setTextColor(120, 120, 120)
      this.doc.text(extraInfo, MARGIN_X + 2 + boxSize + 2 + textW, this.y)
      this.doc.setTextColor(0, 0, 0) // reset
    }

    this.y += lh
  }

  /** Warning box — bordered, bold text, high visibility */
  warningBox(text: string, size: number = 11) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH - 8) as string[]
    const lh = this.lineHeight(size)
    const boxHeight = lines.length * lh + 4
    const boxPadding = 2

    // Box background (light red)
    this.doc.setFillColor(255, 240, 240)
    this.doc.setDrawColor(200, 0, 0)
    this.doc.setLineWidth(0.6)
    this.doc.rect(MARGIN_X, this.y - 1, CONTENT_WIDTH, boxHeight, 'FD')

    // Text inside box
    this.doc.setTextColor(180, 0, 0)
    for (const line of lines) {
      this.y += lh
      this.doc.text(line, MARGIN_X + boxPadding + 2, this.y - boxPadding)
    }
    this.doc.setTextColor(0, 0, 0)
    this.y += 3
  }

  /** Horizontal rule */
  hr() {
    this.doc.setDrawColor(180, 180, 180)
    this.doc.setLineWidth(0.2)
    this.doc.line(MARGIN_X, this.y, LETTER_WIDTH - MARGIN_X, this.y)
    this.y += 2
  }

  /** Footer text — positioned at the very bottom of the page */
  footer(text: string, size: number = 8) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'italic')
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(text, LETTER_WIDTH / 2, LETTER_HEIGHT - 6, { align: 'center' })
    this.doc.setTextColor(0, 0, 0)
  }

  /** Custom footer — replaces the default footer text if set by chef in print preferences */
  customFooter(text: string, size: number = 8) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(120, 120, 120)
    this.doc.text(text, LETTER_WIDTH / 2, LETTER_HEIGHT - 6, { align: 'center' })
    this.doc.setTextColor(0, 0, 0)
  }

  /** Attribution line — who generated this document and when. Sits just above the footer. */
  generatedBy(name: string, docType?: string) {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    const parts = [`Generated by ${name}`, timestamp]
    if (docType) parts.splice(1, 0, docType)
    const line = parts.join('  \u00B7  ')

    const s = this.scaledSize(7)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(140, 140, 140)
    this.doc.text(line, LETTER_WIDTH / 2, LETTER_HEIGHT - 10, { align: 'center' })
    this.doc.setTextColor(0, 0, 0)
  }

  /**
   * Branded header for client-facing PDFs.
   * If the chef has a logo: renders the logo image + business name.
   * If no logo: renders the business name as large text.
   * Always draws a thin accent color bar below.
   *
   * @param brand - ChefBrand object from getChefBrand()
   * @param logoBase64 - Pre-fetched logo as base64 data URI (optional, pass null to skip logo)
   */
  brandedHeader(brand: ChefBrand, logoBase64: string | null = null) {
    const doc = this.doc

    if (logoBase64 && brand.mode === 'full') {
      // Logo mode: render logo image left-aligned, business name to the right
      const logoHeight = 14 // mm
      const logoWidth = 14 // mm (square, image will be fit)
      try {
        doc.addImage(logoBase64, 'PNG', MARGIN_X, this.y - 2, logoWidth, logoHeight)
      } catch {
        // If image fails to render, fall through to text-only
        doc.setFontSize(this.scaledSize(16))
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(brand.businessName, MARGIN_X, this.y + 6)
        this.y += logoHeight + 2
        this._accentBar(brand.primaryColor)
        return
      }

      // Business name next to logo
      doc.setFontSize(this.scaledSize(14))
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(brand.businessName, MARGIN_X + logoWidth + 4, this.y + 6)

      this.y += logoHeight + 2
    } else {
      // Text mode: business name as the header
      doc.setFontSize(this.scaledSize(16))
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(brand.businessName, MARGIN_X, this.y + 4)
      this.y += 8
    }

    // Accent color bar
    this._accentBar(brand.primaryColor)
  }

  /** Thin accent color bar spanning the content width */
  private _accentBar(hexColor: string) {
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    this.doc.setDrawColor(r, g, b)
    this.doc.setLineWidth(0.8)
    this.doc.line(MARGIN_X, this.y, LETTER_WIDTH - MARGIN_X, this.y)
    this.y += 3
  }

  /**
   * "Powered by ChefFlow" footer for free-tier users.
   * Small, unobtrusive text in the bottom-right corner.
   * Call this at the end of document rendering, only when brand.showPoweredBy is true.
   */
  poweredByFooter() {
    const s = this.scaledSize(7)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(160, 160, 160)
    this.doc.text('Powered by ChefFlow', LETTER_WIDTH - MARGIN_X, LETTER_HEIGHT - 6, {
      align: 'right',
    })
    this.doc.setTextColor(0, 0, 0)
  }

  /**
   * Embed a QR code image at the current position or a specific location.
   * Pass a base64 data URL from generateQrDataUrl().
   * Non-blocking: if dataUrl is null, nothing renders (QR generation failed gracefully).
   *
   * @param dataUrl - base64 PNG data URL from qrcode package
   * @param size - QR image size in mm (default 22mm, ~0.9 inches)
   * @param label - Small text label below the QR (optional)
   * @param align - 'left' (at margin), 'right' (at right margin), or 'center'
   */
  qrCode(
    dataUrl: string | null,
    size: number = 22,
    label?: string,
    align: 'left' | 'right' | 'center' = 'right'
  ) {
    if (!dataUrl) return

    let x = MARGIN_X
    if (align === 'right') x = LETTER_WIDTH - MARGIN_X - size
    else if (align === 'center') x = (LETTER_WIDTH - size) / 2

    try {
      this.doc.addImage(dataUrl, 'PNG', x, this.y, size, size)
    } catch {
      return // If image fails, skip silently
    }

    if (label) {
      const s = this.scaledSize(7)
      this.doc.setFontSize(s)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(120, 120, 120)
      this.doc.text(label, x + size / 2, this.y + size + 3, { align: 'center' })
      this.doc.setTextColor(0, 0, 0)
    }

    this.y += size + (label ? 5 : 0)
  }

  /** Add a new page and reset Y position */
  newPage() {
    this.doc.addPage('letter')
    this.y = MARGIN_TOP
  }

  /** Export as Buffer */
  toBuffer(): Buffer {
    return Buffer.from(this.doc.output('arraybuffer'))
  }
}

export { CONTENT_WIDTH, MARGIN_X, LETTER_WIDTH, LETTER_HEIGHT, MAX_Y }
