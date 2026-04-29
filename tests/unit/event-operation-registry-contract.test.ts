import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CORE_PACKET_DOCUMENT_TYPES,
  OPERATIONAL_DOCUMENT_TYPES,
  SNAPSHOT_DOCUMENT_TYPES,
} from '../../lib/documents/document-definitions.js'
import {
  EVENT_CORE_PACKET_DOCUMENT_TYPES,
  EVENT_MOBILE_RUN_MODES,
  EVENT_OPERATION_DOCUMENTS,
  EVENT_PRINT_CENTER_PACKET_TYPES,
  EVENT_SAFETY_PRINTS,
  EVENT_SERVICE_PACKET_DOCUMENT_TYPES,
  EVENT_SNAPSHOT_DOCUMENT_TYPES,
  buildEventMobileRunModeHref,
  buildEventOperationDocumentHref,
  buildEventOperationPacketHref,
  buildEventOperationWorkspaceHref,
  buildEventSafetyPrintHref,
  getEventMobileRunMode,
  getEventOperationReadiness,
  listMissingEventOperationRegistryTypes,
} from '../../lib/events/operation-registry.js'
import type { DocumentReadiness } from '../../lib/documents/actions.js'

const ready: { ready: true; missing: [] } = { ready: true, missing: [] }
const blocked = { ready: false, missing: ['missing menu'] }

function makeReadiness(): DocumentReadiness {
  return {
    eventSummary: ready,
    groceryList: ready,
    frontOfHouseMenu: ready,
    prepSheet: blocked,
    executionSheet: ready,
    checklist: ready,
    packingList: ready,
    resetChecklist: ready,
    travelRoute: ready,
  }
}

describe('event operation registry contract', () => {
  it('covers every operational document type without drift', () => {
    assert.deepEqual(
      EVENT_OPERATION_DOCUMENTS.map((doc) => doc.type),
      OPERATIONAL_DOCUMENT_TYPES
    )
    assert.deepEqual(listMissingEventOperationRegistryTypes(), [])
  })

  it('keeps packet and snapshot definitions aligned with document definitions', () => {
    assert.deepEqual(EVENT_CORE_PACKET_DOCUMENT_TYPES, CORE_PACKET_DOCUMENT_TYPES)
    assert.deepEqual(EVENT_SNAPSHOT_DOCUMENT_TYPES, SNAPSHOT_DOCUMENT_TYPES)

    for (const type of EVENT_SERVICE_PACKET_DOCUMENT_TYPES) {
      assert.equal(EVENT_PRINT_CENTER_PACKET_TYPES.includes(type), true)
    }
  })

  it('centralizes document readiness and route generation', () => {
    const readiness = makeReadiness()
    const prep = EVENT_OPERATION_DOCUMENTS.find((doc) => doc.type === 'prep')
    assert.ok(prep)

    assert.deepEqual(getEventOperationReadiness(prep, readiness), blocked)
    assert.equal(
      buildEventOperationWorkspaceHref('event-1', prep),
      '/events/event-1/interactive?type=prep'
    )
    const reset = EVENT_OPERATION_DOCUMENTS.find((doc) => doc.type === 'reset')
    assert.ok(reset)
    assert.equal(buildEventOperationWorkspaceHref('event-1', reset), '/events/event-1/reset')

    assert.equal(
      buildEventOperationDocumentHref('event-1', 'prep', { archive: true }),
      '/api/documents/event-1?type=prep&archive=1'
    )
    assert.equal(
      buildEventOperationPacketHref('event-1', ['summary', 'prep'], { archive: true }),
      '/api/documents/event-1?type=pack&types=summary%2Cprep&archive=1'
    )
  })

  it('keeps mobile run modes and safety prints connected to real routes', () => {
    assert.equal(getEventMobileRunMode('dop').path, 'dop/mobile')

    assert.deepEqual(
      EVENT_MOBILE_RUN_MODES.map((mode) => buildEventMobileRunModeHref('event-1', mode)),
      [
        '/events/event-1/dop/mobile',
        '/events/event-1/pack',
        '/events/event-1/mise-en-place',
        '/events/event-1/travel',
        '/events/event-1/close-out',
      ]
    )
    assert.equal(buildEventMobileRunModeHref('event-1', 'packing'), '/events/event-1/pack')

    assert.deepEqual(
      EVENT_SAFETY_PRINTS.map((print) => buildEventSafetyPrintHref('event-1', print)),
      ['/api/documents/event-1?type=allergy-card', '/api/documents/event-1?type=beo&archive=1']
    )
  })

  it('is consumed by the print and document hub pages', () => {
    const printPage = readFileSync('app/(chef)/events/[id]/print/page.tsx', 'utf8')
    const documentsPage = readFileSync('app/(chef)/events/[id]/documents/page.tsx', 'utf8')

    assert.match(printPage, /@\/lib\/events\/operation-registry/)
    assert.doesNotMatch(printPage, /CORE_PRINT_CARDS|buildMobileRunModes|getWorkspaceHref/)

    assert.match(documentsPage, /@\/lib\/events\/operation-registry/)
    assert.doesNotMatch(
      documentsPage,
      /CORE_PACKET_OPERATIONAL_TYPES|isOperationalTypeReady|buildOperationalDocWorkspaceHref/
    )
  })
})
