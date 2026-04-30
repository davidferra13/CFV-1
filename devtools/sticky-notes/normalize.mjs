import { stickyColorNameForValue, stickyColorTaxonomy } from './config.mjs'
import { noteContentFingerprint, rowKeyFor, sha256 } from './hash.mjs'

const OLE_UNIX_EPOCH_DAY = 25569
const MS_PER_DAY = 86400000

export function oleDateToIso(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100000) return null
  return new Date((numeric - OLE_UNIX_EPOCH_DAY) * MS_PER_DAY).toISOString()
}

export function normalizeNoteRow(row, options = {}) {
  const text = typeof row.TEXT === 'string' ? row.TEXT : ''
  const dataLength = Number(row.DATA_LENGTH ?? 0)
  const contentHash = sha256(noteContentFingerprint(row))
  const normalized = {
    source: 'simple-sticky-notes',
    sourcePath: options.sourcePath || null,
    sourceRowId: Number(row.ROWID ?? row.rowid ?? 0),
    noteId: Number(row.ID),
    notebook: row.NOTEBOOK || '',
    title: row.TITLE || '',
    text,
    textLength: text.length,
    hasRichData: dataLength > 0,
    richDataLength: dataLength,
    state: Number(row.STATE ?? 0),
    deletedAt: oleDateToIso(row.DELETED),
    deletedRaw: Number(row.DELETED ?? 0),
    starred: Number(row.STARRED ?? 0) !== 0,
    sourceColorValue: Number(row.COLOR ?? stickyColorTaxonomy.unprocessed.value),
    sourceColorName: stickyColorNameForValue(row.COLOR ?? stickyColorTaxonomy.unprocessed.value),
    createdAt: oleDateToIso(row.CREATED),
    createdRaw: Number(row.CREATED ?? 0),
    updatedAt: oleDateToIso(row.UPDATED),
    updatedRaw: Number(row.UPDATED ?? 0),
    contentHash,
    ingestedAt: (options.ingestedAt || new Date()).toISOString(),
  }

  normalized.rowKey = rowKeyFor(normalized)
  normalized.noteRef = `simple-sticky-notes:${normalized.noteId}:${contentHash.slice(0, 16)}`
  normalized.lifecycle = normalized.deletedAt ? 'archive.deleted_source' : 'captured'
  return normalized
}

export function normalizeNoteRows(rows, options = {}) {
  return rows.map((row) => normalizeNoteRow(row, options))
}
