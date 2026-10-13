import { assertSameOrigin, clearAdminCookie } from '../../utils/auth'
export default defineEventHandler(event => { assertSameOrigin(event); clearAdminCookie(event); return { ok: true } })
