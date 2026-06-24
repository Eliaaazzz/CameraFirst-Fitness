declare module '@env' {
  // Legacy API config (for backwards compatibility)
  export const API_BASE_URL: string;
  export const API_TIMEOUT: string;
  export const YOUTUBE_API_KEY: string;
  export const API_KEY: string;
  export const GEMINI_API_KEY: string;

  // Expo public env vars (preferred for production)
  export const EXPO_PUBLIC_API_BASE_URL: string;
  export const EXPO_PUBLIC_API_KEY: string;

  // Realtime gateway (AI Coach WebSocket). When unset, the coach client derives
  // the URL from the API base host on port 8090. See frontend/COACH.md.
  export const EXPO_PUBLIC_GATEWAY_URL: string;

  // Google OAuth Client IDs
  export const EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: string;
  export const EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: string;
  export const EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: string;

  // Apple Sign-In (optional)
  export const EXPO_PUBLIC_APPLE_SERVICE_ID: string;

}
