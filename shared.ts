export const categories = [
  { key: 'mug', name: 'ماگ', english: 'Mugs' },
  { key: 'shot', name: 'شات', english: 'Espresso cups' },
  { key: 'set', name: 'ست لیوان و زیرلیوانی', english: 'Cup & coaster' },
  { key: 'gift', name: 'پک هدیه', english: 'Gift sets' },
  { key: 'clock', name: 'ساعت', english: 'Clocks' },
  { key: 'wall-art', name: 'دیوارکوب', english: 'Wall art' }
] as const
export type Product = { id: number; slug: string; name: string; category: string; description: string; price: number; stock: number; image: string; gallery: string; featured: number; active: number; created_at: string }
export type Order = { id: number; code: string; customer_name: string; mobile: string; city: string; address: string; postal_code: string; total: number; payment_status: string; fulfillment_status: string; authority: string | null; ref_id: string | null; items: string; created_at: string }
export const formatPrice = (price: number) => new Intl.NumberFormat('fa-IR').format(price)
export const categoryName = (key: string) => categories.find(c => c.key === key)?.name || key
