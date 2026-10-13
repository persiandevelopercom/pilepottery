import { authInfo, isAdmin } from '../../utils/auth'
export default defineEventHandler(event => ({ authenticated: isAdmin(event), ...authInfo() }))
