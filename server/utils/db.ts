import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import type { Product, Order } from '../../shared'

const dir = process.env.DATA_DIR || join(process.cwd(), '.data')
let instance: Database.Database | undefined
export function dataDir() { mkdirSync(dir, { recursive: true }); return dir }
export function db() {
  if (instance) return instance
  instance = new Database(join(dataDir(), 'pilepottery.sqlite'))
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  instance.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0, image TEXT NOT NULL, gallery TEXT NOT NULL DEFAULT '[]', featured INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, customer_name TEXT NOT NULL,
      mobile TEXT NOT NULL, city TEXT NOT NULL, address TEXT NOT NULL, postal_code TEXT NOT NULL DEFAULT '',
      total INTEGER NOT NULL, items TEXT NOT NULL, payment_status TEXT NOT NULL DEFAULT 'pending',
      fulfillment_status TEXT NOT NULL DEFAULT 'new', authority TEXT UNIQUE, ref_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  // Preserve older preview databases created before multi-image galleries were added.
  if (!(instance.pragma('table_info(products)') as { name: string }[]).some(c => c.name === 'gallery'))
    instance.exec("ALTER TABLE products ADD COLUMN gallery TEXT NOT NULL DEFAULT '[]'")
  if ((instance.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number }).count === 0) {
    const seed = instance.prepare('INSERT INTO products (slug,name,category,description,price,stock,image,featured) VALUES (?,?,?,?,?,?,?,?)')
    const products = [
      ['earth-mug', 'ماگ آوید', 'mug', 'یک همراه گرم برای مکث‌های کوچک روزانه. هر ماگ با دست شکل گرفته و رد لطیف خاک را در خود نگه داشته است.', 485000, 12, '/images/mug.jpg', 1],
      ['espresso-shot', 'شات خاکی', 'shot', 'کوچک، صمیمی و پر از حس. برای شروع‌های آرام و قهوه‌هایی که باید با حوصله نوشید.', 295000, 18, '/images/shot.jpg', 1],
      ['cup-coaster-set', 'ست لیوان و زیرلیوانی رُها', 'set', 'هماهنگی ساده‌ی فرم و رنگ؛ یک ست دست‌ساز برای میزهایی که قصه دارند.', 765000, 8, '/images/set.jpg', 1],
      ['gift-box', 'پک هدیه‌ی مهر', 'gift', 'هدیه‌ای از جنس توجه. مجموعه‌ای از سفال‌های دست‌ساز، با بسته‌بندی ساده و دلنشین.', 1090000, 6, '/images/gift.jpg', 0],
      ['clay-clock', 'ساعت آرام', 'clock', 'زمان را کمی آرام‌تر ببینید. ساعتی سرامیکی با بافتی زنده و فرمی یگانه.', 1280000, 4, '/images/clock.jpg', 0],
      ['wall-relief', 'دیوارکوب نقش', 'wall-art', 'تکه‌ای هنر برای دیوار خانه؛ ساخته‌شده با دست، الهام‌گرفته از فرم‌های طبیعت.', 890000, 7, '/images/wall-art.jpg', 0]
    ]
    instance.transaction(() => { for (const p of products) seed.run(...p) })()
  }
  // Idempotent: insert catalogue pieces by slug when an older database is missing them.
  // A later admin edit keeps the same slug, so this will not overwrite it.
  const insertMissing = instance.prepare(`INSERT INTO products (slug,name,category,description,price,stock,image,featured)
    SELECT @slug,@name,@category,@description,@price,@stock,@image,@featured
    WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = @slug)`)
  const catalogue = [
    ['mug-sage-cream', 'ماگ سبز و کرم', 'mug', 'ماگی با لعاب سبز و کرم، برای صبح‌هایی که کمی رنگ می‌خواهند. هر قطعه با دست شکل گرفته است.', 0, 8, '/images/products/mug-sage-cream.webp', 0],
    ['wall-bird', 'بشقاب دیوارکوب پرنده', 'wall-art', 'بشقاب دیواری با نقش پرنده؛ تکه‌ای از خیال برای دیوار خانه.', 0, 6, '/images/products/wall-bird.webp', 0],
    ['shot-trio-ridged', 'ست سه‌تایی شات شیاردار', 'shot', 'سه شات شیاردار با لعاب تیره، برای سرو جمع‌وجور و میزهای نزدیک.', 0, 8, '/images/products/shot-trio-ridged.webp', 0],
    ['shot-pair-sage-blue', 'ست دوتایی شات سبز و آبی', 'shot', 'دو شات با لعاب سبز و آبی. کنار هم یک دست‌اند و تنها هم زیبا می‌مانند.', 0, 8, '/images/products/shot-pair-sage-blue.webp', 0],
    ['shot-pair-clay-green', 'ست دوتایی شات قهوه‌ای و سبز', 'shot', 'دو شات خاکی و سبز، برای قهوه‌هایی که باید آرام نوشیده شوند.', 0, 8, '/images/products/shot-pair-clay-green.webp', 0],
    ['shot-petroglyph', 'شات نقش سنگ‌نگاره', 'shot', 'شاتی کوچک با نقش سنگ‌نگاره؛ ساده، تیره و پر از داستان.', 0, 10, '/images/products/shot-petroglyph.webp', 0],
    ['mug-marble', 'ماگ سفید مرمری', 'mug', 'ماگ سفید با رگه‌های مرمری. روشن، آرام و مناسب دست.', 0, 8, '/images/products/mug-marble.webp', 0],
    ['cup-coaster-blush', 'ست لیوان و زیرلیوانی', 'set', 'لیوان و زیرلیوانی با لعاب کرم، یک ست برای مکث‌های روزانه.', 0, 6, '/images/products/cup-coaster-blush.webp', 0],
    ['gift-floral-set', 'ست هدیه', 'gift', 'ست هدیه با جعبه گل‌دار؛ برای رساندن یک توجه دست‌ساز.', 0, 5, '/images/products/gift-floral-set.webp', 0],
    ['clock-butterfly', 'ساعت دیواری پروانه', 'clock', 'ساعت دیواری با پروانه‌ای سرامیکی. زمان را کمی نرم‌تر می‌کند.', 0, 4, '/images/products/clock-butterfly.webp', 0],
    ['ashtray-bloom', 'زیرسیگاری گل‌دار', 'ashtray', 'زیرسیگاری جمع‌وجور با نقش گل، لعاب‌خورده و دست‌ساز.', 0, 8, '/images/products/ashtray-bloom.webp', 0],
    ['shot-tray-set', 'ست شات با سینی', 'shot', 'شش شات روی سینی دست‌ساز، برای دورهمی‌های کوچک.', 0, 4, '/images/products/shot-tray-set.webp', 0],
    ['wall-rose', 'دیوارکوب گل سرخ', 'wall-art', 'دیوارکوب برجسته با گل سرخ و برگ‌های سبز.', 0, 5, '/images/products/wall-rose.webp', 0],
    ['wall-blue-bloom', 'دیوارکوب گل آبی', 'wall-art', 'دیوارکوب با گل آبی و برگ‌های برجسته، برای دیوارهای روشن.', 0, 5, '/images/products/wall-blue-bloom.webp', 0],
    ['wall-sunflower', 'دیوارکوب گل زرد', 'wall-art', 'دیوارکوب با گل زرد و برگ‌های سبز، گرم و زنده.', 0, 5, '/images/products/wall-sunflower.webp', 0],
    ['wall-crow', 'بشقاب دیوارکوب کلاغ', 'wall-art', 'بشقاب دیواری با نقش کلاغ؛ تیره، آرام و چشمگیر.', 0, 4, '/images/products/wall-crow.webp', 0]
  ] as const
  instance.transaction(() => {
    for (const [slug, name, category, description, price, stock, image, featured] of catalogue)
      insertMissing.run({ slug, name, category, description, price, stock, image, featured })
  })()
  return instance
}
export const publicProducts = () => db().prepare('SELECT * FROM products WHERE active = 1 ORDER BY featured DESC, id ASC').all() as Product[]
export const allProducts = () => db().prepare('SELECT * FROM products ORDER BY id DESC').all() as Product[]
export const productById = (id: number) => db().prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined
export const orderByCode = (code: string) => db().prepare('SELECT * FROM orders WHERE code = ?').get(code) as Order | undefined
export const newOrderCode = () => 'PL-' + randomBytes(5).toString('hex').toUpperCase()
export function releaseOrder(order: Order, status: 'failed' | 'expired' | 'cancelled') {
  if (order.payment_status !== 'pending') return
  db().transaction(() => {
    const changed = db().prepare("UPDATE orders SET payment_status = ? WHERE id = ? AND payment_status = 'pending'").run(status, order.id)
    if (changed.changes) for (const item of JSON.parse(order.items) as { id: number; quantity: number }[])
      db().prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.id)
  })()
}
export function expireOrders() {
  const stale = db().prepare("SELECT * FROM orders WHERE payment_status = 'pending' AND created_at < datetime('now', '-45 minutes')").all() as Order[]
  for (const order of stale) releaseOrder(order, 'expired')
}
