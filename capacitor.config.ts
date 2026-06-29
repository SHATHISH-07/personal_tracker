import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.shathish.personaltracker",
  appName: "Personal Tracker",
  server: {
    url: "https://personal-tracker-tau-puce.vercel.app",
    cleartext: false,
  },
};

export default config;