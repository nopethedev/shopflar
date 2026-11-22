// Best-effort public base URL of this deployment, used to show webhook URLs
// in the admin. Falls back to the standard env vars.
export function absoluteUrlFromEnv() {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}
