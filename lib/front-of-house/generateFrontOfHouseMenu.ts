'use server'

import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  FRONT_OF_HOUSE_THEMES,
  FrontOfHouseContextSchema,
  type FrontOfHouseContext,
  type FrontOfHouseEventType,
  type MenuTemplateDefinition,
  MenuTemplateSchema,
} from './menuTemplateSchema'

type FrontOfHouseMenuData = {
  menuId: string
  menuName: string
  tenantId: string
  eventId: string | null
  eventDate: string | null
  occasion: string | null
  clientName: string | null
  dishes: Array<{
    id: string
    course_name: string
    course_number: number
    description: string | null
    dietary_tags: string[] | null
    allergen_flags: string[] | null
    sort_order: number | null
  }>
}

const EVENT_TYPE_LABELS: Record<FrontOfHouseEventType, string> = {
  regular_menu: 'Regular Menu',
  birthday: 'Birthday',
  bachelorette_party: 'Bachelorette Party',
  anniversary: 'Anniversary',
  holiday: 'Holiday',
  corporate_event: 'Corporate Event',
}

const HOLIDAY_KEYWORDS = ['christmas', 'hanukkah', 'valentine', 'easter', 'halloween']
const EVENT_KEYWORDS: Array<{ keyword: string; eventType: FrontOfHouseEventType }> = [
  { keyword: 'birthday', eventType: 'birthday' },
  { keyword: 'bachelorette', eventType: 'bachelorette_party' },
  { keyword: 'anniversary', eventType: 'anniversary' },
  { keyword: 'corporate', eventType: 'corporate_event' },
]

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeTheme(input?: string | null) {
  if (!input) return null
  const match = FRONT_OF_HOUSE_THEMES.find((theme) => theme.toLowerCase() === input.toLowerCase())
  return match ?? input
}

function inferEventType(occasion?: string | null, theme?: string | null): FrontOfHouseEventType {
  const lowerOccasion = (occasion ?? '').toLowerCase()
  const lowerTheme = (theme ?? '').toLowerCase()

  if (
    HOLIDAY_KEYWORDS.some(
      (keyword) => lowerOccasion.includes(keyword) || lowerTheme.includes(keyword)
    )
  ) {
    return 'holiday'
  }

  for (const rule of EVENT_KEYWORDS) {
    if (lowerOccasion.includes(rule.keyword) || lowerTheme.includes(rule.keyword)) {
      return rule.eventType
    }
  }

  return 'regular_menu'
}

async function fetchMenuData(menuId: string): Promise<FrontOfHouseMenuData> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menu, error: menuError } = await db
    .from('menus')
    .select('id, name, tenant_id, event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (menuError || !menu) {
    throw new Error('Menu not found')
  }

  const [{ data: dishes }, { data: event }] = await Promise.all([
    db
      .from('dishes')
      .select(
        'id, course_name, course_number, description, dietary_tags, allergen_flags, sort_order'
      )
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true }),
    menu.event_id
      ? db
          .from('events')
          .select('id, event_date, occasion, clients(full_name)')
          .eq('id', menu.event_id)
          .eq('tenant_id', user.tenantId!)
          .single()
      : Promise.resolve({ data: null }),
  ])

  return {
    menuId: menu.id,
    menuName: menu.name,
    tenantId: menu.tenant_id,
    eventId: menu.event_id,
    eventDate: (event as any)?.event_date ?? null,
    occasion: (event as any)?.occasion ?? null,
    clientName: ((event as any)?.clients as { full_name?: string } | null)?.full_name ?? null,
    dishes: dishes ?? [],
  }
}

const FALLBACK_TEMPLATE: MenuTemplateDefinition = {
  id: '00000000-0000-0000-0000-000000000000',
  slug: 'default-classic-fallback',
  name: 'Default Classic',
  description: 'Fallback system template',
  type: 'default',
  event_type: 'regular_menu',
  theme: 'Default',
  layout: { header: 'centered', showStamp: false },
  placeholders: [
    'chefName',
    'date',
    'hostName',
    'theme',
    'winePairing',
    'specialNote',
    'customStamp',
  ],
  styles: {
    palette: { bg: '#f8f4ec', text: '#1f1f1f', accent: '#6b4f3a' },
    font: { title: 'Georgia, serif', body: 'Times New Roman, serif' },
  },
  default_fields: {
    showHostName: false,
    showTheme: false,
    showWinePairing: true,
    showSpecialNote: false,
    showStamp: false,
  },
  is_system: true,
}

async function getTemplate(
  templateId: string | undefined,
  eventType: FrontOfHouseEventType,
  theme: string | null
): Promise<MenuTemplateDefinition> {
  const user = await requireChef()
  const db: any = createServerClient()
  const templatesTable = (db as any).from('menu_templates')

  if (templateId) {
    const { data } = await templatesTable
      .select('*')
      .eq('id', templateId)
      .or(`tenant_id.eq.${user.tenantId},and(is_system.eq.true,tenant_id.is.null)`)
      .single()

    if (data) {
      return MenuTemplateSchema.parse(data)
    }
  }

  const { data: rows } = await templatesTable
    .select('*')
    .or(`tenant_id.eq.${user.tenantId},and(is_system.eq.true,tenant_id.is.null)`)

  const templates = ((rows ?? []) as unknown[]).map((row) => MenuTemplateSchema.parse(row))

  const byTheme =
    theme && templates.find((template) => template.theme?.toLowerCase() === theme.toLowerCase())
  if (byTheme) return byTheme

  const byEventType = templates.find((template) => template.event_type === eventType)
  if (byEventType) return byEventType

  return templates.find((template) => template.type === 'default') ?? FALLBACK_TEMPLATE
}

/**
 * Generates print-ready HTML for a front-of-house menu.
 */
export async function generateFrontOfHouseMenu(
  menuId: string,
  templateId?: string,
  context?: object
): Promise<string> {
  const data = await fetchMenuData(menuId)
  const parsedContext = FrontOfHouseContextSchema.parse(context ?? {})

  const theme = normalizeTheme(parsedContext.theme) ?? normalizeTheme(data.occasion)
  const eventType = parsedContext.eventType ?? inferEventType(data.occasion, theme)
  const template = await getTemplate(templateId, eventType, theme)

  const palette = (template.styles as any)?.palette ?? FALLBACK_TEMPLATE.styles.palette
  const font = (template.styles as any)?.font ?? FALLBACK_TEMPLATE.styles.font
  const defaults = { ...FALLBACK_TEMPLATE.default_fields, ...(template.default_fields ?? {}) }

  const displayDate =
    parsedContext.date ||
    (data.eventDate ? format(new Date(data.eventDate), 'EEEE, MMMM d, yyyy') : null)
  const displayTheme = theme || template.theme || EVENT_TYPE_LABELS[eventType]
  const hostName = parsedContext.hostName || data.clientName || ''
  const chefName = parsedContext.chefName || 'ChefFlow'
  const winePairing = parsedContext.winePairing || ''
  const specialNote = parsedContext.specialNote || ''
  const customStamp = parsedContext.customStamp || ''

  const showHost =
    Boolean(hostName) &&
    (defaults.showHostName || ['birthday', 'bachelorette_party', 'anniversary'].includes(eventType))

  const menuRows = data.dishes
    .map((dish) => {
      const tags = [...(dish.dietary_tags ?? []), ...(dish.allergen_flags ?? [])]
        .filter(Boolean)
        .map((tag) => `<span class=\"tag\">${escapeHtml(tag)}</span>`)
        .join('')

      return `
        <section class="course">
          <h3>${escapeHtml(dish.course_name)}</h3>
          ${dish.description ? `<p class="desc">${escapeHtml(dish.description)}</p>` : ''}
          ${tags ? `<div class="tags">${tags}</div>` : ''}
        </section>
      `
    })
    .join('\n')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(data.menuName)} - Front of House Menu</title>
    <style>
      :root {
        --bg: ${palette.bg ?? '#f8f4ec'};
        --text: ${palette.text ?? '#1f1f1f'};
        --accent: ${palette.accent ?? '#6b4f3a'};
      }
      @page { size: letter; margin: 0.5in; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: ${font.body ?? 'Times New Roman, serif'};
      }
      .sheet {
        width: 100%;
        min-height: calc(11in - 1in);
        border: 1px solid color-mix(in srgb, var(--accent), white 65%);
        padding: 28px 30px;
        background: linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35));
      }
      .header { text-align: center; margin-bottom: 18px; }
      .eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; color: color-mix(in srgb, var(--text), white 45%); }
      h1 {
        margin: 8px 0 6px;
        font-family: ${font.title ?? 'Georgia, serif'};
        font-size: 34px;
        line-height: 1.15;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        font-size: 13px;
        color: color-mix(in srgb, var(--text), white 25%);
      }
      .host {
        margin: 14px auto 4px;
        padding: 7px 12px;
        max-width: fit-content;
        border: 1px solid color-mix(in srgb, var(--accent), white 55%);
        border-radius: 999px;
        font-weight: 600;
      }
      .stamp {
        margin: 10px auto 0;
        padding: 6px 12px;
        width: fit-content;
        border: 2px dashed var(--accent);
        border-radius: 6px;
        font-weight: 700;
        transform: rotate(-2deg);
      }
      .menu-list { margin-top: 22px; }
      .course { padding: 14px 0; border-top: 1px solid color-mix(in srgb, var(--accent), white 70%); }
      .course:first-child { border-top: 0; }
      h3 {
        margin: 0;
        font-family: ${font.title ?? 'Georgia, serif'};
        font-size: 22px;
        line-height: 1.2;
      }
      .desc { margin: 6px 0 0; font-size: 14px; line-height: 1.55; }
      .tags { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
      .tag {
        display: inline-block;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--accent), white 55%);
        padding: 2px 8px;
        font-size: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .footnote {
        margin-top: 18px;
        font-size: 11px;
        color: color-mix(in srgb, var(--text), white 35%);
      }
      @media print {
        body { background: white; }
        .sheet { border: none; background: white; padding: 0; }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="header">
        <div class="eyebrow">${escapeHtml(EVENT_TYPE_LABELS[eventType])}</div>
        <h1>${escapeHtml(data.menuName)}</h1>
        <div class="meta">
          ${displayDate ? `<span>${escapeHtml(displayDate)}</span>` : ''}
          ${defaults.showTheme && displayTheme ? `<span>${escapeHtml(displayTheme)}</span>` : ''}
          <span>By ${escapeHtml(chefName)}</span>
        </div>
        ${showHost ? `<div class="host">Hosted by ${escapeHtml(hostName)}</div>` : ''}
        ${defaults.showSpecialNote && specialNote ? `<p class="desc">${escapeHtml(specialNote)}</p>` : ''}
        ${defaults.showStamp && customStamp ? `<div class="stamp">${escapeHtml(customStamp)}</div>` : ''}
      </header>

      <section class="menu-list">
        ${menuRows || '<p class="desc">No dishes have been added yet.</p>'}
      </section>

      ${
        defaults.showWinePairing && winePairing
          ? `<p class="footnote"><strong>Wine Pairing:</strong> ${escapeHtml(winePairing)}</p>`
          : ''
      }
      ${
        defaults.showSpecialNote && specialNote
          ? `<p class="footnote">${escapeHtml(specialNote)}</p>`
          : ''
      }
      <p class="footnote">Please notify your chef immediately about allergy concerns before service.</p>
    </main>
  </body>
</html>`
}

export type GeneratedFrontOfHousePayload = {
  html: string
  eventType: FrontOfHouseEventType
  theme: string | null
  context: FrontOfHouseContext
}

export async function generateFrontOfHouseMenuPayload(
  menuId: string,
  templateId?: string,
  context?: object
): Promise<GeneratedFrontOfHousePayload> {
  const data = await fetchMenuData(menuId)
  const parsedContext = FrontOfHouseContextSchema.parse(context ?? {})
  const theme = normalizeTheme(parsedContext.theme) ?? normalizeTheme(data.occasion)
  const eventType = parsedContext.eventType ?? inferEventType(data.occasion, theme)
  const html = await generateFrontOfHouseMenu(menuId, templateId, parsedContext)
  return { html, eventType, theme, context: parsedContext }
}
