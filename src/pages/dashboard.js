// dashboard.js — Main dashboard with charts and session management
import { requireAuth, logout } from '../services/auth.js'
import { getUserStats, getSessionsByUser } from '../services/turso.js'
import { renderCharts } from '../components/charts.js'
import { showToast } from '../main.js'

export async function renderDashboard() {
  const user = await requireAuth()
  if (!user) return ''

  return `
    <div class="bg-gradient"></div>
    <!-- Navbar -->
    <nav class="navbar">
      <div class="navbar-inner">
        <a class="navbar-logo" href="#/dashboard">
          <span>🎙️ InterviewAI</span>
          <div class="logo-dot"></div>
        </a>
        <div class="navbar-actions">
          <div class="navbar-user">
            <div class="navbar-avatar">${user.name.charAt(0).toUpperCase()}</div>
            <span>${user.name.split(' ')[0]}</span>
          </div>
          <button id="new-interview-btn" class="btn btn-primary btn-sm">
            + New Interview
          </button>
          <button id="logout-btn" class="btn btn-ghost btn-sm">Sign Out</button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="dashboard-main page-enter" id="dashboard-content">
      <div class="dashboard-header">
        <div class="dashboard-greeting">
          <h1>Good ${getTimeOfDay()}, <span class="gradient-text">${user.name.split(' ')[0]}</span> 👋</h1>
          <p>Track your interview performance and keep improving</p>
        </div>
        <button class="btn btn-primary" id="new-interview-btn-2">
          🎙️ Start New Interview
        </button>
      </div>

      <!-- Stat Cards -->
      <div class="stats-grid" id="stats-grid">
        <div class="stat-card purple">
          <div class="stat-icon purple">📋</div>
          <div class="stat-value" id="stat-total">—</div>
          <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card cyan">
          <div class="stat-icon cyan">✅</div>
          <div class="stat-value" id="stat-completed">—</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">⭐</div>
          <div class="stat-value" id="stat-avg">—</div>
          <div class="stat-label">Avg Score</div>
        </div>
        <div class="stat-card pink">
          <div class="stat-icon pink">🏆</div>
          <div class="stat-value" id="stat-best">—</div>
          <div class="stat-label">Best Score</div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-grid">
        <!-- Radar: Strengths & Weaknesses -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">💪 Skills Radar</div>
              <div class="chart-subtitle">Average competency scores</div>
            </div>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="radar-chart"></canvas>
          </div>
        </div>

        <!-- Line: Score Trend -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">📈 Performance Trend</div>
              <div class="chart-subtitle">Score over recent sessions</div>
            </div>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="trend-chart"></canvas>
          </div>
        </div>

        <!-- Bar: Sessions per week -->
        <div class="chart-card full-width">
          <div class="chart-header">
            <div>
              <div class="chart-title">📅 Session Activity</div>
              <div class="chart-subtitle">Interviews completed by type</div>
            </div>
          </div>
          <div class="chart-canvas-wrap" style="height: 200px;">
            <canvas id="activity-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Sessions -->
      <div class="sessions-section">
        <div class="section-header">
          <h3 class="section-title">Recent Sessions</h3>
          <span class="badge badge-purple" id="session-count-badge">Loading...</span>
        </div>
        <div id="sessions-list" class="sessions-list">
          <div class="empty-state">
            <div class="spinner"></div>
            <p style="margin-top:1rem; color: var(--text-muted);">Loading sessions...</p>
          </div>
        </div>
      </div>
    </main>
  `
}

export async function initDashboard() {
  const user = await requireAuth()
  if (!user) return

  // Button handlers
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout()
    showToast('Signed out successfully', 'info')
  })

  const startInterview = () => { window.location.hash = '#/interview' }
  document.getElementById('new-interview-btn')?.addEventListener('click', startInterview)
  document.getElementById('new-interview-btn-2')?.addEventListener('click', startInterview)

  // Load data
  try {
    const [stats, sessions] = await Promise.all([
      getUserStats(user.id),
      getSessionsByUser(user.id)
    ])

    // Update stat cards
    document.getElementById('stat-total').textContent = stats.total
    document.getElementById('stat-completed').textContent = stats.completed
    document.getElementById('stat-avg').textContent = stats.avgScore ? `${stats.avgScore}%` : '—'
    document.getElementById('stat-best').textContent = stats.bestScore ? `${stats.bestScore}%` : '—'

    // Render charts
    renderCharts(stats, sessions)

    // Render sessions list
    renderSessions(sessions)

    document.getElementById('session-count-badge').textContent =
      `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`

  } catch (err) {
    console.error('Dashboard load error:', err)
    showToast('Failed to load dashboard data', 'error')
    renderSessions([])
  }
}

function renderSessions(sessions) {
  const list = document.getElementById('sessions-list')
  if (!list) return

  if (sessions.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎙️</div>
        <div class="empty-title">No sessions yet</div>
        <p class="empty-desc">Start your first AI interview practice session to see your performance here</p>
        <button class="btn btn-primary" style="margin-top:1.25rem;" onclick="window.location.hash='#/interview'">
          Start First Interview
        </button>
      </div>
    `
    return
  }

  const typeEmoji = { technical: '⚙️', behavioral: '🤝', hr: '👥' }
  const typeLabel = { technical: 'Technical', behavioral: 'Behavioral', hr: 'HR Round' }

  list.innerHTML = sessions.slice(0, 8).map(s => `
    <div class="session-item" onclick="window.location.hash='#/report/${s.id}'" role="button" tabindex="0">
      <div class="session-icon">${typeEmoji[s.interview_type] || '🎙️'}</div>
      <div class="session-info">
        <div class="session-title">${s.title || `${s.role} Interview`}</div>
        <div class="session-meta">
          <span>${typeLabel[s.interview_type] || 'Interview'}</span>
          <span>·</span>
          <span>${s.experience_level || 'Mid-level'}</span>
          <span>·</span>
          <span>${formatDate(s.created_at)}</span>
        </div>
      </div>
      <div class="session-score">
        ${s.status === 'completed'
          ? `<span class="score-value">${s.score}%</span><span class="badge badge-success">Done</span>`
          : `<span class="badge badge-warning">Active</span>`
        }
      </div>
    </div>
  `).join('')
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}
