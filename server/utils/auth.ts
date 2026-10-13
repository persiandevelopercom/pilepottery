import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const cookieName = 'pile_admin'
function credentials() {
  const password = process.env.ADMIN_PASSWORD || ''
  const demo = process.env.NODE_ENV !== 'production' && !password
  return { username: process.env.ADMIN_USERNAME || 'admin', password: demo ? 'atelier-demo-2026' : password, secret: demo ? 'pile-local-preview-only-secret-not-for-production' : process.env.SESSION_SECRET || '', demo }
}
function sign(value: string, secret: string) { return createHmac('sha256', secret).update(value).digest('hex') }
export function authInfo() { const c = credentials(); return { demo: c.demo, configured: !!c.password && c.secret.length >= 32 } }
export function verifyLogin(username: string, password: string) {
  const c = credentials()
  if (!c.password || c.secret.length < 32) return false
  const actual = Buffer.from(sign(username + ':' + password, c.secret), 'hex')
  const expected = Buffer.from(sign(c.username + ':' + c.password, c.secret), 'hex')
  return timingSafeEqual(actual, expected)
}
export function setAdminCookie(event: H3Event) {
  const { secret } = credentials()
  const payload = String(Date.now() + 1000 * 60 * 60 * 12)
  const previewHost = process.env.E2B_SANDBOX_ID ? `3000-${process.env.E2B_SANDBOX_ID}.e2b.app` : ''
  const origin = getHeader(event, 'origin')
  const embeddedPreview = !!previewHost && origin === `https://${previewHost}`
  // The Arena preview is embedded on another site. Lax cookies are not sent from
  // cross-site iframes, so only that HTTPS preview uses SameSite=None; Secure.
  const token = payload + '.' + sign(payload, secret)
  setCookie(event, cookieName, token, { httpOnly: true, sameSite: embeddedPreview ? 'none' : 'lax', secure: embeddedPreview || process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 })
  return embeddedPreview && process.env.NODE_ENV !== 'production' ? token : undefined
}
export function clearAdminCookie(event: H3Event) { deleteCookie(event, cookieName, { path: '/' }) }
export function isAdmin(event: H3Event) {
  const { secret } = credentials()
  if (secret.length < 32) return false
  const bearer = process.env.NODE_ENV !== 'production' && process.env.E2B_SANDBOX_ID
    ? (getHeader(event, 'authorization') || '').match(/^Bearer (\d+\.[a-f0-9]{64})$/)?.[1]
    : undefined
  const token = getCookie(event, cookieName) || bearer || ''
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !/^\d+$/.test(payload) || Number(payload) < Date.now() || signature.length !== 64) return false
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(payload, secret), 'hex'))
}
export function requireAdmin(event: H3Event) {
  if (!isAdmin(event)) throw createError({ statusCode: 401, statusMessage: 'ابتدا وارد پنل شوید.' })
}
export function assertSameOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  if (origin) {
    try {
      const originHost = new URL(origin).host
      const previewHost = process.env.E2B_SANDBOX_ID ? `3000-${process.env.E2B_SANDBOX_ID}.e2b.app` : ''
      const allowedHosts = [getHeader(event, 'host'), getHeader(event, 'x-forwarded-host')?.split(',')[0]?.trim(), process.env.SITE_URL ? new URL(process.env.SITE_URL).host : '', previewHost]
      if (allowedHosts.includes(originHost)) return
    } catch { /* reject malformed Origin */ }
    throw createError({ statusCode: 403, statusMessage: 'درخواست نامعتبر است.' })
  }
}
