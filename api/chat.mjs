// chat.mjs — Serverless proxy to Groq. Key stays server-side.
import { requireAuth, sendJSON, readBody } from './lib/auth.mjs'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

export default async function handler(req, res) {
  const user = await requireAuth(req, res)
  if (!user) return

  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'Method not allowed' })
    return
  }

  const { messages, temperature = 0.8, max_tokens = 250 } = readBody(req)

  if (!Array.isArray(messages) || messages.length === 0) {
    sendJSON(res, 400, { error: 'messages array is required' })
    return
  }

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens,
        stream: false
      })
    })

    if (!response.ok) {
      const err = await response.text()
      sendJSON(res, response.status, { error: `Groq error ${response.status}: ${err}` })
      return
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      sendJSON(res, 502, { error: 'Unexpected response from Groq' })
      return
    }
    sendJSON(res, 200, { content })
  } catch (err) {
    sendJSON(res, 500, { error: err.message })
  }
}