import { requireAdmin } from '../../../utils/auth'
import { db, expireOrders } from '../../../utils/db'
import type { Order } from '../../../../shared'
export default defineEventHandler(event => { requireAdmin(event); expireOrders(); return db().prepare('SELECT * FROM orders ORDER BY id DESC').all() as Order[] })
