import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level33.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'timed' | 'mc' | 'yn' | 'tf'
type P2Sub = 'timeline' | 'mc' | 'tf'
type P3Sub = 'match' | 'yn' | 'mc' | 'tf'
type P4Sub = 'pass' | 'mc' | 'boss'
type RoundT = 'yn' | 'tf' | 'mc'
type Banner = 'gold' | 'warn' | 'comedic' | 'legendary' | 'emotional'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }
interface Bubble { text: string; correct: boolean }
interface MPair { left: string; right: string }
interface Pos { top: number; left: number }
interface Milestone { icon: string; text: string }

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'You finished strong — just like Abraham!!',
  '175 years of faithfulness — and you remembered every bit!!',
  'You honoured a legend today!!',
  'Full of years and full of wisdom — just like you!!',
  'Even in endings God is faithful — and so are you!!',
  'You too will live a long, healthy and fulfilled life!!',
  'Isaac and Ishmael reunited — and you saw it!!',
  'Every promise God made to Abraham — kept!!',
  'The baton has been passed — and you carried it!!',
  'Abraham would call you blessed!!',
]

const ROUND1_POS: Pos[] = [
  { top: 8,  left: 16 }, { top: 6,  left: 66 }, { top: 30, left: 40 },
  { top: 42, left: 10 }, { top: 56, left: 76 }, { top: 70, left: 36 },
]
const ROUND1_BUBBLES: Bubble[] = [
  { text: 'Abraham married a woman named Keturah', correct: true },
  { text: 'Abraham gave everything equally to all his sons', correct: false },
  { text: 'Abraham gave gifts to the sons of his concubines', correct: true },
  { text: "Keturah was Isaac's wife", correct: false },
  { text: 'Abraham left everything he owned to Isaac', correct: true },
  { text: 'Abraham sent Isaac away to live in the east', correct: false },
]

const ROUND2_POS: Pos[] = [
  { top: 6,  left: 14 }, { top: 5,  left: 64 }, { top: 24, left: 40 }, { top: 32, left: 84 },
  { top: 44, left: 10 }, { top: 52, left: 60 }, { top: 66, left: 28 }, { top: 74, left: 76 },
]
const ROUND2_BUBBLES: Bubble[] = [
  { text: 'Abraham died at a ripe old age full of years', correct: true },
  { text: "Abraham's story ended when he died", correct: false },
  { text: 'Isaac and Ishmael buried their father together', correct: true },
  { text: 'The promise died with Abraham', correct: false },
  { text: "God blessed Isaac after Abraham's death", correct: true },
  { text: 'Isaac and Ishmael never reconciled after childhood', correct: false },
  { text: "Abraham's life shows that faithfulness leaves a lasting legacy", correct: true },
  { text: "Abraham's greatest achievement was his wealth", correct: false },
]

const P1_MC: Round = {
  type: 'mc',
  q: 'How many sons did Keturah bear to Abraham?',
  opts: ['3 sons', '4 sons', '6 sons', '12 sons'],
  ans: 2,
}
const P1_YN: Round = {
  type: 'yn',
  q: 'Did Abraham send the sons of his concubines away from Isaac while he was still alive?',
  opts: ['YES', 'NO'],
  ans: 0,
}
const P1_TF: Round = {
  type: 'tf',
  q: 'Abraham left all his possessions equally to all of his sons.',
  opts: ['TRUE', 'FALSE'],
  ans: 1,
}

// Milestones in correct chronological order (index = correct sequence position)
const MILESTONES: Milestone[] = [
  { icon: '🏠', text: 'Left Ur of the Chaldeans' },
  { icon: '🌟', text: "God's covenant promise" },
  { icon: '🏜️', text: 'Went to Egypt (Sarai/sister incident)' },
  { icon: '⚔️', text: 'Rescued Lot from the kings' },
  { icon: '👶', text: 'Isaac was born' },
  { icon: '⛰️', text: 'The binding of Isaac' },
  { icon: '🕯️', text: 'Sarah died' },
]
// Scrambled display order: display slot -> milestone index
const TIMELINE_DISPLAY: number[] = [5, 2, 6, 0, 4, 1, 3]

const P2_MC: Round = {
  type: 'mc',
  q: 'How old was Abraham when he died?',
  opts: ['150 years old', '165 years old', '180 years old', '175 years old'],
  ans: 3,
}
const P2_TF: Round = {
  type: 'tf',
  q: "The Bible describes Abraham's death as tragic and too soon.",
  opts: ['TRUE', 'FALSE'],
  ans: 1,
}

const P3_PAIRS: MPair[] = [
  { left: 'The two sons who buried Abraham',       right: 'Isaac and Ishmael — together' },
  { left: 'The location of the burial',            right: 'The cave of Machpelah near Mamre in the field of Ephron' },
  { left: 'Who was buried there before Abraham',   right: 'His wife Sarah' },
  { left: 'What happened to Isaac after the burial', right: "God blessed Isaac after Abraham's death" },
]
const P3_RIGHT_ORDER = [1, 3, 0, 2]

const P3_YN: Round = {
  type: 'yn',
  q: 'Is this the first time Isaac and Ishmael appear together in the same scene since Ishmael was sent away?',
  opts: ['YES', 'NO'],
  ans: 0,
}
const P3_MC: Round = {
  type: 'mc',
  q: 'What does it mean that Isaac and Ishmael BOTH came to bury Abraham?',
  opts: [
    'They had secretly stayed in contact all along',
    'Even fractured families can come together to honour what truly matters',
    'Ishmael had forgiven Isaac for taking his birthright',
    'God forced them to attend the burial together',
  ],
  ans: 1,
}
const P3_TF: Round = {
  type: 'tf',
  q: 'Ishmael was excluded from Abraham\'s burial because he was not the promised son.',
  opts: ['TRUE', 'FALSE'],
  ans: 1,
}

const LEGACY_ELEMENTS = [
  'The Promised Land',
  'Descendants like stars',
  "God's blessing",
  'The covenant',
  'A great nation',
]

const P4_MC: Round = {
  type: 'mc',
  q: "What does God do for Isaac immediately after Abraham's death?",
  opts: [
    'God appears to Isaac on Mount Moriah',
    'God sends an angel to comfort Isaac',
    "God blesses Isaac after Abraham's death",
    'God gives Isaac a new covenant',
  ],
  ans: 2,
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function playBellTone() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(660, c.currentTime)
    g.gain.setValueAtTime(0.001, c.currentTime); g.gain.linearRampToValueAtTime(0.22, c.currentTime + 0.08)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.6)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 2.7)
  } catch (_) {}
}
function playGoldLightBurst() {
  try {
    const c = new AudioContext()
    ;[130, 260, 390, 520, 660, 880, 1100].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.06)
      g.gain.linearRampToValueAtTime(0.2, c.currentTime + i * 0.06 + 0.08)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 1.6)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.06); o.stop(c.currentTime + i * 0.06 + 1.8)
    })
  } catch (_) {}
}
function playPing() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.value = 900
    g.gain.setValueAtTime(0.20, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.32)
  } catch (_) {}
}
function playBuzz() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(150, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(85, c.currentTime + 0.28)
    g.gain.setValueAtTime(0.14, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.32)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.34)
  } catch (_) {}
}
function playChime() {
  try {
    const c = new AudioContext()
    ;[523.3, 659.3, 784.0].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.06)
      g.gain.linearRampToValueAtTime(0.18, c.currentTime + i * 0.06 + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 0.6)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.06); o.stop(c.currentTime + i * 0.06 + 0.65)
    })
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
function playClick() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.setValueAtTime(700, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.1)
    g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.16)
  } catch (_) {}
}
function playWhoosh() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(700, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.4)
    g.gain.setValueAtTime(0.001, c.currentTime); g.gain.linearRampToValueAtTime(0.14, c.currentTime + 0.06)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.42)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.44)
  } catch (_) {}
}
function playCoinShower() {
  try {
    const c = new AudioContext()
    for (let i = 0; i < 10; i++) {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'triangle'; o.frequency.value = 700 + Math.random() * 500
      g.gain.setValueAtTime(0.14, c.currentTime + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 0.3)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.06); o.stop(c.currentTime + i * 0.06 + 0.35)
    }
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
function playWarmChime(pitch = 1.0) {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.value = 660 * pitch
    g.gain.setValueAtTime(0.20, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.55)
  } catch (_) {}
}
function playSunriseSwell() {
  try {
    const c = new AudioContext()
    ;[130, 195, 260, 330, 440, 550, 660].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime)
      g.gain.linearRampToValueAtTime(0.16, c.currentTime + 1.1 + i * 0.05)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 3.0)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime); o.stop(c.currentTime + 3.1)
    })
  } catch (_) {}
}

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }
function mkBurst(cx: number, cy: number, cnt: number, hue = 42): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random() * Math.PI * 2; const s = Math.random() * 8 + 2
    return { x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, r: Math.random() * 3 + 1, life: 0, max: Math.random() * 70 + 55, hue }
  })
}
function mkEmbers(cnt: number, w: number, h: number, hue = 40): Pt[] {
  return Array.from({ length: cnt }, () => ({
    x: Math.random() * w, y: h + Math.random() * 40,
    vx: (Math.random() - 0.5) * 0.6, vy: -(Math.random() * 1.4 + 0.6),
    r: Math.random() * 2.4 + 1, life: 0, max: Math.random() * 140 + 120, hue,
  }))
}

// ── Reusable question card (YN / TF / MC) ───────────────────────────────────
function RoundCard({ round, sel, grace, graceMsg, onPick, label, extraClass }: {
  round: Round; sel: number | null; grace: boolean; graceMsg: string; onPick: (i: number) => void
  label?: string; extraClass?: string
}) {
  return (
    <div className={`l33-q-card${extraClass ? ' ' + extraClass : ''}`}>
      <div className="l33-round-label">
        {label ?? (round.type === 'yn' ? 'YES OR NO?' : round.type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?')}
      </div>
      <p className="l33-q-text">{round.q}</p>
      {round.type === 'yn' && (
        <div className="l33-yn-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l33-yn-btn${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'tf' && (
        <div className="l33-tf-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l33-tf-tablet${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'mc' && (
        <div className="l33-mc-opts">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l33-mc-opt${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {grace && <div className="l33-grace">✨ {graceMsg}</div>}
    </div>
  )
}

// ── Timed Select mechanic ───────────────────────────────────────────────────
function TimedSelect({ bubbles, positions, seconds, urgent, prompt, onCorrectTap, onWrongTap, onAllCollected, onTimeout, onWarmPulseAt3 }: {
  bubbles: Bubble[]; positions: Pos[]; seconds: number; urgent?: boolean; prompt: string
  onCorrectTap: () => void; onWrongTap: () => void; onAllCollected: () => void; onTimeout: () => void; onWarmPulseAt3?: () => void
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
        if (urgent && t - 1 === 3) onWarmPulseAt3?.()
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
  const timerClass = frac > 0.5 ? '' : frac > 0.25 ? ' warn' : ' danger'
  const urgentClass = urgent && timeLeft <= 5 ? ' urgent' : ''

  return (
    <div className="l33-timed-scene">
      <div className="l33-timer-wrap">
        <div className="l33-timer-label">{prompt}</div>
        <div className={`l33-timer-bar${timerClass}${urgentClass}`}>
          <div className="l33-timer-fill" style={{ width: `${(timeLeft / seconds) * 100}%` }} />
        </div>
        <div className="l33-timer-num">⏱️ {timeLeft}s</div>
      </div>
      <div className="l33-bubble-field">
        {bubbles.map((b, i) => (
          <button key={i}
            style={{ top: `${positions[i].top}%`, left: `${positions[i].left}%`, animationDelay: `${i * 0.15}s` }}
            disabled={collected[i] || revealed[i]}
            className={`l33-bubble${collected[i] || revealed[i] ? ' collected' : ''}${wrongIdx === i ? ' wrong-shake' : ''}`}
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
    <div className="l33-match-scene">
      <div className="l33-match-wrap" ref={containerRef}>
        <svg className="l33-match-svg">
          {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="l33-match-line" />)}
        </svg>
        <div className="l33-match-col l33-match-left">
          {pairs.map((p, i) => (
            <button key={i} ref={el => { leftRefs.current[i] = el }}
              disabled={leftMatched[i]}
              className={`l33-match-item${leftMatched[i] ? ' matched' : ''}${selectedLeft === i ? ' selected' : ''}${wrongFlash?.left === i ? ' wrong-shake' : ''}`}
              onClick={() => tapLeft(i)}>{p.left}</button>
          ))}
        </div>
        <div className="l33-match-col l33-match-right">
          {rightOrder.map((pairIdx, pos) => (
            <button key={pos} ref={el => { rightRefs.current[pos] = el }}
              disabled={rightMatched[pos]}
              className={`l33-match-item${rightMatched[pos] ? ' matched' : ''}${wrongFlash?.rightPos === pos ? ' wrong-shake' : ''}`}
              onClick={() => tapRight(pos)}>{pairs[pairIdx].right}</button>
          ))}
        </div>
      </div>
      {hint && <div className="l33-match-hint">{hint}</div>}
    </div>
  )
}

// ── Legacy Timeline mechanic (tap milestones into chronological order) ─────
function LegacyTimeline({ onCorrectTap, onWrongTap, onAllPlaced }: {
  onCorrectTap: () => void; onWrongTap: () => void; onAllPlaced: () => void
}) {
  const [placed, setPlaced]     = useState<boolean[]>(() => MILESTONES.map(() => false))
  const [wrongSlot, setWrongSlot] = useState<number | null>(null)
  const [hint, setHint]         = useState<string | null>(null)
  const nextRef = useRef(0)
  const doneRef = useRef(false)

  const tapMilestone = useCallback((idx: number) => {
    if (placed[idx] || doneRef.current) return
    if (idx === nextRef.current) {
      setPlaced(prev => { const n = [...prev]; n[idx] = true; return n })
      nextRef.current++
      onCorrectTap()
      if (nextRef.current >= MILESTONES.length && !doneRef.current) {
        doneRef.current = true
        onAllPlaced()
      }
    } else {
      setWrongSlot(idx)
      setHint('Try that one in a different order!')
      onWrongTap()
      setTimeout(() => setWrongSlot(s => s === idx ? null : s), 500)
      setTimeout(() => setHint(null), 1600)
    }
  }, [placed, onCorrectTap, onWrongTap, onAllPlaced])

  return (
    <div className="l33-timeline-mechanic">
      <div className="l33-timeline-track">
        {MILESTONES.map((m, i) => (
          <div key={i} className={`l33-timeline-slot${placed[i] ? ' filled' : ''}`}>
            {placed[i] && <span className="l33-timeline-slot-icon">{m.icon}</span>}
          </div>
        ))}
      </div>
      <div className="l33-timeline-pool">
        {TIMELINE_DISPLAY.map(idx => !placed[idx] && (
          <button key={idx}
            className={`l33-milestone-btn${wrongSlot === idx ? ' wrong-shake' : ''}`}
            onClick={() => tapMilestone(idx)}>
            <span className="l33-milestone-icon">{MILESTONES[idx].icon}</span>
            <span className="l33-milestone-text">{MILESTONES[idx].text}</span>
          </button>
        ))}
      </div>
      <div className="l33-timeline-hint">{hint ?? 'Tap the milestones in the order they happened'}</div>
    </div>
  )
}

// ── Legacy Passing mechanic (tap elements to send Abraham → Isaac) ─────────
function LegacyPass({ onPass, onAllPassed }: {
  onPass: () => void; onAllPassed: () => void
}) {
  const [flying, setFlying] = useState<boolean[]>(() => LEGACY_ELEMENTS.map(() => false))
  const [passed, setPassed] = useState<boolean[]>(() => LEGACY_ELEMENTS.map(() => false))
  const doneRef = useRef(false)
  const passedRef = useRef(0)

  const tapElement = useCallback((i: number) => {
    if (flying[i] || passed[i] || doneRef.current) return
    setFlying(prev => { const n = [...prev]; n[i] = true; return n })
    onPass()
    setTimeout(() => {
      setFlying(prev => { const n = [...prev]; n[i] = false; return n })
      setPassed(prev => { const n = [...prev]; n[i] = true; return n })
      passedRef.current++
      if (passedRef.current >= LEGACY_ELEMENTS.length && !doneRef.current) {
        doneRef.current = true
        onAllPassed()
      }
    }, 650)
  }, [flying, passed, onPass, onAllPassed])

  return (
    <div className="l33-pass-mechanic">
      <div className="l33-pass-stage">
        <div className="l33-pass-fig l33-pass-fig-left">🧓</div>
        <div className="l33-pass-fig l33-pass-fig-right">🧔</div>
      </div>
      <div className="l33-pass-chips">
        {LEGACY_ELEMENTS.map((el, i) => !passed[i] && (
          <button key={i}
            className={`l33-pass-chip${flying[i] ? ' flying' : ''}`}
            disabled={flying[i]}
            onClick={() => tapElement(i)}>
            {el}
          </button>
        ))}
      </div>
      <div className="l33-pass-hint">Tap each legacy to pass it from Abraham to Isaac</div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level33({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [goldBurst, setGoldBurst]   = useState(false)
  const [sunrise, setSunrise]       = useState(false)
  const [warmPulse, setWarmPulse]   = useState(false)
  const [banner, setBannerText]     = useState<string | null>(null)
  const [bannerVariant, setBannerVariant] = useState<Banner>('gold')

  // Cinematic
  const [cinStep, setCinStep] = useState(0)

  // Phase 1
  const [p1Ready, setP1Ready] = useState(false)
  const [p1Sub, setP1Sub]     = useState<P1Sub>('timed')
  const [p1McSel, setP1McSel] = useState<number | null>(null)
  const [p1McGrace, setP1McGrace] = useState(false)
  const [p1YnSel, setP1YnSel] = useState<number | null>(null)
  const [p1YnGrace, setP1YnGrace] = useState(false)
  const [p1TfSel, setP1TfSel] = useState<number | null>(null)
  const [p1TfGrace, setP1TfGrace] = useState(false)

  // Phase 2
  const [p2Ready, setP2Ready] = useState(false)
  const [p2Sub, setP2Sub]     = useState<P2Sub>('timeline')
  const [p2McSel, setP2McSel] = useState<number | null>(null)
  const [p2McGrace, setP2McGrace] = useState(false)
  const [p2TfSel, setP2TfSel] = useState<number | null>(null)
  const [p2TfGrace, setP2TfGrace] = useState(false)

  // Phase 3
  const [p3Ready, setP3Ready] = useState(false)
  const [p3Sub, setP3Sub]     = useState<P3Sub>('match')
  const [p3YnSel, setP3YnSel] = useState<number | null>(null)
  const [p3YnGrace, setP3YnGrace] = useState(false)
  const [p3McSel, setP3McSel] = useState<number | null>(null)
  const [p3McGrace, setP3McGrace] = useState(false)
  const [p3TfSel, setP3TfSel] = useState<number | null>(null)
  const [p3TfGrace, setP3TfGrace] = useState(false)

  // Phase 4
  const [p4Ready, setP4Ready] = useState(false)
  const [p4Sub, setP4Sub]     = useState<P4Sub>('pass')
  const [p4McSel, setP4McSel] = useState<number | null>(null)
  const [p4McGrace, setP4McGrace] = useState(false)

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
  const shake = useCallback(() => {
    setShakeClass('l33-tremble'); setTimeout(() => setShakeClass(''), 800)
  }, [])

  const pulseWarm = useCallback(() => {
    setWarmPulse(true); setTimeout(() => setWarmPulse(false), 1000)
  }, [])

  const showBanner = useCallback((text: string, variant: Banner = 'gold', ms = 3000) => {
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
    speakRaw(text, 0.85, 1.05)
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
          p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.98; p.life++
          const op = Math.pow(1 - p.life / p.max, 0.55) * 0.95
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},92%,60%,${op * 0.18})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.6, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},88%,75%,${op * 0.70})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},65%,97%,${op})`; ctx.fill()
        }
      }
      if (particlesRef.current.length > 0) rafRef.current = requestAnimationFrame(tick)
      else rafRef.current = 0
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const burst = useCallback((cx: number, cy: number, cnt = 70, hue = 42) => {
    particlesRef.current.push(...mkBurst(cx, cy, cnt, hue)); runParticles()
  }, [runParticles])

  const emberRise = useCallback((cnt = 60, hue = 40) => {
    const cv = canvasRef.current
    const w = cv?.width ?? window.innerWidth, h = cv?.height ?? window.innerHeight
    particlesRef.current.push(...mkEmbers(cnt, w, h, hue)); runParticles()
  }, [runParticles])

  const fireGoldBurst = useCallback(() => {
    setGoldBurst(true); setTimeout(() => setGoldBurst(false), 1400)
    for (let i = 0; i < 10; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 42 : 36
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 60, hue)
      }, i * 110)
  }, [burst])

  const fireSunrise = useCallback(() => {
    setSunrise(true); setTimeout(() => setSunrise(false), 3000)
    playSunriseSwell()
    emberRise(90, 40)
    setTimeout(() => emberRise(60, 44), 500)
    setTimeout(() => emberRise(60, 36), 1000)
  }, [emberRise])

  const addEarned = useCallback((n: number) => {
    if (n <= 0) return
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    const ts = [
      setTimeout(() => setCinStep(1), 700),
      setTimeout(() => setCinStep(2), 2000),
      setTimeout(() => setCinStep(3), 3300),
      setTimeout(() => setCinStep(4), 4600),
      setTimeout(() => setCinStep(5), 6600),
      setTimeout(() => setCinStep(6), 7900),
      setTimeout(() => { setCinStep(7); playBellTone() }, 9200),
      setTimeout(() => { setCinStep(8); playGoldLightBurst(); fireGoldBurst(); shake() }, 10800),
      setTimeout(() => setCinStep(9), 11700),
      setTimeout(() => { phaseRef.current = 'phase1'; setPhase('phase1') }, 13400),
    ]
    return () => ts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Ready(false); setP1Sub('timed')
    setP1McSel(null); setP1McGrace(false); setP1YnSel(null); setP1YnGrace(false); setP1TfSel(null); setP1TfGrace(false)
    speak("After Sarah died, Abraham's story was not over. Life continued. Family grew. And Abraham made careful plans to ensure that his legacy would be ordered and clear.", () => {
      setP1Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p1TimedCorrect = useCallback(() => { addEarned(8); playPing() }, [addEarned])
  const p1TimedWrong   = useCallback(() => { playBuzz() }, [])
  const p1TimedAll     = useCallback(() => {
    addEarned(25); playGoldPop(); fireGoldBurst(); shake()
    showBanner("ABRAHAM'S LEGACY TAKES SHAPE!!", 'gold', 3000)
    fireAffirmation()
    setTimeout(() => setP1Sub('mc'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])
  const p1TimedTimeout = useCallback(() => {
    showBanner('Keep going — the story continues!', 'comedic', 3000)
    setTimeout(() => setP1Sub('mc'), 3200)
  }, [showBanner])

  const handleP1Mc = useCallback((idx: number) => {
    if (p1McSel !== null || p1McGrace) return
    setP1McSel(idx)
    if (idx === P1_MC.ans) {
      addEarned(20); playGoldPop(); shake()
      fireAffirmation()
      setTimeout(() => setP1Sub('yn'), 2400)
    } else {
      setP1McGrace(true); setP1McSel(null); playBuzz()
      setTimeout(() => setP1McGrace(false), 2800)
    }
  }, [p1McSel, p1McGrace, addEarned, shake, fireAffirmation])

  const handleP1Yn = useCallback((idx: number) => {
    if (p1YnSel !== null || p1YnGrace) return
    setP1YnSel(idx)
    if (idx === P1_YN.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner("ABRAHAM PROTECTED ISAAC'S INHERITANCE!!", 'gold', 3200)
      setTimeout(() => setP1Sub('tf'), 3400)
    } else {
      setP1YnGrace(true); setP1YnSel(null); playBuzz()
      setTimeout(() => setP1YnGrace(false), 2800)
    }
  }, [p1YnSel, p1YnGrace, addEarned, shake, showBanner])

  const handleP1Tf = useCallback((idx: number) => {
    if (p1TfSel !== null || p1TfGrace) return
    setP1TfSel(idx)
    if (idx === P1_TF.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner('ISAAC WAS THE HEIR OF THE PROMISE!!', 'gold', 3200)
      setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 3400)
    } else {
      setP1TfGrace(true); setP1TfSel(null); playBuzz()
      setTimeout(() => setP1TfGrace(false), 2800)
    }
  }, [p1TfSel, p1TfGrace, addEarned, shake, showBanner])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Ready(false); setP2Sub('timeline')
    setP2McSel(null); setP2McGrace(false); setP2TfSel(null); setP2TfGrace(false)
    speak("Abraham's life was not measured in years alone. It was measured in faith, obedience and legacy. Every step of his journey built something that would last forever.", () => {
      setP2Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p2TimelineCorrect = useCallback(() => { addEarned(8); playClick() }, [addEarned])
  const p2TimelineWrong   = useCallback(() => { playBuzz() }, [])
  const p2TimelineAll     = useCallback(() => {
    addEarned(35); playGoldPop(); fireGoldBurst(); shake()
    showBanner("ABRAHAM'S FULL JOURNEY REVEALED!!", 'legendary', 3200)
    fireAffirmation()
    setTimeout(() => setP2Sub('mc'), 3400)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP2Mc = useCallback((idx: number) => {
    if (p2McSel !== null || p2McGrace) return
    setP2McSel(idx)
    if (idx === P2_MC.ans) {
      addEarned(20); playGoldPop(); shake()
      fireAffirmation()
      setTimeout(() => setP2Sub('tf'), 2400)
    } else {
      setP2McGrace(true); setP2McSel(null); playBuzz()
      setTimeout(() => setP2McGrace(false), 2800)
    }
  }, [p2McSel, p2McGrace, addEarned, shake, fireAffirmation])

  const handleP2Tf = useCallback((idx: number) => {
    if (p2TfSel !== null || p2TfGrace) return
    setP2TfSel(idx)
    if (idx === P2_TF.ans) {
      addEarned(20); playWarmChime(1.1); shake()
      showBanner('FULL OF YEARS — A LIFE WELL LIVED!!', 'emotional', 3400)
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 3600)
    } else {
      setP2TfGrace(true); setP2TfSel(null); playBuzz()
      setTimeout(() => setP2TfGrace(false), 2800)
    }
  }, [p2TfSel, p2TfGrace, addEarned, shake, showBanner])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Ready(false); setP3Sub('match')
    setP3YnSel(null); setP3YnGrace(false); setP3McSel(null); setP3McGrace(false); setP3TfSel(null); setP3TfGrace(false)
    speak("Something remarkable happened at Abraham's burial. Two brothers who had been separated for years — came together. Sometimes grief does what nothing else can.", () => {
      setP3Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p3MatchCorrect = useCallback(() => { addEarned(15); playChime() }, [addEarned])
  const p3MatchWrong   = useCallback(() => { playBuzz() }, [])
  const p3MatchAll     = useCallback(() => {
    addEarned(30); playGoldPop(); fireGoldBurst(); shake()
    showBanner('TWO BROTHERS, ONE FAREWELL!!', 'emotional', 3200)
    fireAffirmation()
    setTimeout(() => setP3Sub('yn'), 3400)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP3Yn = useCallback((idx: number) => {
    if (p3YnSel !== null || p3YnGrace) return
    setP3YnSel(idx)
    if (idx === P3_YN.ans) {
      addEarned(25); playWarmChime(1.1); shake()
      showBanner('GRIEF REUNITED THE BROTHERS!!', 'emotional', 3400)
      setTimeout(() => setP3Sub('mc'), 3600)
    } else {
      setP3YnGrace(true); setP3YnSel(null); playBuzz()
      setTimeout(() => setP3YnGrace(false), 2800)
    }
  }, [p3YnSel, p3YnGrace, addEarned, shake, showBanner])

  const handleP3Mc = useCallback((idx: number) => {
    if (p3McSel !== null || p3McGrace) return
    setP3McSel(idx)
    if (idx === P3_MC.ans) {
      addEarned(25); playGoldPop(); shake()
      fireAffirmation()
      setTimeout(() => setP3Sub('tf'), 2400)
    } else {
      setP3McGrace(true); setP3McSel(null); playBuzz()
      setTimeout(() => setP3McGrace(false), 2800)
    }
  }, [p3McSel, p3McGrace, addEarned, shake, fireAffirmation])

  const handleP3Tf = useCallback((idx: number) => {
    if (p3TfSel !== null || p3TfGrace) return
    setP3TfSel(idx)
    if (idx === P3_TF.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner('BOTH SONS HONOURED THEIR FATHER!!', 'gold', 3200)
      setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 3400)
    } else {
      setP3TfGrace(true); setP3TfSel(null); playBuzz()
      setTimeout(() => setP3TfGrace(false), 2800)
    }
  }, [p3TfSel, p3TfGrace, addEarned, shake, showBanner])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Ready(false); setP4Sub('pass'); setP4McSel(null); setP4McGrace(false)
    speak("Abraham's story ended. But the promise did not end with him. God had made a commitment that went beyond one man's lifetime. The journey was just beginning for the next generation.", () => {
      setP4Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p4Pass = useCallback(() => { addEarned(8); playWhoosh() }, [addEarned])
  const p4PassAll = useCallback(() => {
    addEarned(30); playGoldPop(); fireGoldBurst(); shake()
    showBanner('THE BATON HAS BEEN PASSED!!', 'legendary', 3200)
    fireAffirmation()
    setTimeout(() => setP4Sub('mc'), 3400)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP4Mc = useCallback((idx: number) => {
    if (p4McSel !== null || p4McGrace) return
    setP4McSel(idx)
    if (idx === P4_MC.ans) {
      addEarned(20); playGoldPop(); shake()
      setTimeout(() => setP4Sub('boss'), 2400)
    } else {
      setP4McGrace(true); setP4McSel(null); playBuzz()
      setTimeout(() => setP4McGrace(false), 2800)
    }
  }, [p4McSel, p4McGrace, addEarned, shake])

  const p4BossCorrect = useCallback(() => { playPing() }, [])
  const p4BossWrong   = useCallback(() => { playBuzz() }, [])
  const p4BossAll     = useCallback(() => {
    addEarned(60); fireSunrise(); playCoinShower()
    showBanner(`${playerName} — ABRAHAM WOULD CALL YOU BLESSED!!`, 'legendary', 4400)
    fireAffirmation()
    setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4800)
  }, [addEarned, fireSunrise, showBanner, playerName, fireAffirmation])
  const p4BossTimeout = useCallback(() => {
    showBanner('Keep trusting — the legacy still stands!', 'comedic', 3000)
    setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 3200)
  }, [showBanner])
  const p4BossWarmPulse = useCallback(() => { pulseWarm() }, [pulseWarm])

  // ── ENDING ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ending') return
    playFanfare()
    const total = earnedRef.current; let cur = 0
    const step = Math.max(1, Math.ceil(total / 60))
    const id = setInterval(() => {
      cur = Math.min(cur + step, total); setCoinCount(cur)
      if (cur % (Math.ceil(total / 6)) === 0 || cur === total) playWarmChime(0.8 + (cur / total) * 0.5)
      if (cur >= total) clearInterval(id)
    }, 28)
    for (let i = 0; i < 8; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 42 : 36
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.6, 34, hue)
      }, i * 200)
    const ts = [
      setTimeout(() => setStarsShown(1), 1400),
      setTimeout(() => setStarsShown(2), 2100),
      setTimeout(() => setStarsShown(3), 2800),
      setTimeout(() => {
        setShowScripture(true)
        speak('Abraham breathed his last and died at a good old age, an old man and full of years, and he was gathered to his people. Genesis chapter 25, verse 8.')
      }, 3600),
      setTimeout(() => setShowAdvance(true), 7000),
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
        verse="Abraham breathed his last and died at a good old age, an old man and full of years; and he was gathered to his people."
        verseRef="Genesis 25:8"
        subtitle={`${playerName} — a life fully lived leaves a legacy that lasts`}
        voiceLine={`${playerName}. Abraham lived fully, gave generously, and finished in peace. Your story isn't over either — write it well.`}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`l33-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l33-bg${cinStep >= 8 ? ' visible' : ''}`} />
      {cinStep < 8 && <div className="l33-black" />}
      {cinStep >= 8 && <div className="l33-bg-overlay" />}
      <canvas ref={canvasRef} className="l33-canvas" />
      {goldBurst && <div className="l33-gold-flash" />}
      {sunrise && <div className="l33-sunrise-flash" />}
      {warmPulse && <div className="l33-warm-pulse" />}

      {/* HUD */}
      {phase !== 'cinematic' && (
        <div className="l33-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && (
        <div className="l33-level-label">1-33 FULL OF YEARS</div>
      )}

      {/* Global banner */}
      {banner && <div className={`l33-banner l33-banner-${bannerVariant}`}>{banner}</div>}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l33-cin">
          <div className="l33-sunset-glow" />
          {cinStep === 1 && <div className="l33-cin-line">He left his homeland.</div>}
          {cinStep === 2 && <div className="l33-cin-line">He trusted the impossible.</div>}
          {cinStep === 3 && <div className="l33-cin-line">He fathered nations.</div>}
          {cinStep === 4 && <div className="l33-cin-line">He walked with God.</div>}
          {cinStep === 5 && <div className="l33-cin-word">Abraham.</div>}
          {cinStep === 6 && <div className="l33-cin-word">Age 175.</div>}
          {cinStep === 7 && <div className="l33-cin-word l33-cin-gentle">Full of years.</div>}
          {cinStep >= 8 && (
            <div className="l33-title-card">
              <span className="l33-title-icon">🕯️</span>
              <span className="l33-title-word">FULL OF YEARS</span>
              <span className="l33-title-icon">🕯️</span>
            </div>
          )}
          {cinStep >= 9 && <div className="l33-title-sub">The end of the greatest journey in Genesis.</div>}
        </div>
      )}

      {/* ── PHASE 1: Keturah and the Sons ── */}
      {phase === 'phase1' && (
        <div className="l33-phase-wrap l33-sons-scene">
          <div className="l33-phase-header">
            <div className="l33-phase-badge">PHASE 1</div>
            <div className="l33-phase-title">KETURAH AND THE SONS 👨‍👩‍👧‍👦</div>
          </div>

          {p1Sub === 'timed' && p1Ready && (
            <TimedSelect key="p1-round1" bubbles={ROUND1_BUBBLES} positions={ROUND1_POS} seconds={12}
              prompt="TAP ALL THE TRUE STATEMENTS!"
              onCorrectTap={p1TimedCorrect} onWrongTap={p1TimedWrong}
              onAllCollected={p1TimedAll} onTimeout={p1TimedTimeout} />
          )}

          {p1Sub === 'mc' && (
            <RoundCard round={P1_MC} sel={p1McSel} grace={p1McGrace}
              graceMsg="Think about how many sons Keturah bore — try again!" onPick={handleP1Mc} />
          )}

          {p1Sub === 'yn' && (
            <RoundCard round={P1_YN} sel={p1YnSel} grace={p1YnGrace}
              graceMsg="Think about what Abraham did to protect Isaac's inheritance — try again!" onPick={handleP1Yn} />
          )}

          {p1Sub === 'tf' && (
            <RoundCard round={P1_TF} sel={p1TfSel} grace={p1TfGrace}
              graceMsg="Think about who received the full inheritance — try again!" onPick={handleP1Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 2: 175 Years ── */}
      {phase === 'phase2' && (
        <div className="l33-phase-wrap l33-legacy-scene">
          <div className="l33-phase-header">
            <div className="l33-phase-badge">PHASE 2</div>
            <div className="l33-phase-title">175 YEARS 🌟</div>
          </div>

          {p2Sub === 'timeline' && p2Ready && (
            <LegacyTimeline onCorrectTap={p2TimelineCorrect} onWrongTap={p2TimelineWrong} onAllPlaced={p2TimelineAll} />
          )}

          {p2Sub === 'mc' && (
            <RoundCard round={P2_MC} sel={p2McSel} grace={p2McGrace}
              graceMsg="Think about the number the Bible gives for his age — try again!" onPick={handleP2Mc} />
          )}

          {p2Sub === 'tf' && (
            <RoundCard round={P2_TF} sel={p2TfSel} grace={p2TfGrace}
              graceMsg="Think about how Genesis describes his death — try again!" onPick={handleP2Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 3: Together at the Grave ── */}
      {phase === 'phase3' && (
        <div className="l33-phase-wrap l33-grave-scene">
          <div className="l33-phase-header">
            <div className="l33-phase-badge">PHASE 3</div>
            <div className="l33-phase-title">TOGETHER AT THE GRAVE 🤝</div>
          </div>

          {p3Sub === 'match' && p3Ready && (
            <MatchRound pairs={P3_PAIRS} rightOrder={P3_RIGHT_ORDER}
              onCorrectMatch={p3MatchCorrect} onWrongMatch={p3MatchWrong} onAllMatched={p3MatchAll} />
          )}

          {p3Sub === 'yn' && (
            <RoundCard round={P3_YN} sel={p3YnSel} grace={p3YnGrace}
              graceMsg="Think about how long Ishmael had been away — try again!" onPick={handleP3Yn} />
          )}

          {p3Sub === 'mc' && (
            <RoundCard round={P3_MC} sel={p3McSel} grace={p3McGrace}
              graceMsg="Think about what unites broken families — try again!" onPick={handleP3Mc} />
          )}

          {p3Sub === 'tf' && (
            <RoundCard round={P3_TF} sel={p3TfSel} grace={p3TfGrace}
              graceMsg="Think about who actually attended the burial — try again!" onPick={handleP3Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 4: The Baton is Passed ── */}
      {phase === 'phase4' && (
        <div className="l33-phase-wrap l33-baton-scene">
          <div className="l33-phase-header">
            <div className="l33-phase-badge">PHASE 4</div>
            <div className="l33-phase-title">THE BATON IS PASSED 🏆</div>
          </div>

          {p4Sub === 'pass' && p4Ready && (
            <LegacyPass onPass={p4Pass} onAllPassed={p4PassAll} />
          )}

          {p4Sub === 'mc' && (
            <RoundCard round={P4_MC} sel={p4McSel} grace={p4McGrace}
              graceMsg="Think about what God does for Isaac right after — try again!" onPick={handleP4Mc} />
          )}

          {p4Sub === 'boss' && (
            <TimedSelect key="p4-boss" bubbles={ROUND2_BUBBLES} positions={ROUND2_POS} seconds={15} urgent
              prompt="FINAL ROUND — TAP ALL TRUE STATEMENTS!!"
              onCorrectTap={p4BossCorrect} onWrongTap={p4BossWrong}
              onAllCollected={p4BossAll} onTimeout={p4BossTimeout} onWarmPulseAt3={p4BossWarmPulse} />
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <div className="l33-ending-wrap">
          <div className="l33-ending-glow" />
          <div className="l33-ending-silhouette" aria-hidden>🧓</div>
          <div className="l33-ending-name">{playerName} — YOUR LEGACY IS ALREADY BEING WRITTEN.</div>
          <div className="l33-stars-row">
            {starsShown >= 1 && <div className="l33-end-star l33-st1">⭐</div>}
            {starsShown >= 2 && <div className="l33-end-star l33-st2">⭐</div>}
            {starsShown >= 3 && <div className="l33-end-star l33-st3">⭐</div>}
          </div>
          <div className="l33-coin-tally">
            <span className="l33-coin-icon">🪙</span>
            <span className="l33-coin-num">{coinCount}</span>
            <span className="l33-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l33-scripture-card">
              <div className="l33-scripture-watermark" aria-hidden>⭐</div>
              <div className="l33-scripture-quote">
                "Abraham breathed his last and died at a good old age, an old man and full of years; and he was gathered to his people."
              </div>
              <div className="l33-scripture-ref">— Genesis 25:8</div>
            </div>
          )}
          {showAdvance && (
            <button className="l33-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-34 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
