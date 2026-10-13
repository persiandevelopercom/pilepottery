import { categories } from '../../shared'
export function validateProduct(raw: any) {
  const name = String(raw?.name || '').trim().slice(0, 120)
  const description = String(raw?.description || '').trim().slice(0, 2000)
  const category = String(raw?.category || '')
  const image = String(raw?.image || '').trim()
  const price = Number(raw?.price)
  const stock = Number(raw?.stock)
  const gallery = raw?.gallery ?? []
  const validImage = (value: string) => /^\/(images\/(?:products\/)?[^/]+\.(jpg|jpeg|png|webp)|api\/uploads\/[a-f0-9]{32}\.(jpg|png|webp))$/i.test(value)
  const priced = price === 0 || (price >= 1000 && price <= 1_000_000_000)
  if (!name || !categories.some(c => c.key === category) || !Number.isSafeInteger(price) || !priced || !Number.isSafeInteger(stock) || stock < 0 || stock > 100_000 || !validImage(image) || !Array.isArray(gallery) || gallery.length > 8 || !gallery.every((url: unknown) => typeof url === 'string' && validImage(url)))
    throw createError({ statusCode: 400, statusMessage: 'مشخصات محصول معتبر نیست.' })
  return { name, description, category, image, gallery: JSON.stringify([...new Set(gallery)]), price, stock, featured: raw?.featured ? 1 : 0, active: raw?.active === false || raw?.active === 0 ? 0 : 1 }
}
