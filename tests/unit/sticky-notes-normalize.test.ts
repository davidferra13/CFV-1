import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildChangeSummary } from '../../devtools/sticky-notes/hash.mjs'
import { normalizeNoteRow, oleDateToIso } from '../../devtools/sticky-notes/normalize.mjs'

describe('sticky notes normalization', () => {
  it('converts OLE Automation dates instead of Unix timestamps', () => {
    assert.equal(oleDateToIso(46141.5609269444), '2026-04-29T13:27:44.087Z')
    assert.equal(oleDateToIso(0), null)
    assert.equal(oleDateToIso(2461131.2835815), null)
  })

  it('normalizes rows into stable note references and row keys', () => {
    const note = normalizeNoteRow(
      {
        ID: 68,
        ROWID: 91,
        STATE: 1,
        CREATED: 46141.5609269444,
        UPDATED: 46141.9511426389,
        DELETED: 0,
        STARRED: 1,
        COLOR: 16777215,
        NOTEBOOK: 'David Ferragamo',
        TITLE: 'New Note (60)',
        DATA_LENGTH: 168,
        TEXT: 'Codex should organize everything.',
      },
      { sourcePath: 'C:/Users/david/Documents/Simple Sticky Notes/Notes.db' }
    )

    assert.equal(note.source, 'simple-sticky-notes')
    assert.equal(note.sourceRowId, 91)
    assert.equal(note.noteId, 68)
    assert.equal(note.starred, true)
    assert.equal(note.sourceColorName, 'white')
    assert.equal(note.sourceColorValue, 16777215)
    assert.equal(note.hasRichData, true)
    assert.equal(note.textLength, 33)
    assert.match(note.noteRef, /^simple-sticky-notes:68:[a-f0-9]{16}$/)
    assert.match(note.rowKey, /^68:46141\.9511426389:[a-f0-9]{16}$/)
  })

  it('detects new, changed, and unchanged notes by note ref and row key', () => {
    const previous = [
      {
        noteRef: 'note:a',
        rowKey: 'same',
      },
      {
        noteRef: 'note:b',
        rowKey: 'old',
      },
    ]
    const current = [
      {
        noteRef: 'note:a',
        rowKey: 'same',
      },
      {
        noteRef: 'note:b',
        rowKey: 'new',
      },
      {
        noteRef: 'note:c',
        rowKey: 'new',
      },
    ]

    assert.deepEqual(buildChangeSummary(current, previous), {
      total: 3,
      new: 1,
      changed: 1,
      unchanged: 1,
    })
  })
})
