// auth.js — Client-side auth client. Password hashing, JWT signing/verification
// all happen server-side on Vercel. The client only stores the returned token.

const TOKEN_KEY = 'interviewai_token'
const USER_KEY = 'interviewai_user'

async function api(path, options = {}) {
  const res = await fetch(path, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

function authHeaders(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

// ─── Auth API ───────────────────────────────────────────────────────────────

export async function register({ name, email, password }) {
  const data = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })

  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data.user
}

export async function login({ email, password }) {
  const data = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data.user
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.location.hash = '#/login'
}

export async function getCurrentUser() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  // Validate the token server-side
  try {
    const data = await api('/api/auth/me', {
      headers: authHeaders(token)
    })
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data.user
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    window.location.hash = '#/login'
    return null
  }
  return user
}

// ─── Shared helpers for other services ──────────────────────────────────────

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}