import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.shathish.personaltracker",
  appName: "Personal Tracker",

  server: {
    url: "https://personal-tracker-tau-puce.vercel.app",
    cleartext: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
    },
  },
};

export default config;