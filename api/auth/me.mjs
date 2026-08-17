// me.mjs — Verify Bearer token and return the current user
import { requireAuth, sendJSON } from '../lib/auth.mjs'

export default async function handler(req, res) {
  const user = await requireAuth(req, res)
  if (!user) return

  sendJSON(res, 200, {
    user: { id: user.sub, email: user.email, name: user.name }
  })
}