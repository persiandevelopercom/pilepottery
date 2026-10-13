import { assertSameOrigin, requireAdmin } from '../../../utils/auth'
import { db, productById } from '../../../utils/db'
import { validateProduct } from '../../../utils/validate'
import { randomBytes } from 'node:crypto'
export default defineEventHandler(async event => {
  requireAdmin(event); assertSameOrigin(event)
  const p = validateProduct(await readBody(event))
  const slug = 'piece-' + randomBytes(6).toString('hex')
  const result = db().prepare('INSERT INTO products (slug,name,category,description,price,stock,image,gallery,featured,active) VALUES (@slug,@name,@category,@description,@price,@stock,@image,@gallery,@featured,@active)').run({ ...p, slug })
  return productById(Number(result.lastInsertRowid))
})
