import { assertSameOrigin, requireAdmin } from '../../../utils/auth'
import { db } from '../../../utils/db'
export default defineEventHandler(async event => {
  requireAdmin(event); assertSameOrigin(event)
  const id = Number(getRouterParam(event, 'id'))
  const { fulfillment_status } = await readBody(event)
  if (!Number.isSafeInteger(id) || !['new', 'processing', 'shipped', 'completed', 'review'].includes(fulfillment_status)) throw createError({ statusCode: 400 })
  const result = db().prepare("UPDATE orders SET fulfillment_status = ? WHERE id = ? AND payment_status = 'paid'").run(fulfillment_status, id)
  if (!result.changes) throw createError({ statusCode: 400, statusMessage: 'فقط سفارش پرداخت‌شده قابل ویرایش است.' })
  return { ok: true }
})
