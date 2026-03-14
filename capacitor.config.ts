import type { CapacitorConfig } from '@capacitor/cli'
import {
  buildCapacitorNavigationHosts,
  resolveCapacitorServerUrl,
  shouldUseCapacitorCleartext,
} from './lib/mobile/capacitor-config'

const serverUrl = resolveCapacitorServerUrl()

const config: CapacitorConfig = {
  appId: 'com.chefflow.app',
  appName: 'ChefFlow',
  webDir: 'public',
  bundledWebRuntime: false,
  server: {
    url: serverUrl,
    cleartext: shouldUseCapacitorCleartext(serverUrl),
    allowNavigation: buildCapacitorNavigationHosts(serverUrl),
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#e88f47',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#e88f47',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Haptics: {
      selectionDuration: 10,
    },
  },
}

export default config
