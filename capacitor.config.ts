import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.buroq.billing',
  appName: 'Buroq Billing',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    cleartext: true
  }
};

export default config;
