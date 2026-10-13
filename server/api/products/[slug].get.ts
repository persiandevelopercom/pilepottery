import { db } from '../../utils/db'
import type { Product } from '../../../shared'
export default defineEventHandler((event) => {
  const product = db().prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(getRouterParam(event, 'slug')) as Product | undefined
  if (!product) throw createError({ statusCode: 404, statusMessage: 'محصول پیدا نشد.' })
  return product
})
