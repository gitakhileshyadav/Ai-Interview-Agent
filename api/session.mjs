import { requireAuth, sendJSON } from './lib/auth.mjs'
import { execute, rowsToObjects } from './lib/db.mjs'

export default async function handler(req, res) {
  const user = await requireAuth(req, res)
  if (!user) return

  if (req.method === 'DELETE') {
    const sessionId = req.query.id
    if (!sessionId) {
      sendJSON(res, 400, { error: 'Session ID is required' })
      return
    }

    const sessionResult = await execute(
      'SELECT id, user_id FROM sessions WHERE id = ? LIMIT 1',
      [sessionId]
    )
    const session = rowsToObjects(sessionResult)[0]
    if (!session) {
      sendJSON(res, 404, { error: 'Session not found' })
      return
    }
    if (session.user_id !== user.sub) {
      sendJSON(res, 403, { error: 'Forbidden: not your session' })
      return
    }

    await execute('DELETE FROM messages WHERE session_id = ?', [sessionId])
    await execute('DELETE FROM analysis WHERE session_id = ?', [sessionId])
    await execute('DELETE FROM sessions WHERE id = ?', [sessionId])

    sendJSON(res, 200, { success: true })
    return
  }

  if (req.method === 'GET') {
    const sessionId = req.query.id
    if (!sessionId) {
      sendJSON(res, 400, { error: 'Session ID is required' })
      return
    }

    const result = await execute(
      'SELECT * FROM sessions WHERE id = ? LIMIT 1',
      [sessionId]
    )
    const session = rowsToObjects(result)[0]
    if (!session) {
      sendJSON(res, 404, { error: 'Session not found' })
      return
    }
    if (session.user_id !== user.sub) {
      sendJSON(res, 403, { error: 'Forbidden: not your session' })
      return
    }

    sendJSON(res, 200, { session })
    return
  }

  sendJSON(res, 405, { error: 'Method not allowed' })
}
