import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level31.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'timed' | 'tf' | 'mc' | 'yn'
type P2Sub = 'match' | 'yn' | 'mc' | 'tf'
type P3Sub = 'weigh' | 'mc' | 'timed'
type P4Sub = 'candles' | 'genealogy' | 'boss'
type RoundT = 'yn' | 'tf' | 'mc'
type Banner = 'gold' | 'warn' | 'comedic' | 'legendary' | 'emotional'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }
interface Bubble { text: string; correct: boolean }
interface MPair { left: string; right: string }
interface Pos { top: number; left: number }

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'You honoured her memory well!!',
  "Your heart is as faithful as Abraham's!!",
  'You know that love outlasts loss!!',
  'Even in grief — you kept going!!',
  'You buried that answer with dignity!!',
  '127 years well lived — and you remembered!!',
  'Your wisdom honours the faithful!!',
  "You stood with Abraham in his grief!!",
  'Grief and faith can coexist — and you knew that!!',
  'Sarah would be proud of you right now!!',
]

const ROUND1_POS: Pos[] = [
  { top: 8,  left: 18 }, { top: 6,  left: 68 }, { top: 30, left: 42 },
  { top: 40, left: 12 }, { top: 55, left: 78 }, { top: 68, left: 38 },
]
const ROUND1_BUBBLES: Bubble[] = [
  { text: 'Sarah died at 127 years old', correct: true },
  { text: 'Sarah died in Egypt', correct: false },
  { text: 'Abraham did not mourn for long', correct: false },
  { text: 'Abraham mourned and wept for Sarah', correct: true },
  { text: 'Sarah was 90 years old when she died', correct: false },
  { text: 'Sarah died in Hebron in Canaan', correct: true },
]

const ROUND2_POS: Pos[] = ROUND1_POS
const ROUND2_BUBBLES: Bubble[] = [
  { text: 'Abraham weighed out the silver in front of witnesses', correct: true },
  { text: 'Abraham paid secretly at night', correct: false },
  { text: "The field and cave became Abraham's permanent property", correct: true },
  { text: 'The Hittites kept ownership of the cave', correct: false },
  { text: 'The transaction was done publicly and legally', correct: true },
  { text: 'Abraham borrowed the silver from Lot', correct: false },
]

const ROUND3_POS: Pos[] = [
  { top: 5,  left: 15 }, { top: 4,  left: 65 }, { top: 22, left: 40 }, { top: 30, left: 85 },
  { top: 42, left: 10 }, { top: 50, left: 62 }, { top: 65, left: 30 }, { top: 72, left: 78 },
]
const ROUND3_BUBBLES: Bubble[] = [
  { text: 'Abraham honoured Sarah with a proper burial', correct: true },
  { text: 'Abraham moved on immediately without grieving', correct: false },
  { text: 'The cave became the first owned land in the Promised Land', correct: true },
  { text: "Sarah's death ended God's promise", correct: false },
  { text: 'Grief and faith can exist together', correct: true },
  { text: 'The Promised Land was lost when Sarah died', correct: false },
  { text: "God's promises outlast our losses", correct: true },
  { text: 'Abraham gave up on God after Sarah died', correct: false },
]

const P1_TF: Round = { type: 'tf', q: 'Abraham wept and mourned for Sarah before doing anything else.', opts: ['TRUE', 'FALSE'], ans: 0 }
const P1_MC: Round = { type: 'mc', q: 'How old was Sarah when she died?', opts: ['90 years old', '100 years old', '120 years old', '127 years old'], ans: 3 }
const P1_YN: Round = { type: 'yn', q: 'Did Sarah die in the Promised Land of Canaan?', opts: ['YES', 'NO'], ans: 0 }

const P2_PAIRS: MPair[] = [
  { left: 'Abraham approached the Hittites',     right: 'To buy a burial place for Sarah' },
  { left: 'The Hittites offered Abraham',        right: 'Any of their choicest tombs freely' },
  { left: 'Abraham specifically requested',      right: 'The cave of Machpelah owned by Ephron son of Zohar' },
  { left: 'Ephron offered Abraham',              right: 'The field and cave as a gift — for free' },
]
const P2_RIGHT_ORDER = [2, 0, 3, 1]
const P2_YN: Round = { type: 'yn', q: 'Did Abraham accept the cave as a free gift from the Hittites?', opts: ['YES', 'NO'], ans: 1 }
const P2_MC: Round = {
  type: 'mc',
  q: 'Why did Abraham insist on paying full price for the cave?',
  opts: [
    'He was very wealthy and wanted to show it',
    'The Hittites demanded payment',
    'He wanted permanent legal ownership — not a gift that could be taken back',
    'God told him to pay full price',
  ],
  ans: 2,
}
const P2_TF: Round = { type: 'tf', q: 'The cave of Machpelah was the first piece of the Promised Land that Abraham actually owned legally.', opts: ['TRUE', 'FALSE'], ans: 0 }

const P3_MC: Round = {
  type: 'mc',
  q: 'How much did Abraham pay for the cave of Machpelah?',
  opts: ['100 shekels of gold', '200 shekels of silver', '400 shekels of silver', 'He exchanged livestock for the land'],
  ans: 2,
}

const GENEALOGY_LINES = [
  'The woman who laughed at the impossible…',
  'Became the grandmother of nations…',
  'And part of the family line of Jesus.',
]

// ── Audio (soft, reverent — no harsh transients) ────────────────────────────
function playCandleFlicker() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(300, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(420, c.currentTime + 0.8)
    g.gain.setValueAtTime(0.001, c.currentTime); g.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.4)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.3)
  } catch (_) {}
}
function playSoftBell() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.value = 660
    g.gain.setValueAtTime(0.16, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.4)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.5)
  } catch (_) {}
}
function playGentleBuzz() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(200, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.3)
    g.gain.setValueAtTime(0.08, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4)
  } catch (_) {}
}
function playSoftChime() {
  try {
    const c = new AudioContext()
    ;[523.3, 659.3, 784.0].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.08)
      g.gain.linearRampToValueAtTime(0.10, c.currentTime + i * 0.08 + 0.1)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.9)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.08); o.stop(c.currentTime + i * 0.08 + 1.0)
    })
  } catch (_) {}
}
function playSoftGlowTone() {
  try {
    const c = new AudioContext()
    ;[220, 330, 440].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.15)
      g.gain.linearRampToValueAtTime(0.09, c.currentTime + i * 0.15 + 0.5)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.15 + 2.0)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.15); o.stop(c.currentTime + i * 0.15 + 2.2)
    })
  } catch (_) {}
}
function playCoinClink() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.value = 780
    g.gain.setValueAtTime(0.12, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.38)
  } catch (_) {}
}
function playScaleBalance() {
  try {
    const c = new AudioContext()
    ;[392, 523.3, 659.3].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.1)
      g.gain.linearRampToValueAtTime(0.14, c.currentTime + i * 0.1 + 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.1 + 1.6)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.1); o.stop(c.currentTime + i * 0.1 + 1.8)
    })
  } catch (_) {}
}
function playGentlePing() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.value = 700
    g.gain.setValueAtTime(0.12, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.42)
  } catch (_) {}
}
function playHolyPad() {
  try {
    const c = new AudioContext()
    ;[261.6, 329.6, 392.0].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.2)
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + i * 0.2 + 0.5)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.2 + 2.6)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.2); o.stop(c.currentTime + i * 0.2 + 2.8)
    })
  } catch (_) {}
}
function playFanfareSoft() {
  try {
    const c = new AudioContext()
    ;[392, 523.3, 659.3, 784.0].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.12)
      g.gain.linearRampToValueAtTime(0.12, c.currentTime + i * 0.12 + 0.1)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 1.2)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 1.4)
    })
  } catch (_) {}
}
function playWarmChime(pitch = 1.0) {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.value = 587 * pitch
    g.gain.setValueAtTime(0.14, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.65)
  } catch (_) {}
}

// ── Particles (slow, gentle drift — not explosive bursts) ──────────────────
interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }
function mkDrift(cx: number, cy: number, cnt: number, hue = 45): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random() * Math.PI * 2; const s = Math.random() * 1.4 + 0.3
    return { x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.4 - 0.3, r: Math.random() * 2.4 + 1, life: 0, max: Math.random() * 160 + 140, hue }
  })
}

// ── Reusable question card (YN / TF / MC) ───────────────────────────────────
function RoundCard({ round, sel, grace, graceMsg, onPick, label, extraClass }: {
  round: Round; sel: number | null; grace: boolean; graceMsg: string; onPick: (i: number) => void
  label?: string; extraClass?: string
}) {
  return (
    <div className={`l31-q-card${extraClass ? ' ' + extraClass : ''}`}>
      <div className="l31-round-label">
        {label ?? (round.type === 'yn' ? 'YES OR NO?' : round.type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?')}
      </div>
      <p className="l31-q-text">{round.q}</p>
      {round.type === 'yn' && (
        <div className="l31-yn-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l31-yn-btn${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'tf' && (
        <div className="l31-tf-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l31-tf-tablet${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'mc' && (
        <div className="l31-mc-opts">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l31-mc-opt${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {grace && <div className="l31-grace">✨ {graceMsg}</div>}
    </div>
  )
}

// ── Timed Select mechanic (silver → amber → grey) ───────────────────────────
function TimedSelect({ bubbles, positions, seconds, urgent, prompt, onCorrectTap, onWrongTap, onAllCollected, onTimeout, onTrembleAt3 }: {
  bubbles: Bubble[]; positions: Pos[]; seconds: number; urgent?: boolean; prompt: string
  onCorrectTap: () => void; onWrongTap: () => void; onAllCollected: () => void; onTimeout: () => void; onTrembleAt3?: () => void
}) {
  const totalCorrect = bubbles.filter(b => b.correct).length
  const [collected, setCollected] = useState<boolean[]>(() => bubbles.map(() => false))
  const [revealed, setRevealed]   = useState<boolean[]>(() => bubbles.map(() => false))
  const [wrongIdx, setWrongIdx]   = useState<number | null>(null)
  const [timeLeft, setTimeLeft]   = useState(seconds)
  const doneRef = useRef(false)
  const countRef = useRef(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          window.clearInterval(id)
          if (!doneRef.current) {
            doneRef.current = true
            setRevealed(bubbles.map(b => b.correct))
            onTimeout()
          }
          return 0
        }
        if (urgent && t - 1 === 3) onTrembleAt3?.()
        return t - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tapBubble = useCallback((i: number) => {
    if (doneRef.current || collected[i] || revealed[i]) return
    const b = bubbles[i]
    if (b.correct) {
      setCollected(prev => { const n = [...prev]; n[i] = true; return n })
      countRef.current++
      onCorrectTap()
      if (countRef.current >= totalCorrect && !doneRef.current) {
        doneRef.current = true
        onAllCollected()
      }
    } else {
      setWrongIdx(i); onWrongTap()
      setTimeout(() => setWrongIdx(idx => idx === i ? null : idx), 500)
    }
  }, [bubbles, collected, revealed, totalCorrect, onCorrectTap, onWrongTap, onAllCollected])

  const frac = timeLeft / seconds
  const timerClass = frac > 0.5 ? '' : frac > 0.25 ? ' amber' : ' grey'
  const urgentClass = urgent && timeLeft <= 5 ? ' urgent' : ''

  return (
    <div className="l31-timed-scene">
      <div className="l31-timer-wrap">
        <div className="l31-timer-label">{prompt}</div>
        <div className={`l31-timer-bar${timerClass}${urgentClass}`}>
          <div className="l31-timer-fill" style={{ width: `${(timeLeft / seconds) * 100}%` }} />
        </div>
        <div className="l31-timer-num">⏱️ {timeLeft}s</div>
      </div>
      <div className="l31-bubble-field">
        {bubbles.map((b, i) => (
          <button key={i}
            style={{ top: `${positions[i].top}%`, left: `${positions[i].left}%`, animationDelay: `${i * 0.18}s` }}
            disabled={collected[i] || revealed[i]}
            className={`l31-bubble${collected[i] || revealed[i] ? ' collected' : ''}${wrongIdx === i ? ' wrong-shake' : ''}`}
            onClick={() => tapBubble(i)}>
            {b.text}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Matching mechanic ────────────────────────────────────────────────────────
interface Line { x1: number; y1: number; x2: number; y2: number }
function MatchRound({ pairs, rightOrder, onCorrectMatch, onWrongMatch, onAllMatched }: {
  pairs: MPair[]; rightOrder: number[]
  onCorrectMatch: () => void; onWrongMatch: () => void; onAllMatched: () => void
}) {
  const [leftMatched, setLeftMatched]   = useState<boolean[]>(() => pairs.map(() => false))
  const [rightMatched, setRightMatched] = useState<boolean[]>(() => pairs.map(() => false))
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [wrongFlash, setWrongFlash]     = useState<{ left: number; rightPos: number } | null>(null)
  const [lines, setLines]               = useState<Line[]>([])
  const [hint, setHint]                 = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRefs  = useRef<(HTMLButtonElement | null)[]>(pairs.map(() => null))
  const rightRefs = useRef<(HTMLButtonElement | null)[]>(pairs.map(() => null))
  const doneRef = useRef(false)
  const matchedRef = useRef(0)

  const tapLeft = useCallback((i: number) => {
    if (leftMatched[i] || doneRef.current) return
    setSelectedLeft(i)
  }, [leftMatched])

  const tapRight = useCallback((pos: number) => {
    if (selectedLeft === null || rightMatched[pos] || doneRef.current) return
    const pairIdx = rightOrder[pos]
    if (pairIdx === selectedLeft) {
      const container = containerRef.current
      const lEl = leftRefs.current[selectedLeft]
      const rEl = rightRefs.current[pos]
      if (container && lEl && rEl) {
        const cRect = container.getBoundingClientRect()
        const lRect = lEl.getBoundingClientRect()
        const rRect = rEl.getBoundingClientRect()
        setLines(prev => [...prev, {
          x1: lRect.right - cRect.left, y1: lRect.top + lRect.height / 2 - cRect.top,
          x2: rRect.left - cRect.left,  y2: rRect.top + rRect.height / 2 - cRect.top,
        }])
      }
      const li = selectedLeft
      setLeftMatched(prev => { const n = [...prev]; n[li] = true; return n })
      setRightMatched(prev => { const n = [...prev]; n[pos] = true; return n })
      setSelectedLeft(null)
      onCorrectMatch()
      matchedRef.current++
      if (matchedRef.current >= pairs.length && !doneRef.current) {
        doneRef.current = true
        onAllMatched()
      }
    } else {
      setWrongFlash({ left: selectedLeft, rightPos: pos })
      setHint('Try matching that one again!')
      onWrongMatch()
      setTimeout(() => { setSelectedLeft(null); setWrongFlash(null) }, 500)
      setTimeout(() => setHint(null), 1600)
    }
  }, [selectedLeft, rightMatched, rightOrder, pairs.length, onCorrectMatch, onWrongMatch, onAllMatched])

  return (
    <div className="l31-match-scene">
      <div className="l31-match-wrap" ref={containerRef}>
        <svg className="l31-match-svg">
          {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="l31-match-line" />)}
        </svg>
        <div className="l31-match-col l31-match-left">
          {pairs.map((p, i) => (
            <button key={i} ref={el => { leftRefs.current[i] = el }}
              disabled={leftMatched[i]}
              className={`l31-match-item${leftMatched[i] ? ' matched' : ''}${selectedLeft === i ? ' selected' : ''}${wrongFlash?.left === i ? ' wrong-shake' : ''}`}
              onClick={() => tapLeft(i)}>{p.left}</button>
          ))}
        </div>
        <div className="l31-match-col l31-match-right">
          {rightOrder.map((pairIdx, pos) => (
            <button key={pos} ref={el => { rightRefs.current[pos] = el }}
              disabled={rightMatched[pos]}
              className={`l31-match-item${rightMatched[pos] ? ' matched' : ''}${wrongFlash?.rightPos === pos ? ' wrong-shake' : ''}`}
              onClick={() => tapRight(pos)}>{pairs[pairIdx].right}</button>
          ))}
        </div>
      </div>
      {hint && <div className="l31-match-hint">{hint}</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level31({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [trembleClass, setTrembleClass] = useState('')
  const [softGlow, setSoftGlow]     = useState(false)
  const [banner, setBannerText]     = useState<string | null>(null)
  const [bannerVariant, setBannerVariant] = useState<Banner>('gold')

  // Cinematic
  const [cinStep, setCinStep] = useState(0)

  // Phase 1
  const [p1Ready, setP1Ready] = useState(false)
  const [p1Sub, setP1Sub]     = useState<P1Sub>('timed')
  const [p1TfSel, setP1TfSel] = useState<number | null>(null)
  const [p1TfGrace, setP1TfGrace] = useState(false)
  const [p1McSel, setP1McSel] = useState<number | null>(null)
  const [p1McGrace, setP1McGrace] = useState(false)
  const [p1YnSel, setP1YnSel] = useState<number | null>(null)
  const [p1YnGrace, setP1YnGrace] = useState(false)

  // Phase 2
  const [p2Ready, setP2Ready] = useState(false)
  const [p2Sub, setP2Sub]     = useState<P2Sub>('match')
  const [p2YnSel, setP2YnSel] = useState<number | null>(null)
  const [p2YnGrace, setP2YnGrace] = useState(false)
  const [p2McSel, setP2McSel] = useState<number | null>(null)
  const [p2McGrace, setP2McGrace] = useState(false)
  const [p2TfSel, setP2TfSel] = useState<number | null>(null)
  const [p2TfGrace, setP2TfGrace] = useState(false)

  // Phase 3
  const [p3Ready, setP3Ready] = useState(false)
  const [p3Sub, setP3Sub]     = useState<P3Sub>('weigh')
  const [coinsOnScale, setCoinsOnScale] = useState<boolean[]>(() => Array(10).fill(false))
  const [p3McSel, setP3McSel] = useState<number | null>(null)
  const [p3McGrace, setP3McGrace] = useState(false)

  // Phase 4
  const [p4Ready, setP4Ready] = useState(false)
  const [p4Sub, setP4Sub]     = useState<P4Sub>('candles')
  const [candlesLit, setCandlesLit] = useState<boolean[]>(() => Array(5).fill(false))
  const [genLineIdx, setGenLineIdx] = useState(-1)
  const [genCrossShown, setGenCrossShown] = useState(false)
  const [genDone, setGenDone] = useState(false)

  // Ending
  const [coinCount, setCoinCount]   = useState(0)
  const [starsShown, setStarsShown] = useState(0)
  const [showScripture, setShowScripture] = useState(false)
  const [showAdvance, setShowAdvance]     = useState(false)

  // Refs
  const earnedRef    = useRef(0)
  const affIdxRef    = useRef(0)
  const phaseRef     = useRef<Phase>('cinematic')
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef(0)
  const particlesRef = useRef<Pt[]>([])
  const speechTokenRef = useRef(0)

  // Canvas resize
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const r = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    r(); window.addEventListener('resize', r)
    return () => { window.removeEventListener('resize', r); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const tremble = useCallback(() => {
    setTrembleClass('l31-tremble'); setTimeout(() => setTrembleClass(''), 900)
  }, [])

  const showBanner = useCallback((text: string, variant: Banner = 'gold', ms = 3200) => {
    setBannerVariant(variant); setBannerText(text); setTimeout(() => setBannerText(null), ms)
  }, [])

  const nextAffirmation = useCallback(() => {
    const t = AFFIRMATIONS[affIdxRef.current % AFFIRMATIONS.length]
    affIdxRef.current++
    return t
  }, [])

  // Single-voice guard: cancel, wait 300ms, then speak — a newer call always supersedes an older
  // pending one so at most one utterance is ever audible. A bounded failsafe guarantees the
  // level always advances even if the browser never fires onend/onerror for the utterance.
  const speakRaw = useCallback((text: string, rate: number, pitch: number, onEnd?: () => void) => {
    const token = ++speechTokenRef.current
    try { window.speechSynthesis?.cancel() } catch (_) {}
    setTimeout(() => {
      if (speechTokenRef.current !== token) return
      let fired = false
      const finish = () => {
        if (fired || speechTokenRef.current !== token) return
        fired = true
        onEnd?.()
      }
      try {
        window.speechSynthesis?.cancel()
        const fixed = text.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())
        const u = new SpeechSynthesisUtterance(fixed); u.rate = rate; u.pitch = pitch; u.volume = 1
        u.onend = finish
        u.onerror = finish
        window.speechSynthesis?.speak(u)
        const failsafeMs = Math.min(15000, Math.max(3000, (fixed.length * 70) / rate))
        setTimeout(finish, failsafeMs)
      } catch (_) { finish() }
    }, 300)
  }, [])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    speakRaw(text, 1.0, 1.0, onEnd)
  }, [speakRaw])

  // AUDIO ONLY — never displayed on screen
  const speakAffirm = useCallback((text: string) => {
    speakRaw(text, 0.85, 1.3)
  }, [speakRaw])

  const fireAffirmation = useCallback(() => {
    speakAffirm(nextAffirmation())
  }, [speakAffirm, nextAffirmation])

  const runParticles = useCallback(() => {
    const cv = canvasRef.current; if (!cv || rafRef.current !== 0) return
    const tick = () => {
      const ctx = cv.getContext('2d'); if (ctx) {
        ctx.clearRect(0, 0, cv.width, cv.height)
        particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
        for (const p of particlesRef.current) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.01; p.life++
          const op = Math.pow(1 - p.life / p.max, 0.7) * 0.7
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},70%,80%,${op * 0.5})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.9, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},60%,95%,${op})`; ctx.fill()
        }
      }
      if (particlesRef.current.length > 0) rafRef.current = requestAnimationFrame(tick)
      else rafRef.current = 0
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const drift = useCallback((cx: number, cy: number, cnt = 30, hue = 45) => {
    particlesRef.current.push(...mkDrift(cx, cy, cnt, hue)); runParticles()
  }, [runParticles])

  const fireSoftGlow = useCallback((slow = false) => {
    setSoftGlow(true); setTimeout(() => setSoftGlow(false), slow ? 3400 : 1800)
    const count = slow ? 8 : 5
    for (let i = 0; i < count; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 45 : 220
        drift(Math.random() * window.innerWidth, window.innerHeight * 0.1 + Math.random() * window.innerHeight * 0.3, slow ? 26 : 16, hue)
      }, i * (slow ? 220 : 140))
  }, [drift])

  const addEarned = useCallback((n: number) => {
    if (n <= 0) return
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    const ts = [
      setTimeout(() => setCinStep(1), 900),
      setTimeout(() => setCinStep(2), 3000),
      setTimeout(() => setCinStep(3), 5100),
      setTimeout(() => setCinStep(4), 7600),
      setTimeout(() => setCinStep(5), 8900),
      setTimeout(() => { setCinStep(6); playSoftBell() }, 10200),
      setTimeout(() => setCinStep(7), 11600),
      setTimeout(() => setCinStep(8), 12800),
      setTimeout(() => { phaseRef.current = 'phase1'; setPhase('phase1') }, 14800),
    ]
    return () => ts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Ready(false); setP1Sub('timed')
    setP1TfSel(null); setP1TfGrace(false); setP1McSel(null); setP1McGrace(false); setP1YnSel(null); setP1YnGrace(false)
    speak('Abraham lost his partner of a lifetime. The woman who had walked every step of the journey with him. Grief is real — and Abraham did not hide from it.', () => {
      setP1Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p1TimedCorrect = useCallback(() => { addEarned(8); playGentlePing() }, [addEarned])
  const p1TimedWrong   = useCallback(() => { playGentleBuzz() }, [])
  const p1TimedAll     = useCallback(() => {
    addEarned(25); playSoftGlowTone(); fireSoftGlow()
    fireAffirmation()
    setTimeout(() => setP1Sub('tf'), 2800)
  }, [addEarned, fireSoftGlow, fireAffirmation])
  const p1TimedTimeout = useCallback(() => {
    showBanner('Take your time — grief has its own pace.', 'comedic', 2800)
    setTimeout(() => setP1Sub('tf'), 3000)
  }, [showBanner])

  const handleP1Tf = useCallback((idx: number) => {
    if (p1TfSel !== null || p1TfGrace) return
    setP1TfSel(idx)
    if (idx === P1_TF.ans) {
      addEarned(20); playWarmChime(); tremble()
      showBanner('ABRAHAM HONOURED HIS GRIEF FIRST!!', 'gold', 3000)
      setTimeout(() => setP1Sub('mc'), 3200)
    } else {
      setP1TfGrace(true); setP1TfSel(null); playGentleBuzz()
      setTimeout(() => setP1TfGrace(false), 2800)
    }
  }, [p1TfSel, p1TfGrace, addEarned, tremble, showBanner])

  const handleP1Mc = useCallback((idx: number) => {
    if (p1McSel !== null || p1McGrace) return
    setP1McSel(idx)
    if (idx === P1_MC.ans) {
      addEarned(20); playWarmChime()
      fireAffirmation()
      setTimeout(() => setP1Sub('yn'), 2400)
    } else {
      setP1McGrace(true); setP1McSel(null); playGentleBuzz()
      setTimeout(() => setP1McGrace(false), 2800)
    }
  }, [p1McSel, p1McGrace, addEarned, fireAffirmation])

  const handleP1Yn = useCallback((idx: number) => {
    if (p1YnSel !== null || p1YnGrace) return
    setP1YnSel(idx)
    if (idx === P1_YN.ans) {
      addEarned(15); playWarmChime()
      showBanner('SHE DIED IN THE PROMISED LAND!!', 'gold', 3000)
      setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 3200)
    } else {
      setP1YnGrace(true); setP1YnSel(null); playGentleBuzz()
      setTimeout(() => setP1YnGrace(false), 2800)
    }
  }, [p1YnSel, p1YnGrace, addEarned, showBanner])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Ready(false); setP2Sub('match')
    setP2YnSel(null); setP2YnGrace(false); setP2McSel(null); setP2McGrace(false); setP2TfSel(null); setP2TfGrace(false)
    speak('Abraham had no land of his own. No place to bury his wife. He had to negotiate with the people of the land. And he did it with remarkable dignity and wisdom.', () => {
      setP2Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p2MatchCorrect = useCallback(() => { addEarned(15); playSoftChime() }, [addEarned])
  const p2MatchWrong   = useCallback(() => { playGentleBuzz() }, [])
  const p2MatchAll     = useCallback(() => {
    addEarned(30); playSoftGlowTone(); fireSoftGlow()
    showBanner('THE NEGOTIATION IS COMPLETE!!', 'gold', 3000)
    fireAffirmation()
    setTimeout(() => setP2Sub('yn'), 3200)
  }, [addEarned, fireSoftGlow, showBanner, fireAffirmation])

  const handleP2Yn = useCallback((idx: number) => {
    if (p2YnSel !== null || p2YnGrace) return
    setP2YnSel(idx)
    if (idx === P2_YN.ans) {
      addEarned(20); playWarmChime()
      showBanner('ABRAHAM INSISTED ON PAYING!!', 'gold', 3000)
      setTimeout(() => setP2Sub('mc'), 3200)
    } else {
      setP2YnGrace(true); setP2YnSel(null); playGentleBuzz()
      setTimeout(() => setP2YnGrace(false), 2800)
    }
  }, [p2YnSel, p2YnGrace, addEarned, showBanner])

  const handleP2Mc = useCallback((idx: number) => {
    if (p2McSel !== null || p2McGrace) return
    setP2McSel(idx)
    if (idx === P2_MC.ans) {
      addEarned(25); playWarmChime()
      fireAffirmation()
      setTimeout(() => setP2Sub('tf'), 2400)
    } else {
      setP2McGrace(true); setP2McSel(null); playGentleBuzz()
      setTimeout(() => setP2McGrace(false), 2800)
    }
  }, [p2McSel, p2McGrace, addEarned, fireAffirmation])

  const handleP2Tf = useCallback((idx: number) => {
    if (p2TfSel !== null || p2TfGrace) return
    setP2TfSel(idx)
    if (idx === P2_TF.ans) {
      addEarned(25); playWarmChime(); tremble()
      showBanner('THE FIRST LAND ABRAHAM EVER OWNED!!', 'gold', 3200)
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 3400)
    } else {
      setP2TfGrace(true); setP2TfSel(null); playGentleBuzz()
      setTimeout(() => setP2TfGrace(false), 2800)
    }
  }, [p2TfSel, p2TfGrace, addEarned, tremble, showBanner])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Ready(false); setP3Sub('weigh'); setCoinsOnScale(Array(10).fill(false))
    setP3McSel(null); setP3McGrace(false)
    speak('An agreement was reached. A price was set. Abraham weighed out the payment — publicly, transparently, in front of witnesses. Nothing hidden. Nothing cheap. Love is measured in what we are willing to pay.', () => {
      setP3Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const scaleCount = coinsOnScale.filter(Boolean).length
  const tapCoin = useCallback((i: number) => {
    if (coinsOnScale[i]) return
    playCoinClink(); addEarned(5)
    setCoinsOnScale(prev => {
      const next = [...prev]; next[i] = true
      if (next.every(Boolean)) {
        setTimeout(() => {
          addEarned(30); playScaleBalance(); fireSoftGlow()
          showBanner('THE PRICE IS PAID!!', 'gold', 3200)
          fireAffirmation()
          setTimeout(() => setP3Sub('mc'), 3400)
        }, 500)
      }
      return next
    })
  }, [coinsOnScale, addEarned, fireSoftGlow, showBanner, fireAffirmation])

  const handleP3Mc = useCallback((idx: number) => {
    if (p3McSel !== null || p3McGrace) return
    setP3McSel(idx)
    if (idx === P3_MC.ans) {
      addEarned(20); playWarmChime()
      setTimeout(() => setP3Sub('timed'), 2200)
    } else {
      setP3McGrace(true); setP3McSel(null); playGentleBuzz()
      setTimeout(() => setP3McGrace(false), 2800)
    }
  }, [p3McSel, p3McGrace, addEarned])

  const p3TimedCorrect = useCallback(() => { addEarned(8); playGentlePing() }, [addEarned])
  const p3TimedWrong   = useCallback(() => { playGentleBuzz() }, [])
  const p3TimedAll     = useCallback(() => {
    addEarned(25); playSoftGlowTone(); fireSoftGlow()
    showBanner('THE TRANSACTION WAS COMPLETE!!', 'gold', 3000)
    fireAffirmation()
    setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 3200)
  }, [addEarned, fireSoftGlow, showBanner, fireAffirmation])
  const p3TimedTimeout = useCallback(() => {
    showBanner('Take your time — grief has its own pace.', 'comedic', 2800)
    setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 3000)
  }, [showBanner])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Ready(false); setP4Sub('candles'); setCandlesLit(Array(5).fill(false))
    setGenLineIdx(-1); setGenCrossShown(false); setGenDone(false)
    speak('Sarah was laid to rest in the cave of Machpelah. In the land God had promised. Surrounded by those who loved her. Her journey was complete. But the promise she carried — lived on.', () => {
      setP4Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const candlesCount = candlesLit.filter(Boolean).length
  const tapCandle = useCallback((i: number) => {
    if (candlesLit[i]) return
    playCandleFlicker(); addEarned(8)
    setCandlesLit(prev => {
      const next = [...prev]; next[i] = true
      if (next.every(Boolean)) {
        setTimeout(() => {
          addEarned(20); playSoftGlowTone(); fireSoftGlow()
          showBanner('SARAH RESTS IN THE PROMISED LAND!!', 'gold', 3200)
          fireAffirmation()
          setTimeout(() => setP4Sub('genealogy'), 3400)
        }, 500)
      }
      return next
    })
  }, [candlesLit, addEarned, fireSoftGlow, showBanner, fireAffirmation])

  // Genealogy moment — sacred, still, no coins, no affirmation
  useEffect(() => {
    if (phase !== 'phase4' || p4Sub !== 'genealogy') return
    playHolyPad()
    const timers: number[] = []
    let t = 900
    GENEALOGY_LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setGenLineIdx(i), t))
      t += i === 1 ? 2600 : 2000
    })
    timers.push(window.setTimeout(() => { setGenLineIdx(-1); setGenCrossShown(true) }, t + 700))
    return () => timers.forEach(clearTimeout)
  }, [phase, p4Sub])

  const tapGenCross = useCallback(() => {
    if (genDone) return
    setGenDone(true)
    setTimeout(() => setP4Sub('boss'), 2200)
  }, [genDone])

  const p4BossCorrect = useCallback(() => { playGentlePing() }, [])
  const p4BossWrong   = useCallback(() => { playGentleBuzz() }, [])
  const p4BossAll     = useCallback(() => {
    addEarned(60); playSoftGlowTone(); fireSoftGlow(true)
    showBanner(`${playerName} — SARAH WOULD BE PROUD OF YOU RIGHT NOW!!`, 'legendary', 4200)
    fireAffirmation()
    setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4600)
  }, [addEarned, fireSoftGlow, showBanner, playerName, fireAffirmation])
  const p4BossTimeout = useCallback(() => {
    showBanner('Take your time — grief has its own pace.', 'comedic', 2800)
    setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 3000)
  }, [showBanner])
  const p4BossTremble = useCallback(() => { tremble() }, [tremble])

  // ── ENDING ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ending') return
    playFanfareSoft()
    const total = earnedRef.current; let cur = 0
    const step = Math.max(1, Math.ceil(total / 60))
    const id = setInterval(() => {
      cur = Math.min(cur + step, total); setCoinCount(cur)
      if (cur % (Math.ceil(total / 6)) === 0 || cur === total) playWarmChime(0.85 + (cur / total) * 0.4)
      if (cur >= total) clearInterval(id)
    }, 32)
    for (let i = 0; i < 8; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 220
        drift(Math.random() * window.innerWidth, window.innerHeight * 0.05, 20, hue)
      }, i * 260)
    const ts = [
      setTimeout(() => setStarsShown(1), 1500),
      setTimeout(() => setStarsShown(2), 2300),
      setTimeout(() => setStarsShown(3), 3100),
      setTimeout(() => {
        setShowScripture(true)
        speak('Afterward Abraham buried his wife Sarah in the cave in the field of Machpelah near Mamre, which is Hebron, in the land of Canaan. Genesis chapter 23.')
      }, 3900),
      setTimeout(() => setShowAdvance(true), 6900),
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
        verse="Afterward Abraham buried his wife Sarah in the cave in the field of Machpelah near Mamre — which is Hebron — in the land of Canaan."
        verseRef="Genesis 23:19"
        subtitle={`${playerName} — love outlasts every loss`}
        voiceLine={`${playerName}. Love outlasts every loss. Sarah's faith lives on — and so does yours.`}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`l31-wrap ${trembleClass}`}>

      {/* Background */}
      <div className={`l31-bg${cinStep >= 6 ? ' visible' : ''}`} />
      {cinStep < 6 && <div className="l31-black" />}
      {cinStep >= 6 && <div className="l31-bg-overlay" />}
      <canvas ref={canvasRef} className="l31-canvas" />
      {softGlow && <div className="l31-soft-glow" />}

      {/* HUD */}
      {phase !== 'cinematic' && (
        <div className="l31-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && (
        <div className="l31-level-label">1-31 FAREWELL</div>
      )}

      {/* Global banner */}
      {banner && <div className={`l31-banner l31-banner-${bannerVariant}`}>{banner}</div>}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l31-cin">
          <div className="l31-candle-glow" aria-hidden><span className="l31-candle-flame">🕯️</span></div>
          {cinStep === 1 && <div className="l31-cin-line">She laughed at the impossible.</div>}
          {cinStep === 2 && <div className="l31-cin-line">She believed when it seemed too late.</div>}
          {cinStep === 3 && <div className="l31-cin-line">She became the mother of nations.</div>}
          {cinStep === 4 && <div className="l31-cin-word">Sarah.</div>}
          {cinStep === 5 && <div className="l31-cin-word">127 years old.</div>}
          {cinStep === 6 && <div className="l31-cin-word l31-cin-gone">Gone.</div>}
          {cinStep >= 7 && (
            <div className="l31-title-card">
              <span className="l31-title-icon">🕯️</span>
              <span className="l31-title-word">FAREWELL</span>
              <span className="l31-title-icon">🕯️</span>
            </div>
          )}
          {cinStep >= 8 && <div className="l31-title-sub">The death and burial of Sarah.</div>}
        </div>
      )}

      {/* ── PHASE 1: Mourning and Rising ── */}
      {phase === 'phase1' && (
        <div className="l31-phase-wrap l31-mourning-scene">
          <div className="l31-phase-header">
            <div className="l31-phase-badge">PHASE 1</div>
            <div className="l31-phase-title">MOURNING AND RISING 🕯️</div>
          </div>

          {p1Sub === 'timed' && p1Ready && (
            <TimedSelect key="p1-round1" bubbles={ROUND1_BUBBLES} positions={ROUND1_POS} seconds={12}
              prompt="TAP ALL THE TRUE STATEMENTS!"
              onCorrectTap={p1TimedCorrect} onWrongTap={p1TimedWrong}
              onAllCollected={p1TimedAll} onTimeout={p1TimedTimeout} />
          )}

          {p1Sub === 'tf' && (
            <RoundCard round={P1_TF} sel={p1TfSel} grace={p1TfGrace}
              graceMsg="Think about what Abraham did before anything else — try again!" onPick={handleP1Tf} />
          )}

          {p1Sub === 'mc' && (
            <RoundCard round={P1_MC} sel={p1McSel} grace={p1McGrace}
              graceMsg="Think about the number that opened this story — try again!" onPick={handleP1Mc} />
          )}

          {p1Sub === 'yn' && (
            <RoundCard round={P1_YN} sel={p1YnSel} grace={p1YnGrace}
              graceMsg="Think about where Hebron is located — try again!" onPick={handleP1Yn} />
          )}
        </div>
      )}

      {/* ── PHASE 2: The Negotiation ── */}
      {phase === 'phase2' && (
        <div className="l31-phase-wrap l31-negotiation-scene">
          <div className="l31-phase-header">
            <div className="l31-phase-badge">PHASE 2</div>
            <div className="l31-phase-title">THE NEGOTIATION 💰</div>
          </div>

          {p2Sub === 'match' && p2Ready && (
            <MatchRound pairs={P2_PAIRS} rightOrder={P2_RIGHT_ORDER}
              onCorrectMatch={p2MatchCorrect} onWrongMatch={p2MatchWrong} onAllMatched={p2MatchAll} />
          )}

          {p2Sub === 'yn' && (
            <RoundCard round={P2_YN} sel={p2YnSel} grace={p2YnGrace}
              graceMsg="Think about what Abraham wanted — permanence, not charity — try again!" onPick={handleP2Yn} />
          )}

          {p2Sub === 'mc' && (
            <RoundCard round={P2_MC} sel={p2McSel} grace={p2McGrace}
              graceMsg="Think about why a gift could be a problem later — try again!" onPick={handleP2Mc} />
          )}

          {p2Sub === 'tf' && (
            <RoundCard round={P2_TF} sel={p2TfSel} grace={p2TfGrace}
              graceMsg="Think about what made this purchase historic — try again!" onPick={handleP2Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 3: 400 Shekels of Silver ── */}
      {phase === 'phase3' && (
        <div className="l31-phase-wrap l31-weighing-scene">
          <div className="l31-phase-header">
            <div className="l31-phase-badge">PHASE 3</div>
            <div className="l31-phase-title">400 SHEKELS OF SILVER ⚖️</div>
          </div>

          {p3Sub === 'weigh' && p3Ready && (
            <div className="l31-scale-mechanic">
              <div className="l31-scale-hint">Tap each coin to weigh it onto the scale</div>
              <div className="l31-scale" style={{ ['--tilt' as string]: `${8 - scaleCount * 0.8}deg` }}>
                <div className="l31-scale-beam">
                  <div className="l31-scale-pan l31-scale-pan-left">
                    <span className="l31-scale-pan-count">{scaleCount}</span>
                  </div>
                  <div className="l31-scale-pan l31-scale-pan-right">
                    <span className="l31-scale-pan-label">400<br/>SHEKELS</span>
                  </div>
                </div>
                <div className="l31-scale-post" />
              </div>
              <div className="l31-coin-field">
                {coinsOnScale.map((placed, i) => !placed && (
                  <button key={i} className="l31-coin-btn" style={{ animationDelay: `${i * 0.12}s` }}
                    onClick={() => tapCoin(i)}>🪙</button>
                ))}
              </div>
              <div className="l31-scale-progress">{scaleCount} / 10 shekels weighed</div>
            </div>
          )}

          {p3Sub === 'mc' && (
            <RoundCard round={P3_MC} sel={p3McSel} grace={p3McGrace}
              graceMsg="Think about the exact number spoken in the negotiation — try again!" onPick={handleP3Mc} />
          )}

          {p3Sub === 'timed' && (
            <TimedSelect key="p3-round2" bubbles={ROUND2_BUBBLES} positions={ROUND2_POS} seconds={10}
              prompt="TAP ALL THE TRUE STATEMENTS!"
              onCorrectTap={p3TimedCorrect} onWrongTap={p3TimedWrong}
              onAllCollected={p3TimedAll} onTimeout={p3TimedTimeout} />
          )}
        </div>
      )}

      {/* ── PHASE 4: She Rests in the Promise ── */}
      {phase === 'phase4' && (
        <div className="l31-phase-wrap l31-rest-scene">
          <div className="l31-phase-header">
            <div className="l31-phase-badge">PHASE 4</div>
            <div className="l31-phase-title">SHE RESTS IN THE PROMISE 🕯️</div>
          </div>

          {p4Sub === 'candles' && p4Ready && (
            <div className="l31-candle-mechanic">
              <div className="l31-candle-hint">Tap each candle to light the way</div>
              <div className="l31-candle-row">
                {candlesLit.map((lit, i) => (
                  <button key={i} disabled={lit} className={`l31-candle-btn${lit ? ' lit' : ''}`}
                    onClick={() => tapCandle(i)}>
                    <span className="l31-candle-icon">{lit ? '🕯️' : '🕯'}</span>
                  </button>
                ))}
              </div>
              <div className="l31-candle-progress">{candlesCount} / 5 candles lit</div>
            </div>
          )}

          {p4Sub === 'genealogy' && (
            <div className="l31-genealogy-moment">
              {genLineIdx >= 0 && <div className="l31-gen-line">{GENEALOGY_LINES[genLineIdx]}</div>}
              {genCrossShown && (
                <button className="l31-gen-cross-btn" onClick={tapGenCross} disabled={genDone}>
                  <span className="l31-gen-cross-icon">✝️</span>
                </button>
              )}
            </div>
          )}

          {p4Sub === 'boss' && (
            <TimedSelect key="p4-boss" bubbles={ROUND3_BUBBLES} positions={ROUND3_POS} seconds={15} urgent
              prompt="FINAL ROUND — TAP ALL TRUE STATEMENTS!!"
              onCorrectTap={p4BossCorrect} onWrongTap={p4BossWrong}
              onAllCollected={p4BossAll} onTimeout={p4BossTimeout} onTrembleAt3={p4BossTremble} />
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <div className="l31-ending-wrap">
          <div className="l31-ending-glow" />
          <div className="l31-ending-petals" aria-hidden>
            {['🌸', '✨', '🌸', '✨', '🌸'].map((ic, i) => (
              <span key={i} className="l31-petal-item" style={{ left: `${(i * 21 + 4) % 100}%`, animationDelay: `${i * 0.5}s` }}>{ic}</span>
            ))}
          </div>
          <div className="l31-ending-name">{playerName} — LOVE OUTLASTS EVERY LOSS.</div>
          <div className="l31-stars-row">
            {starsShown >= 1 && <div className="l31-end-star l31-st1">⭐</div>}
            {starsShown >= 2 && <div className="l31-end-star l31-st2">⭐</div>}
            {starsShown >= 3 && <div className="l31-end-star l31-st3">⭐</div>}
          </div>
          <div className="l31-coin-tally">
            <span className="l31-coin-icon">🪙</span>
            <span className="l31-coin-num">{coinCount}</span>
            <span className="l31-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l31-scripture-card">
              <div className="l31-scripture-watermark" aria-hidden>🕯️</div>
              <div className="l31-scripture-quote">
                "Afterward Abraham buried his wife Sarah in the cave in the field of Machpelah near Mamre — which is Hebron — in the land of Canaan."
              </div>
              <div className="l31-scripture-ref">— Genesis 23:19</div>
            </div>
          )}
          {showAdvance && (
            <button className="l31-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-32 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
