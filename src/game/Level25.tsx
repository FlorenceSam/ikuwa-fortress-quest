import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level25.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'warning' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'cracks' | 'questions'
type P2Sub = 'wine' | 'questions'
type P3Sub = 'wake' | 'split' | 'tf'
type P4Sub = 'tree' | 'tf' | 'mc' | 'yn'
type RoundT = 'yn' | 'tf' | 'mc'
type Banner = 'gold' | 'warn' | 'comedic' | 'legendary'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'CAVE LIFE IS WILD!!',
  'DESPERATE TIMES — BUT GOD!!',
  'YOU SURVIVED THE CAVE!!',
  'NOTHING IS WASTED WITH GOD!!',
  'BEN-AMMI BOUND AND LEGEND FOUND!!',
  'YOU KEPT THE FAMILY ALIVE!!',
  'DESCENDANTS UNLOCKED!!',
  'RUTH WOULD BE PROUD!!',
  'EVEN DARK STORIES HAVE REDEMPTION!!',
  'YOU MADE HISTORY — AWKWARDLY!! 😂',
]

const CRACK_COUNT = 10
const CRACK_POS = [
  { x: 10, y: 22 }, { x: 85, y: 18 }, { x: 22, y: 60 }, { x: 75, y: 65 }, { x: 50, y: 15 },
  { x: 15, y: 80 }, { x: 88, y: 78 }, { x: 45, y: 86 }, { x: 62, y: 34 }, { x: 30, y: 42 },
]

const P1_ROUNDS: Round[] = [
  { type: 'yn', q: 'Did Lot and his daughters flee to the mountains after leaving Sodom?', opts: ['YES', 'NO'], ans: 0 },
  { type: 'tf', q: 'Lot\'s daughters believed they were the only people left on earth.', opts: ['TRUE', 'FALSE'], ans: 0 },
  { type: 'mc', q: 'Where did Lot and his daughters live after fleeing Sodom?', opts: ['In a cave in the mountains', 'In a house in Zoar', 'In a tent in the wilderness', 'They returned to Sodom'], ans: 0 },
  { type: 'tf', q: 'The daughters had many neighbors and friends nearby.', opts: ['TRUE', 'FALSE'], ans: 1 },
]
const P1_COINS = [15, 20, 20, 20]
const P1_BANNER: Record<number, [string, Banner]> = {
  1: ['THEY THOUGHT THEY WERE THE LAST HUMANS!!', 'warn'],
  3: ['TOTALLY ISOLATED!!', 'warn'],
}

const WINE_MAX_TAPS = 20

const P2_ROUNDS: Round[] = [
  { type: 'yn', q: 'Did the daughters get their father drunk?', opts: ['YES', 'NO'], ans: 0 },
  {
    type: 'mc',
    q: 'Why did the daughters get Lot drunk?',
    opts: [
      'To preserve their family line — they thought they were the last people on earth',
      'To steal his money',
      'To escape the cave',
      'To make him happy',
    ],
    ans: 0,
  },
]
const P2_COINS = [20, 20]

const P3_WAKE: Round = { type: 'yn', q: 'Did Lot remember what happened that night?', opts: ['YES', 'NO'], ans: 1 }
const P3_TF: Round = { type: 'tf', q: 'The daughters\' plan worked — they both had children.', opts: ['TRUE', 'FALSE'], ans: 0 }

const P4_TF: Round = { type: 'tf', q: 'God approved of what the daughters did in the cave.', opts: ['TRUE', 'FALSE'], ans: 1 }
const P4_MC: Round = {
  type: 'mc',
  q: 'What does this dark story teach us about God?',
  opts: [
    'God can bring redemption even from human failure — nothing is wasted',
    'God only works through perfect people',
    'God abandoned Lot\'s family',
    'The daughters were right because it worked out',
  ],
  ans: 0,
}
const P4_YN: Round = { type: 'yn', q: 'Did God later use a descendant of Lot\'s daughters in Jesus\' family line?', opts: ['YES', 'NO'], ans: 0 }

const TREE_LINE1 = ['Lot', 'Moab', '…', 'RUTH']
const TREE_LINE2 = ['Ruth', 'Boaz', 'Obed', 'Jesse', 'David', 'JESUS']

// ── Audio ─────────────────────────────────────────────────────────────────────
function playCaveRumble() {
  try {
    const c = new AudioContext()
    ;[42, 58, 70].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.2)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.2 + 1.2)
      g.gain.linearRampToValueAtTime(0.16, c.currentTime + i * 0.2 + 3.5)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.2 + 5.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.2); o.stop(c.currentTime + i * 0.2 + 6)
    })
  } catch (_) {}
}
function playRevealChime() {
  try {
    const c = new AudioContext()
    ;[261.6, 349.2, 440, 587.3].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.10)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.10 + 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.10 + 1.6)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.10); o.stop(c.currentTime + i * 0.10 + 1.8)
    })
  } catch (_) {}
}
function playCrackTap(i: number) {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.value = 440 + i * 28
    g.gain.setValueAtTime(0.20, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.45)
  } catch (_) {}
}
function playPressureRelease() {
  try {
    const c = new AudioContext()
    ;[220, 277, 330, 440, 554].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.07)
      g.gain.linearRampToValueAtTime(0.22, c.currentTime + i * 0.07 + 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.07 + 1.6)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.07); o.stop(c.currentTime + i * 0.07 + 1.8)
    })
  } catch (_) {}
}
function playWineGlug() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(260, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.14)
    g.gain.setValueAtTime(0.20, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.2)
  } catch (_) {}
}
function playDarkPulse() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(90, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(30, c.currentTime + 2.2)
    g.gain.setValueAtTime(0.5, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.6)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 2.8)
  } catch (_) {}
}
function playConfusedWobble() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(220, c.currentTime)
    for (let i = 0; i < 6; i++) {
      o.frequency.linearRampToValueAtTime(220 + (i % 2 === 0 ? 40 : -40), c.currentTime + 0.12 * (i + 1))
    }
    g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.0)
  } catch (_) {}
}
function playNationPop(pitchMult: number) {
  try {
    const c = new AudioContext()
    ;[330, 415, 523].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f * pitchMult
      g.gain.setValueAtTime(0, c.currentTime + i * 0.05)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.05 + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.05 + 0.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.05); o.stop(c.currentTime + i * 0.05 + 0.6)
    })
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

// ── Reusable question card ──────────────────────────────────────────────────
function RoundCard({ round, sel, grace, graceMsg, onPick, label, extraClass }: {
  round: Round; sel: number | null; grace: boolean; graceMsg: string; onPick: (i: number) => void
  label?: string; extraClass?: string
}) {
  return (
    <div className={`l25-q-card${extraClass ? ' ' + extraClass : ''}`}>
      <div className="l25-round-label">
        {label ?? (round.type === 'yn' ? 'YES OR NO?' : round.type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?')}
      </div>
      <p className="l25-q-text">{round.q}</p>
      {round.type === 'yn' && (
        <div className="l25-yn-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l25-yn-btn${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'tf' && (
        <div className="l25-tf-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l25-tf-tablet${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'mc' && (
        <div className="l25-mc-opts">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l25-mc-opt${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {grace && <div className="l25-grace">✨ {graceMsg}</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level25({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [affirm, setAffirm]         = useState<string | null>(null)
  const [affKey, setAffKey]         = useState(0)
  const [whiteBurst, setWhiteBurst] = useState(false)
  const [redFlash, setRedFlash]     = useState(false)
  const [goldBurst, setGoldBurst]   = useState(false)
  const [banner, setBannerText]     = useState<string | null>(null)
  const [bannerVariant, setBannerVariant] = useState<Banner>('gold')

  // Cinematic
  const [cinStep, setCinStep] = useState(0)

  // Phase 1
  const [p1Sub, setP1Sub]           = useState<P1Sub>('cracks')
  const [crackTapped, setCrackTapped] = useState<boolean[]>(Array(CRACK_COUNT).fill(false))
  const [crackDone, setCrackDone]   = useState(false)
  const [p1Round, setP1Round]       = useState(0)
  const [p1Sel, setP1Sel]           = useState<number | null>(null)
  const [p1Grace, setP1Grace]       = useState(false)

  // Phase 2
  const [p2Sub, setP2Sub]           = useState<P2Sub>('wine')
  const [wineTaps, setWineTaps]     = useState(0)
  const [wineDone, setWineDone]     = useState(false)
  const [p2Round, setP2Round]       = useState(0)
  const [p2Sel, setP2Sel]           = useState<number | null>(null)
  const [p2Grace, setP2Grace]       = useState(false)

  // Phase 3
  const [p3Sub, setP3Sub]           = useState<P3Sub>('wake')
  const [wakeSel, setWakeSel]       = useState<number | null>(null)
  const [wakeGrace, setWakeGrace]   = useState(false)
  const [splitLeftDone, setSplitLeftDone]   = useState(false)
  const [splitRightDone, setSplitRightDone] = useState(false)
  const [p3TfSel, setP3TfSel]       = useState<number | null>(null)
  const [p3TfGrace, setP3TfGrace]   = useState(false)

  // Phase 4
  const [p4Sub, setP4Sub]           = useState<P4Sub>('tree')
  const [treeStep, setTreeStep]     = useState(0)
  const [p4TfSel, setP4TfSel]       = useState<number | null>(null)
  const [p4TfGrace, setP4TfGrace]   = useState(false)
  const [p4McSel, setP4McSel]       = useState<number | null>(null)
  const [p4McGrace, setP4McGrace]   = useState(false)
  const [p4YnSel, setP4YnSel]       = useState<number | null>(null)
  const [p4YnGrace, setP4YnGrace]   = useState(false)

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
  const crackCountRef = useRef(0)
  const wineTapsRef  = useRef(0)
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
    setShakeClass('l25-shake'); setTimeout(() => setShakeClass(''), 700)
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
    else if (combo >= 6) pool = AFFIRMATIONS.slice(3, 6)
    else if (combo >= 3) pool = AFFIRMATIONS.slice(0, 3)
    else                 pool = AFFIRMATIONS.slice(0, 3)
    const t = pool[affIdxRef.current % pool.length]
    affIdxRef.current++; comboRef.current++
    return t
  }, [])

  // Only one utterance may ever be audible at a time: cancel, wait 300ms, then speak —
  // and if a newer call supersedes this one during that wait, this one is dropped silently.
  const speakRaw = useCallback((text: string, rate: number, pitch: number, onEnd?: () => void) => {
    const token = ++speechTokenRef.current
    try { window.speechSynthesis?.cancel() } catch (_) {}
    setTimeout(() => {
      if (speechTokenRef.current !== token) return
      try {
        window.speechSynthesis?.cancel()
        const fixed = text.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())
        const u = new SpeechSynthesisUtterance(fixed); u.rate = rate; u.pitch = pitch; u.volume = 1
        if (onEnd) u.onend = () => { if (speechTokenRef.current === token) onEnd() }
        window.speechSynthesis?.speak(u)
      } catch (_) { if (speechTokenRef.current === token) onEnd?.() }
    }, 300)
  }, [])

  const speak = useCallback((text: string, rate = 0.80, pitch = 1.0, onEnd?: () => void) => {
    speakRaw(text, rate, pitch, onEnd)
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
      setTimeout(() => burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 70, 42 + Math.random() * 16), i * 110)
  }, [burst])

  const fireLegendaryBurst = useCallback(() => {
    setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 2000)
    for (let i = 0; i < 16; i++)
      setTimeout(() => burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 85, 46 + Math.random() * 14), i * 110)
  }, [burst])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playCaveRumble()
    const ts = [
      setTimeout(() => setCinStep(1), 900),
      setTimeout(() => setCinStep(2), 2000),
      setTimeout(() => setCinStep(3), 3100),
      setTimeout(() => setCinStep(4), 4200),
      setTimeout(() => { setCinStep(5); playRevealChime() }, 5400),
      setTimeout(() => { setCinStep(6); shake() }, 6300),
      setTimeout(() => setCinStep(7), 7200),
      setTimeout(() => {
        phaseRef.current = 'phase1'; setPhase('phase1')
        speak('The fire was gone. But for Lot and his daughters, survival brought a new kind of fear.', 0.76, 0.90)
      }, 8600),
    ]
    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Sub('cracks'); setCrackTapped(Array(CRACK_COUNT).fill(false)); crackCountRef.current = 0
    setCrackDone(false); setP1Round(0); setP1Sel(null); setP1Grace(false)
  }, [phase])

  const tapCrack = useCallback((i: number) => {
    if (crackTapped[i] || crackCountRef.current >= CRACK_COUNT) return
    setCrackTapped(prev => { const next = [...prev]; next[i] = true; return next })
    playCrackTap(i); addEarned(5)
    burst((CRACK_POS[i].x / 100) * window.innerWidth, (CRACK_POS[i].y / 100) * window.innerHeight, 20, 45)
    const next = crackCountRef.current + 1
    crackCountRef.current = next
    if (next >= CRACK_COUNT) {
      setCrackDone(true)
      addEarned(20); playPressureRelease(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      showBanner('THE CAVE FEELS LESS SUFFOCATING.', 'gold', 3200)
      setTimeout(() => setP1Sub('questions'), 2200)
    }
  }, [crackTapped, addEarned, burst, getAffirm, speakAffirm, showAffirm, showBanner, shake])

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
          speak('What happened next is a hard part of the story. Get ready.', 0.78, 0.92)
          setTimeout(() => { phaseRef.current = 'warning'; setPhase('warning') }, 2600)
        }
      }, 2200)
    } else {
      setP1Grace(true); setP1Sel(null); playBuzzer()
      setTimeout(() => setP1Grace(false), 2800)
    }
  }, [p1Sel, p1Grace, p1Round, addEarned, shake, getAffirm, speakAffirm, showAffirm, showBanner, speak])

  // ── WARNING → PHASE 2 ────────────────────────────────────────────────────
  const handleWarningContinue = useCallback(() => {
    phaseRef.current = 'phase2'; setPhase('phase2')
  }, [])

  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Sub('wine'); setWineTaps(0); wineTapsRef.current = 0; setWineDone(false)
    setP2Round(0); setP2Sel(null); setP2Grace(false)
    speak('The daughters made a sinful decision — one the Bible records but never approves. What they did was wrong. But God\'s story doesn\'t end there.', 0.74, 0.88)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapJar = useCallback(() => {
    if (wineTapsRef.current >= WINE_MAX_TAPS || wineDone) return
    playWineGlug(); addEarned(3)
    burst(window.innerWidth * 0.5, window.innerHeight * 0.5, 10, 355)
    const next = wineTapsRef.current + 1
    wineTapsRef.current = next
    setWineTaps(next)
    if (next >= WINE_MAX_TAPS) {
      setWineDone(true); playDarkPulse(); shake()
      setRedFlash(true); setTimeout(() => setRedFlash(false), 900)
      speak('This was wrong. The Bible never calls this right, no matter the reason. Sin always has consequences. But grace is bigger.', 0.72, 0.84)
      setTimeout(() => setP2Sub('questions'), 5200)
    }
  }, [wineDone, addEarned, burst, shake])

  const handleP2 = useCallback((idx: number) => {
    if (p2Sel !== null || p2Grace) return
    setP2Sel(idx)
    const round = P2_ROUNDS[p2Round]
    if (idx === round.ans) {
      addEarned(P2_COINS[p2Round]); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      if (p2Round === 0) showBanner('DESPERATE — BUT WRONG!!', 'warn', 3000)
      setTimeout(() => {
        setP2Sel(null)
        if (p2Round < P2_ROUNDS.length - 1) {
          setP2Round(r => r + 1)
        } else {
          speak('Morning came. And what happened next would echo far beyond that cave.', 0.74, 0.88)
          setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 5200)
        }
      }, 2200)
    } else {
      setP2Grace(true); setP2Sel(null); playBuzzer()
      setTimeout(() => setP2Grace(false), 2800)
    }
  }, [p2Sel, p2Grace, p2Round, addEarned, shake, getAffirm, speakAffirm, showAffirm, showBanner, speak])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Sub('wake'); setWakeSel(null); setWakeGrace(false)
    setSplitLeftDone(false); setSplitRightDone(false)
    setP3TfSel(null); setP3TfGrace(false)
  }, [phase])

  const handleWake = useCallback((idx: number) => {
    if (wakeSel !== null || wakeGrace) return
    setWakeSel(idx)
    if (idx === P3_WAKE.ans) {
      addEarned(20); playConfusedWobble(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      showBanner('LOT HAD NO IDEA!! 😂', 'comedic', 3000)
      speak('Watch history unfold from one desperate night.', 0.78, 0.94)
      setTimeout(() => setP3Sub('split'), 3200)
    } else {
      setWakeGrace(true); setWakeSel(null); playBuzzer()
      setTimeout(() => setWakeGrace(false), 2800)
    }
  }, [wakeSel, wakeGrace, addEarned, shake, getAffirm, speakAffirm, showAffirm, showBanner, speak])

  const tapMoab = useCallback(() => {
    if (splitLeftDone) return
    setSplitLeftDone(true); addEarned(15); playNationPop(1.0); shake()
    burst(window.innerWidth * 0.25, window.innerHeight * 0.5, 40, 30)
    speak('Moab — father of the Moabites!', 0.84, 0.98)
  }, [splitLeftDone, addEarned, burst, shake, speak])

  const tapBenAmmi = useCallback(() => {
    if (splitRightDone) return
    setSplitRightDone(true); addEarned(15); playNationPop(1.3); shake()
    burst(window.innerWidth * 0.75, window.innerHeight * 0.5, 40, 200)
    speak('Ben-Ammi — father of the Ammonites!', 0.84, 0.98)
  }, [splitRightDone, addEarned, burst, shake, speak])

  useEffect(() => {
    if (phase !== 'phase3' || p3Sub !== 'split') return
    if (splitLeftDone && splitRightDone) {
      addEarned(40); playGoldExplosion(); fireGoldBurst(); shake()
      showBanner('TWO NATIONS WERE BORN FROM ONE CAVE!!', 'legendary', 3400)
      const af = AFFIRMATIONS[6]; speakAffirm(af); showAffirm(af); comboRef.current++
      setTimeout(() => setP3Sub('tf'), 3600)
    }
  }, [phase, p3Sub, splitLeftDone, splitRightDone, addEarned, fireGoldBurst, shake, showAffirm, showBanner])

  const handleP3TF = useCallback((idx: number) => {
    if (p3TfSel !== null || p3TfGrace) return
    setP3TfSel(idx)
    if (idx === P3_TF.ans) {
      addEarned(25); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      showBanner('MOAB AND AMMON — TWO GREAT NATIONS!!', 'gold', 3200)
      setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 4200)
    } else {
      setP3TfGrace(true); setP3TfSel(null); playBuzzer()
      setTimeout(() => setP3TfGrace(false), 2800)
    }
  }, [p3TfSel, p3TfGrace, addEarned, shake, getAffirm, speakAffirm, showAffirm, showBanner])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Sub('tree'); setTreeStep(0)
    setP4TfSel(null); setP4TfGrace(false); setP4McSel(null); setP4McGrace(false)
    setP4YnSel(null); setP4YnGrace(false)
    playSoftChime()
    speak('The sun was rising. And this dark story was not over yet — because God was still writing it.', 0.70, 0.86)
  }, [phase, speak])

  useEffect(() => {
    if (phase !== 'phase4' || p4Sub !== 'tree') return
    const ts = [
      setTimeout(() => setTreeStep(1), 2000),
      setTimeout(() => setTreeStep(2), 3600),
      setTimeout(() => setTreeStep(3), 5200),
      setTimeout(() => setTreeStep(4), 6800),
      setTimeout(() => setTreeStep(5), 8600),
      setTimeout(() => setTreeStep(6), 10600),
      setTimeout(() => setTreeStep(7), 12600),
      setTimeout(() => setP4Sub('tf'), 15600),
    ]
    return () => ts.forEach(clearTimeout)
  }, [phase, p4Sub])

  const handleP4TF = useCallback((idx: number) => {
    if (p4TfSel !== null || p4TfGrace) return
    setP4TfSel(idx)
    if (idx === P4_TF.ans) {
      addEarned(25); playGoldPop(); shake()
      const af = getAffirm(); speakAffirm(af); showAffirm(af)
      showBanner('GOD REDEEMS — HE DOESN\'T ALWAYS APPROVE!!', 'gold', 3400)
      setTimeout(() => setP4Sub('mc'), 3600)
    } else {
      setP4TfGrace(true); setP4TfSel(null); playBuzzer()
      setTimeout(() => setP4TfGrace(false), 2800)
    }
  }, [p4TfSel, p4TfGrace, addEarned, shake, getAffirm, speakAffirm, showAffirm, showBanner])

  const handleP4MC = useCallback((idx: number) => {
    if (p4McSel !== null || p4McGrace) return
    setP4McSel(idx)
    if (idx === P4_MC.ans) {
      addEarned(60); playWhiteBurstSound(); fireLegendaryBurst(); shake()
      const af = AFFIRMATIONS[8]; speakAffirm(af); showAffirm(af); comboRef.current++
      showBanner(`${playerName} — EVEN IN THE DARK, GOD IS WORKING!!`, 'legendary', 4200)
      speak(`${playerName} — even in the dark, God is working!`, 0.78, 1.0)
      setTimeout(() => setP4Sub('yn'), 4600)
    } else {
      setP4McGrace(true); setP4McSel(null); playBuzzer()
      setTimeout(() => setP4McGrace(false), 2800)
    }
  }, [p4McSel, p4McGrace, addEarned, fireLegendaryBurst, shake, showAffirm, showBanner, speak, playerName])

  const handleP4YN = useCallback((idx: number) => {
    if (p4YnSel !== null || p4YnGrace) return
    setP4YnSel(idx)
    if (idx === P4_YN.ans) {
      addEarned(20); playGoldPop(); shake()
      const af = AFFIRMATIONS[7]; speakAffirm(af); showAffirm(af); comboRef.current++
      showBanner('RUTH THE MOABITESS — IN JESUS\' LINEAGE!! ✝️', 'legendary', 3600)
      setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4200)
    } else {
      setP4YnGrace(true); setP4YnSel(null); playBuzzer()
      setTimeout(() => setP4YnGrace(false), 2800)
    }
  }, [p4YnSel, p4YnGrace, addEarned, shake, showAffirm, showBanner])

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
        speak('God brings beauty from ashes. Inspired by Genesis 19, verses 37 and 38, and Ruth chapter 4.', 0.74, 0.88)
      }, 3600),
      setTimeout(() => setShowAdvance(true), 6500),
    ]
    return () => { clearInterval(id); ts.forEach(clearTimeout) }
  }, [phase, speak])

  // Cleanup
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="God brings beauty from ashes."
        verseRef="Genesis 19:37-38 & Ruth 4:13-17"
        subtitle={`${playerName} — even in the dark, God is working`}
        voiceLine={`${playerName}. Even in the darkest cave, God was already writing a redemption story. Nothing is wasted with Him.`}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`l25-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l25-bg${cinStep >= 5 ? ' visible' : ''}`} />
      {cinStep < 5 && <div className="l25-black" />}
      {cinStep >= 5 && <div className="l25-bg-overlay" />}
      <canvas ref={canvasRef} className="l25-canvas" />
      {whiteBurst && <div className="l25-white-burst" />}
      {redFlash && <div className="l25-red-flash" />}
      {goldBurst && <div className="l25-gold-flash" />}

      {/* HUD */}
      {phase !== 'cinematic' && (
        <div className="l25-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && (
        <div className="l25-level-label">1-25 THE CAVE</div>
      )}

      {/* Affirm toast */}
      {affirm && <div key={affKey} className="l25-affirm">{affirm}</div>}

      {/* Global banner */}
      {banner && <div className={`l25-banner l25-banner-${bannerVariant}`}>{banner}</div>}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l25-cin">
          <div className="l25-amber-glow" />
          <div className="l25-cave-shapes" aria-hidden>
            <span className="l25-cave-fig">🧔🏾‍♂️</span>
            <span className="l25-cave-fig">🧕🏾</span>
            <span className="l25-cave-fig">🧕🏾</span>
          </div>
          <div className="l25-cin-fire" aria-hidden>🔥</div>
          {cinStep >= 1 && <div className="l25-cin-line">Sodom was gone.</div>}
          {cinStep >= 2 && <div className="l25-cin-line">Lot's wife was gone.</div>}
          {cinStep >= 3 && <div className="l25-cin-line">They were alone.</div>}
          {cinStep >= 4 && <div className="l25-cin-line l25-cin-fear">And they were afraid.</div>}
          {cinStep >= 6 && (
            <div className="l25-title-card">
              <span className="l25-title-mtn">🏔️</span>
              <span className="l25-title-word">THE CAVE</span>
              <span className="l25-title-mtn">🏔️</span>
            </div>
          )}
          {cinStep >= 7 && <div className="l25-title-sub">When desperation breeds nations.</div>}
        </div>
      )}

      {/* ── PHASE 1: Dwelling in the Cave ── */}
      {phase === 'phase1' && (
        <div className="l25-phase-wrap l25-cave-scene">
          <div className="l25-phase-header">
            <div className="l25-phase-badge">PHASE 1</div>
            <div className="l25-phase-title">DWELLING IN THE CAVE 🏔️</div>
          </div>

          {p1Sub === 'cracks' && (
            <div className="l25-crack-scene">
              <div className="l25-pressure-meter">
                <span className="l25-pm-label">CAVE PRESSURE</span>
                <div className="l25-pm-track">
                  <div className="l25-pm-fill" style={{ width: `${(crackTapped.filter(Boolean).length / CRACK_COUNT) * 100}%` }} />
                </div>
              </div>
              <div className="l25-crack-field">
                {CRACK_POS.map((p, i) => (
                  <button key={i} disabled={crackTapped[i]}
                    className={`l25-crack${crackTapped[i] ? ' tapped' : ''}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onClick={() => tapCrack(i)} aria-label="crack">
                    {crackTapped[i] ? '✨' : '⚡'}
                  </button>
                ))}
              </div>
              <div className="l25-crack-hint">Tap the glowing cracks to release the pressure!</div>
            </div>
          )}

          {p1Sub === 'questions' && (
            <RoundCard round={P1_ROUNDS[p1Round]} sel={p1Sel} grace={p1Grace}
              graceMsg="Read the passage again — try once more!" onPick={handleP1} />
          )}
        </div>
      )}

      {/* ── WARNING CARD ── */}
      {phase === 'warning' && (
        <div className="l25-warning-wrap">
          <div className="l25-warning-icon">⚠️</div>
          <div className="l25-warning-title">WHAT HAPPENS NEXT IS WRONG.</div>
          <p className="l25-warning-sub">
            The Bible records this story exactly as it happened — because truth matters. But
            getting someone drunk to take advantage of them is a sin, no matter the reason.
          </p>
          <p className="l25-warning-sub2">
            Watch how God brings redemption even from humanity's darkest moments.
          </p>
          <button className="l25-warning-btn" onClick={handleWarningContinue}>I UNDERSTAND — CONTINUE</button>
        </div>
      )}

      {/* ── PHASE 2: The Desperate Plan ── */}
      {phase === 'phase2' && (
        <div className="l25-phase-wrap l25-wine-scene">
          <div className="l25-phase-header">
            <div className="l25-phase-badge">PHASE 2</div>
            <div className="l25-phase-title">THE DESPERATE PLAN 🍷</div>
          </div>

          {p2Sub === 'wine' && (
            <div className="l25-wine-mechanic">
              <div className="l25-wine-fill-meter">
                <div className="l25-wf-track">
                  <div className="l25-wf-fill" style={{ height: `${(wineTaps / WINE_MAX_TAPS) * 100}%` }} />
                </div>
              </div>
              <button className="l25-jar-btn" onClick={tapJar} disabled={wineDone}>
                <span className="l25-jar-icon">🏺</span>
                <span className="l25-jar-label">TAP TO POUR ({wineTaps}/{WINE_MAX_TAPS})</span>
              </button>
              <div className="l25-cup-icon">🍷</div>
            </div>
          )}

          {p2Sub === 'questions' && (
            <RoundCard round={P2_ROUNDS[p2Round]} sel={p2Sel} grace={p2Grace}
              graceMsg="Read the passage again — try once more!" onPick={handleP2} />
          )}
        </div>
      )}

      {/* ── PHASE 3: The Awkward Morning ── */}
      {phase === 'phase3' && (
        <div className="l25-phase-wrap l25-morning-scene">
          <div className="l25-phase-header">
            <div className="l25-phase-badge">PHASE 3</div>
            <div className="l25-phase-title">THE AWKWARD MORNING 🌅</div>
          </div>

          {p3Sub === 'wake' && (
            <>
              <div className="l25-wake-scene">
                <div className="l25-lot-wake">🧔🏾‍♂️💫</div>
                <div className="l25-daughters-guilty">
                  <span>🧕🏾</span><span>🧕🏾</span>
                </div>
              </div>
              <RoundCard round={P3_WAKE} sel={wakeSel} grace={wakeGrace}
                graceMsg="Think about how much wine was involved — try again!" onPick={handleWake} />
            </>
          )}

          {p3Sub === 'split' && (
            <div className="l25-split-scene">
              <button className={`l25-split-half l25-split-left${splitLeftDone ? ' done' : ''}`}
                onClick={tapMoab} disabled={splitLeftDone}>
                <span className="l25-split-icon">🏜️</span>
                <span className="l25-split-name">MOAB</span>
                {splitLeftDone && <span className="l25-split-tag">FATHER OF MOABITES!!</span>}
              </button>
              <button className={`l25-split-half l25-split-right${splitRightDone ? ' done' : ''}`}
                onClick={tapBenAmmi} disabled={splitRightDone}>
                <span className="l25-split-icon">⛰️</span>
                <span className="l25-split-name">BEN-AMMI</span>
                {splitRightDone && <span className="l25-split-tag">FATHER OF AMMONITES!!</span>}
              </button>
            </div>
          )}

          {p3Sub === 'tf' && (
            <RoundCard round={P3_TF} sel={p3TfSel} grace={p3TfGrace}
              graceMsg="Both sons were named — think again!" onPick={handleP3TF} />
          )}
        </div>
      )}

      {/* ── PHASE 4: Redemption in the Darkness ── */}
      {phase === 'phase4' && (
        <div className="l25-phase-wrap l25-sunrise-scene">
          <div className="l25-phase-header">
            <div className="l25-phase-badge">PHASE 4</div>
            <div className="l25-phase-title">REDEMPTION IN THE DARKNESS 🌅</div>
          </div>

          {p4Sub === 'tree' && (
            <div className="l25-tree-scene">
              <div className="l25-tree-line">
                {TREE_LINE1.slice(0, treeStep >= 4 ? 4 : treeStep >= 1 ? treeStep : 0).map((n, i) => (
                  <span key={i} className={`l25-tree-node${n === 'RUTH' ? ' ruth' : ''}`}>
                    {i > 0 && <span className="l25-tree-arrow">→</span>}{n}
                  </span>
                ))}
              </div>
              {treeStep >= 5 && (
                <div className="l25-tree-line">
                  {TREE_LINE2.slice(0, treeStep >= 6 ? TREE_LINE2.length : 1).map((n, i) => (
                    <span key={i} className={`l25-tree-node${n === 'JESUS' ? ' jesus' : ''}`}>
                      {i > 0 && <span className="l25-tree-arrow">→</span>}{n}{n === 'JESUS' && ' ✝️'}
                    </span>
                  ))}
                </div>
              )}
              {treeStep >= 7 && (
                <div className="l25-tree-text">
                  <div className="l25-tree-t1">Moab → Ruth → Jesus.</div>
                  <div className="l25-tree-t2">Nothing is wasted with God.</div>
                </div>
              )}
            </div>
          )}

          {p4Sub === 'tf' && (
            <RoundCard round={P4_TF} sel={p4TfSel} grace={p4TfGrace}
              graceMsg="Think about the difference between approving and redeeming — try again!" onPick={handleP4TF} />
          )}

          {p4Sub === 'mc' && (
            <RoundCard round={P4_MC} sel={p4McSel} grace={p4McGrace} extraClass="l25-final-boss"
              label="⚡ LEGENDARY QUESTION — WHICH ONE? ⚡"
              graceMsg="Think about what kind of God rescues people from their own failures — try again!" onPick={handleP4MC} />
          )}

          {p4Sub === 'yn' && (
            <RoundCard round={P4_YN} sel={p4YnSel} grace={p4YnGrace}
              graceMsg="Think about the Book of Ruth — try again!" onPick={handleP4YN} />
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <div className="l25-ending-wrap">
          <div className="l25-ending-sunrise" />
          <div className="l25-ending-name">{playerName}</div>
          <div className="l25-ending-sub">EVEN IN THE DARK, GOD IS WORKING!</div>
          <div className="l25-stars-row">
            {starsShown >= 1 && <div className="l25-end-star l25-st1">⭐</div>}
            {starsShown >= 2 && <div className="l25-end-star l25-st2">⭐</div>}
            {starsShown >= 3 && <div className="l25-end-star l25-st3">⭐</div>}
          </div>
          <div className="l25-coin-tally">
            <span className="l25-coin-icon">🪙</span>
            <span className="l25-coin-num">{coinCount}</span>
            <span className="l25-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l25-scripture-card">
              <div className="l25-scripture-sun">🌅</div>
              <div className="l25-scripture-quote">"God brings beauty from ashes."</div>
              <div className="l25-scripture-ref">Inspired by Genesis 19:37-38 & Ruth 4:13-17</div>
            </div>
          )}
          {showAdvance && (
            <button className="l25-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-26 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
