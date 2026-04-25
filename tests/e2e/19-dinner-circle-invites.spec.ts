import type { Browser, Page } from '@playwright/test'
import { createAdminClient } from '@/lib/db/admin'
import { test, expect } from '../helpers/fixtures'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'

type AdminDb = ReturnType<typeof createAdminClient>

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getGroupTokenFromInviteUrl(inviteUrl: string): string {
  const url = new URL(inviteUrl)
  const match = url.pathname.match(/^\/hub\/join\/([^/]+)$/)
  if (!match?.[1]) {
    throw new Error(`[hub-invites] Could not parse group token from ${inviteUrl}`)
  }
  return match[1]
}

async function newStoredPage(browser: Browser, storageState: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: BASE_URL, storageState })
  return context.newPage()
}

async function getRenderedInviteUrl(page: Page): Promise<string> {
  const joinLink = page
    .locator('p')
    .filter({ hasText: /\/hub\/join\// })
    .first()
  await expect(joinLink).toBeVisible({ timeout: 20_000 })

  await expect
    .poll(async () => (await joinLink.textContent()) ?? '', {
      message: 'invite card should render an attributed join URL',
      timeout: 20_000,
    })
    .toContain('invite=')

  const text = ((await joinLink.textContent()) ?? '').trim()
  const match = text.match(/https?:\/\/\S+\/hub\/join\/\S+/)
  if (!match) {
    throw new Error(`[hub-invites] Could not read invite URL from rendered text: ${text}`)
  }
  return match[0]
}

async function loadCircle(admin: AdminDb, groupToken: string) {
  const { data, error } = await admin
    .from('hub_groups')
    .select('id, group_token, allow_member_invites')
    .eq('group_token', groupToken)
    .single()

  if (error || !data) {
    throw new Error(`[hub-invites] Failed to load circle: ${error?.message ?? 'not found'}`)
  }
  return data
}

async function getChefInviterProfileId(admin: AdminDb, groupId: string): Promise<string> {
  const { data, error } = await admin
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', groupId)
    .eq('role', 'chef')
    .limit(1)
    .maybeSingle()

  if (error || !data?.profile_id) {
    throw new Error(
      `[hub-invites] Failed to load chef inviter membership: ${error?.message ?? 'not found'}`
    )
  }
  return data.profile_id
}

test.describe('Dinner Circle invite journey', () => {
  test('chef invite, public join, attribution persistence, member invite, and client copy stay wired', async ({
    browser,
    seedIds,
  }) => {
    const admin = createAdminClient()
    const unique = Date.now()
    const guestName = `Invite Journey Guest ${unique}`
    const guestEmail = `invite-journey-${unique}@chefflow.test`

    let inviteUrl = ''
    let groupToken = ''
    let groupId = ''
    let inviterProfileId = ''

    await test.step('chef surface renders attributed chef invite copy', async () => {
      const chefPage = await newStoredPage(browser, '.auth/chef.json')

      try {
        await chefPage.goto(`/events/${seedIds.eventIds.confirmed}`)
        await expect(chefPage).not.toHaveURL(/auth\/signin/)
        await expect(chefPage.getByText('Dinner Circle is live')).toBeVisible({ timeout: 30_000 })
        await expect(
          chefPage.getByText(
            'Send the client one clean link, text guests without extra setup, and keep every allergy, message, and update tied to the same event thread.'
          )
        ).toBeVisible()
        await expect(chefPage.getByText(/I set up our Dinner Circle/)).toBeVisible()
        await expect(chefPage.getByText('Chef-led coordination')).toBeVisible()

        inviteUrl = await getRenderedInviteUrl(chefPage)
        expect(inviteUrl).toContain('/hub/join/')
        expect(inviteUrl).toContain('invite=')
        groupToken = getGroupTokenFromInviteUrl(inviteUrl)
      } finally {
        await chefPage.context().close()
      }
    })

    await test.step('test setup allows member-native invite affordance for the joined guest', async () => {
      const group = await loadCircle(admin, groupToken)
      groupId = group.id
      inviterProfileId = await getChefInviterProfileId(admin, groupId)

      const { error } = await admin
        .from('hub_groups')
        .update({ allow_member_invites: true })
        .eq('id', groupId)

      if (error) {
        throw new Error(`[hub-invites] Failed to enable member invites: ${error.message}`)
      }
    })

    await test.step('public join honors chef attribution and lands in the circle', async () => {
      const publicContext = await browser.newContext({ baseURL: BASE_URL })
      const publicPage = await publicContext.newPage()

      try {
        await publicPage.goto(inviteUrl)
        await expect(publicPage.getByText('Chef Invite')).toBeVisible({ timeout: 20_000 })
        await expect(publicPage.getByText(/Chef .* sent this link/)).toBeVisible()
        await expect(publicPage.getByText('Quick Join')).toBeVisible()
        await expect(publicPage.getByText(/invited you to/)).toBeVisible()

        await publicPage.getByLabel('Your Name').fill(guestName)
        await publicPage.getByLabel('Email').fill(guestEmail)
        await publicPage.getByRole('button', { name: 'No, none' }).click()
        await publicPage.getByRole('button', { name: 'Join Dinner Circle' }).click()

        await expect(publicPage).toHaveURL(new RegExp(`/hub/g/${escapeRegExp(groupToken)}`), {
          timeout: 20_000,
        })
        await expect(
          publicPage.getByText(new RegExp(`${escapeRegExp(guestName)} joined via Chef`))
        ).toBeVisible({ timeout: 20_000 })

        await expect(publicPage.getByTitle('Copy invite link')).toBeVisible()
        await publicPage.getByRole('button', { name: /Members/i }).click()
        await expect(publicPage.getByText('Bring someone into the circle')).toBeVisible({
          timeout: 20_000,
        })
        await expect(
          publicPage.getByText(
            'Copy the join link or drop it into a text. New guests can get into the Dinner Circle in seconds.'
          )
        ).toBeVisible()
        await expect(publicPage.getByText(/Join our Dinner Circle/)).toBeVisible()
      } finally {
        await publicContext.close()
      }
    })

    await test.step('join attribution is persisted in hub messages and guest profile referral', async () => {
      const { data: guestProfile, error: guestError } = await admin
        .from('hub_guest_profiles')
        .select('id, referred_by_profile_id')
        .eq('email_normalized', guestEmail.toLowerCase())
        .single()

      if (guestError || !guestProfile) {
        throw new Error(
          `[hub-invites] Failed to load joined guest profile: ${guestError?.message ?? 'not found'}`
        )
      }

      const { data: messages, error: messageError } = await admin
        .from('hub_messages')
        .select('id, author_profile_id, system_event_type, system_metadata, body, created_at')
        .eq('group_id', groupId)
        .eq('author_profile_id', guestProfile.id)
        .eq('system_event_type', 'member_joined')
        .order('created_at', { ascending: false })
        .limit(1)

      if (messageError || !messages?.[0]) {
        throw new Error(
          `[hub-invites] Failed to load member_joined message: ${
            messageError?.message ?? 'not found'
          }`
        )
      }

      const message = messages[0]
      const metadata = message.system_metadata as Record<string, unknown>

      expect(message.system_event_type).toBe('member_joined')
      expect(metadata.invited_by_profile_id).toBe(inviterProfileId)
      expect(metadata.invited_by_display_name).toEqual(expect.any(String))
      expect(metadata.invited_by_copy_role).toBe('chef')
      expect(guestProfile.referred_by_profile_id).toBe(inviterProfileId)
    })

    await test.step('client event surface keeps host-native invite copy', async () => {
      const clientPage = await newStoredPage(browser, '.auth/client.json')

      try {
        await clientPage.goto(`/my-events/${seedIds.eventIds.confirmed}`)
        await expect(clientPage).not.toHaveURL(/auth\/signin/)
        await expect(clientPage.getByText('Your dinner circle is live')).toBeVisible({
          timeout: 30_000,
        })
        await expect(
          clientPage.getByText(
            'Send one polished link to your guests and keep the host side, chef, and table aligned in the same thread.'
          )
        ).toBeVisible()
        await expect(clientPage.getByText(/I started a Dinner Circle/)).toBeVisible()
        await expect(clientPage.getByText('Host, chef, and guests aligned')).toBeVisible()
      } finally {
        await clientPage.context().close()
      }
    })
  })
})
