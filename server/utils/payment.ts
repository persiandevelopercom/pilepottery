import { db } from './db'
import type { Order } from '../../shared'

function base() { return process.env.ZARINPAL_SANDBOX === 'true' ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com' }
export function gatewayConfigured() {
  return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(process.env.ZARINPAL_MERCHANT_ID || '') && /^https:\/\//.test(process.env.SITE_URL || '')
}
async function postZarinpal(path: string, payload: Record<string, unknown>) {
  const response = await $fetch<{ data?: { code: number; authority?: string; ref_id?: number | string }; errors?: unknown }>(base() + '/pg/v4/payment/' + path + '.json', {
    method: 'POST', body: payload, timeout: 12000, headers: { accept: 'application/json' }
  })
  return response.data
}
export async function requestPayment(order: Order) {
  const data = await postZarinpal('request', {
    merchant_id: process.env.ZARINPAL_MERCHANT_ID, amount: order.total, currency: 'IRT',
    callback_url: process.env.SITE_URL!.replace(/\/$/, '') + '/api/payments/callback',
    description: 'سفارش پیله پاتری ' + order.code,
    metadata: { mobile: order.mobile, order_id: order.code }
  })
  if (data?.code !== 100 || !data.authority || !/^[a-zA-Z0-9]+$/.test(data.authority)) throw new Error('Gateway request rejected')
  db().prepare('UPDATE orders SET authority = ? WHERE id = ?').run(data.authority, order.id)
  return base() + '/pg/StartPay/' + data.authority
}
export async function verifyPayment(order: Order) {
  const data = await postZarinpal('verify', { merchant_id: process.env.ZARINPAL_MERCHANT_ID, amount: order.total, currency: 'IRT', authority: order.authority })
  if (data?.code !== 100 && data?.code !== 101) return false
  db().transaction(() => {
    const current = db().prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as Order
    if (current.payment_status === 'paid') return
    // A late successful callback after the reservation expired is still a real payment.
    // Re-reserve if possible; otherwise flag it for manual fulfillment review.
    let review = false
    if (current.payment_status === 'expired' || current.payment_status === 'failed') {
      const items = JSON.parse(current.items) as { id: number; quantity: number }[]
      review = items.some(item => {
        const product = db().prepare('SELECT stock FROM products WHERE id = ?').get(item.id) as { stock: number } | undefined
        return !product || product.stock < item.quantity
      })
      if (!review) for (const item of items) db().prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id)
    }
    db().prepare("UPDATE orders SET payment_status = 'paid', fulfillment_status = ?, ref_id = ? WHERE id = ?").run(review ? 'review' : 'new', String(data.ref_id || ''), order.id)
  })()
  return true
}
