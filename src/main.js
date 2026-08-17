// main.js — App entry point and hash-based router
import './styles/main.css'
import './styles/auth.css'
import './styles/dashboard.css'
import './styles/interview.css'
import { getCurrentUser } from './services/auth.js'

// ─── Toast System ────────────────────────────────────────────────────────────

export function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container')
  if (!container) {
    container = document.createElement('div')
    container.className = 'toast-container'
    document.body.appendChild(container)
  }

  const toast = document.createElement('div')
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  toast.className = `toast toast-${type}`
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <span>${message}</span>`
  container.appendChild(toast)

  setTimeout(() => toast.remove(), 3100)
}

// ─── Router ──────────────────────────────────────────────────────────────────

const routes = {
  '/login':     () => import('./pages/login.js'),
  '/register':  () => import('./pages/register.js'),
  '/dashboard': () => import('./pages/dashboard.js'),
  '/interview': () => import('./pages/interview.js'),
  '/report':    () => import('./pages/report.js'),
}

async function navigate() {
  const app = document.getElementById('app')
  const hash = window.location.hash.slice(1) || '/'

  // Parse route and params
  const parts = hash.split('/')
  const route = '/' + (parts[1] || '')
  const param = parts[2] || null

  // Auth guard: redirect to login if not authenticated
  const publicRoutes = ['/login', '/register', '/']
  if (!publicRoutes.includes(route)) {
    const user = await getCurrentUser()
    if (!user) {
      window.location.hash = '#/login'
      return
    }
  }

  // Root redirect
  if (route === '/') {
    const user = await getCurrentUser()
    window.location.hash = user ? '#/dashboard' : '#/login'
    return
  }

  // Load page module
  const loader = routes[route]
  if (!loader) {
    app.innerHTML = `
      <div class="bg-gradient"></div>
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:2rem;text-align:center;">
        <div style="font-size:4rem;">🌌</div>
        <h2 style="font-family:var(--font-display);">Page not found</h2>
        <p style="color:var(--text-muted);">The page you're looking for doesn't exist.</p>
        <a href="#/dashboard" class="btn btn-primary" style="margin-top:0.5rem;">Go to Dashboard</a>
      </div>
    `
    return
  }

  try {
    const module = await loader()

    // Render
    const renderFn = route === '/report' ? () => module.renderReport(param) : module[`render${capitalize(route.slice(1))}`]
    if (renderFn) {
      const html = await renderFn()
      app.innerHTML = html
    }

    // Init
    const initFn = route === '/report'
      ? () => module.initReport(param)
      : module[`init${capitalize(route.slice(1))}`]
    if (initFn) await initFn()

  } catch (err) {
    console.error('Navigation error:', err)
    app.innerHTML = `
      <div class="bg-gradient"></div>
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:2rem;text-align:center;">
        <div style="font-size:3rem;">⚠️</div>
        <h2>Something went wrong</h2>
        <p style="color:var(--text-muted); max-width:400px;">${err.message}</p>
        <div style="display:flex;gap:1rem;margin-top:0.5rem;">
          <a href="#/dashboard" class="btn btn-primary">Dashboard</a>
          <button onclick="location.reload()" class="btn btn-ghost">Reload</button>
        </div>
      </div>
    `
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ─── App Init ────────────────────────────────────────────────────────────────

async function init() {
  // Database schema is ensured server-side on register/login (api/auth/*)
  // Listen for hash changes
  window.addEventListener('hashchange', navigate)

  // Initial navigation
  await navigate()
}

init()
