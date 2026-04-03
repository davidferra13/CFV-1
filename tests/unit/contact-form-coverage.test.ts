import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('contact form flow coverage', () => {
  it('wires owner alerting and client acknowledgment into the public contact submission path', () => {
    const source = read('lib/contact/actions.ts')

    assert.match(source, /sendNotification\(\{/)
    assert.match(source, /type:\s*'new_inquiry'/)
    assert.match(source, /kind:\s*'contact_form_submission'/)
    assert.match(source, /sendContactMessageReceivedEmail\(\{/)
  })
})
