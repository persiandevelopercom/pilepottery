import { requireAdmin } from '../../../utils/auth'
import { allProducts } from '../../../utils/db'
export default defineEventHandler(event => { requireAdmin(event); return allProducts() })
