// register.js — Registration page
import { register } from '../services/auth.js'
import { showToast } from '../main.js'

export function renderRegister() {
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
          <h1>Start Your <span class="gradient-text">Interview Journey</span></h1>
          <p>Join thousands of candidates who've improved their interview skills with AI-powered practice sessions and detailed feedback.</p>
        </div>
        <div class="auth-features">
          <div class="auth-feature-item">
            <div class="auth-feature-icon">⚡</div>
            <span>Get started in under 2 minutes</span>
          </div>
          <div class="auth-feature-item">
            <div class="auth-feature-icon">💯</div>
            <span>100% free — no credit card needed</span>
          </div>
          <div class="auth-feature-item">
            <div class="auth-feature-icon">📈</div>
            <span>Track your progress over time</span>
          </div>
          <div class="auth-feature-item">
            <div class="auth-feature-icon">🔒</div>
            <span>Your data stays private & secure</span>
          </div>
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="auth-form-panel">
        <div class="auth-form-container">
          <div class="auth-form-header">
            <h2>Create your account</h2>
            <p>Start practicing interviews for free today</p>
          </div>

          <div class="auth-card">
            <form id="register-form">
              <div class="form-group">
                <label class="form-label" for="name">Full name</label>
                <input
                  id="name"
                  type="text"
                  class="form-input"
                  placeholder="John Doe"
                  autocomplete="name"
                  required
                />
              </div>

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
                    placeholder="At least 8 characters"
                    autocomplete="new-password"
                    required
                    minlength="8"
                    style="padding-right: 3rem;"
                  />
                  <button type="button" class="password-toggle" id="toggle-pwd" aria-label="Toggle password">
                    👁️
                  </button>
                </div>
                <div class="password-strength" id="strength-meter" style="display:none;">
                  <div class="strength-bars">
                    <div class="strength-bar" id="s1"></div>
                    <div class="strength-bar" id="s2"></div>
                    <div class="strength-bar" id="s3"></div>
                    <div class="strength-bar" id="s4"></div>
                  </div>
                  <span class="strength-label" id="strength-label"></span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  class="form-input"
                  placeholder="Repeat your password"
                  autocomplete="new-password"
                  required
                  style="padding-right: 3rem;"
                />
              </div>

              <div id="register-error" class="form-error hidden" style="margin-bottom: 1rem;">
                ⚠️ <span id="register-error-text"></span>
              </div>

              <button type="submit" id="register-btn" class="btn btn-primary btn-lg auth-submit">
                Create Account
              </button>
            </form>
          </div>

          <div class="auth-footer">
            Already have an account?
            <a href="#/login" style="margin-left: 4px; font-weight: 600;">Sign in →</a>
          </div>
        </div>
      </div>
    </div>
  `
}

export function initRegister() {
  const form = document.getElementById('register-form')
  const btn = document.getElementById('register-btn')
  const errorEl = document.getElementById('register-error')
  const errorText = document.getElementById('register-error-text')
  const pwdInput = document.getElementById('password')
  const togglePwd = document.getElementById('toggle-pwd')
  const strengthMeter = document.getElementById('strength-meter')
  const strengthLabel = document.getElementById('strength-label')

  // Password toggle
  togglePwd?.addEventListener('click', () => {
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password'
    togglePwd.textContent = pwdInput.type === 'password' ? '👁️' : '🙈'
  })

  // Password strength
  pwdInput?.addEventListener('input', () => {
    const val = pwdInput.value
    strengthMeter.style.display = val.length > 0 ? 'block' : 'none'
    const strength = getPasswordStrength(val)
    const bars = [document.getElementById('s1'), document.getElementById('s2'),
                  document.getElementById('s3'), document.getElementById('s4')]
    const classes = ['active-weak', 'active-fair', 'active-good', 'active-strong']
    const labels = ['Weak', 'Fair', 'Good', 'Strong']
    bars.forEach((bar, i) => {
      bar.className = 'strength-bar'
      if (i < strength.level) bar.classList.add(classes[strength.level - 1])
    })
    strengthLabel.textContent = labels[strength.level - 1] || ''
  })

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.classList.add('hidden')

    const name = document.getElementById('name').value.trim()
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value
    const confirmPassword = document.getElementById('confirm-password').value

    if (password !== confirmPassword) {
      showError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters')
      return
    }

    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Creating account...'

    try {
      await register({ name, email, password })
      showToast('Account created! Welcome to InterviewAI 🎉', 'success')
      window.location.hash = '#/dashboard'
    } catch (err) {
      showError(err.message)
      btn.disabled = false
      btn.innerHTML = 'Create Account'
    }
  })

  function showError(msg) {
    errorEl.classList.remove('hidden')
    errorText.textContent = msg
  }
}

function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++
  return { level: Math.max(1, score) }
}
