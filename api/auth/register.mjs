// register.mjs — Server-side registration: PBKDF2 hashing + JWT
import { randomUUID } from 'crypto'
import { sendJSON, signToken, readBody } from '../lib/auth.mjs'
import { ensureSchema, getUserByEmail, createUser, updateUserPassword } from '../lib/db.mjs'
import { hashPassword, isLegacyHash } from '../lib/password.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'Method not allowed' })
    return
  }

  const { name, email, password } = readBody(req)
  if (!name || !email || !password) {
    sendJSON(res, 400, { error: 'Name, email, and password are required' })
    return
  }

  try {
    await ensureSchema()

    const existing = await getUserByEmail(email)

    if (existing) {
      // Legacy accounts (old client-side SHA-256 hashes) cannot verify server-side.
      // Allow overwriting the password hash so the user can re-register once.
      if (isLegacyHash(existing.password_hash)) {
        await updateUserPassword(email, name, hashPassword(password))
      } else {
        sendJSON(res, 409, { error: 'An account with this email already exists' })
        return
      }
    } else {
      await createUser({ id: randomUUID(), name, email, passwordHash: hashPassword(password) })
    }

    const user = await getUserByEmail(email)
    const token = await signToken({ sub: user.id, email: user.email, name: user.name })

    sendJSON(res, 200, {
      token,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (err) {
    sendJSON(res, 500, { error: err.message })
  }
}