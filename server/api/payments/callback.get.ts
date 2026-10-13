import { db, releaseOrder } from '../../utils/db'
import { verifyPayment } from '../../utils/payment'
import type { Order } from '../../../shared'
export default defineEventHandler(async event => {
  const query = getQuery(event)
  const authority = String(query.Authority || '')
  if (!/^[a-zA-Z0-9]{10,100}$/.test(authority)) return sendRedirect(event, '/payment-result?state=invalid', 302)
  const order = db().prepare('SELECT * FROM orders WHERE authority = ?').get(authority) as Order | undefined
  if (!order) return sendRedirect(event, '/payment-result?state=invalid', 302)
  if (order.payment_status === 'paid') return sendRedirect(event, '/payment-result?code=' + encodeURIComponent(order.code), 302)
  if (query.Status !== 'OK') {
    releaseOrder(order, 'failed')
    return sendRedirect(event, '/payment-result?code=' + encodeURIComponent(order.code), 302)
  }
  try {
    const verified = await verifyPayment(order)
    if (!verified) releaseOrder(order, 'failed')
  } catch { /* Keep pending for later verification rather than falsely reporting failure. */ }
  return sendRedirect(event, '/payment-result?code=' + encodeURIComponent(order.code), 302)
})
