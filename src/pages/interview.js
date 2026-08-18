// interview.js — Full Interview Room page
import { requireAuth, logout } from '../services/auth.js'
import { createSession, saveMessage, completeSession } from '../services/turso.js'
import { getInterviewerResponse, generateAnalysis, INTERVIEW_ROLES, INTERVIEW_TYPES, EXPERIENCE_LEVELS } from '../services/interview.js'
import SpeechService from '../services/speech.js'
import { showToast } from '../main.js'

let speechService = null
let sessionId = null
let sessionConfig = null
let conversationHistory = []
let sessionStart = null
let timerInterval = null
let turnCount = 0
const MAX_TURNS = 12
let isProcessing = false
let interimMessageEl = null

// ─── Setup Page ─────────────────────────────────────────────────────────────

export async function renderInterview() {
  const user = await requireAuth()
  if (!user) return ''

  const roleOptions = INTERVIEW_ROLES.map(r => `<option value="${r}">${r}</option>`).join('')
  const experienceOptions = EXPERIENCE_LEVELS.map(e =>
    `<option value="${e.value}">${e.label}</option>`
  ).join('')

  return `
    <div class="bg-gradient"></div>
    <nav class="navbar">
      <div class="navbar-inner">
        <a class="navbar-logo" href="#/dashboard">
          🎙️ InterviewAI
        </a>
        <div class="navbar-actions">
          <button id="logout-btn" class="btn btn-ghost btn-sm">Sign Out</button>
        </div>
      </div>
    </nav>

    <div class="setup-page" style="padding-top: 80px;">
      <div class="setup-card page-enter">
        <div class="setup-header">
          <h1>🎙️ Setup Your Interview</h1>
          <p>Configure your practice session to get the most relevant questions</p>
        </div>

        <form id="setup-form">
          <div class="form-group">
            <label class="form-label">Target Role</label>
            <select id="role-select" class="form-input" required>
              ${roleOptions}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Interview Type</label>
            <div class="interview-type-grid">
              ${INTERVIEW_TYPES.map(t => `
                <button type="button" class="interview-type-btn ${t.value === 'technical' ? 'selected' : ''}"
                  data-type="${t.value}">
                  <span class="interview-type-emoji">${t.label.split(' ')[0]}</span>
                  <span class="interview-type-label">${t.label.split(' ').slice(1).join(' ')}</span>
                  <span class="interview-type-desc">${t.desc}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Experience Level</label>
            <select id="experience-select" class="form-input" required>
              ${experienceOptions}
            </select>
          </div>

          <div id="setup-error" class="form-error hidden" style="margin-bottom: 1rem;">
            ⚠️ <span id="setup-error-text"></span>
          </div>

          <button type="submit" id="start-btn" class="btn btn-primary btn-lg w-full">
            🚀 Start Interview
          </button>
        </form>

        <div class="divider-text">
          <span>Requirements</span>
        </div>
        <div style="display:flex; gap: 0.75rem; flex-wrap: wrap;">
          <span class="badge badge-cyan">🎙️ Microphone access</span>
          <span class="badge badge-cyan">🌐 Chrome or Edge browser</span>
          <span class="badge badge-cyan">🔊 Audio enabled</span>
        </div>
      </div>
    </div>
  `
}

export async function initInterview() {
  const user = await requireAuth()
  if (!user) return

  document.getElementById('logout-btn')?.addEventListener('click', () => logout())

  let selectedType = 'technical'

  // Interview type selection
  document.querySelectorAll('.interview-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.interview-type-btn').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      selectedType = btn.dataset.type
    })
  })

  // Setup form submit
  document.getElementById('setup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const errorEl = document.getElementById('setup-error')
    const errorText = document.getElementById('setup-error-text')
    errorEl.classList.add('hidden')

    const role = document.getElementById('role-select').value
    const experienceLevel = document.getElementById('experience-select').value
    const btn = document.getElementById('start-btn')

    // Check browser support
    if (!SpeechService.isSupported()) {
      errorEl.classList.remove('hidden')
      errorText.textContent = 'Speech Recognition is not supported. Please use Chrome or Edge.'
      return
    }

    // Check microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      errorEl.classList.remove('hidden')
      errorText.textContent = 'Microphone access denied. Please allow microphone and try again.'
      return
    }

    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Starting interview...'

    sessionConfig = { role, interviewType: selectedType, experienceLevel }

    try {
      // Create session in DB
      sessionId = crypto.randomUUID()
      await createSession({
        id: sessionId,
        userId: user.id,
        title: `${role} — ${INTERVIEW_TYPES.find(t => t.value === selectedType)?.label.split(' ').slice(1).join(' ')}`,
        role,
        interviewType: selectedType,
        experienceLevel
      })

      // Switch to interview room
      renderInterviewRoom(user, role, selectedType, experienceLevel)
    } catch (err) {
      console.error('Session create error:', err)
      errorEl.classList.remove('hidden')
      errorText.textContent = `Failed to start: ${err.message}`
      btn.disabled = false
      btn.innerHTML = '🚀 Start Interview'
    }
  })
}

// ─── Interview Room ──────────────────────────────────────────────────────────

function renderInterviewRoom(user, role, interviewType, experienceLevel) {
  const app = document.getElementById('app')
  const typeLabel = INTERVIEW_TYPES.find(t => t.value === interviewType)?.label || ''
  const levelLabel = EXPERIENCE_LEVELS.find(l => l.value === experienceLevel)?.label || ''

  app.innerHTML = `
    <div class="bg-gradient"></div>
    <div class="interview-room">
      <!-- Top Bar -->
      <div class="interview-topbar">
        <div class="interview-info">
          <div class="interview-title">${role} — ${typeLabel}</div>
          <div class="interview-meta">
            <span>${levelLabel}</span>
            <span>·</span>
            <span id="turn-counter">Question 0 / ${MAX_TURNS}</span>
          </div>
        </div>
        <div class="flex items-center gap-md">
          <div class="timer" id="timer">00:00</div>
          <button id="end-btn" class="btn btn-danger btn-sm">End Interview</button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="interview-content">
        <!-- Transcript Panel -->
        <div class="transcript-panel">
          <div class="transcript-header">
            💬 Live Transcript
          </div>
          <div class="transcript-body" id="transcript-body">
            <div style="text-align:center; color: var(--text-muted); padding: 3rem 1rem;">
              <div class="spinner" style="margin: 0 auto 1rem;"></div>
              <p>Alex is preparing your interview...</p>
            </div>
          </div>
        </div>

        <!-- AI Voice Panel -->
        <div class="voice-panel">
          <!-- AI Avatar -->
          <div>
            <div class="ai-avatar" id="ai-avatar">
              <div class="ai-avatar-rings"></div>
              🤖
            </div>
          </div>

          <div class="ai-status-label" id="ai-status">Alex is preparing...</div>

          <!-- Waveform -->
          <div class="waveform-container" id="waveform">
            ${Array.from({length: 9}, (_, i) => `<div class="waveform-bar" style="--i:${i};--h:${Math.random()*30+10}px;"></div>`).join('')}
          </div>

          <!-- Mic Button -->
          <div class="voice-controls">
            <button id="mic-btn" class="mic-btn" disabled title="Wait for Alex to finish speaking">
              🎙️
            </button>
            <div class="mic-hint" id="mic-hint">
              Waiting for Alex to speak...
            </div>
          </div>

          <!-- Progress -->
          <div class="interview-progress" style="width: 100%;">
            <div class="progress-label">
              <span>Interview Progress</span>
              <span id="progress-pct">0%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  startInterviewSession(user)
}

// ─── Core Interview Logic ────────────────────────────────────────────────────

async function startInterviewSession(user) {
  sessionStart = Date.now()
  startTimer()

  speechService = new SpeechService()
  setupSpeechCallbacks()

  // Get first AI message
  try {
    const aiMsg = await getInterviewerResponse([], sessionConfig)
    await handleAIMessage(aiMsg)
  } catch (err) {
    console.error('AI error:', err)
    showToast(err.message || 'Failed to connect to AI. Check API key.', 'error')
    addMessage('ai', "Hello! I'm Alex, your interviewer today. I'm having a small technical issue — please try again in a moment.")
  }

  // End button
  document.getElementById('end-btn')?.addEventListener('click', () => {
    if (confirm('End this interview session? Your progress will be saved.')) {
      endInterview(user)
    }
  })
}

function setupSpeechCallbacks() {
  speechService.onListeningStart = () => {
    document.getElementById('waveform')?.classList.add('listening')
    document.getElementById('ai-status').textContent = '🎤 Listening...'
    document.getElementById('mic-btn')?.classList.add('listening')
    document.getElementById('mic-hint').textContent = 'Speak now — I\'m listening'
  }
  speechService.onListeningEnd = () => {
    document.getElementById('waveform')?.classList.remove('listening')
    document.getElementById('mic-btn')?.classList.remove('listening')
    if (!isProcessing && !speechService.isSpeaking) {
      document.getElementById('ai-status').textContent = '🎤 Tap mic to speak'
      document.getElementById('mic-hint').textContent = 'Click the mic button to start speaking your answer'
    }
  }

  speechService.onSpeakingStart = () => {
    document.getElementById('waveform')?.classList.add('speaking')
    document.getElementById('ai-avatar')?.classList.add('speaking')
    document.getElementById('mic-btn').disabled = true
  }

  speechService.onSpeakingEnd = () => {
    document.getElementById('waveform')?.classList.remove('speaking')
    document.getElementById('ai-avatar')?.classList.remove('speaking')

    if (turnCount < MAX_TURNS) {
      document.getElementById('mic-btn').disabled = false
      document.getElementById('ai-status').textContent = '🎤 Listening...'
      document.getElementById('mic-hint').textContent = 'Speak your answer — Alex is listening'
      speechService.startListening()
    }
  }

  speechService.onTranscript = async ({ final, interim }) => {
    // Show interim transcript
    if (interim && !final) {
      showInterimMessage(interim)
      return
    }

    // Final transcript
    if (final && !isProcessing) {
      clearInterimMessage()
      await handleUserMessage(final)
    }
  }

  speechService.onError = (msg) => {
    showToast(msg, 'error')
    document.getElementById('ai-status').textContent = '⚠️ Error — try again'
  }

  // Mic button click
  document.getElementById('mic-btn')?.addEventListener('click', () => {
    if (!speechService.isListening) {
      speechService.startListening()
    } else {
      speechService.stopListening()
    }
  })
}

function showInterimMessage(text) {
  const body = document.getElementById('transcript-body')
  if (!interimMessageEl) {
    interimMessageEl = document.createElement('div')
    interimMessageEl.className = 'message user'
    interimMessageEl.innerHTML = `
      <div class="message-role">You</div>
      <div class="message-bubble interim" id="interim-text">${text}</div>
    `
    body.appendChild(interimMessageEl)
  } else {
    document.getElementById('interim-text').textContent = text
  }
  body.scrollTop = body.scrollHeight
}

function clearInterimMessage() {
  interimMessageEl?.remove()
  interimMessageEl = null
}

async function handleUserMessage(text) {
  isProcessing = true
  document.getElementById('mic-btn').disabled = true
  document.getElementById('ai-status').textContent = '🤔 Alex is thinking...'

  // Add to UI
  addMessage('user', text)

  // Save to DB
  await saveMessage({ id: crypto.randomUUID(), sessionId, role: 'user', content: text })

  // Add to history
  conversationHistory.push({ role: 'user', content: text })

  turnCount++
  updateProgress()

  if (turnCount >= MAX_TURNS) {
    // Auto-end interview
    addMessage('ai', "This was an excellent session! I have all the information I need. I'll now prepare your detailed performance report. Thank you for your time today!")
    await speechService.speak("This was an excellent session! I have all the information I need. I'll now prepare your detailed performance report. Thank you for your time today!")
    const user = JSON.parse(localStorage.getItem('interviewai_user') || '{}')
    setTimeout(() => endInterview(user), 2000)
    return
  }

  try {
    const aiMsg = await getInterviewerResponse(conversationHistory, sessionConfig)
    await handleAIMessage(aiMsg)
  } catch (err) {
    console.error('AI response error:', err)
    showToast('AI response failed', 'error')
    document.getElementById('mic-btn').disabled = false
    document.getElementById('ai-status').textContent = '⚠️ Connection issue — try again'
  }

  isProcessing = false
}

async function handleAIMessage(text) {
  addMessage('ai', text)
  await saveMessage({ id: crypto.randomUUID(), sessionId, role: 'assistant', content: text })
  conversationHistory.push({ role: 'assistant', content: text })

  document.getElementById('ai-status').textContent = '🔊 Alex is speaking...'
  await speechService.speak(text)
}

function addMessage(role, content) {
  const body = document.getElementById('transcript-body')
  const empty = body.querySelector('[style*="text-align:center"]')
  if (empty) empty.remove()

  const div = document.createElement('div')
  div.className = `message ${role === 'user' ? 'user' : 'ai'}`
  div.innerHTML = `
    <div class="message-role">${role === 'user' ? 'You' : '🤖 Alex'}</div>
    <div class="message-bubble">${content}</div>
  `
  body.appendChild(div)
  body.scrollTop = body.scrollHeight
}

function updateProgress() {
  const pct = Math.round((turnCount / MAX_TURNS) * 100)
  document.getElementById('progress-fill')?.style.setProperty('width', `${pct}%`)
  document.getElementById('progress-pct').textContent = `${pct}%`
  document.getElementById('turn-counter').textContent = `Question ${turnCount} / ${MAX_TURNS}`
}

// ─── Timer ───────────────────────────────────────────────────────────────────

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000)
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const s = (elapsed % 60).toString().padStart(2, '0')
    const el = document.getElementById('timer')
    if (el) el.textContent = `${m}:${s}`
  }, 1000)
}

// ─── End Interview & Generate Analysis ──────────────────────────────────────

async function endInterview(user) {
  clearInterval(timerInterval)
  speechService?.destroy()

  const duration = Math.floor((Date.now() - sessionStart) / 1000)
  const app = document.getElementById('app')

  app.innerHTML = `
    <div class="bg-gradient"></div>
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 1.5rem; padding: 2rem;">
      <div class="ai-avatar speaking" style="width:100px;height:100px;font-size:2.5rem;">
        <div class="ai-avatar-rings"></div>
        🧠
      </div>
      <h2 style="font-family:var(--font-display);">Generating Your Report</h2>
      <p style="color:var(--text-secondary); text-align:center; max-width:400px;">
        Alex is analyzing your interview performance and preparing a detailed report...
      </p>
      <div class="spinner" style="width:32px; height:32px; border-width:3px;"></div>
    </div>
  `

  try {
    // Generate analysis
    const analysisData = await generateAnalysis(conversationHistory, sessionConfig)
    const overallScore = analysisData.overall_score || 0

    // Save to DB
    await completeSession(sessionId, overallScore, duration)

    const { saveAnalysis } = await import('../services/turso.js')
    await saveAnalysis({
      id: crypto.randomUUID(),
      sessionId,
      strengths: analysisData.strengths || [],
      weaknesses: analysisData.weaknesses || [],
      overallScore,
      communicationScore: analysisData.communication_score || 0,
      technicalScore: analysisData.technical_score || 0,
      confidenceScore: analysisData.confidence_score || 0,
      problemSolvingScore: analysisData.problem_solving_score || 0,
      summary: analysisData.summary || '',
      recommendations: analysisData.recommendations || []
    })

    showToast('Report generated! 🎉', 'success')
    window.location.hash = `#/report/${sessionId}`
  } catch (err) {
    console.error('Analysis generation error:', err)
    showToast('Report generation failed. Saving session...', 'error')
    await completeSession(sessionId, 50, duration).catch(() => {})
    window.location.hash = '#/dashboard'
  }
}
