import { assertSameOrigin, requireAdmin } from '../../../../utils/auth'
import { db } from '../../../../utils/db'
import { gatewayConfigured, verifyPayment } from '../../../../utils/payment'
import type { Order } from '../../../../../shared'
export default defineEventHandler(async event => {
  requireAdmin(event); assertSameOrigin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id)) throw createError({ statusCode: 400 })
  const order = db().prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined
  if (!order || !order.authority || !gatewayConfigured()) throw createError({ statusCode: 400, statusMessage: 'این سفارش شناسه‌ی معتبر برای استعلام ندارد.' })
  if (order.payment_status === 'paid') return { paid: true }
  try { return { paid: await verifyPayment(order) } }
  catch { throw createError({ statusCode: 502, statusMessage: 'استعلام از درگاه انجام نشد. بعداً دوباره تلاش کنید.' }) }
})
