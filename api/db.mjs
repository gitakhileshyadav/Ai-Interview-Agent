// db.mjs — Serverless proxy to Turso. URL/token stay server-side.
import { requireAuth, sendJSON, readBody } from './lib/auth.mjs'
import { execute, batch } from './lib/db.mjs'

export default async function handler(req, res) {
  const user = await requireAuth(req, res)
  if (!user) return

  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'Method not allowed' })
    return
  }

  const body = readBody(req)

  try {
    if (body.action === 'execute') {
      const result = await execute(body.sql, body.args || [])
      sendJSON(res, 200, result)
      return
    }
    if (body.action === 'batch') {
      const result = await batch(body.statements || [])
      sendJSON(res, 200, result)
      return
    }
    sendJSON(res, 400, { error: 'Unknown action' })
  } catch (err) {
    sendJSON(res, 500, { error: err.message })
  }
}