// PDF Layout Helper - wraps jsPDF with a position-tracked, section-aware API
// Uses shared design tokens from pdf-design-tokens.ts. No inline magic numbers.
// Supports multi-page documents with continuation headers, color bands, and doc type labels.

import { jsPDF } from 'jspdf'
import {
  FONT,
  SPACING,
  COLOR,
  MARGINS,
  CHECKBOX,
  CATEGORY_BANDS,
  DOC_TYPES,
  RULES,
  PAGE,
  type DocumentCategory,
} from './pdf-design-tokens'

// ─── Backward-compatible exports ────────────────────────────────────────────

const LETTER_WIDTH = PAGE.letterWidth
const LETTER_HEIGHT = PAGE.letterHeight
const MARGIN_X = MARGINS.default.left
const CONTENT_WIDTH = PAGE.contentWidth()
const MAX_Y = PAGE.maxY()

export { CONTENT_WIDTH, MARGIN_X, LETTER_WIDTH, LETTER_HEIGHT, MAX_Y }

// ─── Types ──────────────────────────────────────────────────────────────────

type DocTypeKey = keyof typeof DOC_TYPES

interface PDFLayoutOptions {
  /** Document type key for color band + label */
  docType?: DocTypeKey
  /** Use 3-hole punch margins (20mm left) */
  binderMode?: boolean
  /** Client name for continuation headers */
  clientName?: string
  /** Event date for continuation headers */
  eventDate?: string
}

// ─── Layout Class ───────────────────────────────────────────────────────────

export class PDFLayout {
  doc: jsPDF
  y: number
  private fontScale: number
  private marginLeft: number
  private marginRight: number
  private marginTop: number
  private marginBottom: number
  private contentWidth: number
  private maxY: number
  private pageNumber: number
  private docType?: DocTypeKey
  private clientName?: string
  private eventDate?: string

  constructor(options?: PDFLayoutOptions) {
    const margins = options?.binderMode ? MARGINS.binder : MARGINS.default
    this.marginLeft = margins.left
    this.marginRight = margins.right
    this.marginTop = margins.top
    this.marginBottom = margins.bottom
    this.contentWidth = PAGE.letterWidth - this.marginLeft - this.marginRight
    this.maxY = PAGE.letterHeight - this.marginBottom
    this.fontScale = 1
    this.pageNumber = 1
    this.docType = options?.docType
    this.clientName = options?.clientName
    this.eventDate = options?.eventDate

    this.doc = new jsPDF({ unit: 'mm', format: 'letter' })
    this.y = this.marginTop

    // Draw initial page chrome (color band + doc type label)
    this.drawPageChrome()
  }

  // ─── Page Chrome (color band, doc label) ────────────────────────────────

  private drawPageChrome() {
    if (!this.docType) return
    const typeInfo = DOC_TYPES[this.docType]
    if (!typeInfo) return
    const band = CATEGORY_BANDS[typeInfo.category]
    if (!band) return

    // 2mm color band at very top
    this.doc.setFillColor(band.color[0], band.color[1], band.color[2])
    this.doc.rect(0, 0, PAGE.letterWidth, RULES.colorBandHeight, 'F')

    // Doc type label - top-right corner, below band
    this.doc.setFontSize(RULES.docLabelSize)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(band.color[0], band.color[1], band.color[2])
    this.doc.text(typeInfo.label, PAGE.letterWidth - this.marginRight, RULES.colorBandHeight + 4, {
      align: 'right',
    })
    this.doc.setTextColor(...COLOR.textPrimary)

    // Adjust starting Y to account for band
    if (this.pageNumber === 1) {
      this.y = this.marginTop + RULES.colorBandHeight
    }
  }

  private drawContinuationHeader() {
    if (!this.docType) return
    const typeInfo = DOC_TYPES[this.docType]
    if (!typeInfo) return

    // "[DOC TYPE] (cont.) -- [Client Name] -- [Date]"
    const parts = [typeInfo.label + ' (cont.)']
    if (this.clientName) parts.push(this.clientName)
    if (this.eventDate) parts.push(this.eventDate)
    const headerText = parts.join('  --  ')

    this.doc.setFontSize(RULES.continuationHeaderSize)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text(headerText, this.marginLeft, this.y)
    this.y += this.lineHeight(RULES.continuationHeaderSize) + 2
  }

  // ─── Font Scale ─────────────────────────────────────────────────────────

  /** Set a global font scale factor (0.6-1.0) to shrink content to fit */
  setFontScale(scale: number) {
    this.fontScale = Math.max(0.6, Math.min(1, scale))
  }

  private scaledSize(size: number): number {
    return Math.round(size * this.fontScale * 10) / 10
  }

  /** Line height in mm for a given font size (pt) */
  private lineHeight(fontSize: number): number {
    return this.scaledSize(fontSize) * SPACING.lineHeightMultiplier
  }

  // ─── Spatial Queries ────────────────────────────────────────────────────

  /** How much vertical space remains before hitting the bottom margin */
  remaining(): number {
    return this.maxY - this.y
  }

  /** Would overflow if we added this many mm? */
  wouldOverflow(mm: number): boolean {
    return this.y + mm > this.maxY
  }

  /** Get current content width (accounts for margins) */
  getContentWidth(): number {
    return this.contentWidth
  }

  /** Get current left margin */
  getMarginLeft(): number {
    return this.marginLeft
  }

  // ─── Spacing ────────────────────────────────────────────────────────────

  /** Add vertical space */
  space(mm: number = SPACING.paragraphGap) {
    this.y += mm * this.fontScale
  }

  /** Section gap (5mm) */
  sectionGap() {
    this.y += SPACING.sectionGap * this.fontScale
  }

  /** Group gap (3mm) */
  groupGap() {
    this.y += SPACING.groupGap * this.fontScale
  }

  /** Item gap (1.5mm) */
  itemGap() {
    this.y += SPACING.itemGap * this.fontScale
  }

  // ─── Text Elements ─────────────────────────────────────────────────────

  /** Document title - large, bold, centered */
  title(text: string, size: number = FONT.title.size) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text(text, PAGE.letterWidth / 2, this.y, { align: 'center' })
    this.y += this.lineHeight(size) + 1
  }

  /** Section header - bold, full width, with optional separator line */
  sectionHeader(text: string, size: number = FONT.sectionHeader.size, withLine: boolean = true) {
    if (withLine) {
      this.doc.setDrawColor(...COLOR.borderPrimary)
      this.doc.setLineWidth(RULES.separatorWidth)
      this.doc.line(this.marginLeft, this.y, PAGE.letterWidth - this.marginRight, this.y)
      this.y += 2
    }
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text(text, this.marginLeft, this.y)
    this.y += this.lineHeight(size) + 1
  }

  /** Course header - bold, slightly smaller than section header */
  courseHeader(text: string, size: number = FONT.courseHeader.size) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text(text, this.marginLeft + 2, this.y)
    this.y += this.lineHeight(size) + 0.5
  }

  /** Key-value pair on one line: "Label: Value" */
  keyValue(label: string, value: string, size: number = FONT.metadata.size) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text(label + ':', this.marginLeft, this.y)
    const labelWidth = this.doc.getTextWidth(label + ': ')
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(value, this.marginLeft + labelWidth, this.y)
    this.y += this.lineHeight(size)
  }

  /** Compact header info bar - multiple key-value pairs on one line */
  headerBar(pairs: Array<[string, string]>, size: number = FONT.caption.size) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    let x = this.marginLeft
    for (const [label, value] of pairs) {
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...COLOR.textPrimary)
      this.doc.text(label + ':', x, this.y)
      const lw = this.doc.getTextWidth(label + ': ')
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(value, x + lw, this.y)
      const vw = this.doc.getTextWidth(value)
      x += lw + vw + 6
    }
    this.y += this.lineHeight(size) + 0.5
  }

  /** Body text - wraps to content width */
  text(
    text: string,
    size: number = FONT.bodyText.size,
    style: 'normal' | 'bold' | 'italic' = 'normal',
    indent: number = 0
  ) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', style)
    this.doc.setTextColor(...COLOR.textPrimary)
    const maxW = this.contentWidth - indent
    const lines = this.doc.splitTextToSize(text, maxW) as string[]
    const lh = this.lineHeight(size)
    for (const line of lines) {
      if (this.wouldOverflow(lh)) {
        this.newPage()
      }
      this.doc.text(line, this.marginLeft + indent, this.y)
      this.y += lh
    }
  }

  /** Bullet point - indented with bullet character */
  bullet(text: string, size: number = FONT.bodyText.size, indent: number = 4) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text('\u2022', this.marginLeft + indent, this.y)
    const bulletW = 3
    const maxW = this.contentWidth - indent - bulletW
    const lines = this.doc.splitTextToSize(text, maxW) as string[]
    const lh = this.lineHeight(size)
    for (let i = 0; i < lines.length; i++) {
      if (this.wouldOverflow(lh)) {
        this.newPage()
      }
      this.doc.text(lines[i], this.marginLeft + indent + bulletW, this.y)
      this.y += lh
    }
  }

  // ─── Checkbox Elements ──────────────────────────────────────────────────

  /** Checkbox row - square box + text. Uses 4.5mm minimum box size. */
  checkbox(
    text: string,
    size: number = FONT.bodyText.size,
    extraInfo?: string,
    preChecked?: boolean
  ) {
    const s = this.scaledSize(size)
    const boxSize = Math.max(CHECKBOX.boxSize, s * SPACING.lineHeightMultiplier)
    const lh = Math.max(CHECKBOX.checkRowHeight, this.lineHeight(size) + 1)

    if (this.wouldOverflow(lh)) {
      this.newPage()
    }

    // Draw checkbox
    this.doc.setDrawColor(...CHECKBOX.boxColor)
    this.doc.setLineWidth(CHECKBOX.boxLineWidth)
    this.doc.rect(this.marginLeft + 2, this.y - boxSize + 0.5, boxSize, boxSize)

    // Pre-checked: draw a check mark inside
    if (preChecked) {
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(s * 0.9)
      this.doc.setTextColor(...COLOR.textPrimary)
      this.doc.text('\u2713', this.marginLeft + 2 + boxSize * 0.15, this.y - boxSize * 0.05)
    }

    // Checkbox text
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text(text, this.marginLeft + 2 + boxSize + 2, this.y)

    // Extra info in muted italic
    if (extraInfo) {
      const textW = this.doc.getTextWidth(text + '  ')
      this.doc.setFont('helvetica', 'italic')
      this.doc.setTextColor(...COLOR.textMuted)
      this.doc.text(extraInfo, this.marginLeft + 2 + boxSize + 2 + textW, this.y)
      this.doc.setTextColor(...COLOR.textPrimary)
    }

    this.y += lh
  }

  /** Dual checkbox row - OUT (left) + item + qty + BACK (right). For packing lists. */
  dualCheckbox(text: string, qty?: string, extraInfo?: string, size: number = FONT.bodyText.size) {
    const s = this.scaledSize(size)
    const boxSize = Math.max(CHECKBOX.boxSize, s * SPACING.lineHeightMultiplier)
    const lh = Math.max(CHECKBOX.checkRowHeight, this.lineHeight(size) + 1)

    if (this.wouldOverflow(lh)) {
      this.newPage()
    }

    const leftBoxX = this.marginLeft + 2
    const textX = leftBoxX + boxSize + 3
    const rightEdge = PAGE.letterWidth - this.marginRight
    const rightBoxX = rightEdge - boxSize - 2

    // OUT checkbox (left)
    this.doc.setDrawColor(...CHECKBOX.boxColor)
    this.doc.setLineWidth(CHECKBOX.boxLineWidth)
    this.doc.rect(leftBoxX, this.y - boxSize + 0.5, boxSize, boxSize)

    // Item name
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text(text, textX, this.y)

    // Qty (bold, after item name)
    if (qty) {
      const itemWidth = this.doc.getTextWidth(text + '  ')
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(qty, textX + itemWidth, this.y)
    }

    // Extra info (muted italic)
    if (extraInfo) {
      const totalTextW = this.doc.getTextWidth(text + '  ' + (qty ?? '') + '  ')
      this.doc.setFont('helvetica', 'italic')
      this.doc.setTextColor(...COLOR.textMuted)
      this.doc.text(extraInfo, textX + totalTextW, this.y)
      this.doc.setTextColor(...COLOR.textPrimary)
    }

    // BACK checkbox (right)
    this.doc.setDrawColor(...CHECKBOX.boxColor)
    this.doc.setLineWidth(CHECKBOX.boxLineWidth)
    this.doc.rect(rightBoxX, this.y - boxSize + 0.5, boxSize, boxSize)

    this.y += lh
  }

  /** Column headers for dual checkbox sections: "OUT" on left, "BACK" on right */
  dualCheckboxHeaders(size: number = FONT.caption.size) {
    const s = this.scaledSize(size)
    const boxSize = Math.max(CHECKBOX.boxSize, s * SPACING.lineHeightMultiplier)
    const rightEdge = PAGE.letterWidth - this.marginRight

    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLOR.textSecondary)
    this.doc.text('OUT', this.marginLeft + 2, this.y)
    this.doc.text('BACK', rightEdge - boxSize - 2, this.y, { align: 'left' })
    this.doc.setTextColor(...COLOR.textPrimary)
    this.y += this.lineHeight(size) + 1
  }

  // ─── Alert Boxes ────────────────────────────────────────────────────────

  /** Warning box - bordered, bold text, high visibility */
  warningBox(text: string, size: number = FONT.courseHeader.size) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    const lines = this.doc.splitTextToSize(text, this.contentWidth - 8) as string[]
    const lh = this.lineHeight(size)
    const boxHeight = lines.length * lh + 4
    const boxPadding = 2

    // Box background (light red)
    this.doc.setFillColor(...COLOR.dangerBg)
    this.doc.setDrawColor(...COLOR.dangerBorder)
    this.doc.setLineWidth(0.6)
    this.doc.rect(this.marginLeft, this.y - 1, this.contentWidth, boxHeight, 'FD')

    // Text inside box
    this.doc.setTextColor(...COLOR.dangerText)
    for (const line of lines) {
      this.y += lh
      this.doc.text(line, this.marginLeft + boxPadding + 2, this.y - boxPadding)
    }
    this.doc.setTextColor(...COLOR.textPrimary)
    this.y += 3
  }

  /** Urgency-bordered section - colored left border for reset checklist sections */
  urgencySection(
    headerText: string,
    borderColor: readonly [number, number, number],
    size: number = FONT.sectionHeader.size
  ) {
    const s = this.scaledSize(size)
    // Draw colored left border (2mm wide, extends down - caller manages content height)
    this.doc.setFillColor(borderColor[0], borderColor[1], borderColor[2])
    this.doc.rect(this.marginLeft, this.y - 1, 2, this.lineHeight(size) + 2, 'F')

    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text(headerText, this.marginLeft + 4, this.y)
    this.y += this.lineHeight(size) + 1
  }

  // ─── Layout Helpers ─────────────────────────────────────────────────────

  /** Horizontal rule */
  hr() {
    this.doc.setDrawColor(...COLOR.borderLight)
    this.doc.setLineWidth(0.2)
    this.doc.line(this.marginLeft, this.y, PAGE.letterWidth - this.marginRight, this.y)
    this.y += 2
  }

  /** Shaded section header background */
  shadedHeader(text: string, size: number = FONT.sectionHeader.size) {
    const s = this.scaledSize(size)
    const lh = this.lineHeight(size)
    const boxHeight = lh + 3

    this.doc.setFillColor(...COLOR.shadingMedium)
    this.doc.rect(this.marginLeft, this.y - 1, this.contentWidth, boxHeight, 'F')

    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLOR.textPrimary)
    this.doc.text(text, this.marginLeft + 2, this.y + lh * 0.5)
    this.y += boxHeight + 1
  }

  // ─── Footer & Attribution ───────────────────────────────────────────────

  /** Footer text - positioned at the very bottom of the page */
  footer(text: string, size: number = FONT.caption.size) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'italic')
    this.doc.setTextColor(...COLOR.textMuted)
    this.doc.text(text, PAGE.letterWidth / 2, PAGE.letterHeight - 6, { align: 'center' })
    this.doc.setTextColor(...COLOR.textPrimary)
  }

  /** Custom footer - replaces the default footer text if set by chef in print preferences */
  customFooter(text: string, size: number = FONT.caption.size) {
    const s = this.scaledSize(size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLOR.textMuted)
    this.doc.text(text, PAGE.letterWidth / 2, PAGE.letterHeight - 6, { align: 'center' })
    this.doc.setTextColor(...COLOR.textPrimary)
  }

  /** Standard footer with doc type, page number, and timestamp */
  standardFooter(docTypeLabel?: string) {
    const label = docTypeLabel ?? (this.docType ? DOC_TYPES[this.docType]?.label : undefined)
    const totalPages = this.doc.getNumberOfPages()

    for (let p = 1; p <= totalPages; p++) {
      this.doc.setPage(p)
      const parts: string[] = []
      if (label) parts.push(label)
      parts.push(`Page ${p} of ${totalPages}`)
      parts.push(new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }))

      this.doc.setFontSize(this.scaledSize(FONT.footer.size))
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...COLOR.textMuted)
      this.doc.text(parts.join('  |  '), PAGE.letterWidth / 2, PAGE.letterHeight - 6, {
        align: 'center',
      })
    }
    this.doc.setTextColor(...COLOR.textPrimary)
  }

  /** Attribution line - who generated this document and when */
  generatedBy(name: string, docType?: string) {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    const parts = [`Generated by ${name}`, timestamp]
    if (docType) parts.splice(1, 0, docType)
    const line = parts.join('  \u00B7  ')

    const s = this.scaledSize(FONT.footer.size)
    this.doc.setFontSize(s)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLOR.textMuted)
    this.doc.text(line, PAGE.letterWidth / 2, PAGE.letterHeight - 10, { align: 'center' })
    this.doc.setTextColor(...COLOR.textPrimary)
  }

  // ─── Page Management ────────────────────────────────────────────────────

  /** Add a new page, draw chrome, and add continuation header */
  newPage() {
    this.doc.addPage('letter')
    this.pageNumber++
    this.y = this.marginTop
    this.drawPageChrome()
    if (this.pageNumber > 1) {
      this.y = this.marginTop + RULES.colorBandHeight + 2
      this.drawContinuationHeader()
    }
  }

  /** Ensure at least N mm of space remains, or start a new page */
  ensureSpace(mm: number) {
    if (this.wouldOverflow(mm)) {
      this.newPage()
    }
  }

  /** Get current page number */
  getPageNumber(): number {
    return this.pageNumber
  }

  /** Export as Buffer */
  toBuffer(): Buffer {
    return Buffer.from(this.doc.output('arraybuffer'))
  }
}
