import { orderByCode } from '../../utils/db'
export default defineEventHandler(event => {
  const code = getRouterParam(event, 'code') || ''
  if (!/^PL-[A-F0-9]{10}$/.test(code)) throw createError({ statusCode: 404 })
  const order = orderByCode(code)
  if (!order) throw createError({ statusCode: 404 })
  return { code: order.code, total: order.total, payment_status: order.payment_status, ref_id: order.ref_id, items: JSON.parse(order.items) }
})
