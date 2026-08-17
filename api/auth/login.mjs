// login.mjs — Server-side login with legacy-hash detection
import { sendJSON, signToken, readBody } from '../lib/auth.mjs'
import { ensureSchema, getUserByEmail } from '../lib/db.mjs'
import { verifyPassword, isLegacyHash } from '../lib/password.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'Method not allowed' })
    return
  }

  const { email, password } = readBody(req)
  if (!email || !password) {
    sendJSON(res, 400, { error: 'Email and password are required' })
    return
  }

  try {
    await ensureSchema()

    const user = await getUserByEmail(email)
    if (!user) {
      sendJSON(res, 401, { error: 'No account found with this email' })
      return
    }

    if (isLegacyHash(user.password_hash)) {
      sendJSON(res, 401, {
        error: 'This account uses an older security method. Please register again to continue.'
      })
      return
    }

    if (!verifyPassword(password, user.password_hash)) {
      sendJSON(res, 401, { error: 'Incorrect password' })
      return
    }

    const token = await signToken({ sub: user.id, email: user.email, name: user.name })

    sendJSON(res, 200, {
      token,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (err) {
    sendJSON(res, 500, { error: err.message })
  }
}