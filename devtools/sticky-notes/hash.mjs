import crypto from 'node:crypto'

export function sha256(input) {
  return crypto.createHash('sha256').update(String(input ?? '')).digest('hex')
}

export function shortHash(input, length = 12) {
  return sha256(input).slice(0, length)
}

export function noteContentFingerprint(row) {
  return JSON.stringify({
    title: row.TITLE ?? '',
    text: row.TEXT ?? '',
    state: row.STATE ?? null,
    deleted: row.DELETED ?? null,
    starred: row.STARRED ?? null,
    notebook: row.NOTEBOOK ?? '',
    dataLength: Number(row.DATA_LENGTH ?? 0),
  })
}

export function rowKeyFor(note) {
  return `${note.noteId}:${note.updatedRaw}:${note.contentHash.slice(0, 16)}`
}

export function buildChangeSummary(records, previousRecords = []) {
  const previousByRef = new Map(previousRecords.map((record) => [record.noteRef, record]))
  let newCount = 0
  let changedCount = 0
  let unchangedCount = 0

  for (const record of records) {
    const previous = previousByRef.get(record.noteRef)
    if (!previous) {
      newCount += 1
      continue
    }
    if (previous.rowKey === record.rowKey) {
      unchangedCount += 1
    } else {
      changedCount += 1
    }
  }

  return {
    total: records.length,
    new: newCount,
    changed: changedCount,
    unchanged: unchangedCount,
  }
}
