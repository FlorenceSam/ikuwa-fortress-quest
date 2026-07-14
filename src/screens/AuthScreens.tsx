import { useState } from 'react'
import './screens.css'

// ─── localStorage helpers ──────────────────────────────────────────────────

interface Account { firstName: string; email: string; password: string; accountType: string }

const getAccounts = (): Account[] =>
  JSON.parse(localStorage.getItem('iq_accounts') || '[]')

const saveAccount = (acc: Account) => {
  const list = getAccounts()
  list.push(acc)
  localStorage.setItem('iq_accounts', JSON.stringify(list))
}

const updateAccountPassword = (email: string, newPassword: string): boolean => {
  const list = getAccounts()
  const acc = list.find(a => a.email.toLowerCase() === email.toLowerCase())
  if (!acc) return false
  acc.password = newPassword
  localStorage.setItem('iq_accounts', JSON.stringify(list))
  return true
}

// ─── Eye icons ─────────────────────────────────────────────────────────────

const EyeOpen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeClosed = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

// ─── Account Type Screen ───────────────────────────────────────────────────

interface AccountTypeProps {
  onSelect: () => void
}

export function AccountTypeScreen({ onSelect }: AccountTypeProps) {
  const choose = (type: 'personal' | 'church') => {
    localStorage.setItem('iq_account_type', type)
    onSelect()
  }

  return (
    <div className="screen account-type-screen">
      <div className="account-type-content">
        <p className="account-type-sub">WELCOME TO</p>
        <h1 className="account-type-title">Ikuwa Fortress Quest</h1>
        <div className="gold-rule narrow" />
        <h2 className="account-type-question">How are you joining?</h2>
        <div className="account-type-actions">
          <button className="gold-btn" onClick={() => choose('personal')}>
            Personal
          </button>
          <button className="gold-btn gold-btn--outline" onClick={() => choose('church')}>
            Under a Church
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Welcome Screen ────────────────────────────────────────────────────────

interface WelcomeProps {
  onLogin: () => void
  onCreateAccount: () => void
}

export function WelcomeScreen({ onLogin, onCreateAccount }: WelcomeProps) {
  return (
    <div className="screen welcome-screen">
      <div className="welcome-content">
        <p className="game-subtitle">A CHRISTIAN ADVENTURE</p>
        <h1 className="game-title">
          <span>IKUWA</span>
          <span>FORTRESS</span>
          <span>QUEST</span>
        </h1>
        <div className="gold-rule" />
        <p className="game-verse">"The Lord is my light and my salvation" — Psalm 27:1</p>
      </div>
      <div className="welcome-actions">
        <button className="gold-btn" onClick={onLogin}>LOGIN</button>
        <button className="gold-btn gold-btn--outline" onClick={onCreateAccount}>
          CREATE ACCOUNT
        </button>
      </div>
    </div>
  )
}

// ─── Create Account Screen ─────────────────────────────────────────────────

interface CreateProps {
  onSuccess: (firstName: string) => void
  onLogin: () => void
}

export function CreateAccountScreen({ onSuccess, onLogin }: CreateProps) {
  const [form, setForm] = useState({ firstName: '', email: '', password: '', confirm: '' })
  const [error, setError]         = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim())   return setError('First name is required.')
    if (!form.email.includes('@')) return setError('Please enter a valid email.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (getAccounts().find(a => a.email.toLowerCase() === form.email.toLowerCase()))
                                  return setError('An account with this email already exists.')

    const firstName   = form.firstName.trim()
    const accountType = localStorage.getItem('iq_account_type') || 'personal'
    saveAccount({ firstName, email: form.email.trim(), password: form.password, accountType })
    localStorage.setItem('iq_session', JSON.stringify({ firstName, email: form.email.trim() }))
    onSuccess(firstName)
  }

  return (
    <div className="screen">
      <h2 className="screen-title">CREATE ACCOUNT</h2>
      <div className="gold-rule narrow" />
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="field-group">
          <label>FIRST NAME</label>
          <input value={form.firstName} onChange={set('firstName')}
            placeholder="Your first name" autoComplete="given-name" />
        </div>
        <div className="field-group">
          <label>EMAIL</label>
          <input type="email" value={form.email} onChange={set('email')}
            placeholder="Your email address" autoComplete="email" />
        </div>
        <div className="field-group">
          <label>PASSWORD</label>
          <div className="password-row">
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Create a password"
              autoComplete="new-password"
            />
            <button type="button" className="pw-toggle"
              onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
        </div>
        <div className="field-group">
          <label>CONFIRM PASSWORD</label>
          <div className="password-row">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={set('confirm')}
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
            <button type="button" className="pw-toggle"
              onClick={() => setShowConfirm(v => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}>
              {showConfirm ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="gold-btn form-btn">CREATE ACCOUNT</button>
      </form>
      <p className="auth-switch">
        Already have an account?{' '}
        <button className="text-link" onClick={onLogin}>Login</button>
      </p>
    </div>
  )
}

// ─── Login Screen ──────────────────────────────────────────────────────────

interface LoginProps {
  onSuccess: (firstName: string) => void
  onCreateAccount: () => void
  onForgotPassword: () => void
}

export function LoginScreen({ onSuccess, onCreateAccount, onForgotPassword }: LoginProps) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.email)    return setError('Please enter your email.')
    if (!form.password) return setError('Please enter your password.')

    const acc = getAccounts().find(
      a => a.email.toLowerCase() === form.email.toLowerCase() && a.password === form.password
    )
    if (!acc) return setError('Invalid email or password.')

    localStorage.setItem('iq_session', JSON.stringify({ firstName: acc.firstName, email: acc.email }))
    onSuccess(acc.firstName)
  }

  return (
    <div className="screen">
      <h2 className="screen-title">LOGIN</h2>
      <div className="gold-rule narrow" />
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="field-group">
          <label>EMAIL</label>
          <input type="email" value={form.email} onChange={set('email')}
            placeholder="Your email address" autoComplete="email" />
        </div>
        <div className="field-group">
          <label>PASSWORD</label>
          <div className="password-row">
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Your password"
              autoComplete="current-password"
            />
            <button type="button" className="pw-toggle"
              onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="gold-btn form-btn">LOGIN</button>
        <button type="button" className="text-link forgot-link" onClick={onForgotPassword}>
          Forgot Password?
        </button>
      </form>
      <p className="auth-switch">
        New here?{' '}
        <button className="text-link" onClick={onCreateAccount}>Create Account</button>
      </p>
    </div>
  )
}

// ─── Forgot Password Screen ────────────────────────────────────────────────

interface ForgotPasswordProps {
  onBackToLogin: () => void
}

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordProps) {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request')
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) return setError('Please enter a valid email.')
    if (!getAccounts().find(a => a.email.toLowerCase() === email.toLowerCase()))
      return setError('No account found with that email.')
    setStep('reset')
  }

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    updateAccountPassword(email, form.password)
    setStep('done')
  }

  return (
    <div className="screen">
      <h2 className="screen-title">RESET PASSWORD</h2>
      <div className="gold-rule narrow" />

      {step === 'request' && (
        <form className="auth-form" onSubmit={submitEmail} noValidate>
          <p className="forgot-instructions">
            Enter the email address on your account and we'll let you set a new password.
          </p>
          <div className="field-group">
            <label>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Your email address" autoComplete="email" autoFocus />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="gold-btn form-btn">CONTINUE</button>
        </form>
      )}

      {step === 'reset' && (
        <form className="auth-form" onSubmit={submitReset} noValidate>
          <p className="forgot-instructions">Choose a new password for {email}.</p>
          <div className="field-group">
            <label>NEW PASSWORD</label>
            <div className="password-row">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Create a new password"
                autoComplete="new-password"
                autoFocus
              />
              <button type="button" className="pw-toggle"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOpen /> : <EyeClosed />}
              </button>
            </div>
          </div>
          <div className="field-group">
            <label>CONFIRM PASSWORD</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Confirm your new password"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="gold-btn form-btn">RESET PASSWORD</button>
        </form>
      )}

      {step === 'done' && (
        <div className="auth-form">
          <p className="forgot-instructions">
            Your password has been reset. You can now log in with your new password.
          </p>
          <button className="gold-btn form-btn" onClick={onBackToLogin}>BACK TO LOGIN</button>
        </div>
      )}

      {step !== 'done' && (
        <p className="auth-switch">
          <button className="text-link" onClick={onBackToLogin}>Back to Login</button>
        </p>
      )}
    </div>
  )
}

// ─── Character Name Screen ─────────────────────────────────────────────────

interface CharacterProps {
  firstName: string
  onEnter: (characterName: string) => void
}

export function CharacterNameScreen({ firstName, onEnter }: CharacterProps) {
  const [name, setName] = useState(firstName)
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setError('Your warrior name must be at least 2 characters.')
    localStorage.setItem('iq_character', name.trim())
    onEnter(name.trim())
  }

  return (
    <div className="screen character-screen">
      <p className="character-question">What shall we call you,</p>
      <p className="character-warrior">Warrior?</p>
      <div className="gold-rule narrow" />
      <form className="auth-form character-form" onSubmit={submit} noValidate>
        <input
          className="character-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter your warrior name"
          autoComplete="off"
          autoFocus
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="gold-btn form-btn">
          ENTER THE KINGDOM
        </button>
      </form>
    </div>
  )
}
