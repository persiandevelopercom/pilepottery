import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { dataDir } from '../../utils/db'
export default defineEventHandler(async event => {
  const filename = getRouterParam(event, 'filename') || ''
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(filename)) throw createError({ statusCode: 404 })
  try {
    const content = await readFile(join(dataDir(), 'uploads', filename))
    setHeader(event, 'Content-Type', filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg')
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    return content
  } catch { throw createError({ statusCode: 404 }) }
})
