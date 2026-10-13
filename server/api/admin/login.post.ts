import { assertSameOrigin, setAdminCookie, verifyLogin } from '../../utils/auth'
const attempts = new Map<string, { count: number; until: number }>()
export default defineEventHandler(async event => {
  assertSameOrigin(event)
  const ip = getRequestIP(event) || 'unknown'
  const current = attempts.get(ip)
  if (current && current.until > Date.now() && current.count >= 5) throw createError({ statusCode: 429, statusMessage: 'تلاش‌های بیش از حد. چند دقیقه بعد دوباره امتحان کنید.' })
  const body = await readBody(event)
  const valid = typeof body?.username === 'string' && typeof body?.password === 'string' && verifyLogin(body.username, body.password)
  if (!valid) {
    attempts.set(ip, { count: current && current.until > Date.now() ? current.count + 1 : 1, until: Date.now() + 15 * 60_000 })
    throw createError({ statusCode: 401, statusMessage: 'نام کاربری یا رمز عبور درست نیست.' })
  }
  attempts.delete(ip)
  const token = setAdminCookie(event)
  return { ok: true, ...(token ? { token } : {}) }
})
