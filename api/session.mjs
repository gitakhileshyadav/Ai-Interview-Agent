// session.mjs — Serverless endpoint for session CRUD operations
import { requireAuth, sendJSON } from './lib/auth.mjs'
import { execute } from './lib/db.mjs'

export default async function handler(req, res) {
  const user = await requireAuth(req, res)
  if (!user) return

  if (req.method === 'DELETE') {
    const rawId = req.query.id
    if (!rawId) {
      sendJSON(res, 400, { error: 'Session ID is required' })
      return
    }

    // Support both session id and rowid fallback (for orphaned sessions)
    const isRowid = rawId.startsWith('rowid:')
    const sessionId = isRowid ? rawId.slice(6) : rawId

    if (isRowid) {
      const sessionResult = await execute(
        'SELECT id, user_id, title FROM sessions WHERE rowid = ? LIMIT 1',
        [sessionId]
      )
      const session = sessionResult.rows[0]
      if (!session) {
        sendJSON(res, 404, { error: 'Session not found' })
        return
      }
      if (session.user_id !== user.sub) {
        sendJSON(res, 403, { error: 'Forbidden: not your session' })
        return
      }

      await execute('DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE rowid = ?)', [sessionId])
      await execute('DELETE FROM analysis WHERE session_id IN (SELECT id FROM sessions WHERE rowid = ?)', [sessionId])
      await execute('DELETE FROM sessions WHERE rowid = ?', [sessionId])

      sendJSON(res, 200, { success: true })
      return
    }

    const sessionResult = await execute(
      'SELECT id, user_id, title FROM sessions WHERE id = ? LIMIT 1',
      [sessionId]
    )
    const session = sessionResult.rows[0]
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
    await execute('DELETE FROM sessions WHERE id = ? AND user_id = ?', [sessionId, user.sub])

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
      'SELECT id, user_id, title, role, interview_type, experience_level, status, score, duration, created_at, completed_at FROM sessions WHERE id = ? LIMIT 1',
      [sessionId]
    )
    const session = result.rows[0]
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