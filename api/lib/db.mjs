// db.mjs — Server-side Turso client (libSQL REST API)
// Used by serverless functions only. Keys come from process.env.

const BASE_URL = () => (process.env.TURSO_URL || '').replace('libsql://', 'https://')
const TOKEN = () => process.env.TURSO_TOKEN || ''

/**
 * Execute a SQL statement against Turso via HTTP
 */
export async function execute(sql, args = []) {
  const url = `${BASE_URL()}/v2/pipeline`
  const body = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          args: args.map(a => {
            if (a === null || a === undefined) return { type: 'null' }
            if (typeof a === 'number') return { type: 'integer', value: String(a) }
            return { type: 'text', value: String(a) }
          })
        }
      },
      { type: 'close' }
    ]
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Turso error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const result = data.results?.[0]
  if (result?.type === 'error') throw new Error(result.error.message)
  return result?.response?.result || { rows: [], cols: [] }
}

/**
 * Execute multiple statements in a single transaction
 */
export async function batch(statements) {
  const url = `${BASE_URL()}/v2/pipeline`
  const requests = statements.map(({ sql, args = [] }) => ({
    type: 'execute',
    stmt: {
      sql,
      args: args.map(a => {
        if (a === null || a === undefined) return { type: 'null' }
        if (typeof a === 'number') return { type: 'integer', value: String(a) }
        return { type: 'text', value: String(a) }
      })
    }
  }))
  requests.push({ type: 'close' })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  })

  if (!res.ok) throw new Error(`Turso batch error: ${res.status}`)
  return await res.json()
}

/**
 * Map Turso row result to object using column names
 */
export function rowsToObjects(result) {
  const cols = result.cols.map(c => c.name)
  return result.rows.map(row =>
    Object.fromEntries(cols.map((col, i) => [col, row[i]?.value ?? null]))
  )
}

/**
 * Ensure all database tables exist
 */
export async function ensureSchema() {
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

export async function getUserByEmail(email) {
  const result = await execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email])
  return rowsToObjects(result)[0] || null
}

export async function createUser({ id, name, email, passwordHash }) {
  await execute(
    'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    [id, name, email, passwordHash]
  )
}

export async function updateUserPassword(email, name, passwordHash) {
  await execute(
    'UPDATE users SET name = ?, password_hash = ? WHERE email = ?',
    [name, passwordHash, email]
  )
}