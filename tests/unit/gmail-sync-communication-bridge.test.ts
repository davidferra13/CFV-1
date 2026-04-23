import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

function extractSection(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  if (start === -1 || end === -1) {
    throw new Error(`Could not extract section between ${startMarker} and ${endMarker}`)
  }

  return source.slice(start, end)
}

test('gmail sync generic handlers route compatibility writes through the shared communication bridge', () => {
  const source = readFileSync(path.join(process.cwd(), 'lib/gmail/sync.ts'), 'utf8')

  const inquirySection = extractSection(
    source,
    'async function handleInquiry(',
    'async function handleExistingThread('
  )
  const existingThreadSection = extractSection(
    source,
    'async function handleExistingThread(',
    'async function handleTakeAChefEmail('
  )
  const tacNewInquirySection = extractSection(
    source,
    'async function handleTacNewInquiry(',
    'async function handleTacClientMessage('
  )
  const tacClientMessageSection = extractSection(
    source,
    'async function handleTacClientMessage(',
    'async function ensureTacSeriesEvents('
  )
  const yhangryNewInquirySection = extractSection(
    source,
    'async function handleYhangryNewInquiry(',
    'async function handleYhangryClientMessage('
  )
  const genericNewLeadSection = extractSection(
    source,
    'async function handleGenericNewLead(',
    'async function handleGenericClientMessage('
  )
  const genericClientMessageSection = extractSection(
    source,
    'async function handleGenericClientMessage(',
    'async function handleGenericBookingConfirmed('
  )

  assert.match(source, /async function syncGmailMessageIntoCommunicationBridge\(/)
  assert.match(source, /async function ingestGmailImportedCommunicationEvent\(/)
  assert.match(source, /mapPlatformToCommunicationSource/)
  assert.match(source, /logCommunicationMessageCompat\(/)

  assert.match(inquirySection, /syncGmailMessageIntoCommunicationBridge\(/)
  assert.match(existingThreadSection, /syncGmailMessageIntoCommunicationBridge\(/)
  assert.match(tacNewInquirySection, /syncGmailMessageIntoCommunicationBridge\(/)
  assert.match(tacClientMessageSection, /syncGmailMessageIntoCommunicationBridge\(/)
  assert.match(yhangryNewInquirySection, /syncGmailMessageIntoCommunicationBridge\(/)
  assert.match(genericNewLeadSection, /syncGmailMessageIntoCommunicationBridge\(/)
  assert.match(genericClientMessageSection, /syncGmailMessageIntoCommunicationBridge\(/)

  assert.doesNotMatch(inquirySection, /\.from\('messages'\)\s*[\r\n\s]*\.insert\(/)
  assert.doesNotMatch(existingThreadSection, /\.from\('messages'\)\s*[\r\n\s]*\.insert\(/)
  assert.doesNotMatch(tacNewInquirySection, /\.from\('messages'\)\s*[\r\n\s]*\.insert\(/)
  assert.doesNotMatch(tacClientMessageSection, /\.from\('messages'\)\s*[\r\n\s]*\.insert\(/)
  assert.doesNotMatch(yhangryNewInquirySection, /\.from\('messages'\)\s*[\r\n\s]*\.insert\(/)
  assert.doesNotMatch(genericNewLeadSection, /\.from\('messages'\)\s*[\r\n\s]*\.insert\(/)
  assert.doesNotMatch(genericClientMessageSection, /\.from\('messages'\)\s*[\r\n\s]*\.insert\(/)
})
