// login.js — Login page
import { login } from '../services/auth.js'
import { showToast } from '../main.js'

export function renderLogin() {
  return `
    <div class="auth-page">
      <div class="bg-gradient"></div>

      <!-- Left Branding Panel -->
      <div class="auth-brand">
        <div class="auth-brand-logo">
          <div class="logo-icon">🎙️</div>
          <span>InterviewAI</span>
        </div>
        <div class="auth-brand-headline">
          <h1>Ace Your Next <span class="gradient-text">Interview</span></h1>
          <p>Practice with an AI interviewer that gives real-time feedback and detailed performance analytics to help you land your dream job.</p>
        </div>
        <div class="auth-features">
          <div class="auth-feature-item">
            <div class="auth-feature-icon">🎙️</div>
            <span>Natural two-way voice conversations</span>
          </div>
          <div class="auth-feature-item">
            <div class="auth-feature-icon">🧠</div>
            <span>Powered by LLaMA 3.3-70B AI</span>
          </div>
          <div class="auth-feature-item">
            <div class="auth-feature-icon">📊</div>
            <span>Detailed performance analytics</span>
          </div>
          <div class="auth-feature-item">
            <div class="auth-feature-icon">🎯</div>
            <span>Technical, Behavioral & HR rounds</span>
          </div>
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="auth-form-panel">
        <div class="auth-form-container">
          <div class="auth-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue your practice sessions</p>
          </div>

          <div class="auth-card">
            <form id="login-form">
              <div class="form-group">
                <label class="form-label" for="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  class="form-input"
                  placeholder="you@example.com"
                  autocomplete="email"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <div class="password-wrapper">
                  <input
                    id="password"
                    type="password"
                    class="form-input"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                    required
                    style="padding-right: 3rem;"
                  />
                  <button type="button" class="password-toggle" id="toggle-pwd" aria-label="Toggle password">
                    👁️
                  </button>
                </div>
              </div>

              <div id="login-error" class="form-error hidden" style="margin-bottom: 1rem;">
                ⚠️ <span id="login-error-text"></span>
              </div>

              <button type="submit" id="login-btn" class="btn btn-primary btn-lg auth-submit">
                Sign In
              </button>
            </form>
          </div>

          <div class="auth-footer">
            Don't have an account?
            <a href="#/register" style="margin-left: 4px; font-weight: 600;">Create one free →</a>
          </div>
        </div>
      </div>
    </div>
  `
}

export function initLogin() {
  const form = document.getElementById('login-form')
  const btn = document.getElementById('login-btn')
  const errorEl = document.getElementById('login-error')
  const errorText = document.getElementById('login-error-text')
  const togglePwd = document.getElementById('toggle-pwd')
  const pwdInput = document.getElementById('password')

  // Password toggle
  togglePwd?.addEventListener('click', () => {
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password'
    togglePwd.textContent = pwdInput.type === 'password' ? '👁️' : '🙈'
  })

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.classList.add('hidden')

    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value

    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Signing in...'

    try {
      await login({ email, password })
      showToast('Welcome back! 👋', 'success')
      window.location.hash = '#/dashboard'
    } catch (err) {
      errorEl.classList.remove('hidden')
      errorText.textContent = err.message
      btn.disabled = false
      btn.innerHTML = 'Sign In'
    }
  })
}
