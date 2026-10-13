// The embedded preview can block third-party cookies. A short-lived, tab-scoped
// bearer session is used only there; production authentication remains HttpOnly-cookie-only.
export function adminHeaders(): Record<string, string> {
  if (import.meta.server) return {}
  const token = sessionStorage.getItem('pile-preview-session')
  return token ? { authorization: `Bearer ${token}` } : {}
}
