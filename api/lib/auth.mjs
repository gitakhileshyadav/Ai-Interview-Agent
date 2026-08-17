// auth.mjs — Shared server-side helpers: JWT sign/verify, response helpers
import { SignJWT, jwtVerify } from 'jose'

const SECRET = () => new TextEncoder().encode(process.env.JWT_SECRET || 'interview-agent-secret')

export function sendJSON(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET())
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, SECRET())
  return payload
}

export function getBearerToken(req) {
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return null
  return auth.slice(7)
}

/**
 * Require a valid Bearer JWT. Sends 401 and returns null if missing/invalid.
 */
export async function requireAuth(req, res) {
  const token = getBearerToken(req)
  if (!token) {
    sendJSON(res, 401, { error: 'Unauthorized: missing token' })
    return null
  }
  try {
    return await verifyToken(token)
  } catch {
    sendJSON(res, 401, { error: 'Unauthorized: invalid or expired token' })
    return null
  }
}

export function readBody(req) {
  try {
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
    return req.body || {}
  } catch {
    return {}
  }
}