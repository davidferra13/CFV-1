import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  buildCircleChatActionSurface,
  classifyCircleChatEntry,
  getCircleHypePrompts,
  selectCircleMemoryFeedChatEntries,
} from '@/lib/hub/circle-chat-hype-contracts'

test('circle chat action surface gives members social tools without host authority', () => {
  const member = buildCircleChatActionSurface({
    role: 'member',
    canPost: true,
    canPin: false,
    digestMode: 'hourly',
  })
  const host = buildCircleChatActionSurface({ role: 'host', canPost: true, canPin: true })
  const viewer = buildCircleChatActionSurface({ role: 'viewer', canPost: false, canPin: false })

  assert.equal(member.actions.includes('post_message'), true)
  assert.equal(member.actions.includes('reply'), true)
  assert.equal(member.actions.includes('react'), true)
  assert.equal(member.actions.includes('hype_milestone'), true)
  assert.equal(member.actions.includes('pin_update'), false)
  assert.equal(member.actions.includes('remove_message'), false)
  assert.equal(member.notificationMode, 'hourly')

  assert.equal(host.actions.includes('pin_update'), true)
  assert.equal(viewer.actions.includes('post_message'), false)
  assert.equal(viewer.actions.includes('react'), true)
  assert.equal(
    member.privacyBoundaries.some((boundary) => /payment|cancellation|chef-only/i.test(boundary)),
    true
  )
})

test('muted chat still preserves operational notice boundaries', () => {
  const muted = buildCircleChatActionSurface({
    role: 'member',
    canPost: true,
    canPin: false,
    notificationsMuted: true,
  })

  assert.equal(muted.notificationMode, 'muted')
  assert.equal(muted.operationalNoticeTreatment, 'pinned_distinct_from_chatter')
  assert.equal(muted.privacyBoundaries.some((boundary) => /critical operational/i.test(boundary)), true)
})

test('chat entries classify operational updates separately from social chatter', () => {
  const operational = classifyCircleChatEntry({
    id: 'pin-1',
    messageType: 'text',
    body: 'Parking changed',
    isPinned: true,
    createdAt: '2026-05-20T12:00:00Z',
  })
  const hype = classifyCircleChatEntry({
    id: 'hype-1',
    messageType: 'text',
    body: "Can't wait for the birthday dinner",
    reactionCounts: { fire: 3 },
    createdAt: '2026-05-20T12:05:00Z',
  })
  const social = classifyCircleChatEntry({
    id: 'chat-1',
    messageType: 'text',
    body: 'See you there',
    createdAt: '2026-05-20T12:10:00Z',
  })

  assert.equal(operational.tone, 'operational')
  assert.equal(operational.visuallyDistinct, true)
  assert.equal(operational.notificationPriority, 'live')

  assert.equal(hype.tone, 'hype')
  assert.equal(hype.memoryFeedEligible, true)

  assert.equal(social.tone, 'social')
  assert.equal(social.memoryFeedEligible, false)
})

test('memory feed selection keeps pinned updates and throttles hype chatter', () => {
  const selected = selectCircleMemoryFeedChatEntries([
    {
      id: 'op',
      messageType: 'notification',
      body: 'Menu was shared',
      createdAt: '2026-05-20T12:00:00Z',
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `hype-${index}`,
      messageType: 'text' as const,
      body: `Birthday countdown hype ${index}`,
      reactionCounts: { fire: 4 },
      createdAt: `2026-05-20T12:0${index}:00Z`,
    })),
  ])

  assert.equal(selected.filter((entry) => entry.tone === 'operational').length, 1)
  assert.equal(selected.filter((entry) => entry.tone === 'hype').length, 3)
})

test('hype prompts are milestone-aware', () => {
  const prompts = getCircleHypePrompts({ occasion: 'Anniversary dinner', daysUntil: 12 })

  assert.equal(prompts.some((prompt) => prompt.id === 'countdown'), true)
  assert.equal(prompts.some((prompt) => /Anniversary dinner/.test(prompt.suggestedBody)), true)
})

test('existing hub message actions provide post reply reaction pin read and moderation plumbing', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'lib/hub/message-actions.ts'), 'utf8')

  assert.match(source, /export async function postHubMessage/)
  assert.match(source, /reply_to_message_id/)
  assert.match(source, /export async function addReaction/)
  assert.match(source, /export async function removeReaction/)
  assert.match(source, /export async function togglePinMessage/)
  assert.match(source, /export async function deleteHubMessage/)
  assert.match(source, /export async function markHubRead/)
  assert.match(source, /checkRateLimit/)
  assert.match(source, /\.eq\('group_id', message\.group_id\)/)
})
