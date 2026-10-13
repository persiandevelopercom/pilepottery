import { assertSameOrigin, requireAdmin } from '../../../utils/auth'
import { db, productById } from '../../../utils/db'
import { validateProduct } from '../../../utils/validate'
export default defineEventHandler(async event => {
  requireAdmin(event); assertSameOrigin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || !productById(id)) throw createError({ statusCode: 404 })
  const p = validateProduct(await readBody(event))
  db().prepare('UPDATE products SET name=@name, category=@category, description=@description, price=@price, stock=@stock, image=@image, gallery=@gallery, featured=@featured, active=@active WHERE id=@id').run({ ...p, id })
  return productById(id)
})
