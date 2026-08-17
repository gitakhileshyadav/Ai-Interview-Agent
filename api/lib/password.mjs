// password.mjs — Server-side password hashing (PBKDF2) + legacy hash detection
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto'

const ITERATIONS = 100000
const KEYLEN = 64
const DIGEST = 'sha256'

// Stored format: pbkdf2$<iterations>$<saltHex>$<hashHex>
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex')
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const [, iter, salt, hash] = parts
  const candidate = pbkdf2Sync(password, salt, parseInt(iter, 10), KEYLEN, DIGEST).toString('hex')
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(candidate, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Detect old-format hashes (client-side SHA-256 hex from the previous build).
 * These cannot be verified server-side; user must re-register to overwrite.
 */
export function isLegacyHash(stored) {
  return typeof stored === 'string' && /^[a-f0-9]{64}$/i.test(stored)
}