// turso.js — Client-side Turso client. All SQL is executed server-side
// via /api/db, so the Turso URL and token never reach the browser.
import { getToken } from './auth.js'

async function callDb(body) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {})
    },
    body: JSON.stringify(body)
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Database error (${res.status})`)
  return data
}

/**
 * Execute a single SQL statement via the server proxy
 */
async function execute(sql, args = []) {
  return callDb({ action: 'execute', sql, args })
}

/**
 * Execute multiple statements via the server proxy
 */
async function batch(statements) {
  return callDb({ action: 'batch', statements })
}

/**
 * Map Turso row result to object using column names
 */
function rowsToObjects(result) {
  const cols = result.cols.map(c => c.name)
  return result.rows.map(row =>
    Object.fromEntries(cols.map((col, i) => [col, row[i]?.value ?? null]))
  )
}

/**
 * Initialize all database tables (runs server-side via proxy)
 */
export async function initDB() {
  await batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        role TEXT,
        interview_type TEXT,
        experience_level TEXT,
        status TEXT DEFAULT 'active',
        score INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      )`
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now'))
      )`
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS analysis (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        strengths TEXT,
        weaknesses TEXT,
        overall_score INTEGER,
        communication_score INTEGER,
        technical_score INTEGER,
        confidence_score INTEGER,
        problem_solving_score INTEGER,
        summary TEXT,
        recommendations TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    }
  ])
}

// ─── User Operations ───────────────────────────────────────────────────────

export async function createUser({ id, name, email, passwordHash }) {
  await execute(
    'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    [id, name, email, passwordHash]
  )
}

export async function getUserByEmail(email) {
  const result = await execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email])
  const rows = rowsToObjects(result)
  return rows[0] || null
}

export async function getUserById(id) {
  const result = await execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
  const rows = rowsToObjects(result)
  return rows[0] || null
}

// ─── Session Operations ─────────────────────────────────────────────────────

export async function createSession({ id, userId, title, role, interviewType, experienceLevel }) {
  await execute(
    'INSERT INTO sessions (id, user_id, title, role, interview_type, experience_level) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, title, role, interviewType, experienceLevel]
  )
}

export async function getSessionsByUser(userId) {
  const result = await execute(
    'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  )
  return rowsToObjects(result)
}

export async function getSessionById(id) {
  const result = await execute('SELECT * FROM sessions WHERE id = ? LIMIT 1', [id])
  const rows = rowsToObjects(result)
  return rows[0] || null
}

export async function completeSession(id, score, duration) {
  await execute(
    `UPDATE sessions SET status = 'completed', score = ?, duration = ?, completed_at = datetime('now') WHERE id = ?`,
    [score, duration, id]
  )
}

// ─── Message Operations ─────────────────────────────────────────────────────

export async function saveMessage({ id, sessionId, role, content }) {
  await execute(
    'INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)',
    [id, sessionId, role, content]
  )
}

export async function getMessagesBySession(sessionId) {
  const result = await execute(
    'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
    [sessionId]
  )
  return rowsToObjects(result)
}

// ─── Analysis Operations ────────────────────────────────────────────────────

export async function saveAnalysis({
  id, sessionId, strengths, weaknesses,
  overallScore, communicationScore, technicalScore,
  confidenceScore, problemSolvingScore, summary, recommendations
}) {
  await execute(
    `INSERT OR REPLACE INTO analysis
     (id, session_id, strengths, weaknesses, overall_score, communication_score,
      technical_score, confidence_score, problem_solving_score, summary, recommendations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, sessionId,
      JSON.stringify(strengths),
      JSON.stringify(weaknesses),
      overallScore, communicationScore, technicalScore,
      confidenceScore, problemSolvingScore,
      summary,
      JSON.stringify(recommendations)
    ]
  )
}

export async function getAnalysisBySession(sessionId) {
  const result = await execute(
    'SELECT * FROM analysis WHERE session_id = ? LIMIT 1',
    [sessionId]
  )
  const rows = rowsToObjects(result)
  if (!rows[0]) return null
  const a = rows[0]
  return {
    ...a,
    strengths: JSON.parse(a.strengths || '[]'),
    weaknesses: JSON.parse(a.weaknesses || '[]'),
    recommendations: JSON.parse(a.recommendations || '[]'),
  }
}

export async function getUserStats(userId) {
  const sessions = await getSessionsByUser(userId)
  const completed = sessions.filter(s => s.status === 'completed')
  const scores = completed.map(s => parseInt(s.score) || 0)
  return {
    total: sessions.length,
    completed: completed.length,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
    recentSessions: sessions.slice(0, 5),
    scoreHistory: completed.slice(-10).map(s => ({
      date: s.completed_at?.split(/[ T]/)[0] || s.created_at?.split(/[ T]/)[0],
      score: parseInt(s.score) || 0,
      title: s.title
    }))
  }
}