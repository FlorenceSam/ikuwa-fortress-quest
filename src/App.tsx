import { useEffect, useRef, useState } from 'react'
import {
  AccountTypeScreen,
  WelcomeScreen,
  CreateAccountScreen,
  LoginScreen,
  CharacterNameScreen,
} from './screens/AuthScreens'
import Level1 from './game/Level1'
import Level2 from './game/Level2'
import Level3 from './game/Level3'
import Level4 from './game/Level4'
import Level5 from './game/Level5'
import Level6 from './game/Level6'
import Level7 from './game/Level7'
import Level8 from './game/Level8'
import FailScreen from './game/FailScreen'
import ContinuePromptScreen from './screens/ContinuePromptScreen'
import './App.css'

// ─── Progress helpers ──────────────────────────────────────────────────────────
const PROGRESS_KEY = 'iq_progress'

function isLevelScreen(s: string): boolean {
  return s === 'game' || /^level\d+$/.test(s)
}

function hasSavedSession(): boolean {
  try {
    return !!(
      localStorage.getItem('iq_session') &&
      localStorage.getItem(PROGRESS_KEY) &&
      localStorage.getItem('iq_character')
    )
  } catch (_) { return false }
}

// ─── Audio ─────────────────────────────────────────────────────────────────

function buildReverb(ctx: AudioContext): ConvolverNode {
  const rate = ctx.sampleRate
  const len  = Math.floor(rate * 2.5)
  const buf  = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5)
  }
  const conv = ctx.createConvolver()
  conv.buffer = buf
  return conv
}

function launchSound() {
  const ctx = new AudioContext()
  const now = ctx.currentTime

  const reverb = buildReverb(ctx)
  const wet = ctx.createGain(); wet.gain.value = 0.42
  const dry = ctx.createGain(); dry.gain.value = 0.58
  reverb.connect(wet); wet.connect(ctx.destination)
  dry.connect(ctx.destination)

  const tone = (freq: number, peak: number, start: number, dur: number, detune = 0) => {
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.detune.value    = detune
    g.gain.setValueAtTime(0, now + start)
    g.gain.linearRampToValueAtTime(peak, now + start + dur * 0.4)
    g.gain.linearRampToValueAtTime(peak * 0.8, now + start + dur)
    g.gain.linearRampToValueAtTime(0, now + start + dur + 1.5)
    osc.connect(g); g.connect(dry); g.connect(reverb)
    osc.start(now + start); osc.stop(now + start + dur + 2)
  }

  // Void drone + choir swell
  tone(40,  0.40, 1,   4);   tone(55,  0.30, 1,   4)
  tone(82,  0.15, 1.3, 3.5); tone(110, 0.10, 1.6, 3)
  tone(165, 0.07, 2.0, 2.5)
  tone(220, 0.055, 2.2, 2.2,   0); tone(220, 0.055, 2.2, 2.2,  14)
  tone(220, 0.055, 2.2, 2.2, -14)
  tone(330, 0.038, 2.7, 1.8,   7); tone(330, 0.038, 2.7, 1.8,  -7)
  tone(440, 0.022, 3.0, 1.5,   9); tone(440, 0.022, 3.0, 1.5,  -9)
  tone(660, 0.013, 3.4, 1.2,   5)

  // ── Creation Bang at 4 s ──────────────────────────────────────────────────
  const B = 4

  const sw  = ctx.createOscillator()
  const swG = ctx.createGain()
  sw.type = 'sine'
  sw.frequency.setValueAtTime(220, now + B - 0.7)
  sw.frequency.exponentialRampToValueAtTime(3200, now + B)
  swG.gain.setValueAtTime(0,    now + B - 0.7)
  swG.gain.linearRampToValueAtTime(0.22,  now + B - 0.04)
  swG.gain.linearRampToValueAtTime(0,     now + B + 0.08)
  sw.connect(swG); swG.connect(dry)
  sw.start(now + B - 0.7); sw.stop(now + B + 0.15)

  const bm  = ctx.createOscillator()
  const bmG = ctx.createGain()
  bm.type = 'sine'
  bm.frequency.setValueAtTime(115, now + B)
  bm.frequency.exponentialRampToValueAtTime(22, now + B + 2)
  bmG.gain.setValueAtTime(0,    now + B - 0.01)
  bmG.gain.linearRampToValueAtTime(0.88,  now + B + 0.03)
  bmG.gain.exponentialRampToValueAtTime(0.001, now + B + 3)
  bm.connect(bmG); bmG.connect(dry); bmG.connect(reverb)
  bm.start(now + B); bm.stop(now + B + 4)

  // Cosmic warmth
  tone(55,  0.22, B+0.4, 9);    tone(82,  0.16, B+0.8,  8.5)
  tone(110, 0.11, B+1.2, 8);    tone(165, 0.08, B+1.6,  7.5)
  tone(220, 0.06, B+2.0, 7, 0); tone(330, 0.04, B+2.5,  6.5, 0)
  tone(440, 0.025, B+3,  6, 5)
  tone(880, 0.009, B+1.0, 7,  0); tone(880, 0.009, B+1.0, 7, 18)
  tone(1320, 0.005, B+2.5, 5, 0)

  return ctx
}

// ─── Canvas ─────────────────────────────────────────────────────────────────

interface Star {
  x: number; y: number; r: number
  base: number; amp: number; spd: number; ph: number
  hue: number; bright: boolean
}
interface Particle {
  x: number; y: number; vx: number; vy: number
  r: number; life: number; max: number; hue: number; sat: number
}

function mkStars(w: number, h: number): Star[] {
  return Array.from({ length: 440 }, (_, i) => {
    const bright = i < 60
    const roll = Math.random()
    const hue  = roll < 0.65 ? Math.random() * 22 + 38
               : roll < 0.85 ? Math.random() * 20 + 195
               :               Math.random() * 12 + 28
    return {
      x: Math.random() * w, y: Math.random() * h,
      r:    bright ? Math.random() * 1.6 + 1.2 : Math.random() * 1.0 + 0.15,
      base: bright ? Math.random() * 0.4  + 0.50 : Math.random() * 0.32 + 0.20,
      amp:  bright ? Math.random() * 0.30 + 0.14 : Math.random() * 0.10 + 0.03,
      spd:  Math.random() * 0.022 + 0.004,
      ph:   Math.random() * Math.PI * 2,
      hue, bright,
    }
  })
}

function mkParticles(cx: number, cy: number): Particle[] {
  return Array.from({ length: 340 }, () => {
    const a = Math.random() * Math.PI * 2
    const s = Math.random() * 6.5 + 0.8
    return {
      x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 30,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      r: Math.random() * 2.6 + 0.5,
      life: 0, max: Math.random() * 140 + 80,
      hue: Math.random() * 22 + 40, sat: Math.random() * 12 + 88,
    }
  })
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AppScreen      = 'account-type' | 'continue-prompt' | 'welcome' | 'create-account' | 'login' | 'character-name' | 'cinematic' | 'game' | 'level2' | 'level3' | 'level4' | 'level5' | 'level6' | 'level7' | 'level8'
type CinematicPhase = 'dark' | 'reveal' | 'creation' | 'cosmos'

// ─── Component ───────────────────────────────────────────────────────────────

export default function App() {
  const [appScreen,      setAppScreen]      = useState<AppScreen>(() => hasSavedSession() ? 'continue-prompt' : 'account-type')
  const [cinematicPhase, setCinematicPhase] = useState<CinematicPhase>('dark')
  const [firstName,      setFirstName]      = useState('')
  const [showContinue,   setShowContinue]   = useState(false)

  // ── Fail-screen state ─────────────────────────────────────────────────────
  const [failActive, setFailActive] = useState(false)
  const [levelKey,   setLevelKey]   = useState(0)
  const [showHint,   setShowHint]   = useState(false)

  const handleFail      = (_hint: string) => setFailActive(true)
  const handleRetry     = () => { setFailActive(false); setShowHint(false); setLevelKey(k => k + 1) }
  const handleHintRetry = () => { setFailActive(false); setShowHint(true);  setLevelKey(k => k + 1) }
  const handleRestart   = () => { setFailActive(false); setShowHint(false); setLevelKey(k => k + 1); setAppScreen('game') }

  const advanceLevel = (next: AppScreen) => {
    setShowHint(false)
    // Persist progress whenever entering a level, clear it when all levels done
    if (isLevelScreen(next)) {
      try { localStorage.setItem(PROGRESS_KEY, next) } catch (_) {}
    } else if (next === 'welcome') {
      try { localStorage.removeItem(PROGRESS_KEY) } catch (_) {}
    }
    setAppScreen(next)
  }

  // Continue from saved progress
  const handleContinue = () => {
    const saved = (localStorage.getItem(PROGRESS_KEY) || 'game') as AppScreen
    setFailActive(false); setShowHint(false)
    setAppScreen(saved)
  }

  // Restart from Level 1-1, wiping progress
  const handleRestartFresh = () => {
    try { localStorage.removeItem(PROGRESS_KEY) } catch (_) {}
    setFailActive(false); setShowHint(false)
    setAppScreen('game')
    try { localStorage.setItem(PROGRESS_KEY, 'game') } catch (_) {}
  }

  const audioRef       = useRef<AudioContext | null>(null)
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const rafRef         = useRef<number>(0)
  const speechLoopRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Voice (Web Speech API) ────────────────────────────────────────────────

  const startVoice = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const speak = () => {
      const utt = new SpeechSynthesisUtterance(
        "You are God's. You are lovely. You are fearfully and wonderfully made. God loves you."
      )
      utt.rate   = 0.76
      utt.pitch  = 0.88
      utt.volume = 0.70
      utt.onend  = () => { speechLoopRef.current = setTimeout(speak, 3000) }
      window.speechSynthesis.speak(utt)
    }
    speak()
  }

  const stopVoice = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    if (speechLoopRef.current) { clearTimeout(speechLoopRef.current); speechLoopRef.current = null }
  }

  useEffect(() => () => stopVoice(), [])

  // ── Screen transitions ────────────────────────────────────────────────────

  const goLogin = () => {
    startVoice()
    setAppScreen('login')
  }

  const goCreate = () => {
    startVoice()
    setAppScreen('create-account')
  }

  const afterAuth = (name: string) => {
    setFirstName(name)
    const savedChar    = localStorage.getItem('iq_character')
    const savedProgress = localStorage.getItem(PROGRESS_KEY)
    if (savedChar && savedProgress) {
      // Returning player — show continue prompt
      setAppScreen('continue-prompt')
    } else if (savedChar) {
      // Character already set, no saved level yet — skip naming screen, go to Level 1-1
      try { localStorage.setItem(PROGRESS_KEY, 'game') } catch (_) {}
      setAppScreen('game')
    } else {
      // New player — let them name their character
      setAppScreen('character-name')
    }
  }

  // ── Cinematic launch (called from ENTER THE KINGDOM click — user gesture) ─

  const enterKingdom = (characterName: string) => {
    stopVoice()
    localStorage.setItem('iq_character', characterName)

    // AudioContext MUST be created inside a user gesture handler
    audioRef.current = launchSound()

    setShowContinue(false)
    setAppScreen('cinematic')
    setCinematicPhase('dark')
    setTimeout(() => setCinematicPhase('reveal'),   1000)
    setTimeout(() => setCinematicPhase('creation'), 4000)
    setTimeout(() => setCinematicPhase('cosmos'),   6000)
    // Show "Begin Journey" button 5 s after cosmos fully fades in
    setTimeout(() => setShowContinue(true), 11000)
  }

  // ── Canvas (cosmos phase) ─────────────────────────────────────────────────

  useEffect(() => {
    if (cinematicPhase !== 'cosmos') return
    const canvas = canvasRef.current
    if (!canvas) return
    const c = canvas.getContext('2d')
    if (!c) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const W = canvas.width, H = canvas.height

    const stars = mkStars(W, H)
    const parts = mkParticles(W / 2, H / 2)
    let frame = 0

    const nebulae: [number, number, number, string][] = [
      [W*0.28, H*0.32, W*0.42, 'rgba(200,110,15, 0.07)'],
      [W*0.72, H*0.56, W*0.34, 'rgba(160, 70,12, 0.06)'],
      [W*0.50, H*0.16, W*0.30, 'rgba(220,140,25, 0.05)'],
      [W*0.12, H*0.72, W*0.24, 'rgba( 55, 15,110,0.08)'],
      [W*0.82, H*0.22, W*0.20, 'rgba( 80, 35,130,0.06)'],
    ]

    const tick = () => {
      const bg = c.createRadialGradient(W*.5, H*.42, 0, W*.5, H*.42, W*1.1)
      bg.addColorStop(0, '#120908'); bg.addColorStop(0.30, '#0c0604')
      bg.addColorStop(0.65, '#070302'); bg.addColorStop(1, '#000000')
      c.fillStyle = bg; c.fillRect(0, 0, W, H)

      const cg = c.createRadialGradient(W*.5, H*.5, 0, W*.5, H*.5, W*.38)
      cg.addColorStop(0, 'rgba(255,200,60,0.07)'); cg.addColorStop(1, 'transparent')
      c.fillStyle = cg; c.fillRect(0, 0, W, H)

      const mw = c.createLinearGradient(W*.08, H*.22, W*.92, H*.82)
      mw.addColorStop(0, 'transparent'); mw.addColorStop(0.28, 'rgba(255,210,90,0.028)')
      mw.addColorStop(0.50, 'rgba(255,230,130,0.048)'); mw.addColorStop(0.72, 'rgba(255,210,90,0.028)')
      mw.addColorStop(1, 'transparent')
      c.fillStyle = mw; c.fillRect(0, 0, W, H)

      for (const [x, y, r, col] of nebulae) {
        const g = c.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, col); g.addColorStop(1, 'transparent')
        c.fillStyle = g; c.fillRect(0, 0, W, H)
      }

      frame++

      for (const s of stars) {
        const op = Math.max(0.04, Math.min(1, s.base + Math.sin(frame * s.spd + s.ph) * s.amp))
        c.beginPath(); c.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2)
        c.fillStyle = `hsla(${s.hue},85%,70%,${op * 0.14})`; c.fill()
        c.beginPath(); c.arc(s.x, s.y, s.r * 1.9, 0, Math.PI * 2)
        c.fillStyle = `hsla(${s.hue},80%,80%,${op * 0.35})`; c.fill()
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        c.fillStyle = `hsla(${s.hue},65%,94%,${op})`; c.fill()
        if (s.bright && op > 0.48) {
          const len = s.r * 5.5
          c.strokeStyle = `hsla(${s.hue},90%,85%,${op * 0.40})`; c.lineWidth = 0.65
          c.beginPath()
          c.moveTo(s.x-len, s.y); c.lineTo(s.x+len, s.y)
          c.moveTo(s.x, s.y-len); c.lineTo(s.x, s.y+len); c.stroke()
          const d = len * 0.55
          c.strokeStyle = `hsla(${s.hue},90%,85%,${op * 0.22})`
          c.beginPath()
          c.moveTo(s.x-d, s.y-d); c.lineTo(s.x+d, s.y+d)
          c.moveTo(s.x+d, s.y-d); c.lineTo(s.x-d, s.y+d); c.stroke()
        }
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        if (++p.life >= p.max) { parts.splice(i, 1); continue }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.965; p.vy *= 0.965
        const t = p.life / p.max, op = Math.pow(1 - t, 0.88)
        const rN = p.r * (1 + t * 1.4)
        c.beginPath(); c.arc(p.x, p.y, rN*4.5, 0, Math.PI*2)
        c.fillStyle = `hsla(${p.hue},${p.sat}%,58%,${op*0.18})`; c.fill()
        c.beginPath(); c.arc(p.x, p.y, rN*2.0, 0, Math.PI*2)
        c.fillStyle = `hsla(${p.hue},${p.sat}%,72%,${op*0.52})`; c.fill()
        c.beginPath(); c.arc(p.x, p.y, rN, 0, Math.PI*2)
        c.fillStyle = `hsla(${p.hue},${p.sat}%,95%,${op})`; c.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(rafRef.current)
  }, [cinematicPhase])

  // ── Render ────────────────────────────────────────────────────────────────

  if (appScreen === 'continue-prompt') {
    return <ContinuePromptScreen onContinue={handleContinue} onRestart={handleRestartFresh} />
  }

  if (appScreen === 'account-type') {
    return <AccountTypeScreen onSelect={() => setAppScreen('welcome')} />
  }

  if (appScreen === 'welcome') {
    return <WelcomeScreen onLogin={goLogin} onCreateAccount={goCreate} />
  }

  if (appScreen === 'create-account') {
    return (
      <CreateAccountScreen
        onSuccess={afterAuth}
        onLogin={() => setAppScreen('login')}
      />
    )
  }

  if (appScreen === 'login') {
    return (
      <LoginScreen
        onSuccess={afterAuth}
        onCreateAccount={() => setAppScreen('create-account')}
      />
    )
  }

  if (appScreen === 'character-name') {
    return <CharacterNameScreen firstName={firstName} onEnter={enterKingdom} />
  }

  if (appScreen === 'game') {
    if (failActive) return <FailScreen onRetry={handleRetry} onHintRetry={handleHintRetry} onRestart={handleRestart} />
    return <Level1 key={levelKey} onComplete={() => advanceLevel('level2')} onFail={handleFail} showHint={showHint} />
  }
  if (appScreen === 'level2') {
    if (failActive) return <FailScreen onRetry={handleRetry} onHintRetry={handleHintRetry} onRestart={handleRestart} />
    return <Level2 key={levelKey} onComplete={() => advanceLevel('level3')} onFail={handleFail} showHint={showHint} />
  }
  if (appScreen === 'level3') {
    if (failActive) return <FailScreen onRetry={handleRetry} onHintRetry={handleHintRetry} onRestart={handleRestart} />
    return <Level3 key={levelKey} onComplete={() => advanceLevel('level4')} onFail={handleFail} showHint={showHint} />
  }
  if (appScreen === 'level4') {
    if (failActive) return <FailScreen onRetry={handleRetry} onHintRetry={handleHintRetry} onRestart={handleRestart} />
    return <Level4 key={levelKey} onComplete={() => advanceLevel('level5')} onFail={handleFail} showHint={showHint} />
  }
  if (appScreen === 'level5') {
    if (failActive) return <FailScreen onRetry={handleRetry} onHintRetry={handleHintRetry} onRestart={handleRestart} />
    return <Level5 key={levelKey} onComplete={() => advanceLevel('level6')} onFail={handleFail} showHint={showHint} />
  }
  if (appScreen === 'level6') {
    if (failActive) return <FailScreen onRetry={handleRetry} onHintRetry={handleHintRetry} onRestart={handleRestart} />
    return <Level6 key={levelKey} onComplete={() => advanceLevel('level7')} onFail={handleFail} showHint={showHint} />
  }
  if (appScreen === 'level7') {
    if (failActive) return <FailScreen onRetry={handleRetry} onHintRetry={handleHintRetry} onRestart={handleRestart} />
    return <Level7 key={levelKey} onComplete={() => advanceLevel('level8')} onFail={handleFail} showHint={showHint} />
  }
  if (appScreen === 'level8') {
    if (failActive) return <FailScreen onRetry={handleRetry} onHintRetry={handleHintRetry} onRestart={handleRestart} />
    return <Level8 key={levelKey} onComplete={() => advanceLevel('welcome')} onFail={handleFail} showHint={showHint} />
  }

  // Cinematic
  return (
    <div className="opening-screen">
      {cinematicPhase === 'cosmos'   && <canvas ref={canvasRef} className="cosmos-canvas" />}
      {cinematicPhase === 'creation' && <div className="creation-ball" />}
      {cinematicPhase === 'creation' && <div className="creation-flash" />}
      {(cinematicPhase === 'reveal' || cinematicPhase === 'creation') && (
        <h1 className={`opening-text${cinematicPhase === 'reveal' ? ' visible' : ' fade-out'}`}>
          Let there be light
        </h1>
      )}
      {cinematicPhase === 'cosmos' && showContinue && (
        <button className="continue-btn" onClick={() => setAppScreen('game')}>
          BEGIN YOUR JOURNEY
        </button>
      )}
    </div>
  )
}
