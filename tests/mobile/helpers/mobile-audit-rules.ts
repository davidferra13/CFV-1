import type { Page } from '@playwright/test'

export type MobileViewport = {
  name: string
  width: number
  height: number
}

export const MOBILE_VIEWPORTS_QUICK: MobileViewport[] = [
  { name: 'phone-320', width: 320, height: 740 },
  { name: 'phone-390', width: 390, height: 844 },
]

export const MOBILE_VIEWPORTS_FULL: MobileViewport[] = [
  { name: 'phone-320', width: 320, height: 740 },
  { name: 'phone-360', width: 360, height: 800 },
  { name: 'phone-375', width: 375, height: 812 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-414', width: 414, height: 896 },
  { name: 'tablet-768', width: 768, height: 1024 },
]

export type LayoutProbe = {
  viewportWidth: number
  viewportHeight: number
  scrollWidth: number
  overflowX: number
  bodyOverflowX: string
  htmlOverflowX: string
  overflowCulprits: Array<{
    selector: string
    left: number
    right: number
    width: number
    overflowRight: number
    overflowLeft: number
  }>
}

const CONSOLE_ERROR_IGNORE_PATTERNS = [
  /webpack-hmr/i,
  /WebSocket connection to 'ws:\/\/.*_next\/webpack-hmr/i,
  /Warning: Extra attributes from the server/i,
]

export function shouldIgnoreConsoleError(message: string): boolean {
  return CONSOLE_ERROR_IGNORE_PATTERNS.some((pattern) => pattern.test(message))
}

export async function captureLayoutProbe(page: Page): Promise<LayoutProbe> {
  return page.evaluate(() => {
    function selectorFor(el: Element): string {
      const html = el as HTMLElement
      const tag = html.tagName.toLowerCase()
      const id = html.id ? `#${html.id}` : ''
      const classes =
        html.classList.length > 0 ? `.${Array.from(html.classList).slice(0, 2).join('.')}` : ''
      return `${tag}${id}${classes}`
    }

    const root = document.documentElement
    const body = document.body
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0)
    const culprits = Array.from(document.querySelectorAll('*'))
      .map((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect()
        const overflowRight = Math.max(0, rect.right - viewportWidth)
        const overflowLeft = Math.max(0, -rect.left)
        return {
          selector: selectorFor(el),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          overflowRight: Math.round(overflowRight),
          overflowLeft: Math.round(overflowLeft),
        }
      })
      .filter((item) => item.overflowRight > 0 || item.overflowLeft > 0)
      .sort((a, b) => b.overflowRight + b.overflowLeft - (a.overflowRight + a.overflowLeft))
      .slice(0, 8)

    return {
      viewportWidth,
      viewportHeight,
      scrollWidth,
      overflowX: Math.max(0, scrollWidth - viewportWidth),
      bodyOverflowX: body ? getComputedStyle(body).overflowX : '',
      htmlOverflowX: getComputedStyle(root).overflowX,
      overflowCulprits: culprits,
    }
  })
}

export function slugifyPath(path: string): string {
  return (
    path
      .replace(/^\/+/, '')
      .replace(/[^a-zA-Z0-9._/-]/g, '-')
      .replace(/\//g, '__')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'root'
  )
}
