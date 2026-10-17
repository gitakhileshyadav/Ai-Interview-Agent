// session.mjs — Serverless endpoint for session CRUD operations
import { requireAuth, sendJSON } from './lib/auth.mjs'
import { execute } from './lib/db.mjs'

export default async function handler(req, res) {
  const user = await requireAuth(req, res)
  if (!user) return

  if (req.method === 'DELETE') {
    const sessionId = req.query.id
    if (!sessionId) {
      sendJSON(res, 400, { error: 'Session ID is required' })
      return
    }

    // Verify ownership: the token's 'sub' equals the user's DB id
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

    // Delete messages, analysis, then the session (all in one transaction via batch)
    await execute(
      'DELETE FROM messages WHERE session_id = ?',
      [sessionId]
    )
    await execute(
      'DELETE FROM analysis WHERE session_id = ?',
      [sessionId]
    )
    await execute(
      'DELETE FROM sessions WHERE id = ? AND user_id = ?',
      [sessionId, user.sub]
    )

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