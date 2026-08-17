// report.js — Detailed Interview Report page
import { requireAuth, logout } from '../services/auth.js'
import { getSessionById, getAnalysisBySession, getMessagesBySession } from '../services/turso.js'
import { showToast } from '../main.js'

export async function renderReport(sessionId) {
  const user = await requireAuth()
  if (!user) return ''

  return `
    <div class="bg-gradient"></div>
    <nav class="navbar">
      <div class="navbar-inner">
        <a class="navbar-logo" href="#/dashboard">
          🎙️ InterviewAI
        </a>
        <div class="navbar-actions">
          <a href="#/dashboard" class="btn btn-ghost btn-sm">← Dashboard</a>
          <button id="print-btn" class="btn btn-secondary btn-sm">🖨️ Export</button>
          <button id="logout-btn" class="btn btn-ghost btn-sm">Sign Out</button>
        </div>
      </div>
    </nav>

    <div class="report-page page-enter" id="report-content" style="padding-top: 80px;">
      <div style="text-align:center; padding: 3rem;">
        <div class="spinner" style="margin: 0 auto 1rem; width:36px; height:36px; border-width:3px;"></div>
        <p style="color: var(--text-secondary);">Loading your report...</p>
      </div>
    </div>
  `
}

export async function initReport(sessionId) {
  const user = await requireAuth()
  if (!user) return

  document.getElementById('logout-btn')?.addEventListener('click', () => logout())
  document.getElementById('print-btn')?.addEventListener('click', () => window.print())

  const container = document.getElementById('report-content')

  try {
    const [session, analysis, messages] = await Promise.all([
      getSessionById(sessionId),
      getAnalysisBySession(sessionId),
      getMessagesBySession(sessionId)
    ])

    if (!session) {
      container.innerHTML = `
        <div class="empty-state" style="margin: 3rem auto; max-width: 400px;">
          <div class="empty-icon">😕</div>
          <div class="empty-title">Session not found</div>
          <p class="empty-desc">This interview session doesn't exist or you don't have access.</p>
          <a href="#/dashboard" class="btn btn-primary" style="margin-top: 1.5rem;">Back to Dashboard</a>
        </div>
      `
      return
    }

    if (!analysis) {
      container.innerHTML = `
        <div class="empty-state" style="margin: 3rem auto; max-width: 400px;">
          <div class="empty-icon">⏳</div>
          <div class="empty-title">Report not ready yet</div>
          <p class="empty-desc">This session hasn't been completed. Finish the interview to generate your report.</p>
          <a href="#/dashboard" class="btn btn-primary" style="margin-top: 1.5rem;">Back to Dashboard</a>
        </div>
      `
      return
    }

    renderReportContent(container, session, analysis, messages)

  } catch (err) {
    console.error('Report load error:', err)
    container.innerHTML = `
      <div class="empty-state" style="margin: 3rem auto; max-width: 400px;">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Failed to load report</div>
        <p class="empty-desc">${err.message}</p>
        <a href="#/dashboard" class="btn btn-primary" style="margin-top: 1.5rem;">Back to Dashboard</a>
      </div>
    `
  }
}

function renderReportContent(container, session, analysis, messages) {
  const date = new Date((session.completed_at || session.created_at).replace(' ', 'T')).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreGrade = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Great'
    if (score >= 70) return 'Good'
    if (score >= 60) return 'Fair'
    return 'Needs Work'
  }

  const typeLabel = { technical: 'Technical', behavioral: 'Behavioral', hr: 'HR Round' }
  const scoreMetrics = [
    { label: '💬 Communication', key: 'communication_score', score: analysis.communication_score },
    { label: '⚙️ Technical', key: 'technical_score', score: analysis.technical_score },
    { label: '🎯 Confidence', key: 'confidence_score', score: analysis.confidence_score },
    { label: '🧩 Problem Solving', key: 'problem_solving_score', score: analysis.problem_solving_score },
  ]

  container.innerHTML = `
    <!-- Report Header -->
    <div class="report-header">
      <div class="report-score-circle">
        <div class="report-score-number">${analysis.overall_score}%</div>
        <div class="report-score-label">OVERALL</div>
      </div>
      <h1 style="font-size: 1.875rem; margin-bottom: 0.5rem;">${session.role} Interview Report</h1>
      <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem;">
        <span class="badge badge-purple">${typeLabel[session.interview_type] || session.interview_type}</span>
        <span class="badge badge-cyan">${session.experience_level || 'Mid-level'}</span>
        <span class="badge badge-${analysis.overall_score >= 70 ? 'success' : 'warning'}">${getScoreGrade(analysis.overall_score)}</span>
        <span style="color: var(--text-muted); font-size: 0.875rem;">📅 ${date}</span>
      </div>
    </div>

    <!-- Summary -->
    <div class="report-section">
      <div class="report-section-title">📝 Performance Summary</div>
      <p style="color: var(--text-secondary); line-height: 1.7; font-size: 0.9375rem;">
        ${analysis.summary}
      </p>
    </div>

    <!-- Score Breakdown -->
    <div class="report-section">
      <div class="report-section-title">📊 Score Breakdown</div>
      <div class="score-bars-grid">
        ${scoreMetrics.map(m => `
          <div class="score-bar-item">
            <div class="score-bar-header">
              <span class="score-bar-label">${m.label}</span>
              <span class="score-bar-value">${m.score}%</span>
            </div>
            <div class="score-progress">
              <div class="score-progress-fill"
                style="width: ${m.score}%; background: linear-gradient(90deg, ${getScoreColor(m.score)}, ${getScoreColor(m.score)}aa);">
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Strengths -->
    <div class="report-section">
      <div class="report-section-title">✅ Strengths</div>
      ${(analysis.strengths || []).map(s => `
        <div class="strength-item">
          <span style="font-size: 1.1rem; flex-shrink: 0;">💪</span>
          <span>${s}</span>
        </div>
      `).join('') || '<p style="color:var(--text-muted)">No strengths data available</p>'}
    </div>

    <!-- Weaknesses -->
    <div class="report-section">
      <div class="report-section-title">🔧 Areas to Improve</div>
      ${(analysis.weaknesses || []).map(w => `
        <div class="weakness-item">
          <span style="font-size: 1.1rem; flex-shrink: 0;">⚡</span>
          <span>${w}</span>
        </div>
      `).join('') || '<p style="color:var(--text-muted)">No weaknesses data available</p>'}
    </div>

    <!-- Recommendations -->
    <div class="report-section">
      <div class="report-section-title">🎯 Action Plan</div>
      ${(analysis.recommendations || []).map((r, i) => `
        <div class="recommendation-item">
          <span style="font-family: var(--font-display); font-weight: 700; color: var(--color-primary-2); flex-shrink: 0;">${i + 1}.</span>
          <span>${r}</span>
        </div>
      `).join('') || '<p style="color:var(--text-muted)">No recommendations available</p>'}
    </div>

    <!-- Transcript -->
    <div class="report-section">
      <div class="report-section-title">💬 Full Transcript</div>
      ${messages.map(m => `
        <div class="transcript-entry ${m.role === 'assistant' ? 'ai-msg' : 'user-msg'}">
          <div class="transcript-speaker">${m.role === 'assistant' ? '🤖 Alex (Interviewer)' : '👤 You (Candidate)'}</div>
          <div style="color: var(--text-secondary);">${m.content}</div>
        </div>
      `).join('') || '<p style="color:var(--text-muted)">No transcript available</p>'}
    </div>

    <!-- Actions -->
    <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; padding-bottom: 2rem;">
      <a href="#/interview" class="btn btn-primary">🎙️ Practice Again</a>
      <a href="#/dashboard" class="btn btn-secondary">← Back to Dashboard</a>
      <button onclick="window.print()" class="btn btn-ghost">🖨️ Export PDF</button>
    </div>
  `
}
