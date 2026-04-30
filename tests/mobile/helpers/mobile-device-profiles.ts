import type { BrowserContextOptions } from '@playwright/test'

export type MobileDeviceProfileName = 'responsive' | 'android-chrome' | 'iphone-safari'

export type MobileDeviceProfile = {
  name: MobileDeviceProfileName
  label: string
  contextOptions: Pick<
    BrowserContextOptions,
    'deviceScaleFactor' | 'hasTouch' | 'isMobile' | 'userAgent'
  >
}

const ANDROID_CHROME_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 15; SM-S928U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

const IPHONE_SAFARI_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'

const PROFILES: Record<MobileDeviceProfileName, MobileDeviceProfile> = {
  responsive: {
    name: 'responsive',
    label: 'Responsive viewport baseline',
    contextOptions: {
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    },
  },
  'android-chrome': {
    name: 'android-chrome',
    label: 'Samsung-style Android Chrome',
    contextOptions: {
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3,
      userAgent: ANDROID_CHROME_USER_AGENT,
    },
  },
  'iphone-safari': {
    name: 'iphone-safari',
    label: 'iPhone Safari-style WebKit',
    contextOptions: {
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3,
      userAgent: IPHONE_SAFARI_USER_AGENT,
    },
  },
}

export function resolveMobileDeviceProfile(value: string | undefined): MobileDeviceProfile {
  const normalized = String(value || 'responsive')
    .trim()
    .toLowerCase()
  if (normalized === 'android' || normalized === 'samsung' || normalized === 'samsung-chrome') {
    return PROFILES['android-chrome']
  }
  if (normalized === 'ios' || normalized === 'iphone' || normalized === 'safari') {
    return PROFILES['iphone-safari']
  }
  if (normalized === 'android-chrome' || normalized === 'iphone-safari') {
    return PROFILES[normalized]
  }
  return PROFILES.responsive
}
