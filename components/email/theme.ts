// These hex values are the email-safe equivalents of the app's light theme tokens
// from app/globals.css. We resolve them here because email clients should not rely
// on CSS variables or OKLCH support.
export const emailTheme = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  muted: "#f5f5f5",
  mutedForeground: "#737373",
  link: "#0a0a0a",
  mutedLink: "#737373",
  buttonBackground: "#171717",
  buttonForeground: "#ffffff",
  buttonBorder: "#171717",
} as const;
