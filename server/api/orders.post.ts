import { assertSameOrigin } from '../utils/auth'
import { db, expireOrders, newOrderCode, orderByCode } from '../utils/db'
import { gatewayConfigured, requestPayment } from '../utils/payment'
import type { Product } from '../../shared'
export default defineEventHandler(async event => {
  assertSameOrigin(event)
  const body = await readBody(event)
  const name = String(body?.name || '').trim().slice(0, 100)
  const mobile = String(body?.mobile || '').trim()
  const city = String(body?.city || '').trim().slice(0, 100)
  const address = String(body?.address || '').trim().slice(0, 500)
  const postal = String(body?.postalCode || '').trim().slice(0, 20)
  const items = body?.items
  if (name.length < 2 || !/^09\d{9}$/.test(mobile) || !city || address.length < 10 || !Array.isArray(items) || !items.length || items.length > 30)
    throw createError({ statusCode: 400, statusMessage: 'لطفاً مشخصات ارسال را کامل و صحیح وارد کنید.' })
  const quantities = new Map<number, number>()
  for (const item of items) {
    const id = Number(item?.id), qty = Number(item?.quantity)
    if (!Number.isSafeInteger(id) || !Number.isSafeInteger(qty) || qty < 1 || qty > 20) throw createError({ statusCode: 400, statusMessage: 'سبد خرید نامعتبر است.' })
    quantities.set(id, (quantities.get(id) || 0) + qty)
  }
  if ([...quantities.values()].some(q => q > 20)) throw createError({ statusCode: 400, statusMessage: 'تعداد محصول نامعتبر است.' })
  for (const id of quantities.keys()) {
    const priced = db().prepare('SELECT price FROM products WHERE id = ? AND active = 1').get(id) as { price: number } | undefined
    if (priced && priced.price <= 0) throw createError({ statusCode: 400, statusMessage: 'قیمت برخی از اقلام هنوز مشخص نشده و امکان ثبت سفارش آن‌ها نیست. برای استعلام قیمت با ما در تماس باشید.' })
  }
  if (!gatewayConfigured()) throw createError({ statusCode: 503, statusMessage: 'درگاه پرداخت هنوز فعال نشده است. لطفاً بعداً تلاش کنید.' })
  expireOrders()
  const code = newOrderCode()
  const order = db().transaction(() => {
    let total = 0
    const snapshot = []
    for (const [id, quantity] of quantities) {
      const p = db().prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(id) as Product | undefined
      if (!p) throw createError({ statusCode: 409, statusMessage: 'یکی از محصولات سبد دیگر در دسترس نیست.' })
      if (p.price <= 0) throw createError({ statusCode: 400, statusMessage: 'قیمت برخی از اقلام هنوز مشخص نشده و امکان ثبت سفارش آن‌ها نیست. برای استعلام قیمت با ما در تماس باشید.' })
      if (p.stock < quantity) throw createError({ statusCode: 409, statusMessage: 'موجودی یکی از محصولات کافی نیست. سبد خود را بررسی کنید.' })
      db().prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, id)
      total += p.price * quantity
      snapshot.push({ id, name: p.name, image: p.image, price: p.price, quantity })
    }
    db().prepare('INSERT INTO orders (code,customer_name,mobile,city,address,postal_code,total,items) VALUES (?,?,?,?,?,?,?,?)').run(code, name, mobile, city, address, postal, total, JSON.stringify(snapshot))
    return orderByCode(code)!
  })()
  try { return { code, paymentUrl: await requestPayment(order) } }
  catch {
    // The provider failed before a redirect: return reserved stock immediately.
    const { releaseOrder } = await import('../utils/db')
    releaseOrder(order, 'failed')
    throw createError({ statusCode: 502, statusMessage: 'ارتباط با درگاه برقرار نشد. لطفاً دوباره تلاش کنید.' })
  }
})
