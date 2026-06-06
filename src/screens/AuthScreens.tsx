import { useState } from 'react'
import './screens.css'

// ─── localStorage helpers ──────────────────────────────────────────────────

interface Account { firstName: string; email: string; password: string }

const getAccounts = (): Account[] =>
  JSON.parse(localStorage.getItem('iq_accounts') || '[]')

const saveAccount = (acc: Account) => {
  const list = getAccounts()
  list.push(acc)
  localStorage.setItem('iq_accounts', JSON.stringify(list))
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
  const [error, setError] = useState('')

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim())                         return setError('First name is required.')
    if (!form.email.includes('@'))                      return setError('Please enter a valid email.')
    if (form.password.length < 6)                       return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm)                 return setError('Passwords do not match.')
    if (getAccounts().find(a => a.email.toLowerCase() === form.email.toLowerCase()))
                                                        return setError('An account with this email already exists.')

    const firstName = form.firstName.trim()
    saveAccount({ firstName, email: form.email.trim(), password: form.password })
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
          <input type="password" value={form.password} onChange={set('password')}
            placeholder="Create a password" autoComplete="new-password" />
        </div>
        <div className="field-group">
          <label>CONFIRM PASSWORD</label>
          <input type="password" value={form.confirm} onChange={set('confirm')}
            placeholder="Confirm your password" autoComplete="new-password" />
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
}

export function LoginScreen({ onSuccess, onCreateAccount }: LoginProps) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

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
          <input type="password" value={form.password} onChange={set('password')}
            placeholder="Your password" autoComplete="current-password" />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="gold-btn form-btn">LOGIN</button>
      </form>
      <p className="auth-switch">
        New here?{' '}
        <button className="text-link" onClick={onCreateAccount}>Create Account</button>
      </p>
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
