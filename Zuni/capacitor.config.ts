// Capacitor configuration for iOS/Android mobile app
// Note: Install @capacitor/cli for TypeScript types: npm install -D @capacitor/cli
const config = {
  appId: 'com.zuni.social',
  appName: 'Zuni',
  webDir: 'out',
  server: {
    url: 'https://zuni-mobile.vercel.app',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    // Enable safe area handling
    backgroundColor: '#F3F4F6',
    // Configure status bar
    statusBarStyle: 'default',
  },
  android: {
    backgroundColor: '#F3F4F6',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#F3F4F6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#F3F4F6',
    },
  },
};

export default config;
