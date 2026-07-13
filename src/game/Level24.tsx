import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level24.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'questions' | 'blind'
type P2Sub = 'escape' | 'midq' | 'tfq'
type P3Sub = 'run' | 'salt' | 'questions'
type P4Sub = 'smoke' | 'questions'
type RoundT = 'yn' | 'tf' | 'mc'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'YOU ESCAPED THE FIRE!!',
  "LOT ENERGY — DON'T LOOK BACK!!",
  'FASTER THAN THE FLAMES!!',
  'DIVINE ESCAPE ROUTE!!',
  'THE ANGELS PULLED YOU OUT!!',
  'MERCY BEFORE JUDGMENT!!',
  "YOU DIDN'T LOOK BACK!!",
  'ZOAR BOUND AND GLORY FOUND!!',
  'GOD REMEMBERED ABRAHAM!!',
  'SALT WHO?! YOU KEPT MOVING!! 😂',
]

const P1_ROUNDS: Round[] = [
  { type: 'yn', q: 'Did Lot invite the angels to stay at his house?', opts: ['YES', 'NO'], ans: 0 },
  { type: 'tf', q: 'The men of Sodom were kind and welcoming to the angel visitors.', opts: ['TRUE', 'FALSE'], ans: 1 },
]
const P1_COINS = [15, 20]

const P1_MC: Round = {
  type: 'mc',
  q: 'What did the angels do to the men of Sodom?',
  opts: ['They struck them blind', 'They called fire from heaven immediately', 'They turned them to stone', 'They made them fall asleep'],
  ans: 0,
}

const WAYPOINT_COUNT = 6

const P2_MIDQ: Round = {
  type: 'yn',
  q: 'Did Lot hesitate and have to be dragged out by the angels?',
  opts: ['YES', 'NO'],
  ans: 0,
}

const P2_TFQ: Round = {
  type: 'tf',
  q: 'The angels told Lot to flee to the mountains first.',
  opts: ['TRUE', 'FALSE'],
  ans: 1,
}

const P3_MCQ: Round = {
  type: 'mc',
  q: "What happened to Lot's wife?",
  opts: ['She looked back and became a pillar of salt', 'She tripped and fell', 'She was taken by the mob', 'She made it safely to Zoar'],
  ans: 0,
}

const P3_YNQ: Round = {
  type: 'yn',
  q: 'Did Lot and his two daughters make it safely to Zoar?',
  opts: ['YES', 'NO'],
  ans: 0,
}

const P4_TFQ: Round = {
  type: 'tf',
  q: "God destroyed Sodom because He forgot about Lot and didn't care.",
  opts: ['TRUE', 'FALSE'],
  ans: 1,
}

const P4_MCQ: Round = {
  type: 'mc',
  q: "What does Lot's rescue teach us about God?",
  opts: [
    'God shows mercy to the righteous even in judgment',
    'God only saves perfect people',
    'Lot was saved because he was better than others',
    'God judges everyone the same with no exceptions',
  ],
  ans: 0,
}

const SMOKE_LINES = [
  'Early the next morning Abraham got up',
  'and returned to the place where he had stood before the LORD.',
  'He looked down toward Sodom and Gomorrah...',
  'and he saw dense smoke rising from the land.',
]

// ── Audio ─────────────────────────────────────────────────────────────────────
function playDeepRumble() {
  try {
    const c = new AudioContext()
    ;[40, 55, 65].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.15)
      g.gain.linearRampToValueAtTime(0.28, c.currentTime + i * 0.15 + 1.0)
      g.gain.linearRampToValueAtTime(0.22, c.currentTime + i * 0.15 + 3.0)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.15 + 4.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.15); o.stop(c.currentTime + i * 0.15 + 5)
    })
  } catch (_) {}
}
function playFireExplosion() {
  try {
    const c = new AudioContext()
    ;[80, 120, 160, 220, 300, 440].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sawtooth'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.03)
      g.gain.linearRampToValueAtTime(0.18, c.currentTime + i * 0.03 + 0.06)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.03 + 1.2)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.03); o.stop(c.currentTime + i * 0.03 + 1.4)
    })
    const o2 = c.createOscillator(); const g2 = c.createGain()
    o2.type = 'sine'; o2.frequency.setValueAtTime(100, c.currentTime)
    o2.frequency.exponentialRampToValueAtTime(18, c.currentTime + 1.4)
    g2.gain.setValueAtTime(0.65, c.currentTime); g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.0)
    o2.connect(g2); g2.connect(c.destination); o2.start(); o2.stop(c.currentTime + 2.2)
  } catch (_) {}
}
function playBlindFlash() {
  try {
    const c = new AudioContext()
    ;[660, 880, 1100, 1320, 1760].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0.18, c.currentTime + i * 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.03 + 0.7)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.03); o.stop(c.currentTime + i * 0.03 + 0.8)
    })
  } catch (_) {}
}
function playWhiteBurstSound() {
  try {
    const c = new AudioContext()
    ;[110, 165, 220, 330, 440, 660, 880, 1320].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0.22, c.currentTime + i * 0.06)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 1.8)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.06); o.stop(c.currentTime + i * 0.06 + 2.0)
    })
    const o2 = c.createOscillator(); const g2 = c.createGain()
    o2.type = 'sine'; o2.frequency.setValueAtTime(80, c.currentTime)
    o2.frequency.exponentialRampToValueAtTime(14, c.currentTime + 3)
    g2.gain.setValueAtTime(0.7, c.currentTime); g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 3.5)
    o2.connect(g2); g2.connect(c.destination); o2.start(); o2.stop(c.currentTime + 4)
  } catch (_) {}
}
function playSaltCrystal() {
  try {
    const c = new AudioContext()
    ;[523, 622, 698, 784, 932].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.25)
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + i * 0.25 + 0.4)
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + i * 0.25 + 1.5)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.25 + 3.0)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.25); o.stop(c.currentTime + i * 0.25 + 3.5)
    })
  } catch (_) {}
}
function playFootstep() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(120, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(55, c.currentTime + 0.08)
    g.gain.setValueAtTime(0.22, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.15)
  } catch (_) {}
}
function playGoldExplosion() {
  try {
    const c = new AudioContext()
    ;[110, 220, 330, 440, 550, 880].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.04)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.04 + 0.08)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.04 + 1.4)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.04); o.stop(c.currentTime + i * 0.04 + 1.6)
    })
    const o2 = c.createOscillator(); const g2 = c.createGain()
    o2.type = 'sine'; o2.frequency.setValueAtTime(80, c.currentTime)
    o2.frequency.exponentialRampToValueAtTime(18, c.currentTime + 1.2)
    g2.gain.setValueAtTime(0.6, c.currentTime); g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.8)
    o2.connect(g2); g2.connect(c.destination); o2.start(); o2.stop(c.currentTime + 2)
  } catch (_) {}
}
function playGoldPop() {
  try {
    const c = new AudioContext()
    ;[330, 415, 523, 659].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.06)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.06 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 0.55)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.06); o.stop(c.currentTime + i * 0.06 + 0.7)
    })
  } catch (_) {}
}
function playBuzzer() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(180, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.35)
    g.gain.setValueAtTime(0.4, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5)
  } catch (_) {}
}
function playFanfare() {
  try {
    const c = new AudioContext()
    ;[261, 330, 392, 523, 659, 784, 1047].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.09)
      g.gain.linearRampToValueAtTime(0.18, c.currentTime + i * 0.09 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.09 + 0.85)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.09); o.stop(c.currentTime + i * 0.09 + 1.0)
    })
  } catch (_) {}
}
function playDing(pitch = 1.0) {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.value = 880 * pitch
    g.gain.setValueAtTime(0.22, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.55)
  } catch (_) {}
}
function playSoftChime() {
  try {
    const c = new AudioContext()
    ;[261.6, 329.6, 392.0, 523.3].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.30)
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + i * 0.30 + 0.5)
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + i * 0.30 + 2.5)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.30 + 4.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.30); o.stop(c.currentTime + i * 0.30 + 5)
    })
  } catch (_) {}
}

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }
function mkBurst(cx: number, cy: number, cnt: number, hue = 45): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random() * Math.PI * 2; const s = Math.random() * 10 + 2
    return { x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, r: Math.random() * 3 + 1, life: 0, max: Math.random() * 70 + 50, hue }
  })
}

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level24({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [affirm, setAffirm]         = useState<string | null>(null)
  const [affKey, setAffKey]         = useState(0)
  const [whiteBurst, setWhiteBurst] = useState(false)
  const [redFlash, setRedFlash]     = useState(false)

  // Cinematic
  const [cinStep, setCinStep]       = useState(0)

  // Phase 1
  const [p1Sub, setP1Sub]           = useState<P1Sub>('questions')
  const [p1Round, setP1Round]       = useState(0)
  const [p1Sel, setP1Sel]           = useState<number | null>(null)
  const [p1Grace, setP1Grace]       = useState(false)
  const [blindActive, setBlindActive] = useState(false)
  const [blindDone, setBlindDone]   = useState(false)
  const [mobFrozen, setMobFrozen]   = useState(false)
  const [p1MCDone, setP1MCDone]     = useState(false)
  const [p1MCSel, setP1MCSel]       = useState<number | null>(null)
  const [p1MCGrace, setP1MCGrace]   = useState(false)
  const [mobBanner, setMobBanner]   = useState(false)

  // Phase 2
  const [p2Sub, setP2Sub]           = useState<P2Sub>('escape')
  const [wayDone, setWayDone]       = useState(0)
  const [wayTimer, setWayTimer]     = useState(4)
  const [wayWarning, setWayWarning] = useState(false)
  const [escDone, setEscDone]       = useState(false)
  const [midqSel, setMidqSel]       = useState<number | null>(null)
  const [midqGrace, setMidqGrace]   = useState(false)
  const [tfqSel, setTfqSel]         = useState<number | null>(null)
  const [tfqGrace, setTfqGrace]     = useState(false)
  const [dragBanner, setDragBanner] = useState(false)
  const [escBanner, setEscBanner]   = useState(false)
  const [zoarBanner, setZoarBanner] = useState(false)

  // Phase 3
  const [p3Sub, setP3Sub]           = useState<P3Sub>('run')
  const [forwardTaps, setForwardTaps] = useState(0)
  const [saltMoment, setSaltMoment] = useState(false)
  const [saltCrystals, setSaltCrystals] = useState(false)
  const [p3MCDone, setP3MCDone]     = useState(false)
  const [p3MCSel, setP3MCSel]       = useState<number | null>(null)
  const [p3MCGrace, setP3MCGrace]   = useState(false)
  const [p3YNSel, setP3YNSel]       = useState<number | null>(null)
  const [p3YNGrace, setP3YNGrace]   = useState(false)

  // Phase 4
  const [p4Sub, setP4Sub]           = useState<P4Sub>('smoke')
  const [smokeStep, setSmokeStep]   = useState(0)
  const [goldDescend, setGoldDescend] = useState(false)
  const [p4TFSel, setP4TFSel]       = useState<number | null>(null)
  const [p4TFGrace, setP4TFGrace]   = useState(false)
  const [p4MCSel, setP4MCSel]       = useState<number | null>(null)
  const [p4MCGrace, setP4MCGrace]   = useState(false)
  const [neverForgetBanner, setNeverForgetBanner] = useState(false)

  // Ending
  const [coinCount, setCoinCount]   = useState(0)
  const [starsShown, setStarsShown] = useState(0)
  const [showScripture, setShowScripture] = useState(false)
  const [showAdvance, setShowAdvance]     = useState(false)

  // Refs
  const earnedRef       = useRef(0)
  const affIdxRef       = useRef(0)
  const comboRef        = useRef(0)
  const phaseRef        = useRef<Phase>('cinematic')
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const rafRef          = useRef(0)
  const particlesRef    = useRef<Pt[]>([])
  const wayDoneRef      = useRef(0)
  const wayTimerRef     = useRef<number | null>(null)
  const forwardTapsRef  = useRef(0)
  const saltDoneRef     = useRef(false)
  const blindDoneRef    = useRef(false)

  // Canvas resize
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const r = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    r(); window.addEventListener('resize', r)
    return () => { window.removeEventListener('resize', r); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    setShakeClass('l24-shake'); setTimeout(() => setShakeClass(''), 700)
  }, [])

  const showAffirm = useCallback((t: string) => {
    setAffirm(t); setAffKey(k => k + 1); setTimeout(() => setAffirm(null), 2400)
  }, [])

  const getAffirm = useCallback(() => {
    const combo = comboRef.current
    let pool: string[]
    if (combo >= 10)     pool = [AFFIRMATIONS[9]]
    else if (combo >= 6) pool = AFFIRMATIONS.slice(7, 9)
    else if (combo >= 3) pool = AFFIRMATIONS.slice(3, 7)
    else                 pool = AFFIRMATIONS.slice(0, 3)
    const t = pool[affIdxRef.current % pool.length]
    affIdxRef.current++; comboRef.current++
    return t
  }, [])

  const speak = useCallback((text: string, rate = 0.80, pitch = 1.0, onEnd?: () => void) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())
      const u = new SpeechSynthesisUtterance(fixed); u.rate = rate; u.pitch = pitch; u.volume = 1
      if (onEnd) u.onend = onEnd
      window.speechSynthesis?.speak(u)
    } catch (_) { onEnd?.() }
  }, [])

  const speakAffirm = useCallback((text: string) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())
      const u = new SpeechSynthesisUtterance(fixed); u.rate = 0.90; u.pitch = 1.42; u.volume = 1
      window.speechSynthesis?.speak(u)
    } catch (_) {}
  }, [])

  const runParticles = useCallback(() => {
    const cv = canvasRef.current; if (!cv || rafRef.current !== 0) return
    const tick = () => {
      const ctx = cv.getContext('2d'); if (ctx) {
        ctx.clearRect(0, 0, cv.width, cv.height)
        particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
        for (const p of particlesRef.current) {
          p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy *= 0.93; p.vy += 0.14; p.life++
          const op = Math.pow(1 - p.life / p.max, 0.55) * 0.95
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},95%,60%,${op * 0.18})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.6, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},90%,75%,${op * 0.70})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},70%,97%,${op})`; ctx.fill()
        }
      }
      if (particlesRef.current.length > 0) rafRef.current = requestAnimationFrame(tick)
      else rafRef.current = 0
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const burst = useCallback((cx: number, cy: number, cnt = 80, hue = 45) => {
    particlesRef.current.push(...mkBurst(cx, cy, cnt, hue)); runParticles()
  }, [runParticles])

  const fireBurstWhite = useCallback(() => {
    setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 1400)
    for (let i = 0; i < 14; i++)
      setTimeout(() => burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 80, 48 + Math.random() * 14), i * 110)
  }, [burst])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playDeepRumble()
    const ts = [
      setTimeout(() => setCinStep(1), 800),
      setTimeout(() => setCinStep(2), 1900),
      setTimeout(() => setCinStep(3), 3000),
      setTimeout(() => { setCinStep(4); playFireExplosion(); shake()
        for (let i = 0; i < 20; i++)
          setTimeout(() => burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.85, 60, 10 + i * 2), i * 110)
      }, 4100),
      setTimeout(() => setCinStep(5), 5000),
      setTimeout(() => setCinStep(6), 5900),
      setTimeout(() => {
        phaseRef.current = 'phase1'; setPhase('phase1')
        speak('Two angels arrived at Sodom. Lot saw them and bowed to the ground. He knew something was different about these strangers.', 0.74, 0.88)
      }, 8000),
    ]
    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Sub('questions'); setP1Round(0); setP1Sel(null); setP1Grace(false)
    setBlindActive(false); setBlindDone(false); blindDoneRef.current = false
    setMobFrozen(false); setP1MCDone(false); setP1MCSel(null); setP1MCGrace(false)
    setMobBanner(false)
  }, [phase])

  const handleP1 = useCallback((idx: number) => {
    if (p1Sel !== null || p1Grace) return
    setP1Sel(idx)
    const round = P1_ROUNDS[p1Round]
    if (idx === round.ans) {
      addEarned(P1_COINS[p1Round]); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      if (p1Round === 1) {
        setMobBanner(true)
        speak('The men of Sodom surrounded the house! Every last one of them!', 0.82, 1.0)
        setRedFlash(true); setTimeout(() => setRedFlash(false), 800)
        setTimeout(() => setMobBanner(false), 3000)
      }
      setTimeout(() => {
        setP1Sel(null)
        if (p1Round < P1_ROUNDS.length - 1) {
          setP1Round(r => r + 1)
        } else {
          speak('The mob demanded the visitors. The angels had to act. Watch what happens next!', 0.78, 0.92)
          setTimeout(() => setP1Sub('blind'), 3000)
        }
      }, 2000)
    } else {
      setP1Grace(true); setP1Sel(null); playBuzzer()
      setTimeout(() => setP1Grace(false), 2800)
    }
  }, [p1Sel, p1Grace, p1Round, addEarned, shake, getAffirm, speakAffirm, showAffirm, speak])

  // Blind strike init
  useEffect(() => {
    if (phase !== 'phase1' || p1Sub !== 'blind') return
    setBlindActive(true)
    speak('The mob is closing in! Tap the angel to strike them blind!', 0.82, 0.96)
  }, [phase, p1Sub, speak])

  const tapAngel = useCallback(() => {
    if (blindDoneRef.current) return
    blindDoneRef.current = true
    playBlindFlash(); shake()
    setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 1200)
    setMobFrozen(true)
    addEarned(35)
    const af = getAffirm(); speakAffirm(af); showAffirm(af)
    burst(window.innerWidth * 0.5, window.innerHeight * 0.45, 60, 55)
    speak('The angels struck them blind! Every man — from young to old — could not find the door!', 0.78, 1.0)
    setTimeout(() => {
      setBlindDone(true)
    }, 3500)
  }, [addEarned, burst, shake, getAffirm, speakAffirm, showAffirm, speak])

  const handleP1MC = useCallback((idx: number) => {
    if (p1MCSel !== null || p1MCGrace) return
    setP1MCSel(idx)
    if (idx === P1_MC.ans) {
      addEarned(20); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      setTimeout(() => {
        speak('Blind! The entire mob — blind! Now the angels told Lot: you need to leave. Right now.', 0.76, 0.90)
        setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 4500)
      }, 2000)
    } else {
      setP1MCGrace(true); setP1MCSel(null); playBuzzer()
      setTimeout(() => setP1MCGrace(false), 2800)
    }
  }, [p1MCSel, p1MCGrace, addEarned, shake, getAffirm, speakAffirm, showAffirm, speak])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Sub('escape'); setWayDone(0); wayDoneRef.current = 0
    setWayTimer(4); setWayWarning(false); setEscDone(false)
    setMidqSel(null); setMidqGrace(false); setTfqSel(null); setTfqGrace(false)
    setDragBanner(false); setEscBanner(false); setZoarBanner(false)
    speak('Flee! The angels shouted. Do not look back! Do not stop anywhere! Lot hesitated — so the angels grabbed his hand!', 0.76, 0.94)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Waypoint timer
  useEffect(() => {
    if (phase !== 'phase2' || p2Sub !== 'escape' || escDone) return
    if (wayDoneRef.current >= WAYPOINT_COUNT) return

    wayTimerRef.current = window.setInterval(() => {
      setWayTimer(t => {
        if (t <= 1) {
          setWayWarning(true)
          speak("The angels are pulling you! Keep moving!", 0.88)
          setTimeout(() => setWayWarning(false), 2800)
          return 4
        }
        return t - 1
      })
    }, 1000)
    return () => { if (wayTimerRef.current) clearInterval(wayTimerRef.current) }
  }, [phase, p2Sub, escDone]) // eslint-disable-line react-hooks/exhaustive-deps

  const tapWaypoint = useCallback(() => {
    if (p2Sub !== 'escape' || escDone) return
    const current = wayDoneRef.current
    if (current >= WAYPOINT_COUNT) return
    playFootstep()
    addEarned(10)
    burst(window.innerWidth * 0.5, window.innerHeight * 0.55, 22, 45)
    const next = current + 1
    wayDoneRef.current = next
    setWayDone(next)
    if (wayTimerRef.current) clearInterval(wayTimerRef.current)
    setWayTimer(4)

    if (next === 3) {
      // mid-question
      setP2Sub('midq')
      speak('Did Lot hesitate and have to be dragged out by the angels? Yes or no?', 0.80)
    } else if (next >= WAYPOINT_COUNT) {
      setEscDone(true)
      if (wayTimerRef.current) clearInterval(wayTimerRef.current)
      addEarned(40); playGoldExplosion(); shake()
      for (let i = 0; i < 14; i++)
        setTimeout(() => burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.85, 45, 45), i * 100)
      setEscBanner(true); setTimeout(() => setEscBanner(false), 3000)
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      speak('Lot escaped the city! But the angels had one more instruction for him.', 0.78)
      setTimeout(() => setP2Sub('tfq'), 4500)
    }
  }, [p2Sub, escDone, addEarned, burst, shake, getAffirm, speakAffirm, showAffirm, speak])

  const handleMidQ = useCallback((idx: number) => {
    if (midqSel !== null || midqGrace) return
    setMidqSel(idx)
    if (idx === P2_MIDQ.ans) {
      addEarned(20); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      setDragBanner(true); setTimeout(() => setDragBanner(false), 3000)
      speak('YES! The angels literally grabbed his hand and dragged him out! That is mercy in action!', 0.80, 1.02)
      setTimeout(() => { setMidqSel(null); setP2Sub('escape') }, 3200)
    } else {
      setMidqGrace(true); setMidqSel(null); playBuzzer()
      setTimeout(() => setMidqGrace(false), 2800)
    }
  }, [midqSel, midqGrace, addEarned, shake, getAffirm, speakAffirm, showAffirm, speak])

  const handleTFQ = useCallback((idx: number) => {
    if (tfqSel !== null || tfqGrace) return
    setTfqSel(idx)
    if (idx === P2_TFQ.ans) { // FALSE
      addEarned(20); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      setZoarBanner(true); setTimeout(() => setZoarBanner(false), 3200)
      speak('FALSE! Lot actually asked to go to Zoar instead of the mountains! He negotiated — even while running for his life!', 0.80, 1.0)
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 5000)
    } else {
      setTfqGrace(true); setTfqSel(null); playBuzzer()
      setTimeout(() => setTfqGrace(false), 2800)
    }
  }, [tfqSel, tfqGrace, addEarned, shake, getAffirm, speakAffirm, showAffirm, speak])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Sub('run'); setForwardTaps(0); forwardTapsRef.current = 0
    saltDoneRef.current = false; setSaltMoment(false); setSaltCrystals(false)
    setP3MCDone(false); setP3MCSel(null); setP3MCGrace(false)
    setP3YNSel(null); setP3YNGrace(false)
    speak('The family ran. Fire rained from heaven. Sodom and Gomorrah were destroyed. The angels warned them — do not look back!', 0.72, 0.86)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapForward = useCallback(() => {
    if (saltDoneRef.current || p3Sub !== 'run') return
    const current = forwardTapsRef.current
    if (current >= 10) return
    playFootstep()
    addEarned(5)
    burst(window.innerWidth * 0.55, window.innerHeight * 0.60, 16, 45)
    const next = current + 1
    forwardTapsRef.current = next
    setForwardTaps(next)
    if (next >= 10) {
      saltDoneRef.current = true
      setSaltMoment(true)
      playSaltCrystal()
      setTimeout(() => { setSaltCrystals(true) }, 2000)
      let qShown = false
      const showQ = () => { if (!qShown) { qShown = true; setP3Sub('questions') } }
      speak("But Lot's wife looked back... and she became a pillar of salt.", 0.60, 0.80, () => setTimeout(showQ, 1800))
      setTimeout(showQ, 14000)
    }
  }, [p3Sub, addEarned, burst, speak])

  const handleP3MC = useCallback((idx: number) => {
    if (p3MCSel !== null || p3MCGrace) return
    setP3MCSel(idx)
    if (idx === P3_MCQ.ans) {
      addEarned(25); playGoldPop(); shake()
      // Special: salt affirmation
      const af = AFFIRMATIONS[9]; speakAffirm(af); showAffirm(af)
      comboRef.current++
      speak("She looked back. One moment of longing for what was left behind — and she became a pillar of salt. Don't look back.", 0.74, 0.88)
      setTimeout(() => setP3MCDone(true), 2200)
    } else {
      setP3MCGrace(true); setP3MCSel(null); playBuzzer()
      setTimeout(() => setP3MCGrace(false), 2800)
    }
  }, [p3MCSel, p3MCGrace, addEarned, shake, speakAffirm, showAffirm, speak])

  const handleP3YN = useCallback((idx: number) => {
    if (p3YNSel !== null || p3YNGrace) return
    setP3YNSel(idx)
    if (idx === P3_YNQ.ans) {
      addEarned(20); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      burst(window.innerWidth * 0.5, window.innerHeight * 0.5, 50, 45)
      speak('Yes! Lot and his daughters made it to Zoar! They were safe — because God remembered Abraham.', 0.78, 0.92)
      setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 4500)
    } else {
      setP3YNGrace(true); setP3YNSel(null); playBuzzer()
      setTimeout(() => setP3YNGrace(false), 2800)
    }
  }, [p3YNSel, p3YNGrace, addEarned, shake, getAffirm, speakAffirm, showAffirm, burst, speak])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Sub('smoke'); setSmokeStep(0); setGoldDescend(false)
    setP4TFSel(null); setP4TFGrace(false); setP4MCSel(null); setP4MCGrace(false)
    setNeverForgetBanner(false)
    playSoftChime()
    speak('The sun rose. The battle was over. Abraham walked back to the place where he had stood before God — and looked out.', 0.68, 0.84)
  }, [phase, speak])

  // Smoke lines appear
  useEffect(() => {
    if (phase !== 'phase4' || p4Sub !== 'smoke') return
    const ts = [
      setTimeout(() => setSmokeStep(1), 2200),
      setTimeout(() => setSmokeStep(2), 4200),
      setTimeout(() => setSmokeStep(3), 6200),
      setTimeout(() => setSmokeStep(4), 8200),
      setTimeout(() => { setGoldDescend(true) }, 10500),
      setTimeout(() => { setP4Sub('questions') }, 14000),
    ]
    return () => ts.forEach(clearTimeout)
  }, [phase, p4Sub])

  const handleP4TF = useCallback((idx: number) => {
    if (p4TFSel !== null || p4TFGrace) return
    setP4TFSel(idx)
    if (idx === P4_TFQ.ans) { // FALSE
      addEarned(25); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      setNeverForgetBanner(true); setTimeout(() => setNeverForgetBanner(false), 3500)
      speak('FALSE! God REMEMBERED Abraham and rescued Lot! God never forgets His people!', 0.80, 1.02)
      setTimeout(() => setP4TFSel(prev => prev), 2200)
    } else {
      setP4TFGrace(true); setP4TFSel(null); playBuzzer()
      setTimeout(() => setP4TFGrace(false), 2800)
    }
  }, [p4TFSel, p4TFGrace, addEarned, shake, getAffirm, speakAffirm, showAffirm, speak])

  const handleP4MC = useCallback((idx: number) => {
    if (p4MCSel !== null || p4MCGrace) return
    setP4MCSel(idx)
    if (idx === P4_MCQ.ans) {
      addEarned(60); playWhiteBurstSound(); fireBurstWhite(); shake()
      const af = AFFIRMATIONS[8]; speakAffirm(af); showAffirm(af)
      comboRef.current++
      speak(`${playerName} — God remembered Abraham and He remembers YOU too! Mercy before judgment. Always.`, 0.74, 1.0)
      setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 6000)
    } else {
      setP4MCGrace(true); setP4MCSel(null); playBuzzer()
      setTimeout(() => setP4MCGrace(false), 2800)
    }
  }, [p4MCSel, p4MCGrace, addEarned, fireBurstWhite, shake, speakAffirm, showAffirm, speak, playerName])

  // ── ENDING ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ending') return
    playFanfare()
    const total = earnedRef.current; let cur = 0
    const step = Math.max(1, Math.ceil(total / 60))
    const id = setInterval(() => {
      cur = Math.min(cur + step, total); setCoinCount(cur)
      if (cur % (Math.ceil(total / 6)) === 0 || cur === total) playDing(0.8 + (cur / total) * 0.5)
      if (cur >= total) clearInterval(id)
    }, 28)
    const ts = [
      setTimeout(() => setStarsShown(1), 1400),
      setTimeout(() => setStarsShown(2), 2100),
      setTimeout(() => setStarsShown(3), 2800),
      setTimeout(() => {
        setShowScripture(true)
        speak('"So when God destroyed the cities of the plain, he remembered Abraham, and he brought Lot out." — Genesis 19 verse 29', 0.74, 0.88)
      }, 3600),
      setTimeout(() => setShowAdvance(true), 6500),
    ]
    return () => { clearInterval(id); ts.forEach(clearTimeout) }
  }, [phase, speak])

  // Cleanup
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    window.speechSynthesis?.cancel()
    if (wayTimerRef.current) clearInterval(wayTimerRef.current)
  }, [])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse='So when God destroyed the cities of the plain, he remembered Abraham, and he brought Lot out of the catastrophe.'
        verseRef='Genesis 19:29'
        subtitle={`${playerName} — you didn't look back`}
        voiceLine={`${playerName}. Lot made it out because God remembered Abraham. That's grace. That's mercy before judgment. And God remembers you too.`}
        onComplete={onComplete}
      />
    )
  }

  // Waypoint positions along a winding path
  const WAYPOINTS = [
    { x: 18, y: 68 }, { x: 30, y: 52 }, { x: 46, y: 60 },
    { x: 60, y: 44 }, { x: 72, y: 56 }, { x: 84, y: 38 },
  ]

  return (
    <div className={`l24-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l24-bg${cinStep >= 4 ? ' visible' : ''}`} />
      {cinStep < 4 && <div className="l24-black" />}
      {cinStep >= 4 && <div className="l24-bg-overlay" />}
      <canvas ref={canvasRef} className="l24-canvas" />
      {whiteBurst && <div className="l24-white-burst" />}
      {redFlash && <div className="l24-red-flash" />}

      {/* HUD */}
      {phase !== 'cinematic' && phase !== 'complete' && (
        <div className="l24-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && phase !== 'complete' && (
        <div className="l24-level-label">1-24 FIRE FROM HEAVEN</div>
      )}

      {/* Affirm toast */}
      {affirm && <div key={affKey} className="l24-affirm">{affirm}</div>}

      {/* Global banners */}
      {mobBanner && <div className="l24-mob-banner">🔴 THE MOB SURROUNDED LOT'S HOUSE!! 🔴</div>}
      {dragBanner && <div className="l24-drag-banner">🤝 THE ANGELS LITERALLY GRABBED HIS HAND!! 🤝</div>}
      {escBanner  && <div className="l24-esc-banner">⚡ LOT HAS ESCAPED THE CITY!! ⚡</div>}
      {zoarBanner && <div className="l24-zoar-banner">😂 LOT NEGOTIATED EVEN WHILE RUNNING!! 😂</div>}
      {neverForgetBanner && <div className="l24-nf-banner">✦ GOD NEVER FORGETS HIS PEOPLE!! ✦</div>}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l24-cin">
          <div className="l24-red-glow" />
          {cinStep >= 1 && <div className="l24-cin-line l24-cin-l1">Two angels. One city.</div>}
          {cinStep >= 2 && <div className="l24-cin-line l24-cin-l2">One chance to escape.</div>}
          {cinStep >= 3 && <div className="l24-cin-silence">— — —</div>}
          {cinStep >= 4 && <div className="l24-fire-rain" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="l24-fire-drop"
                style={{ left: `${5 + i * 8}%`, animationDelay: `${i * 0.12}s` }}>🔥</div>
            ))}
          </div>}
          {cinStep >= 4 && <div className="l24-cin-running-lot">🏃🏾 🏃🏾‍♀️ 🏃🏾‍♀️</div>}
          {cinStep >= 5 && (
            <div className="l24-title-card">
              <span className="l24-title-fire">🔥</span>
              <span className="l24-title-word">FIRE FROM HEAVEN</span>
              <span className="l24-title-fire">🔥</span>
            </div>
          )}
          {cinStep >= 6 && <div className="l24-title-sub">Don't look back.</div>}
        </div>
      )}

      {/* ── PHASE 1: Sodom's Gate ── */}
      {phase === 'phase1' && (
        <div className="l24-phase-wrap l24-gate-scene">
          <div className="l24-phase-header">
            <div className="l24-phase-badge">PHASE 1</div>
            <div className="l24-phase-title">SODOM'S GATE 🚪</div>
          </div>

          {p1Sub === 'questions' && (
            <div className="l24-q-card">
              <div className="l24-round-label">
                {P1_ROUNDS[p1Round].type === 'yn' ? 'YES OR NO?' : 'TRUE OR FALSE?'}
              </div>
              <p className="l24-q-text">{P1_ROUNDS[p1Round].q}</p>
              {P1_ROUNDS[p1Round].type === 'yn' && (
                <div className="l24-yn-row">
                  {P1_ROUNDS[p1Round].opts.map((o, i) => (
                    <button key={i} disabled={p1Sel !== null || p1Grace}
                      className={`l24-yn-btn${p1Sel === i ? (i === P1_ROUNDS[p1Round].ans ? ' correct' : ' wrong') : ''}`}
                      onClick={() => handleP1(i)}>{o}</button>
                  ))}
                </div>
              )}
              {P1_ROUNDS[p1Round].type === 'tf' && (
                <div className="l24-tf-row">
                  {P1_ROUNDS[p1Round].opts.map((o, i) => (
                    <button key={i} disabled={p1Sel !== null || p1Grace}
                      className={`l24-tf-tablet${p1Sel === i ? (i === P1_ROUNDS[p1Round].ans ? ' correct' : ' wrong') : ''}`}
                      onClick={() => handleP1(i)}>{o}</button>
                  ))}
                </div>
              )}
              {p1Grace && <div className="l24-grace">✨ Read the passage again — try once more!</div>}
            </div>
          )}

          {p1Sub === 'blind' && !blindDone && (
            <div className="l24-blind-scene">
              <div className="l24-mob-icons" aria-hidden>
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className={`l24-mob-figure${mobFrozen ? ' frozen' : ''}`}
                    style={{ animationDelay: `${i * 0.15}s` }}>👤</div>
                ))}
              </div>
              <button className="l24-angel-btn" onClick={tapAngel} disabled={blindDoneRef.current}>
                <span className="l24-angel-glow">✨</span>
                <span className="l24-angel-label">TAP THE ANGEL!</span>
                <span className="l24-angel-glow">✨</span>
              </button>
              <div className="l24-blind-hint">The mob is closing in — strike them blind!</div>
            </div>
          )}

          {p1Sub === 'blind' && blindDone && !p1MCDone && (
            <div className="l24-q-card">
              <div className="l24-blind-done-banner">⚡ THE ANGELS STRUCK THEM BLIND!! ⚡</div>
              <div className="l24-round-label">WHICH ONE?</div>
              <p className="l24-q-text">{P1_MC.q}</p>
              <div className="l24-mc-opts">
                {P1_MC.opts.map((o, i) => (
                  <button key={i} disabled={p1MCSel !== null || p1MCGrace}
                    className={`l24-mc-opt${p1MCSel === i ? (i === P1_MC.ans ? ' correct' : ' wrong') : ''}`}
                    onClick={() => handleP1MC(i)}>{o}</button>
                ))}
              </div>
              {p1MCGrace && <div className="l24-grace">✨ Think about what the angels used as their weapon — try again!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 2: Escape Countdown ── */}
      {phase === 'phase2' && (
        <div className="l24-phase-wrap l24-escape-scene">
          <div className="l24-phase-header">
            <div className="l24-phase-badge">PHASE 2</div>
            <div className="l24-phase-title">THE ESCAPE COUNTDOWN 🏃‍♂️⚡</div>
          </div>

          {/* Fire meter at top */}
          <div className="l24-fire-meter">
            <span className="l24-fm-label">🔥 FIRE APPROACHING</span>
            <div className="l24-fm-track">
              <div className="l24-fm-fill" style={{ width: `${Math.min(wayDone / WAYPOINT_COUNT * 100 + 5, 95)}%` }} />
            </div>
          </div>

          {p2Sub === 'escape' && (
            <>
              <div className={`l24-escape-warning${wayWarning ? ' flash' : ''}`}>
                {wayWarning ? '🙏 THE ANGELS ARE PULLING YOU! KEEP MOVING!' : '⚠️ FLEE! DON\'T LOOK BACK! DON\'T STOP!'}
              </div>
              <div className="l24-waypath">
                {WAYPOINTS.map((wp, i) => (
                  <div key={i}
                    className={`l24-waypoint${i < wayDone ? ' done' : i === wayDone ? ' active' : ''}`}
                    style={{ left: `${wp.x}%`, top: `${wp.y}%` }}>
                    {i < wayDone ? '✦' : i === wayDone ? '▶' : '◇'}
                  </div>
                ))}
                <div className="l24-lot-runner"
                  style={{
                    left: `${wayDone > 0 ? WAYPOINTS[Math.min(wayDone - 1, 5)].x : 8}%`,
                    top:  `${wayDone > 0 ? WAYPOINTS[Math.min(wayDone - 1, 5)].y : 72}%`,
                  }}>🏃🏾</div>
                <div className="l24-fire-chase" />
              </div>
              {wayDone < WAYPOINT_COUNT && (
                <button className="l24-tap-btn" onClick={tapWaypoint}>
                  TAP TO RUN! ({wayTimer}s) ➤
                </button>
              )}
              <div className="l24-way-progress">{wayDone} / {WAYPOINT_COUNT} waypoints</div>
            </>
          )}

          {p2Sub === 'midq' && (
            <div className="l24-q-card l24-midq">
              <div className="l24-round-label">MID-ESCAPE QUESTION — YES OR NO?</div>
              <p className="l24-q-text">{P2_MIDQ.q}</p>
              <div className="l24-yn-row">
                {P2_MIDQ.opts.map((o, i) => (
                  <button key={i} disabled={midqSel !== null || midqGrace}
                    className={`l24-yn-btn${midqSel === i ? (i === P2_MIDQ.ans ? ' correct' : ' wrong') : ''}`}
                    onClick={() => handleMidQ(i)}>{o}</button>
                ))}
              </div>
              {midqGrace && <div className="l24-grace">✨ Think about what it says about Lot's hesitation — try again!</div>}
            </div>
          )}

          {p2Sub === 'tfq' && (
            <div className="l24-q-card">
              <div className="l24-round-label">TRUE OR FALSE?</div>
              <p className="l24-q-text">{P2_TFQ.q}</p>
              <div className="l24-tf-row">
                {P2_TFQ.opts.map((o, i) => (
                  <button key={i} disabled={tfqSel !== null || tfqGrace}
                    className={`l24-tf-tablet${tfqSel === i ? (i === P2_TFQ.ans ? ' correct' : ' wrong') : ''}`}
                    onClick={() => handleTFQ(i)}>{o}</button>
                ))}
              </div>
              {tfqGrace && <div className="l24-grace">✨ Where did Lot actually end up going? — try again!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: Don't Look Back ── */}
      {phase === 'phase3' && (
        <div className="l24-phase-wrap l24-lookback-scene">
          <div className="l24-phase-header">
            <div className="l24-phase-badge">PHASE 3</div>
            <div className="l24-phase-title">DON'T LOOK BACK 👀🔥</div>
          </div>

          {p3Sub === 'run' && (
            <>
              <div className="l24-warning-pulse">⚠️ THE ANGELS SAID: DO NOT LOOK BACK ⚠️</div>
              <div className="l24-sodom-burning-fs" aria-hidden>
                {['🌋','🔥','🌆','🔥','🌋'].map((e, i) => <span key={i}>{e}</span>)}
              </div>
              <div className="l24-run-family-fs">
                {['🏃🏾', '🏃🏾‍♀️', '🏃🏾‍♀️', saltMoment ? '🧂' : '🏃🏾‍♀️'].map((icon, i) => (
                  <span key={i} className={`l24-runner${i === 3 && saltMoment ? ' turning' : ''}`}>{icon}</span>
                ))}
              </div>
              <div className="l24-mountain-fs">⛰️ ZOAR</div>
              {saltCrystals && (
                <div className="l24-salt-pillar-fs">
                  <div className="l24-salt-crystal">🧂</div>
                  <div className="l24-salt-label">Lot's wife</div>
                  <div className="l24-salt-verse">"But Lot's wife looked back... and she became a pillar of salt." — Genesis 19:26</div>
                </div>
              )}
              <div className="l24-run-spacer" />
              {!saltMoment && (
                <button className="l24-forward-btn l24-forward-fs-btn" onClick={tapForward}>
                  ▶ KEEP MOVING! ({forwardTaps}/10)
                </button>
              )}
              {saltMoment && !saltCrystals && (
                <div className="l24-slo-mo-text">...she turned...</div>
              )}
            </>
          )}

          {p3Sub === 'questions' && (
            <>
              {!p3MCDone ? (
                <div className="l24-q-card">
                  <div className="l24-salt-reminder">🧂 A pillar of salt.</div>
                  <div className="l24-round-label">WHICH ONE?</div>
                  <p className="l24-q-text">{P3_MCQ.q}</p>
                  <div className="l24-mc-opts">
                    {P3_MCQ.opts.map((o, i) => (
                      <button key={i} disabled={p3MCSel !== null || p3MCGrace}
                        className={`l24-mc-opt${p3MCSel === i ? (i === P3_MCQ.ans ? ' correct' : ' wrong') : ''}`}
                        onClick={() => handleP3MC(i)}>{o}</button>
                    ))}
                  </div>
                  {p3MCGrace && <div className="l24-grace">✨ The Bible is very clear about this — try again!</div>}
                </div>
              ) : (
                <div className="l24-q-card">
                  <div className="l24-zoar-glow">🏙️ ZOAR ✦</div>
                  <div className="l24-round-label">YES OR NO?</div>
                  <p className="l24-q-text">{P3_YNQ.q}</p>
                  <div className="l24-yn-row">
                    {P3_YNQ.opts.map((o, i) => (
                      <button key={i} disabled={p3YNSel !== null || p3YNGrace}
                        className={`l24-yn-btn${p3YNSel === i ? (i === P3_YNQ.ans ? ' correct' : ' wrong') : ''}`}
                        onClick={() => handleP3YN(i)}>{o}</button>
                    ))}
                  </div>
                  {p3YNGrace && <div className="l24-grace">✨ Check the end of the chapter — try again!</div>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── PHASE 4: God Remembered ── */}
      {phase === 'phase4' && (
        <div className="l24-phase-wrap l24-sunrise-scene">
          <div className="l24-phase-header">
            <div className="l24-phase-badge">PHASE 4</div>
            <div className="l24-phase-title">GOD REMEMBERED 🌅</div>
          </div>

          {p4Sub === 'smoke' && (
            <div className="l24-smoke-scene">
              <div className="l24-abr-silhouette">🧔🏾‍♂️</div>
              <div className="l24-smoke-column" />
              <div className="l24-smoke-lines">
                {SMOKE_LINES.slice(0, smokeStep).map((line, i) => (
                  <div key={i} className="l24-smoke-line">{line}</div>
                ))}
              </div>
              {goldDescend && (
                <div className="l24-gold-descend">
                  <div className="l24-gd-line1">BUT GOD REMEMBERED ABRAHAM —</div>
                  <div className="l24-gd-line2">AND BROUGHT LOT OUT OF THE CATASTROPHE.</div>
                  <div className="l24-gd-ref">— Genesis 19:29</div>
                </div>
              )}
            </div>
          )}

          {p4Sub === 'questions' && (
            <>
              {neverForgetBanner && <div className="l24-nf-banner-inline">✦ GOD NEVER FORGETS HIS PEOPLE!! ✦</div>}
              {p4TFSel === null || p4TFSel !== P4_TFQ.ans ? (
                <div className="l24-q-card">
                  <div className="l24-round-label">TRUE OR FALSE?</div>
                  <p className="l24-q-text">{P4_TFQ.q}</p>
                  <div className="l24-tf-row">
                    {P4_TFQ.opts.map((o, i) => (
                      <button key={i} disabled={p4TFSel !== null || p4TFGrace}
                        className={`l24-tf-tablet${p4TFSel === i ? (i === P4_TFQ.ans ? ' correct' : ' wrong') : ''}`}
                        onClick={() => handleP4TF(i)}>{o}</button>
                    ))}
                  </div>
                  {p4TFGrace && <div className="l24-grace">✨ What does Genesis 19:29 say about WHY Lot was saved? — try again!</div>}
                </div>
              ) : (
                <div className="l24-q-card l24-final-boss">
                  <div className="l24-round-label">⚡ LEGENDARY QUESTION — WHICH ONE? ⚡</div>
                  <p className="l24-q-text">{P4_MCQ.q}</p>
                  <div className="l24-mc-opts">
                    {P4_MCQ.opts.map((o, i) => (
                      <button key={i} disabled={p4MCSel !== null || p4MCGrace}
                        className={`l24-mc-opt${p4MCSel === i ? (i === P4_MCQ.ans ? ' correct' : ' wrong') : ''}`}
                        onClick={() => handleP4MC(i)}>{o}</button>
                    ))}
                  </div>
                  {p4MCGrace && <div className="l24-grace">✨ Think about what kind of God rescues people in judgment — try again!</div>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <div className="l24-ending-wrap">
          <div className="l24-ending-sunrise" />
          <div className="l24-ending-name">{playerName}</div>
          <div className="l24-ending-sub">YOU DIDN'T LOOK BACK!</div>
          <div className="l24-stars-row">
            {starsShown >= 1 && <div className="l24-end-star l24-st1">⭐</div>}
            {starsShown >= 2 && <div className="l24-end-star l24-st2">⭐</div>}
            {starsShown >= 3 && <div className="l24-end-star l24-st3">⭐</div>}
          </div>
          <div className="l24-coin-tally">
            <span className="l24-coin-icon">🪙</span>
            <span className="l24-coin-num">{coinCount}</span>
            <span className="l24-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l24-scripture-card">
              <div className="l24-scripture-fire">🌅</div>
              <div className="l24-scripture-quote">
                "So when God destroyed the cities of the plain, he remembered Abraham, and he brought Lot out of the catastrophe."
              </div>
              <div className="l24-scripture-ref">— Genesis 19:29</div>
            </div>
          )}
          {showAdvance && (
            <button className="l24-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-25 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
