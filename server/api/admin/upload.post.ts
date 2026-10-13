import { assertSameOrigin, requireAdmin } from '../../utils/auth'
import { dataDir } from '../../utils/db'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
export default defineEventHandler(async event => {
  requireAdmin(event); assertSameOrigin(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'image')
  if (!file || !file.data.length || file.data.length > 5 * 1024 * 1024) throw createError({ statusCode: 400, statusMessage: 'تصویر باید کمتر از ۵ مگابایت باشد.' })
  const b = file.data
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  const png = b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  const webp = b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
  if (!jpg && !png && !webp) throw createError({ statusCode: 400, statusMessage: 'فقط JPG، PNG و WEBP پذیرفته می‌شود.' })
  const filename = randomBytes(16).toString('hex') + (jpg ? '.jpg' : png ? '.png' : '.webp')
  const folder = join(dataDir(), 'uploads')
  await mkdir(folder, { recursive: true })
  await writeFile(join(folder, filename), b, { flag: 'wx' })
  return { url: '/api/uploads/' + filename }
})
