import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level30.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'timed' | 'yn' | 'mc' | 'tf'
type P2Sub = 'match' | 'tf' | 'mc'
type P3Sub = 'hold' | 'yn' | 'mc'
type P4Sub = 'ram' | 'mc1' | 'mc2' | 'jesus' | 'boss'
type RoundT = 'yn' | 'tf' | 'mc'
type Banner = 'gold' | 'warn' | 'comedic' | 'legendary' | 'emotional'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }
interface Bubble { text: string; correct: boolean }
interface MPair { left: string; right: string }
interface Pos { top: number; left: number }

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'You trusted like Abraham trusted!!',
  'Your faith just moved a mountain!!',
  "You heard God's voice — and you obeyed!!",
  'The ram was already in the thicket for you!!',
  'You passed the ultimate test!!',
  'God provided — and He will provide for you too!!',
  "Your obedience just unlocked heaven's blessing!!",
  "You didn't hold back — and neither did God!!",
  'Jehovah Jireh — your provider — sees you!!',
  'Abraham would be proud of you right now!!',
]

const ROUND1_POS: Pos[] = [
  { top: 8,  left: 18 }, { top: 6,  left: 68 }, { top: 30, left: 42 },
  { top: 40, left: 12 }, { top: 55, left: 78 }, { top: 68, left: 38 },
]
const ROUND1_BUBBLES: Bubble[] = [
  { text: 'Abraham rose early the next morning', correct: true },
  { text: 'Abraham argued with God all night', correct: false },
  { text: 'Sarah went with them on the journey', correct: false },
  { text: 'Abraham took two servants and Isaac', correct: true },
  { text: 'They arrived at the mountain immediately', correct: false },
  { text: 'The journey took three days', correct: true },
]

const ROUND2_POS: Pos[] = [
  { top: 5,  left: 15 }, { top: 4,  left: 65 }, { top: 22, left: 40 }, { top: 30, left: 85 },
  { top: 42, left: 10 }, { top: 50, left: 62 }, { top: 65, left: 30 }, { top: 72, left: 78 },
]
const ROUND2_BUBBLES: Bubble[] = [
  { text: 'Abraham obeyed God without delay', correct: true },
  { text: "Abraham earned God's blessing by his own goodness", correct: false },
  { text: 'God provided the sacrifice', correct: true },
  { text: 'God was cruel to test Abraham', correct: false },
  { text: 'True faith obeys before it understands', correct: true },
  { text: 'Isaac was actually sacrificed', correct: false },
  { text: 'Jesus is the ultimate Lamb of God', correct: true },
  { text: 'This story has nothing to do with Jesus', correct: false },
]

const P1_YN: Round = { type: 'yn', q: 'Did Abraham hesitate and wait several days before obeying God?', opts: ['YES', 'NO'], ans: 1 }
const P1_MC: Round = {
  type: 'mc',
  q: 'What did Abraham tell his servants when they reached the mountain?',
  opts: [
    'Wait here while I go alone',
    'Pray for us while we go up',
    'We will worship and then WE will come back to you',
    'This is as far as you can come',
  ],
  ans: 2,
}
const P1_TF: Round = { type: 'tf', q: 'Abraham told Isaac exactly what God had commanded him to do.', opts: ['TRUE', 'FALSE'], ans: 1 }

const P2_PAIRS: MPair[] = [
  { left: 'Isaac carried',            right: 'The wood for the burnt offering' },
  { left: 'Isaac asked his father',   right: 'Where is the lamb for the burnt offering?' },
  { left: 'Abraham answered',         right: 'God himself will provide the lamb, my son' },
  { left: 'They arrived together',    right: 'At the place God had told him' },
]
const P2_RIGHT_ORDER = [2, 0, 3, 1]
const P2_TF: Round = { type: 'tf', q: 'When Isaac asked where the lamb was, Abraham had no answer and panicked.', opts: ['TRUE', 'FALSE'], ans: 1 }
const P2_MC: Round = {
  type: 'mc',
  q: 'What did Abraham say when Isaac asked where the lamb was?',
  opts: [
    "I don't know — let's trust God",
    'You are the lamb, my son',
    'God himself will provide the lamb, my son',
    'We brought enough for the offering',
  ],
  ans: 2,
}

const P3_YN: Round = { type: 'yn', q: 'Did God actually want Abraham to kill Isaac?', opts: ['YES', 'NO'], ans: 1 }
const P3_MC: Round = {
  type: 'mc',
  q: 'What did the angel say to Abraham from heaven?',
  opts: [
    'Well done — the sacrifice is complete',
    'Stop — God has changed His mind',
    'Do not lay a hand on the boy — now I know you fear God',
    'Abraham — I will do this for you',
  ],
  ans: 2,
}

const P4_MC1: Round = {
  type: 'mc',
  q: 'What was caught in the thicket that God provided?',
  opts: ['A lamb without blemish', 'A goat', 'Two doves', 'A ram caught by its horns'],
  ans: 3,
}
const P4_MC2: Round = {
  type: 'mc',
  q: 'What name did Abraham give to that place on the mountain?',
  opts: [
    'El Roi — The God Who Sees',
    'El Shaddai — God Almighty',
    'El Olam — The Eternal God',
    'Jehovah Jireh — The LORD Will Provide',
  ],
  ans: 3,
}

const JESUS_LINES = [
  'A father.',
  'A beloved son.',
  'A mountain.',
  'A sacrifice.',
  'A substitute.',
  'Sound familiar?',
  'God did for us what He stopped Abraham from doing.',
  'He gave His only Son.',
  'Jesus — the Lamb of God.',
]

// ── Audio ─────────────────────────────────────────────────────────────────────
function playBassRumble() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(45, c.currentTime)
    g.gain.setValueAtTime(0.001, c.currentTime); g.gain.linearRampToValueAtTime(0.35, c.currentTime + 1.4)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.2)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 2.3)
  } catch (_) {}
}
function playGoldLightBurst() {
  try {
    const c = new AudioContext()
    ;[130, 260, 390, 520, 660, 880, 1100, 1320].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.05)
      g.gain.linearRampToValueAtTime(0.22, c.currentTime + i * 0.05 + 0.08)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.05 + 1.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.05); o.stop(c.currentTime + i * 0.05 + 1.7)
    })
  } catch (_) {}
}
function playPing() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.value = 920
    g.gain.setValueAtTime(0.20, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.32)
  } catch (_) {}
}
function playBuzz() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(160, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.28)
    g.gain.setValueAtTime(0.16, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.32)
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
function playThunder() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(90, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.8)
    g.gain.setValueAtTime(0.4, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.3)
  } catch (_) {}
}
function playAngelCall() {
  try {
    const c = new AudioContext()
    ;[440, 554, 659, 880].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.1)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.1 + 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.1 + 1.4)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.1); o.stop(c.currentTime + i * 0.1 + 1.6)
    })
  } catch (_) {}
}
function playRustling() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(500, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(260, c.currentTime + 0.25)
    g.gain.setValueAtTime(0.08, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.32)
  } catch (_) {}
}
function playHolyTone() {
  try {
    const c = new AudioContext()
    ;[261.6, 329.6, 392.0].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.2)
      g.gain.linearRampToValueAtTime(0.10, c.currentTime + i * 0.2 + 0.4)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.2 + 2.4)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.2); o.stop(c.currentTime + i * 0.2 + 2.6)
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
function playTriumphChime(pitch = 1.0) {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.value = 660 * pitch
    g.gain.setValueAtTime(0.20, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
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

// ── Reusable question card (YN / TF / MC) ───────────────────────────────────
function RoundCard({ round, sel, grace, graceMsg, onPick, label, extraClass }: {
  round: Round; sel: number | null; grace: boolean; graceMsg: string; onPick: (i: number) => void
  label?: string; extraClass?: string
}) {
  return (
    <div className={`l30-q-card${extraClass ? ' ' + extraClass : ''}`}>
      <div className="l30-round-label">
        {label ?? (round.type === 'yn' ? 'YES OR NO?' : round.type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?')}
      </div>
      <p className="l30-q-text">{round.q}</p>
      {round.type === 'yn' && (
        <div className="l30-yn-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l30-yn-btn${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'tf' && (
        <div className="l30-tf-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l30-tf-tablet${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'mc' && (
        <div className="l30-mc-opts">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l30-mc-opt${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {grace && <div className="l30-grace">✨ {graceMsg}</div>}
    </div>
  )
}

// ── Timed Select mechanic ───────────────────────────────────────────────────
function TimedSelect({ bubbles, positions, seconds, urgent, prompt, onCorrectTap, onWrongTap, onAllCollected, onTimeout, onShakeAt3 }: {
  bubbles: Bubble[]; positions: Pos[]; seconds: number; urgent?: boolean; prompt: string
  onCorrectTap: () => void; onWrongTap: () => void; onAllCollected: () => void; onTimeout: () => void; onShakeAt3?: () => void
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
        if (urgent && t - 1 === 3) onShakeAt3?.()
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
    <div className="l30-timed-scene">
      {urgent && timeLeft <= 5 && (
        <div className="l30-gold-pulse-swirl" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="l30-swirl-mote" style={{ left: `${(i * 17 + 5) % 100}%`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      )}
      <div className="l30-timer-wrap">
        <div className="l30-timer-label">{prompt}</div>
        <div className={`l30-timer-bar${timerClass}${urgentClass}`}>
          <div className="l30-timer-fill" style={{ width: `${(timeLeft / seconds) * 100}%` }} />
        </div>
        <div className="l30-timer-num">⏱️ {timeLeft}s</div>
      </div>
      <div className="l30-bubble-field">
        {bubbles.map((b, i) => (
          <button key={i}
            style={{ top: `${positions[i].top}%`, left: `${positions[i].left}%`, animationDelay: `${i * 0.15}s` }}
            disabled={collected[i] || revealed[i]}
            className={`l30-bubble${collected[i] || revealed[i] ? ' collected' : ''}${wrongIdx === i ? ' wrong-shake' : ''}`}
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
    <div className="l30-match-scene">
      <div className="l30-match-wrap" ref={containerRef}>
        <svg className="l30-match-svg">
          {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="l30-match-line" />)}
        </svg>
        <div className="l30-match-col l30-match-left">
          {pairs.map((p, i) => (
            <button key={i} ref={el => { leftRefs.current[i] = el }}
              disabled={leftMatched[i]}
              className={`l30-match-item${leftMatched[i] ? ' matched' : ''}${selectedLeft === i ? ' selected' : ''}${wrongFlash?.left === i ? ' wrong-shake' : ''}`}
              onClick={() => tapLeft(i)}>{p.left}</button>
          ))}
        </div>
        <div className="l30-match-col l30-match-right">
          {rightOrder.map((pairIdx, pos) => (
            <button key={pos} ref={el => { rightRefs.current[pos] = el }}
              disabled={rightMatched[pos]}
              className={`l30-match-item${rightMatched[pos] ? ' matched' : ''}${wrongFlash?.rightPos === pos ? ' wrong-shake' : ''}`}
              onClick={() => tapRight(pos)}>{pairs[pairIdx].right}</button>
          ))}
        </div>
      </div>
      {hint && <div className="l30-match-hint">{hint}</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level30({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [whiteBurst, setWhiteBurst] = useState(false)
  const [goldBurst, setGoldBurst]   = useState(false)
  const [banner, setBannerText]     = useState<string | null>(null)
  const [bannerVariant, setBannerVariant] = useState<Banner>('gold')

  // Cinematic
  const [cinStep, setCinStep] = useState(0)

  // Phase 1
  const [p1Ready, setP1Ready] = useState(false)
  const [p1Sub, setP1Sub]     = useState<P1Sub>('timed')
  const [p1YnSel, setP1YnSel] = useState<number | null>(null)
  const [p1YnGrace, setP1YnGrace] = useState(false)
  const [p1McSel, setP1McSel] = useState<number | null>(null)
  const [p1McGrace, setP1McGrace] = useState(false)
  const [p1TfSel, setP1TfSel] = useState<number | null>(null)
  const [p1TfGrace, setP1TfGrace] = useState(false)

  // Phase 2
  const [p2Ready, setP2Ready] = useState(false)
  const [p2Sub, setP2Sub]     = useState<P2Sub>('match')
  const [p2TfSel, setP2TfSel] = useState<number | null>(null)
  const [p2TfGrace, setP2TfGrace] = useState(false)
  const [p2McSel, setP2McSel] = useState<number | null>(null)
  const [p2McGrace, setP2McGrace] = useState(false)

  // Phase 3
  const [p3Ready, setP3Ready] = useState(false)
  const [p3Sub, setP3Sub]     = useState<P3Sub>('hold')
  const [holdElapsed, setHoldElapsed] = useState(0)
  const [holdGraceMsg, setHoldGraceMsg] = useState<string | null>(null)
  const [cloudsSwirl, setCloudsSwirl] = useState(false)
  const [angelLine, setAngelLine] = useState<string | null>(null)
  const [p3YnSel, setP3YnSel] = useState<number | null>(null)
  const [p3YnGrace, setP3YnGrace] = useState(false)
  const [p3McSel, setP3McSel] = useState<number | null>(null)
  const [p3McGrace, setP3McGrace] = useState(false)

  // Phase 4
  const [p4Ready, setP4Ready] = useState(false)
  const [p4Sub, setP4Sub]     = useState<P4Sub>('ram')
  const [ramTaps, setRamTaps] = useState(0)
  const [p4Mc1Sel, setP4Mc1Sel] = useState<number | null>(null)
  const [p4Mc1Grace, setP4Mc1Grace] = useState(false)
  const [p4Mc2Sel, setP4Mc2Sel] = useState<number | null>(null)
  const [p4Mc2Grace, setP4Mc2Grace] = useState(false)
  const [jesusLineIdx, setJesusLineIdx] = useState(-1)
  const [jesusCrossShown, setJesusCrossShown] = useState(false)
  const [jesusDone, setJesusDone] = useState(false)

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
  const holdStartRef = useRef(0)
  const holdIntervalRef = useRef<number | null>(null)
  const holdTimeoutRef  = useRef<number | null>(null)
  const holdDoneRef = useRef(false)
  const holdMilestoneRef = useRef({ m2: false, m3: false, m4: false })

  // Canvas resize
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const r = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    r(); window.addEventListener('resize', r)
    return () => { window.removeEventListener('resize', r); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    setShakeClass('l30-shake'); setTimeout(() => setShakeClass(''), 700)
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
    speakRaw(text, 0.85, 1.4)
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
        const hue = i % 2 === 0 ? 45 : 48
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 70, hue)
      }, i * 110)
  }, [burst])

  const fireLegendaryBurst = useCallback(() => {
    setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 2000)
    for (let i = 0; i < 16; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 0
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 85, i % 2 === 0 ? hue : 0)
      }, i * 110)
  }, [burst])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    const ts = [
      setTimeout(() => setCinStep(1), 400),
      setTimeout(() => setCinStep(2), 3000),
      setTimeout(() => { setCinStep(3); playBassRumble() }, 4200),
      setTimeout(() => setCinStep(4), 6200),
      setTimeout(() => setCinStep(5), 7300),
      setTimeout(() => setCinStep(6), 8400),
      setTimeout(() => setCinStep(7), 9500),
      setTimeout(() => { setCinStep(8); playGoldLightBurst(); fireLegendaryBurst(); shake() }, 10800),
      setTimeout(() => setCinStep(9), 11500),
      setTimeout(() => setCinStep(10), 12200),
      setTimeout(() => { phaseRef.current = 'phase1'; setPhase('phase1') }, 13800),
    ]
    return () => ts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Ready(false); setP1Sub('timed')
    setP1YnSel(null); setP1YnGrace(false); setP1McSel(null); setP1McGrace(false); setP1TfSel(null); setP1TfGrace(false)
    speak('Abraham received the hardest command ever given to a human being. What he did next revealed everything about his faith.', () => {
      setP1Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p1TimedCorrect = useCallback(() => { addEarned(8); playPing() }, [addEarned])
  const p1TimedWrong   = useCallback(() => { playBuzz() }, [])
  const p1TimedAll     = useCallback(() => {
    addEarned(25); playGoldPop(); fireGoldBurst(); shake()
    showBanner('ABRAHAM OBEYED WITHOUT DELAY!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP1Sub('yn'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])
  const p1TimedTimeout = useCallback(() => {
    showBanner('Take heart — faith is still being tested!', 'comedic', 3000)
    setTimeout(() => setP1Sub('yn'), 3200)
  }, [showBanner])

  const handleP1Yn = useCallback((idx: number) => {
    if (p1YnSel !== null || p1YnGrace) return
    setP1YnSel(idx)
    if (idx === P1_YN.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner('HE OBEYED WITHOUT DELAY!!', 'gold', 3000)
      setTimeout(() => setP1Sub('mc'), 3200)
    } else {
      setP1YnGrace(true); setP1YnSel(null); playBuzz()
      setTimeout(() => setP1YnGrace(false), 2800)
    }
  }, [p1YnSel, p1YnGrace, addEarned, shake, showBanner])

  const handleP1Mc = useCallback((idx: number) => {
    if (p1McSel !== null || p1McGrace) return
    setP1McSel(idx)
    if (idx === P1_MC.ans) {
      addEarned(25); playGoldPop(); shake()
      showBanner('ABRAHAM SAID WE — HE BELIEVED ISAAC WOULD RETURN!!', 'legendary', 3200)
      fireAffirmation()
      setTimeout(() => setP1Sub('tf'), 3400)
    } else {
      setP1McGrace(true); setP1McSel(null); playBuzz()
      setTimeout(() => setP1McGrace(false), 2800)
    }
  }, [p1McSel, p1McGrace, addEarned, shake, showBanner, fireAffirmation])

  const handleP1Tf = useCallback((idx: number) => {
    if (p1TfSel !== null || p1TfGrace) return
    setP1TfSel(idx)
    if (idx === P1_TF.ans) {
      addEarned(20); playGoldPop(); shake()
      setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 2200)
    } else {
      setP1TfGrace(true); setP1TfSel(null); playBuzz()
      setTimeout(() => setP1TfGrace(false), 2800)
    }
  }, [p1TfSel, p1TfGrace, addEarned, shake])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Ready(false); setP2Sub('match')
    setP2TfSel(null); setP2TfGrace(false); setP2McSel(null); setP2McGrace(false)
    speak('Father and son walked up the mountain together. Something was missing. Isaac noticed. And what Abraham said next became one of the greatest prophecies ever spoken.', () => {
      setP2Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p2MatchCorrect = useCallback(() => { addEarned(15); playChime() }, [addEarned])
  const p2MatchWrong   = useCallback(() => { playBuzz() }, [])
  const p2MatchAll     = useCallback(() => {
    addEarned(30); playGoldPop(); fireGoldBurst(); shake()
    showBanner('THE PROPHECY WAS SPOKEN!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP2Sub('tf'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP2Tf = useCallback((idx: number) => {
    if (p2TfSel !== null || p2TfGrace) return
    setP2TfSel(idx)
    if (idx === P2_TF.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner('GOD WILL PROVIDE — ABRAHAM KNEW IT!!', 'gold', 3200)
      setTimeout(() => setP2Sub('mc'), 3400)
    } else {
      setP2TfGrace(true); setP2TfSel(null); playBuzz()
      setTimeout(() => setP2TfGrace(false), 2800)
    }
  }, [p2TfSel, p2TfGrace, addEarned, shake, showBanner])

  const handleP2Mc = useCallback((idx: number) => {
    if (p2McSel !== null || p2McGrace) return
    setP2McSel(idx)
    if (idx === P2_MC.ans) {
      addEarned(25); playGoldPop(); shake()
      fireAffirmation()
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 2400)
    } else {
      setP2McGrace(true); setP2McSel(null); playBuzz()
      setTimeout(() => setP2McGrace(false), 2800)
    }
  }, [p2McSel, p2McGrace, addEarned, shake, fireAffirmation])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Ready(false); setP3Sub('hold'); setHoldElapsed(0); setHoldGraceMsg(null); setCloudsSwirl(false); setAngelLine(null)
    setP3YnSel(null); setP3YnGrace(false); setP3McSel(null); setP3McGrace(false)
    holdDoneRef.current = false
    speak('They reached the top. Abraham built the altar. He laid the wood. He bound his son. He raised the knife.', () => {
      setP3Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const clearHoldTimers = useCallback(() => {
    if (holdIntervalRef.current) { window.clearInterval(holdIntervalRef.current); holdIntervalRef.current = null }
    if (holdTimeoutRef.current) { window.clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null }
  }, [])

  const completeHold = useCallback(() => {
    if (holdDoneRef.current) return
    holdDoneRef.current = true
    clearHoldTimers()
    setHoldElapsed(5000)
    setCloudsSwirl(false)
    playAngelCall()
    setAngelLine('ABRAHAM! ABRAHAM!')
    setTimeout(() => {
      setAngelLine(null)
      setTimeout(() => {
        setAngelLine('DO NOT LAY A HAND ON THE BOY!!')
        fireLegendaryBurst(); playWhiteBurstSound(); shake()
        addEarned(50)
        setTimeout(() => {
          setAngelLine(null)
          showBanner('NOW I KNOW THAT YOU FEAR GOD!!', 'legendary', 3600)
          fireAffirmation()
          setTimeout(() => setP3Sub('yn'), 3800)
        }, 2200)
      }, 400)
    }, 1600)
  }, [clearHoldTimers, addEarned, showBanner, fireAffirmation, fireLegendaryBurst, shake])

  const startHold = useCallback(() => {
    if (holdDoneRef.current) return
    clearHoldTimers()
    holdStartRef.current = Date.now()
    holdMilestoneRef.current = { m2: false, m3: false, m4: false }
    setHoldGraceMsg(null)
    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current
      setHoldElapsed(Math.min(elapsed, 5000))
      const m = holdMilestoneRef.current
      if (elapsed >= 2000 && !m.m2) { m.m2 = true; shake() }
      if (elapsed >= 3000 && !m.m3) { m.m3 = true; setCloudsSwirl(true) }
      if (elapsed >= 4000 && !m.m4) { m.m4 = true; playThunder() }
    }, 100)
    holdTimeoutRef.current = window.setTimeout(() => {
      completeHold()
    }, 5000)
  }, [clearHoldTimers, shake, completeHold])

  const releaseHold = useCallback(() => {
    if (holdDoneRef.current) return
    const elapsed = Date.now() - holdStartRef.current
    clearHoldTimers()
    if (elapsed < 5000) {
      setHoldElapsed(0)
      setCloudsSwirl(false)
      setHoldGraceMsg("Hold on — faith doesn't let go! Try again — you've got this!")
      setTimeout(() => setHoldGraceMsg(null), 2600)
    }
  }, [clearHoldTimers])

  const handleP3Yn = useCallback((idx: number) => {
    if (p3YnSel !== null || p3YnGrace) return
    setP3YnSel(idx)
    if (idx === P3_YN.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner('IT WAS ALWAYS A TEST!!', 'gold', 3000)
      setTimeout(() => setP3Sub('mc'), 3200)
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
      setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 2200)
    } else {
      setP3McGrace(true); setP3McSel(null); playBuzz()
      setTimeout(() => setP3McGrace(false), 2800)
    }
  }, [p3McSel, p3McGrace, addEarned, shake])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Ready(false); setP4Sub('ram'); setRamTaps(0)
    setP4Mc1Sel(null); setP4Mc1Grace(false); setP4Mc2Sel(null); setP4Mc2Grace(false)
    setJesusLineIdx(-1); setJesusCrossShown(false); setJesusDone(false)
    speak('Abraham looked up. And there — caught in a thicket — was a ram. God had provided. Just as Abraham had said. And on that mountain Abraham gave God a name that would echo through all of history.', () => {
      setP4Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapThicket = useCallback(() => {
    if (ramTaps >= 5) return
    playRustling(); addEarned(8)
    const next = ramTaps + 1
    setRamTaps(next)
    if (next >= 5) {
      setTimeout(() => {
        addEarned(25); playGoldPop(); fireGoldBurst(); shake()
        showBanner('THE RAM IS FOUND!!', 'legendary', 3000)
        fireAffirmation()
        setTimeout(() => setP4Sub('mc1'), 3200)
      }, 500)
    }
  }, [ramTaps, addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP4Mc1 = useCallback((idx: number) => {
    if (p4Mc1Sel !== null || p4Mc1Grace) return
    setP4Mc1Sel(idx)
    if (idx === P4_MC1.ans) {
      addEarned(20); playGoldPop(); shake()
      setTimeout(() => setP4Sub('mc2'), 2200)
    } else {
      setP4Mc1Grace(true); setP4Mc1Sel(null); playBuzz()
      setTimeout(() => setP4Mc1Grace(false), 2800)
    }
  }, [p4Mc1Sel, p4Mc1Grace, addEarned, shake])

  const handleP4Mc2 = useCallback((idx: number) => {
    if (p4Mc2Sel !== null || p4Mc2Grace) return
    setP4Mc2Sel(idx)
    if (idx === P4_MC2.ans) {
      addEarned(25); playGoldPop(); fireGoldBurst(); shake()
      showBanner('JEHOVAH JIREH!!', 'legendary', 3400)
      fireAffirmation()
      setTimeout(() => setP4Sub('jesus'), 3600)
    } else {
      setP4Mc2Grace(true); setP4Mc2Sel(null); playBuzz()
      setTimeout(() => setP4Mc2Grace(false), 2800)
    }
  }, [p4Mc2Sel, p4Mc2Grace, addEarned, shake, showBanner, fireAffirmation])

  // Jesus connection moment — sacred, sequential, no celebration
  useEffect(() => {
    if (phase !== 'phase4' || p4Sub !== 'jesus') return
    playHolyTone()
    const timers: number[] = []
    let t = 900
    JESUS_LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setJesusLineIdx(i), t))
      const extraPause = i === 4 ? 3000 : i === 5 ? 2000 : 1600
      t += extraPause
    })
    timers.push(window.setTimeout(() => { setJesusLineIdx(-1); setJesusCrossShown(true) }, t + 800))
    return () => timers.forEach(clearTimeout)
  }, [phase, p4Sub])

  const tapCross = useCallback(() => {
    if (jesusDone) return
    setJesusDone(true)
    fireLegendaryBurst(); playWhiteBurstSound()
    addEarned(30)
    setTimeout(() => setP4Sub('boss'), 2600)
  }, [jesusDone, fireLegendaryBurst, addEarned])

  const p4BossCorrect = useCallback(() => { playPing() }, [])
  const p4BossWrong   = useCallback(() => { playBuzz() }, [])
  const p4BossAll     = useCallback(() => {
    addEarned(60); playWhiteBurstSound(); fireLegendaryBurst(); playCoinShower(); shake()
    showBanner(`${playerName} — JEHOVAH JIREH SEES YOU TOO!!`, 'legendary', 4200)
    fireAffirmation()
    setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4600)
  }, [addEarned, fireLegendaryBurst, shake, showBanner, playerName, fireAffirmation])
  const p4BossTimeout = useCallback(() => {
    showBanner('Take heart — faith is still being tested!', 'comedic', 3000)
    setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 3400)
  }, [showBanner])
  const p4BossShake = useCallback(() => { shake() }, [shake])

  // ── ENDING ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ending') return
    playFanfare()
    const total = earnedRef.current; let cur = 0
    const step = Math.max(1, Math.ceil(total / 60))
    const id = setInterval(() => {
      cur = Math.min(cur + step, total); setCoinCount(cur)
      if (cur % (Math.ceil(total / 6)) === 0 || cur === total) playTriumphChime(0.8 + (cur / total) * 0.5)
      if (cur >= total) clearInterval(id)
    }, 28)
    for (let i = 0; i < 10; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 0
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.7, 40, hue)
      }, i * 180)
    const ts = [
      setTimeout(() => setStarsShown(1), 1400),
      setTimeout(() => setStarsShown(2), 2100),
      setTimeout(() => setStarsShown(3), 2800),
      setTimeout(() => {
        setShowScripture(true)
        speak('Abraham called that place The LORD Will Provide. And to this day it is said, on the mountain of the LORD it will be provided. Genesis chapter 22.')
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
    clearHoldTimers()
  }, [clearHoldTimers])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="Abraham called that place The LORD Will Provide. And to this day it is said, On the mountain of the LORD it will be provided."
        verseRef="Genesis 22:14"
        subtitle={`${playerName} — your faith moved a mountain`}
        voiceLine={`${playerName}. Abraham's faith moved a mountain. God provided then, and He provides now — Jehovah Jireh sees you too.`}
        onComplete={onComplete}
      />
    )
  }

  const holdPct = (holdElapsed / 5000) * 100

  return (
    <div className={`l30-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l30-bg${cinStep >= 8 ? ' visible' : ''}`} />
      {cinStep < 8 && <div className="l30-black" />}
      {cinStep >= 8 && <div className="l30-bg-overlay" />}
      <canvas ref={canvasRef} className="l30-canvas" />
      {whiteBurst && <div className="l30-white-burst" />}
      {goldBurst && <div className="l30-gold-flash" />}

      {/* HUD */}
      {phase !== 'cinematic' && (
        <div className="l30-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && (
        <div className="l30-level-label">1-30 THE TEST</div>
      )}

      {/* Global banner */}
      {banner && <div className={`l30-banner l30-banner-${bannerVariant}`}>{banner}</div>}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l30-cin">
          {cinStep >= 3 && cinStep < 4 && <div className="l30-rumble-glow" />}
          {cinStep === 1 && <div className="l30-cin-word">God…</div>}
          {cinStep === 2 && <div className="l30-cin-word">...tested Abraham.</div>}
          {cinStep === 4 && <div className="l30-cin-command">Take your son.</div>}
          {cinStep === 5 && <div className="l30-cin-command">Your only son.</div>}
          {cinStep === 6 && <div className="l30-cin-command">Isaac.</div>}
          {cinStep === 7 && <div className="l30-cin-command">Whom you love.</div>}
          {cinStep >= 9 && (
            <div className="l30-title-card">
              <span className="l30-title-icon">⚔️</span>
              <span className="l30-title-word">THE TEST</span>
              <span className="l30-title-icon">⚔️</span>
            </div>
          )}
          {cinStep >= 10 && <div className="l30-title-sub">The day faith became everything.</div>}
        </div>
      )}

      {/* ── PHASE 1: Early The Next Morning ── */}
      {phase === 'phase1' && (
        <div className="l30-phase-wrap l30-morning-scene">
          <div className="l30-phase-header">
            <div className="l30-phase-badge">PHASE 1</div>
            <div className="l30-phase-title">EARLY THE NEXT MORNING 🌅</div>
          </div>

          {p1Sub === 'timed' && p1Ready && (
            <TimedSelect key="p1-round1" bubbles={ROUND1_BUBBLES} positions={ROUND1_POS} seconds={12}
              prompt="TAP ALL THE TRUE STATEMENTS!"
              onCorrectTap={p1TimedCorrect} onWrongTap={p1TimedWrong}
              onAllCollected={p1TimedAll} onTimeout={p1TimedTimeout} />
          )}

          {p1Sub === 'yn' && (
            <RoundCard round={P1_YN} sel={p1YnSel} grace={p1YnGrace}
              graceMsg="Think about how quickly Abraham responded — try again!" onPick={handleP1Yn} />
          )}

          {p1Sub === 'mc' && (
            <RoundCard round={P1_MC} sel={p1McSel} grace={p1McGrace}
              graceMsg="Think about what Abraham believed would happen — try again!" onPick={handleP1Mc} />
          )}

          {p1Sub === 'tf' && (
            <RoundCard round={P1_TF} sel={p1TfSel} grace={p1TfGrace}
              graceMsg="Think about what Abraham kept between himself and God — try again!" onPick={handleP1Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 2: Where Is The Lamb? ── */}
      {phase === 'phase2' && (
        <div className="l30-phase-wrap l30-lamb-scene">
          <div className="l30-phase-header">
            <div className="l30-phase-badge">PHASE 2</div>
            <div className="l30-phase-title">WHERE IS THE LAMB? 🐑</div>
          </div>

          {p2Sub === 'match' && p2Ready && (
            <MatchRound pairs={P2_PAIRS} rightOrder={P2_RIGHT_ORDER}
              onCorrectMatch={p2MatchCorrect} onWrongMatch={p2MatchWrong} onAllMatched={p2MatchAll} />
          )}

          {p2Sub === 'tf' && (
            <RoundCard round={P2_TF} sel={p2TfSel} grace={p2TfGrace}
              graceMsg="Think about the strength of Abraham's answer — try again!" onPick={handleP2Tf} />
          )}

          {p2Sub === 'mc' && (
            <RoundCard round={P2_MC} sel={p2McSel} grace={p2McGrace}
              graceMsg="Think about what Abraham said God himself would do — try again!" onPick={handleP2Mc} />
          )}
        </div>
      )}

      {/* ── PHASE 3: The Knife Is Raised ── */}
      {phase === 'phase3' && (
        <div className="l30-phase-wrap l30-knife-scene">
          <div className="l30-phase-header">
            <div className="l30-phase-badge">PHASE 3</div>
            <div className="l30-phase-title">THE KNIFE IS RAISED ⚔️</div>
          </div>

          {p3Sub === 'hold' && p3Ready && (
            <div className="l30-hold-mechanic">
              {cloudsSwirl && (
                <div className="l30-clouds-swirl" aria-hidden>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className="l30-cloud" style={{ left: `${(i * 19 + 4) % 100}%`, animationDelay: `${i * 0.2}s` }}>☁️</span>
                  ))}
                </div>
              )}
              {!angelLine && (
                <>
                  <div className="l30-hold-title">HOLD YOUR FAITH!</div>
                  <button
                    className="l30-hold-btn"
                    onPointerDown={startHold}
                    onPointerUp={releaseHold}
                    onPointerLeave={releaseHold}
                  >
                    <div className="l30-faith-meter-track">
                      <div className="l30-faith-meter-fill" style={{ height: `${holdPct}%` }} />
                    </div>
                    <span className="l30-hold-label">HOLD</span>
                  </button>
                  <div className="l30-hold-hint">Press and hold for 5 seconds</div>
                  {holdGraceMsg && <div className="l30-hold-grace">✨ {holdGraceMsg}</div>}
                </>
              )}
              {angelLine && <div className="l30-angel-line">{angelLine}</div>}
            </div>
          )}

          {p3Sub === 'yn' && (
            <RoundCard round={P3_YN} sel={p3YnSel} grace={p3YnGrace}
              graceMsg="Think about why God stopped Abraham — try again!" onPick={handleP3Yn} />
          )}

          {p3Sub === 'mc' && (
            <RoundCard round={P3_MC} sel={p3McSel} grace={p3McGrace}
              graceMsg="Think about the exact words the angel spoke — try again!" onPick={handleP3Mc} />
          )}
        </div>
      )}

      {/* ── PHASE 4: Jehovah Jireh ── */}
      {phase === 'phase4' && (
        <div className="l30-phase-wrap l30-provide-scene">
          <div className="l30-phase-header">
            <div className="l30-phase-badge">PHASE 4</div>
            <div className="l30-phase-title">JEHOVAH JIREH 🐏</div>
          </div>

          {p4Sub === 'ram' && p4Ready && (
            <div className="l30-ram-mechanic">
              <div className="l30-ram-hint">Tap the thicket to reveal what God has provided</div>
              <button className={`l30-ram-btn l30-ram-stage-${ramTaps}`} onClick={tapThicket} disabled={ramTaps >= 5}>
                <span className="l30-ram-icon">🐏</span>
              </button>
              <div className="l30-ram-progress">{ramTaps} / 5</div>
            </div>
          )}

          {p4Sub === 'mc1' && (
            <RoundCard round={P4_MC1} sel={p4Mc1Sel} grace={p4Mc1Grace}
              graceMsg="Think about what was tangled by its horns — try again!" onPick={handleP4Mc1} />
          )}

          {p4Sub === 'mc2' && (
            <RoundCard round={P4_MC2} sel={p4Mc2Sel} grace={p4Mc2Grace}
              graceMsg="Think about the name that means the LORD will provide — try again!" onPick={handleP4Mc2} />
          )}

          {p4Sub === 'jesus' && (
            <div className="l30-jesus-moment">
              {jesusLineIdx >= 0 && <div className="l30-jesus-line">{JESUS_LINES[jesusLineIdx]}</div>}
              {jesusCrossShown && (
                <button className="l30-cross-btn" onClick={tapCross} disabled={jesusDone}>
                  <span className="l30-cross-icon">✝️</span>
                </button>
              )}
            </div>
          )}

          {p4Sub === 'boss' && (
            <TimedSelect key="p4-boss" bubbles={ROUND2_BUBBLES} positions={ROUND2_POS} seconds={15} urgent
              prompt="FINAL ROUND — TAP ALL TRUE STATEMENTS!!"
              onCorrectTap={p4BossCorrect} onWrongTap={p4BossWrong}
              onAllCollected={p4BossAll} onTimeout={p4BossTimeout} onShakeAt3={p4BossShake} />
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <div className="l30-ending-wrap">
          <div className="l30-ending-glow" />
          <div className="l30-ending-name">{playerName} — YOUR FAITH MOVED A MOUNTAIN!</div>
          <div className="l30-stars-row">
            {starsShown >= 1 && <div className="l30-end-star l30-st1">⭐</div>}
            {starsShown >= 2 && <div className="l30-end-star l30-st2">⭐</div>}
            {starsShown >= 3 && <div className="l30-end-star l30-st3">⭐</div>}
          </div>
          <div className="l30-coin-tally">
            <span className="l30-coin-icon">🪙</span>
            <span className="l30-coin-num">{coinCount}</span>
            <span className="l30-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l30-scripture-card">
              <div className="l30-scripture-watermark" aria-hidden>✝️🐏</div>
              <div className="l30-scripture-quote">
                "Abraham called that place The LORD Will Provide. And to this day it is said, On the mountain of the LORD it will be provided."
              </div>
              <div className="l30-scripture-ref">— Genesis 22:14</div>
            </div>
          )}
          {showAdvance && (
            <button className="l30-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-31 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
