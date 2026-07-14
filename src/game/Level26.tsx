import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level26.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'scroll' | 'questions'
type P2Sub = 'dream' | 'panic' | 'questions'
type P3Sub = 'sort' | 'questions'
type P4Sub = 'restore' | 'questions'
type RoundT = 'yn' | 'tf' | 'mc'
type Banner = 'gold' | 'warn' | 'comedic' | 'legendary'
type SortBox = 'what' | 'why'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'KING ABIMELEK HAD A DREAM!!',
  "SARAH'S BEAUTY — EVEN AT 90!! 😂",
  'YOU AVOIDED THE ROYAL DRAMA!!',
  "HALF-TRUTH ENERGY — DON'T RECOMMEND!! 😂",
  'GOD INTERVENED IN 4K!!',
  'DIVINE DREAM INTERVENTION!!',
  'ROYAL COURT SURVIVOR!!',
  'GOD PROTECTS HIS PROMISES!!',
  'YOU PRAYED FOR THE KING!!',
  'ABRAHAM ENERGY — REDEEMED!!',
]

const SCROLL_TIMER_START = 8

const P1_ROUNDS: Round[] = [
  { type: 'yn', q: 'Did Abraham tell Abimelek that Sarah was his sister?', opts: ['YES', 'NO'], ans: 0 },
  { type: 'tf', q: "Abraham's half-truth was completely honest.", opts: ['TRUE', 'FALSE'], ans: 1 },
]
const P1_COINS = [15, 20]
const P1_BANNER: Record<number, [string, Banner]> = {
  0: ['TECHNICALLY TRUE... BUT MISLEADING!! 😂', 'comedic'],
  1: ['ABRAHAM LEFT OUT THE WIFE PART!!', 'warn'],
}

const DREAM_CARDS = [
  { icon: '💀', text: 'You are a dead man!' },
  { icon: '👤', text: 'This woman is married!' },
  { icon: '🙏', text: 'Return her to her husband!' },
]

const P2_ROUNDS: Round[] = [
  {
    type: 'mc',
    q: 'How did God warn King Abimelek?',
    opts: ['Through a dream at night', 'Through an angel in the palace', 'Through a loud voice from heaven', 'Through a sign in the sky'],
    ans: 0,
  },
  { type: 'yn', q: 'Did Abimelek ignore the dream and keep Sarah?', opts: ['YES', 'NO'], ans: 1 },
  { type: 'tf', q: 'God speaks only to people who already follow Him.', opts: ['TRUE', 'FALSE'], ans: 1 },
]
const P2_COINS = [20, 20, 20]
const P2_BANNER: Record<number, [string, Banner]> = {
  1: ['THE KING WOKE UP TERRIFIED!! 😂', 'comedic'],
  2: ['GOD SPEAKS TO WHOEVER HE CHOOSES!!', 'gold'],
}

const SORT_CARDS: { text: string; box: SortBox }[] = [
  { text: 'I said she was my sister', box: 'what' },
  { text: 'I thought they would kill me', box: 'why' },
  { text: 'There is no fear of God here', box: 'why' },
  { text: 'She is technically my half-sister', box: 'what' },
]

const P3_ROUNDS: Round[] = [
  { type: 'yn', q: 'Did Abraham confess his fear to Abimelek?', opts: ['YES', 'NO'], ans: 0 },
  {
    type: 'mc',
    q: 'Why did Abraham say Sarah was his sister?',
    opts: ['He was afraid the king would kill him', 'He wanted to test the king', 'He was showing off', 'He forgot she was his wife'],
    ans: 0,
  },
]
const P3_COINS = [15, 20]
const P3_BANNER: Record<number, [string, Banner]> = {
  0: ['ABRAHAM SAID: I WAS AFRAID!!', 'gold'],
}

const RESTORE_ITEMS = [
  { icon: '🤍', label: 'Sarah returned' },
  { icon: '🐑', label: 'Sheep and oxen' },
  { icon: '💰', label: 'Gold and silver' },
  { icon: '✨', label: 'Household healed' },
]

const P4_YN: Round = { type: 'yn', q: 'Did Abraham pray for Abimelek after everything?', opts: ['YES', 'NO'], ans: 0 }
const P4_MC: Round = {
  type: 'mc',
  q: 'What does this story teach us about God?',
  opts: [
    'God protects His promises even when we make mistakes',
    'Abraham was a perfect example of faith',
    'God only works through perfect people',
    "The king was punished for Abraham's sin",
  ],
  ans: 0,
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function playCurtainSwish() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(180, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.5)
    g.gain.setValueAtTime(0.10, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.65)
  } catch (_) {}
}
function playTrumpetFanfare() {
  try {
    const c = new AudioContext()
    ;[261, 330, 392, 523, 659, 784, 1047, 1319].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'square'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.08)
      g.gain.linearRampToValueAtTime(0.10, c.currentTime + i * 0.08 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.9)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.08); o.stop(c.currentTime + i * 0.08 + 1.0)
    })
  } catch (_) {}
}
function playScrollWhoosh() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(500, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(1400, c.currentTime + 0.35)
    g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.45)
  } catch (_) {}
}
function playCardFlip() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.setValueAtTime(600, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.12)
    g.gain.setValueAtTime(0.20, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.16)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.18)
  } catch (_) {}
}
function playOminousTone() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(140, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(60, c.currentTime + 1.1)
    g.gain.setValueAtTime(0.35, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.3)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.4)
  } catch (_) {}
}
function playDreamChord() {
  try {
    const c = new AudioContext()
    ;[261.6, 329.6, 392.0, 493.9].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.05)
      g.gain.linearRampToValueAtTime(0.16, c.currentTime + i * 0.05 + 0.2)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.05 + 1.2)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.05); o.stop(c.currentTime + i * 0.05 + 1.4)
    })
  } catch (_) {}
}
function playResolutionChime() {
  try {
    const c = new AudioContext()
    ;[392, 523.3, 659.3].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.10)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.10 + 0.05)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.10 + 1.0)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.10); o.stop(c.currentTime + i * 0.10 + 1.1)
    })
  } catch (_) {}
}
function playSilverExplosion() {
  try {
    const c = new AudioContext()
    ;[440, 554, 659, 880, 1108, 1319].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.05)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.05 + 0.08)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.05 + 1.3)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.05); o.stop(c.currentTime + i * 0.05 + 1.5)
    })
  } catch (_) {}
}
function playClickLock() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'square'; o.frequency.setValueAtTime(440, c.currentTime)
    g.gain.setValueAtTime(0.14, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.14)
  } catch (_) {}
}
function playSoftBounce() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(220, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(160, c.currentTime + 0.2)
    g.gain.setValueAtTime(0.14, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.24)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.26)
  } catch (_) {}
}
function playRestoreGlow() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(392, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(784, c.currentTime + 0.3)
    g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.55)
  } catch (_) {}
}
function playCoinShower() {
  try {
    const c = new AudioContext()
    for (let i = 0; i < 8; i++) {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'triangle'; o.frequency.value = 700 + Math.random() * 500
      g.gain.setValueAtTime(0.14, c.currentTime + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 0.3)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.06); o.stop(c.currentTime + i * 0.06 + 0.35)
    }
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

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }
function mkBurst(cx: number, cy: number, cnt: number, hue = 45): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random() * Math.PI * 2; const s = Math.random() * 10 + 2
    return { x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, r: Math.random() * 3 + 1, life: 0, max: Math.random() * 70 + 50, hue }
  })
}

// ── Reusable question card ──────────────────────────────────────────────────
function RoundCard({ round, sel, grace, graceMsg, onPick, label, extraClass }: {
  round: Round; sel: number | null; grace: boolean; graceMsg: string; onPick: (i: number) => void
  label?: string; extraClass?: string
}) {
  return (
    <div className={`l26-q-card${extraClass ? ' ' + extraClass : ''}`}>
      <div className="l26-round-label">
        {label ?? (round.type === 'yn' ? 'YES OR NO?' : round.type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?')}
      </div>
      <p className="l26-q-text">{round.q}</p>
      {round.type === 'yn' && (
        <div className="l26-yn-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l26-yn-btn${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'tf' && (
        <div className="l26-tf-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l26-tf-tablet${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'mc' && (
        <div className="l26-mc-opts">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l26-mc-opt${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {grace && <div className="l26-grace">✨ {graceMsg}</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level26({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [affirm, setAffirm]         = useState<string | null>(null)
  const [affKey, setAffKey]         = useState(0)
  const [whiteBurst, setWhiteBurst] = useState(false)
  const [goldBurst, setGoldBurst]   = useState(false)
  const [banner, setBannerText]     = useState<string | null>(null)
  const [bannerVariant, setBannerVariant] = useState<Banner>('gold')

  // Cinematic
  const [cinStep, setCinStep] = useState(0)

  // Phase 1
  const [p1Ready, setP1Ready]       = useState(false)
  const [p1Sub, setP1Sub]           = useState<P1Sub>('scroll')
  const [scrollTimer, setScrollTimer] = useState(SCROLL_TIMER_START)
  const [scrollDone, setScrollDone] = useState(false)
  const [scrollPick, setScrollPick] = useState<'left' | 'right' | null>(null)
  const [p1Round, setP1Round]       = useState(0)
  const [p1Sel, setP1Sel]           = useState<number | null>(null)
  const [p1Grace, setP1Grace]       = useState(false)

  // Phase 2
  const [p2Ready, setP2Ready]       = useState(false)
  const [p2Sub, setP2Sub]           = useState<P2Sub>('dream')
  const [dreamFlipped, setDreamFlipped] = useState<boolean[]>([false, false, false])
  const [p2Round, setP2Round]       = useState(0)
  const [p2Sel, setP2Sel]           = useState<number | null>(null)
  const [p2Grace, setP2Grace]       = useState(false)

  // Phase 3
  const [p3Ready, setP3Ready]       = useState(false)
  const [p3Sub, setP3Sub]           = useState<P3Sub>('sort')
  const [sortAssigned, setSortAssigned] = useState<(SortBox | null)[]>([null, null, null, null])
  const [sortSelected, setSortSelected] = useState<number | null>(null)
  const [sortWrongIdx, setSortWrongIdx] = useState<number | null>(null)
  const [p3Round, setP3Round]       = useState(0)
  const [p3Sel, setP3Sel]           = useState<number | null>(null)
  const [p3Grace, setP3Grace]       = useState(false)

  // Phase 4
  const [p4Ready, setP4Ready]       = useState(false)
  const [p4Sub, setP4Sub]           = useState<P4Sub>('restore')
  const [restoreShown, setRestoreShown] = useState(0)
  const [restoreDone, setRestoreDone]   = useState<boolean[]>([false, false, false, false])
  const [p4YnSel, setP4YnSel]       = useState<number | null>(null)
  const [p4YnGrace, setP4YnGrace]   = useState(false)
  const [p4McSel, setP4McSel]       = useState<number | null>(null)
  const [p4McGrace, setP4McGrace]   = useState(false)
  const [p4QSub, setP4QSub]         = useState<'yn' | 'mc'>('yn')

  // Ending
  const [coinCount, setCoinCount]   = useState(0)
  const [starsShown, setStarsShown] = useState(0)
  const [showScripture, setShowScripture] = useState(false)
  const [showAdvance, setShowAdvance]     = useState(false)

  // Refs
  const earnedRef    = useRef(0)
  const affIdxRef    = useRef(0)
  const comboRef     = useRef(0)
  const phaseRef     = useRef<Phase>('cinematic')
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef(0)
  const particlesRef = useRef<Pt[]>([])
  const scrollDoneRef = useRef(false)
  const scrollTimerIntervalRef = useRef<number | null>(null)
  const dreamCountRef = useRef(0)
  const restoreCountRef = useRef(0)
  const speechTokenRef = useRef(0)

  // Canvas resize
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const r = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    r(); window.addEventListener('resize', r)
    return () => { window.removeEventListener('resize', r); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    setShakeClass('l26-shake'); setTimeout(() => setShakeClass(''), 700)
  }, [])

  const showAffirm = useCallback((t: string) => {
    setAffirm(t); setAffKey(k => k + 1); setTimeout(() => setAffirm(null), 2400)
  }, [])

  const showBanner = useCallback((text: string, variant: Banner = 'gold', ms = 3000) => {
    setBannerVariant(variant); setBannerText(text); setTimeout(() => setBannerText(null), ms)
  }, [])

  const getAffirm = useCallback(() => {
    const combo = comboRef.current
    let pool: string[]
    if (combo >= 10)     pool = [AFFIRMATIONS[9]]
    else if (combo >= 6) pool = AFFIRMATIONS.slice(4, 7)
    else if (combo >= 3) pool = AFFIRMATIONS.slice(1, 4)
    else                 pool = AFFIRMATIONS.slice(1, 4)
    const t = pool[affIdxRef.current % pool.length]
    affIdxRef.current++; comboRef.current++
    return t
  }, [])

  // Single-voice guard: cancel, wait 300ms, then speak — a newer call always supersedes an older
  // pending one so at most one utterance is ever audible. Narration rate is fixed at 1.0;
  // affirmations always speak at 0.85 so every word is clear.
  const speakRaw = useCallback((text: string, rate: number, pitch: number, onEnd?: () => void) => {
    const token = ++speechTokenRef.current
    try { window.speechSynthesis?.cancel() } catch (_) {}
    setTimeout(() => {
      if (speechTokenRef.current !== token) return
      try {
        window.speechSynthesis?.cancel()
        const fixed = text.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())
        const u = new SpeechSynthesisUtterance(fixed); u.rate = rate; u.pitch = pitch; u.volume = 1
        u.onend = () => { if (speechTokenRef.current === token) onEnd?.() }
        window.speechSynthesis?.speak(u)
      } catch (_) { if (speechTokenRef.current === token) onEnd?.() }
    }, 300)
  }, [])

  const speak = useCallback((text: string, pitch = 1.0, onEnd?: () => void) => {
    speakRaw(text, 1.0, pitch, onEnd)
  }, [speakRaw])

  const speakAffirm = useCallback((text: string) => {
    speakRaw(text, 0.85, 1.42)
  }, [speakRaw])

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

  const fireGoldBurst = useCallback(() => {
    setGoldBurst(true); setTimeout(() => setGoldBurst(false), 1400)
    for (let i = 0; i < 12; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 45 : 275
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 70, hue)
      }, i * 110)
  }, [burst])

  const fireLegendaryBurst = useCallback(() => {
    setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 2000)
    for (let i = 0; i < 16; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 272
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 85, hue)
      }, i * 110)
  }, [burst])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playCurtainSwish()
    const ts = [
      setTimeout(() => setCinStep(1), 900),
      setTimeout(() => setCinStep(2), 2000),
      setTimeout(() => setCinStep(3), 3100),
      setTimeout(() => { setCinStep(4); playTrumpetFanfare(); shake() }, 4600),
      setTimeout(() => setCinStep(5), 5600),
      setTimeout(() => setCinStep(6), 6500),
      setTimeout(() => { phaseRef.current = 'phase1'; setPhase('phase1') }, 8200),
    ]
    return () => ts.forEach(clearTimeout)
  }, [phase, shake])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Ready(false); setP1Sub('scroll'); setScrollTimer(SCROLL_TIMER_START)
    setScrollDone(false); scrollDoneRef.current = false; setScrollPick(null)
    setP1Round(0); setP1Sel(null); setP1Grace(false)
    speak('Abraham arrived in Gerar. He looked at Sarah — still beautiful — and he panicked. Fear took over.', 1.0, () => {
      speak('Fear can make even heroes of faith tell half-truths. But God always sees the whole truth.', 1.0, () => {
        setP1Ready(true)
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Scroll timer
  useEffect(() => {
    if (phase !== 'phase1' || p1Sub !== 'scroll' || !p1Ready || scrollDone) return
    scrollTimerIntervalRef.current = window.setInterval(() => {
      setScrollTimer(t => {
        if (t <= 1) {
          if (scrollTimerIntervalRef.current) clearInterval(scrollTimerIntervalRef.current)
          resolveScroll(false, true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (scrollTimerIntervalRef.current) clearInterval(scrollTimerIntervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, p1Sub, p1Ready, scrollDone])

  const resolveScroll = useCallback((correct: boolean, timedOut = false) => {
    if (scrollDoneRef.current) return
    scrollDoneRef.current = true
    setScrollDone(true)
    setScrollPick(correct ? 'left' : 'right')
    if (scrollTimerIntervalRef.current) { clearInterval(scrollTimerIntervalRef.current); scrollTimerIntervalRef.current = null }
    if (correct) {
      addEarned(25); playScrollWhoosh(); playGoldExplosion(); fireGoldBurst(); shake()
      showBanner('ABRAHAM CHOSE THE HALF-TRUTH!!', 'legendary', 3200)
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      setTimeout(() => setP1Sub('questions'), 3400)
    } else {
      addEarned(5); playScrollWhoosh(); playBuzzer()
      showBanner(timedOut ? "TIME'S UP! HERE'S WHAT HE ACTUALLY SAID." : "THAT'S WHAT HE SHOULD HAVE SAID!", 'warn', 3200)
      setTimeout(() => setP1Sub('questions'), 3400)
    }
  }, [addEarned, fireGoldBurst, shake, getAffirm, speakAffirm, showAffirm, showBanner])

  const tapScroll = useCallback((side: 'left' | 'right') => {
    resolveScroll(side === 'left')
  }, [resolveScroll])

  const handleP1 = useCallback((idx: number) => {
    if (p1Sel !== null || p1Grace) return
    setP1Sel(idx)
    const round = P1_ROUNDS[p1Round]
    if (idx === round.ans) {
      addEarned(P1_COINS[p1Round]); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      const b = P1_BANNER[p1Round]
      if (b) showBanner(b[0], b[1], 3000)
      setTimeout(() => {
        setP1Sel(null)
        if (p1Round < P1_ROUNDS.length - 1) {
          setP1Round(r => r + 1)
        } else {
          setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 400)
        }
      }, b ? 3100 : 2200)
    } else {
      setP1Grace(true); setP1Sel(null); playBuzzer()
      setTimeout(() => setP1Grace(false), 2800)
    }
  }, [p1Sel, p1Grace, p1Round, addEarned, shake, getAffirm, speakAffirm, showAffirm, showBanner])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Ready(false); setP2Sub('dream'); setDreamFlipped([false, false, false]); dreamCountRef.current = 0
    setP2Round(0); setP2Sel(null); setP2Grace(false)
    speak('That night something extraordinary happened. God spoke directly to the king in a dream. Abimelek woke up terrified.', 1.0, () => {
      setP2Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapDreamCard = useCallback((i: number) => {
    if (dreamFlipped[i]) return
    setDreamFlipped(prev => { const next = [...prev]; next[i] = true; return next })
    playCardFlip()
    setTimeout(() => { i === 0 ? playOminousTone() : i === 1 ? playDreamChord() : playResolutionChime() }, 150)
    addEarned(10)
    const next = dreamCountRef.current + 1
    dreamCountRef.current = next
    if (next >= DREAM_CARDS.length) {
      setTimeout(() => {
        addEarned(15); playSilverExplosion(); fireGoldBurst(); shake()
        showBanner('THE DREAM IS FULLY REVEALED!!', 'legendary', 3000)
        const af = AFFIRMATIONS[0]; speakAffirm(af); showAffirm(af); comboRef.current++
        setTimeout(() => setP2Sub('panic'), 3200)
      }, 700)
    }
  }, [dreamFlipped, addEarned, fireGoldBurst, shake, showAffirm, showBanner])

  useEffect(() => {
    if (phase !== 'phase2' || p2Sub !== 'panic') return
    const t = setTimeout(() => setP2Sub('questions'), 2600)
    return () => clearTimeout(t)
  }, [phase, p2Sub])

  const handleP2 = useCallback((idx: number) => {
    if (p2Sel !== null || p2Grace) return
    setP2Sel(idx)
    const round = P2_ROUNDS[p2Round]
    if (idx === round.ans) {
      addEarned(P2_COINS[p2Round]); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      const b = P2_BANNER[p2Round]
      if (b) showBanner(b[0], b[1], 3000)
      setTimeout(() => {
        setP2Sel(null)
        if (p2Round < P2_ROUNDS.length - 1) {
          setP2Round(r => r + 1)
        } else {
          setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 400)
        }
      }, b ? 3100 : 2200)
    } else {
      setP2Grace(true); setP2Sel(null); playBuzzer()
      setTimeout(() => setP2Grace(false), 2800)
    }
  }, [p2Sel, p2Grace, p2Round, addEarned, shake, getAffirm, speakAffirm, showAffirm, showBanner])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Ready(false); setP3Sub('sort'); setSortAssigned([null, null, null, null])
    setSortSelected(null); setSortWrongIdx(null)
    setP3Round(0); setP3Sel(null); setP3Grace(false)
    speak('The next morning Abimelek confronted Abraham. Words were exchanged. Truths came out. Abraham had to explain his fear.', 1.0, () => {
      setP3Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapSortCard = useCallback((i: number) => {
    if (sortAssigned[i]) return
    setSortSelected(prev => prev === i ? null : i)
  }, [sortAssigned])

  const tapSortBox = useCallback((box: SortBox) => {
    if (sortSelected === null) return
    const card = SORT_CARDS[sortSelected]
    if (card.box === box) {
      playClickLock(); addEarned(8)
      const idx = sortSelected
      setSortAssigned(prev => { const next = [...prev]; next[idx] = box; return next })
      setSortSelected(null)
    } else {
      playSoftBounce()
      const idx = sortSelected
      setSortWrongIdx(idx); setTimeout(() => setSortWrongIdx(null), 500)
      setSortSelected(null)
    }
  }, [sortSelected, addEarned])

  useEffect(() => {
    if (phase !== 'phase3' || p3Sub !== 'sort') return
    if (sortAssigned.every(Boolean)) {
      addEarned(15); playGoldExplosion(); fireGoldBurst(); shake()
      showBanner('ABRAHAM CONFESSED HIS FEAR!!', 'legendary', 3200)
      const af = AFFIRMATIONS[2]; speakAffirm(af); showAffirm(af); comboRef.current++
      setTimeout(() => setP3Sub('questions'), 3400)
    }
  }, [phase, p3Sub, sortAssigned, addEarned, fireGoldBurst, shake, showAffirm, showBanner])

  const handleP3 = useCallback((idx: number) => {
    if (p3Sel !== null || p3Grace) return
    setP3Sel(idx)
    const round = P3_ROUNDS[p3Round]
    if (idx === round.ans) {
      addEarned(P3_COINS[p3Round]); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      const b = P3_BANNER[p3Round]
      if (b) showBanner(b[0], b[1], 3000)
      setTimeout(() => {
        setP3Sel(null)
        if (p3Round < P3_ROUNDS.length - 1) {
          setP3Round(r => r + 1)
        } else {
          setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 400)
        }
      }, b ? 3100 : 2200)
    } else {
      setP3Grace(true); setP3Sel(null); playBuzzer()
      setTimeout(() => setP3Grace(false), 2800)
    }
  }, [p3Sel, p3Grace, p3Round, addEarned, shake, getAffirm, speakAffirm, showAffirm, showBanner])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Ready(false); setP4Sub('restore'); setRestoreShown(0)
    setRestoreDone([false, false, false, false]); restoreCountRef.current = 0
    setP4YnSel(null); setP4YnGrace(false); setP4McSel(null); setP4McGrace(false); setP4QSub('yn')
    speak("God acknowledged Abimelek's integrity. Sarah was returned. Gifts were given. And then Abraham did something remarkable — he prayed for the king.", 1.0, () => {
      setP4Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Stagger restoration items appearing
  useEffect(() => {
    if (phase !== 'phase4' || p4Sub !== 'restore' || !p4Ready) return
    const ts = RESTORE_ITEMS.map((_, i) => setTimeout(() => setRestoreShown(s => Math.max(s, i + 1)), i * 700))
    return () => ts.forEach(clearTimeout)
  }, [phase, p4Sub, p4Ready])

  const tapRestore = useCallback((i: number) => {
    if (i >= restoreShown || restoreDone[i]) return
    setRestoreDone(prev => { const next = [...prev]; next[i] = true; return next })
    playRestoreGlow()
    if (i === 2) playCoinShower()
    addEarned(10)
    const next = restoreCountRef.current + 1
    restoreCountRef.current = next
    if (next >= RESTORE_ITEMS.length) {
      setTimeout(() => {
        addEarned(20); playGoldExplosion(); fireLegendaryBurst(); shake()
        showBanner('RESTORATION COMPLETE!!', 'legendary', 3200)
        const af = AFFIRMATIONS[7]; speakAffirm(af); showAffirm(af); comboRef.current++
        setTimeout(() => setP4Sub('questions'), 3400)
      }, 500)
    }
  }, [restoreShown, restoreDone, addEarned, fireLegendaryBurst, shake, showAffirm, showBanner])

  const handleP4Yn = useCallback((idx: number) => {
    if (p4YnSel !== null || p4YnGrace) return
    setP4YnSel(idx)
    if (idx === P4_YN.ans) {
      addEarned(20); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      showBanner("ABRAHAM PRAYED FOR THE KING!! ✝️👑", 'legendary', 3200)
      setTimeout(() => setP4QSub('mc'), 3400)
    } else {
      setP4YnGrace(true); setP4YnSel(null); playBuzzer()
      setTimeout(() => setP4YnGrace(false), 2800)
    }
  }, [p4YnSel, p4YnGrace, addEarned, shake, getAffirm, speakAffirm, showAffirm, showBanner])

  const handleP4Mc = useCallback((idx: number) => {
    if (p4McSel !== null || p4McGrace) return
    setP4McSel(idx)
    if (idx === P4_MC.ans) {
      addEarned(60); playWhiteBurstSound(); fireLegendaryBurst(); shake()
      const af = AFFIRMATIONS[7]; speakAffirm(af); showAffirm(af); comboRef.current++
      showBanner(`${playerName} — GOD PROTECTS HIS PROMISES!!`, 'legendary', 4200)
      setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4600)
    } else {
      setP4McGrace(true); setP4McSel(null); playBuzzer()
      setTimeout(() => setP4McGrace(false), 2800)
    }
  }, [p4McSel, p4McGrace, addEarned, fireLegendaryBurst, shake, showAffirm, showBanner, playerName])

  // ── ENDING ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ending') return
    playFanfare(); playTrumpetFanfare()
    const total = earnedRef.current; let cur = 0
    const step = Math.max(1, Math.ceil(total / 60))
    const id = setInterval(() => {
      cur = Math.min(cur + step, total); setCoinCount(cur)
      if (cur % (Math.ceil(total / 6)) === 0 || cur === total) playDing(0.8 + (cur / total) * 0.5)
      if (cur >= total) clearInterval(id)
    }, 28)
    for (let i = 0; i < 10; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 272
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.7, 40, hue)
      }, i * 180)
    const ts = [
      setTimeout(() => setStarsShown(1), 1400),
      setTimeout(() => setStarsShown(2), 2100),
      setTimeout(() => setStarsShown(3), 2800),
      setTimeout(() => {
        setShowScripture(true)
        speak('So Abraham prayed to God, and God healed Abimelek, his wife and his female servants. Genesis chapter 20, verse 17.', 1.0)
      }, 3600),
      setTimeout(() => setShowAdvance(true), 6500),
    ]
    return () => { clearInterval(id); ts.forEach(clearTimeout) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Cleanup
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="So Abraham prayed to God, and God healed Abimelek, his wife and his female servants."
        verseRef="Genesis 20:17"
        subtitle={`${playerName} — God protects His promises`}
        voiceLine={`${playerName}. Even when Abraham let fear speak, God protected His promise. God protects you too.`}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`l26-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l26-bg${cinStep >= 4 ? ' visible' : ''}`} />
      {cinStep < 4 && <div className="l26-black" />}
      {cinStep >= 4 && <div className="l26-bg-overlay" />}
      <canvas ref={canvasRef} className="l26-canvas" />
      {whiteBurst && <div className="l26-white-burst" />}
      {goldBurst && <div className="l26-gold-flash" />}

      {/* HUD */}
      {phase !== 'cinematic' && (
        <div className="l26-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && (
        <div className="l26-level-label">1-26 ROYAL DECEPTION</div>
      )}

      {/* Affirm toast */}
      {affirm && <div key={affKey} className="l26-affirm">{affirm}</div>}

      {/* Global banner */}
      {banner && <div className={`l26-banner l26-banner-${bannerVariant}`}>{banner}</div>}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l26-cin">
          <div className="l26-royal-glow" />
          <div className="l26-stars" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} className="l26-star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 70}%`, animationDelay: `${i * 0.2}s` }}>✦</span>
            ))}
          </div>
          {cinStep >= 1 && <div className="l26-curtain l26-curtain-left" />}
          {cinStep >= 1 && <div className="l26-curtain l26-curtain-right" />}
          <div className="l26-palace" aria-hidden>🏰</div>
          {cinStep >= 2 && <div className="l26-cin-line">Abraham journeyed to Gerar.</div>}
          {cinStep >= 3 && <div className="l26-cin-line">Fear made him tell a half-truth…</div>}
          {cinStep >= 3 && <div className="l26-cin-line l26-cin-quote">"She is my sister."</div>}
          {cinStep >= 5 && (
            <div className="l26-title-card">
              <span className="l26-title-crown">👑</span>
              <span className="l26-title-word">ROYAL DECEPTION</span>
              <span className="l26-title-crown">👑</span>
            </div>
          )}
          {cinStep >= 6 && <div className="l26-title-sub">The King's Dream.</div>}
        </div>
      )}

      {/* ── PHASE 1: The Royal Court ── */}
      {phase === 'phase1' && (
        <div className="l26-phase-wrap l26-court-scene">
          <div className="l26-phase-header">
            <div className="l26-phase-badge">PHASE 1</div>
            <div className="l26-phase-title">THE ROYAL COURT 👑</div>
          </div>

          {p1Sub === 'scroll' && p1Ready && (
            <div className="l26-scroll-scene">
              <div className="l26-scroll-instruction">What did Abraham tell King Abimelek?</div>
              {!scrollDone && (
                <div className={`l26-scroll-timer${scrollTimer <= 3 ? ' danger' : scrollTimer <= 5 ? ' warn' : ''}`}>
                  ⏱️ {scrollTimer}s
                </div>
              )}
              <div className="l26-scroll-row">
                <button className={`l26-scroll l26-scroll-gold${scrollPick === 'left' ? ' picked' : ''}`}
                  disabled={scrollDone} onClick={() => tapScroll('left')}>
                  <span className="l26-scroll-icon">📜</span>
                  <span className="l26-scroll-text">"She is my sister."</span>
                </button>
                <button className={`l26-scroll l26-scroll-silver${scrollPick === 'right' ? ' picked' : ''}`}
                  disabled={scrollDone} onClick={() => tapScroll('right')}>
                  <span className="l26-scroll-icon">📜</span>
                  <span className="l26-scroll-text">"She is my wife."</span>
                </button>
              </div>
              {scrollDone && (
                <div className="l26-king-receive">
                  <span className="l26-king-icon">🤴</span>
                  <span className="l26-king-bow">bows to receive the scroll</span>
                </div>
              )}
            </div>
          )}

          {p1Sub === 'questions' && (
            <RoundCard round={P1_ROUNDS[p1Round]} sel={p1Sel} grace={p1Grace}
              graceMsg="Read the passage again — try once more!" onPick={handleP1} />
          )}
        </div>
      )}

      {/* ── PHASE 2: The King's Dream ── */}
      {phase === 'phase2' && (
        <div className="l26-phase-wrap l26-dream-scene">
          <div className="l26-phase-header">
            <div className="l26-phase-badge">PHASE 2</div>
            <div className="l26-phase-title">THE KING'S DREAM 💤🌙</div>
          </div>

          {p2Sub === 'dream' && p2Ready && (
            <div className="l26-dream-mechanic">
              <div className="l26-dream-king">👤💤</div>
              <div className="l26-dream-cloud">☁️</div>
              <div className="l26-dream-cards">
                {DREAM_CARDS.map((card, i) => (
                  <button key={i} disabled={dreamFlipped[i]}
                    className={`l26-dream-card${dreamFlipped[i] ? ' flipped' : ''}`}
                    onClick={() => tapDreamCard(i)}>
                    {dreamFlipped[i]
                      ? <><span className="l26-dream-icon">{card.icon}</span><span className="l26-dream-text">{card.text}</span></>
                      : <span className="l26-dream-back">?</span>}
                  </button>
                ))}
              </div>
              <div className="l26-dream-hint">Tap each card to reveal the dream</div>
            </div>
          )}

          {p2Sub === 'panic' && (
            <div className="l26-panic-scene">
              <div className="l26-panic-king">🤴💦</div>
              <div className="l26-panic-bubble">WHAT DID I DO?!</div>
            </div>
          )}

          {p2Sub === 'questions' && (
            <RoundCard round={P2_ROUNDS[p2Round]} sel={p2Sel} grace={p2Grace}
              graceMsg="Read the passage again — try once more!" onPick={handleP2} />
          )}
        </div>
      )}

      {/* ── PHASE 3: The Confrontation ── */}
      {phase === 'phase3' && (
        <div className="l26-phase-wrap l26-confront-scene">
          <div className="l26-phase-header">
            <div className="l26-phase-badge">PHASE 3</div>
            <div className="l26-phase-title">THE CONFRONTATION ⚔️</div>
          </div>

          {p3Sub === 'sort' && p3Ready && (
            <div className="l26-sort-scene">
              <div className="l26-sort-boxes">
                <button className="l26-sort-box l26-sort-box-what" onClick={() => tapSortBox('what')}>
                  <span className="l26-sort-box-icon">🔴</span>
                  <span className="l26-sort-box-label">WHAT ABRAHAM DID</span>
                </button>
                <button className="l26-sort-box l26-sort-box-why" onClick={() => tapSortBox('why')}>
                  <span className="l26-sort-box-icon">🟡</span>
                  <span className="l26-sort-box-label">WHY HE DID IT</span>
                </button>
              </div>
              <div className="l26-sort-cards">
                {SORT_CARDS.map((card, i) => (
                  !sortAssigned[i] && (
                    <button key={i}
                      className={`l26-sort-card${sortSelected === i ? ' selected' : ''}${sortWrongIdx === i ? ' wrong-bounce' : ''}`}
                      onClick={() => tapSortCard(i)}>{card.text}</button>
                  )
                ))}
              </div>
              <div className="l26-sort-hint">Tap a card, then tap the box it belongs in</div>
            </div>
          )}

          {p3Sub === 'questions' && (
            <RoundCard round={P3_ROUNDS[p3Round]} sel={p3Sel} grace={p3Grace}
              graceMsg="Read the passage again — try once more!" onPick={handleP3} />
          )}
        </div>
      )}

      {/* ── PHASE 4: Restoration and Prayer ── */}
      {phase === 'phase4' && (
        <div className="l26-phase-wrap l26-restore-scene">
          <div className="l26-phase-header">
            <div className="l26-phase-badge">PHASE 4</div>
            <div className="l26-phase-title">RESTORATION AND PRAYER 🌅</div>
          </div>

          {p4Sub === 'restore' && p4Ready && (
            <div className="l26-restore-mechanic">
              {RESTORE_ITEMS.map((item, i) => (
                i < restoreShown && (
                  <button key={i} disabled={restoreDone[i]}
                    className={`l26-restore-item${restoreDone[i] ? ' done' : ''}`}
                    onClick={() => tapRestore(i)}>
                    <span className="l26-restore-icon">{item.icon}</span>
                    <span className="l26-restore-label">{item.label}</span>
                  </button>
                )
              ))}
            </div>
          )}

          {p4Sub === 'questions' && p4QSub === 'yn' && (
            <RoundCard round={P4_YN} sel={p4YnSel} grace={p4YnGrace}
              graceMsg="Think about how Abraham responded to God's mercy — try again!" onPick={handleP4Yn} />
          )}

          {p4Sub === 'questions' && p4QSub === 'mc' && (
            <RoundCard round={P4_MC} sel={p4McSel} grace={p4McGrace} extraClass="l26-final-boss"
              label="⚡ LEGENDARY QUESTION — WHICH ONE? ⚡"
              graceMsg="Think about how God treated Abraham despite his fear — try again!" onPick={handleP4Mc} />
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <div className="l26-ending-wrap">
          <div className="l26-ending-royal" />
          <div className="l26-ending-name">{playerName}</div>
          <div className="l26-ending-sub">GOD PROTECTS HIS PROMISES!</div>
          <div className="l26-stars-row">
            {starsShown >= 1 && <div className="l26-end-star l26-st1">⭐</div>}
            {starsShown >= 2 && <div className="l26-end-star l26-st2">⭐</div>}
            {starsShown >= 3 && <div className="l26-end-star l26-st3">⭐</div>}
          </div>
          <div className="l26-coin-tally">
            <span className="l26-coin-icon">🪙</span>
            <span className="l26-coin-num">{coinCount}</span>
            <span className="l26-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l26-scripture-card">
              <div className="l26-scripture-crown">👑</div>
              <div className="l26-scripture-quote">
                "So Abraham prayed to God, and God healed Abimelek, his wife and his female servants."
              </div>
              <div className="l26-scripture-ref">— Genesis 20:17</div>
            </div>
          )}
          {showAdvance && (
            <button className="l26-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-27 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
