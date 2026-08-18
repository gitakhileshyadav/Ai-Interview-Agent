// chat.mjs — Serverless proxy to Groq (primary) and NVIDIA NIM (fallback).
// Keys stay server-side. Fallback triggers on Groq error, timeout, rate
// limit, or empty/garbled content. NVIDIA is warmed up with a small ping
// first to reduce cold-start latency.
import { requireAuth, sendJSON, readBody } from './lib/auth.mjs'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'groq/compound-mini'

const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '')
const NVIDIA_URL = `${NVIDIA_BASE_URL}/chat/completions`
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct'
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || ''

const GROQ_TIMEOUT_MS = 30000
const NVIDIA_TIMEOUT_MS = 90000
const WARMUP_TIMEOUT_MS = 15000

/**
 * Call an OpenAI-compatible chat completions endpoint with a timeout.
 * Returns { response } on HTTP completion or { err } on timeout/network failure.
 */
async function callOpenAI(url, apiKey, body, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    return { response }
  } catch (err) {
    return { err }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Warm up the NVIDIA model with a tiny request so a real fallback request
 * after a cold start is much faster.
 */
async function warmUpNvidia() {
  if (!NVIDIA_KEY) return
  try {
    await callOpenAI(NVIDIA_URL, NVIDIA_KEY, {
      model: NVIDIA_MODEL,
      messages: [{ role: 'user', content: 'Hello.' }],
      max_tokens: 5,
      temperature: 0.1
    }, WARMUP_TIMEOUT_MS)
  } catch {
    // warm-up is best-effort
  }
}

/**
 * Extract usable content, rejecting reasoning leaks and empty responses.
 */
function extractContent(message) {
  const c = message?.content
  if (typeof c !== 'string' || c.trim().length < 2) return null
  const trimmed = c.trim()
  // Reject obvious reasoning dumps from reasoning models
  if (/^\*\*Reasoning\*\*|^\s*Reasoning:/i.test(trimmed)) return null
  return c
}

async function safeText(response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

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

  // Fire NVIDIA warm-up in parallel with the Groq call (doesn't block it)
  const warmup = warmUpNvidia()

  const requestBody = { messages, temperature, max_tokens, stream: false }

  try {
    // 1) Try Groq first
    const groq = await callOpenAI(GROQ_URL, process.env.GROQ_API_KEY || '', {
      model: GROQ_MODEL,
      ...requestBody
    }, GROQ_TIMEOUT_MS)

    let content = null
    let groqError = null
    if (groq.response) {
      if (groq.response.ok) {
        const data = await groq.response.json()
        content = extractContent(data.choices?.[0]?.message)
      } else {
        groqError = `Groq error ${groq.response.status}: ${(await safeText(groq.response)).slice(0, 200)}`
      }
    } else {
      groqError = `Groq request failed: ${groq.err?.message || 'timeout'}`
    }

    if (content !== null) {
      sendJSON(res, 200, { content })
      return
    }

    // 2) Groq failed or returned garbled content — fall back to NVIDIA
    await warmup.catch(() => {})

    if (!NVIDIA_KEY) {
      sendJSON(res, 502, { error: groqError || 'Groq returned no usable content, and NVIDIA fallback is not configured' })
      return
    }

    const nvidia = await callOpenAI(NVIDIA_URL, NVIDIA_KEY, {
      model: NVIDIA_MODEL,
      ...requestBody
    }, NVIDIA_TIMEOUT_MS)

    if (nvidia.response && nvidia.response.ok) {
      const data = await nvidia.response.json()
      const nvContent = extractContent(data.choices?.[0]?.message)
      if (nvContent !== null) {
        sendJSON(res, 200, { content: nvContent, fallback: 'nvidia' })
        return
      }
      sendJSON(res, 502, { error: 'NVIDIA returned no usable content' })
      return
    }

    const nvidiaError = nvidia.err
      ? `NVIDIA request failed: ${nvidia.err.message || 'timeout'}`
      : `NVIDIA error ${nvidia.response.status}: ${(await safeText(nvidia.response)).slice(0, 200)}`

    sendJSON(res, 502, {
      error: `${groqError || 'Groq returned no usable content'}; fallback ${nvidiaError}`
    })
  } catch (err) {
    sendJSON(res, 500, { error: err.message })
  }
}