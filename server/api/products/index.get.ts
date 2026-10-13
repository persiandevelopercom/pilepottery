import { publicProducts } from '../../utils/db'
export default defineEventHandler(() => publicProducts())
