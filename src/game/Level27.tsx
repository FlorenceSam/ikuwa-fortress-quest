import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level27.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'timed' | 'tf' | 'yn'
type P2Sub = 'match' | 'tf'
type P3Sub = 'timed' | 'yn' | 'mc'
type P4Sub = 'match' | 'tf' | 'boss'
type RoundT = 'yn' | 'tf' | 'mc'
type Banner = 'gold' | 'warn' | 'comedic' | 'legendary' | 'emotional'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }
interface Bubble { text: string; correct: boolean }
interface MPair { left: string; right: string }
interface Pos { top: number; left: number }

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'GOD KEPT HIS PROMISE!!',
  '25 YEARS IN THE MAKING!!',
  'SARAH IS LITERALLY CRYING LAUGHING!!',
  'ISAAC — THE MIRACLE BABY!!',
  'NOTHING IS TOO HARD FOR GOD!!',
  'THE WAIT WAS WORTH IT!!',
  'FROM LAUGHTER TO LAUGHING!!',
  'PROMISE DELIVERED — ON TIME!!',
  'SARAH SAID: WHO WOULD HAVE THOUGHT?!',
  "GOD'S TIMING IS ALWAYS PERFECT!!",
]

const ROUND1_POS: Pos[] = [
  { top: 8,  left: 18 }, { top: 6,  left: 68 }, { top: 30, left: 42 },
  { top: 40, left: 12 }, { top: 55, left: 78 }, { top: 68, left: 38 },
]
const ROUND1_BUBBLES: Bubble[] = [
  { text: 'Sarah had a son', correct: true },
  { text: 'Lot delivered the baby', correct: false },
  { text: 'It happened in Egypt', correct: false },
  { text: 'Abraham was 100', correct: true },
  { text: 'Sarah was 70 years old', correct: false },
  { text: 'The baby was named Isaac', correct: true },
]

const ROUND2_POS: Pos[] = ROUND1_POS
const ROUND2_BUBBLES: Bubble[] = [
  { text: 'Abraham threw a great feast', correct: true },
  { text: 'The angels danced at the feast', correct: false },
  { text: 'Ishmael mocked Isaac', correct: true },
  { text: 'Isaac grew up immediately', correct: false },
  { text: 'Lot came to celebrate', correct: false },
  { text: 'Sarah asked for Hagar to leave', correct: true },
]

const ROUND3_POS: Pos[] = [
  { top: 5,  left: 15 }, { top: 4,  left: 65 }, { top: 22, left: 40 }, { top: 30, left: 85 },
  { top: 42, left: 10 }, { top: 50, left: 62 }, { top: 65, left: 30 }, { top: 72, left: 78 },
]
const ROUND3_BUBBLES: Bubble[] = [
  { text: 'Isaac was the promised son', correct: true },
  { text: 'Abraham gave up on God', correct: false },
  { text: 'God provided water for Ishmael', correct: true },
  { text: 'Ishmael was forgotten forever', correct: false },
  { text: "Sarah's laughter became joy", correct: true },
  { text: 'Sarah never truly believed', correct: false },
  { text: 'God kept every promise He made', correct: true },
  { text: 'God only helps perfect people', correct: false },
]

const P1_TF: Round = { type: 'tf', q: 'Isaac means laughter in Hebrew.', opts: ['TRUE', 'FALSE'], ans: 0 }
const P1_YN: Round = { type: 'yn', q: 'Was this the fulfillment of God’s promise to Abraham and Sarah?', opts: ['YES', 'NO'], ans: 0 }

const P2_PAIRS: MPair[] = [
  { left: 'Sarah',   right: 'Laughed with joy and said, “Who would have thought?”' },
  { left: 'Abraham', right: 'Held his son and circumcised him on the 8th day' },
  { left: 'Isaac',   right: 'Cried and needed to be fed' },
  { left: 'God',     right: 'Did exactly what He promised — on time' },
]
const P2_RIGHT_ORDER = [3, 1, 0, 2]
const P2_TF: Round = { type: 'tf', q: 'Abraham was sad when Isaac was born.', opts: ['TRUE', 'FALSE'], ans: 1 }

const P3_YN: Round = { type: 'yn', q: 'Was Abraham distressed about sending Ishmael away?', opts: ['YES', 'NO'], ans: 0 }
const P3_MC: Round = {
  type: 'mc',
  q: 'What did God tell Abraham to do about the situation with Hagar and Ishmael?',
  opts: [
    'Listen to Sarah and send them away — God would take care of Ishmael',
    'Keep Ishmael and send Isaac away',
    'Send everyone away and live alone',
    'Ask Lot for advice',
  ],
  ans: 0,
}

const P4_PAIRS: MPair[] = [
  { left: 'Hagar and Ishmael sent away',   right: 'Abraham gave them bread and a water skin and sent them off' },
  { left: 'Water ran out in the desert',   right: 'Hagar placed Ishmael under a bush and wept' },
  { left: "God opened Hagar's eyes",       right: 'She saw a well of water and they were saved' },
  { left: "God promised Ishmael's future", right: 'God said He would make Ishmael a great nation' },
]
const P4_RIGHT_ORDER = [2, 0, 3, 1]
const P4_TF: Round = { type: 'tf', q: 'God abandoned Hagar and Ishmael in the desert.', opts: ['TRUE', 'FALSE'], ans: 1 }

// ── Audio ─────────────────────────────────────────────────────────────────────
function playSunriseTone() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(220, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(660, c.currentTime + 1.4)
    g.gain.setValueAtTime(0.001, c.currentTime); g.gain.linearRampToValueAtTime(0.16, c.currentTime + 0.6)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.8)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.9)
  } catch (_) {}
}
function playBabyCry() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.setValueAtTime(420, c.currentTime)
    o.frequency.linearRampToValueAtTime(560, c.currentTime + 0.18)
    o.frequency.linearRampToValueAtTime(380, c.currentTime + 0.4)
    o.frequency.linearRampToValueAtTime(500, c.currentTime + 0.62)
    g.gain.setValueAtTime(0.001, c.currentTime); g.gain.linearRampToValueAtTime(0.14, c.currentTime + 0.08)
    g.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.35); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.72)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.75)
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
function playLaughBurst() {
  try {
    const c = new AudioContext()
    ;[392, 494, 587, 659, 784].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'triangle'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.07)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.07 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.07 + 0.45)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.07); o.stop(c.currentTime + i * 0.07 + 0.5)
    })
  } catch (_) {}
}
function playElRoiTone() {
  try {
    const c = new AudioContext()
    ;[220, 277.2, 329.6, 440].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.12)
      g.gain.linearRampToValueAtTime(0.16, c.currentTime + i * 0.12 + 0.3)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 1.6)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 1.8)
    })
  } catch (_) {}
}
function playAmberPulseTone() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(180, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(110, c.currentTime + 0.9)
    g.gain.setValueAtTime(0.22, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.1)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.2)
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

// ── Reusable question card (YN / TF / MC) ───────────────────────────────────
function RoundCard({ round, sel, grace, graceMsg, onPick, label, extraClass }: {
  round: Round; sel: number | null; grace: boolean; graceMsg: string; onPick: (i: number) => void
  label?: string; extraClass?: string
}) {
  return (
    <div className={`l27-q-card${extraClass ? ' ' + extraClass : ''}`}>
      <div className="l27-round-label">
        {label ?? (round.type === 'yn' ? 'YES OR NO?' : round.type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?')}
      </div>
      <p className="l27-q-text">{round.q}</p>
      {round.type === 'yn' && (
        <div className="l27-yn-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l27-yn-btn${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'tf' && (
        <div className="l27-tf-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l27-tf-tablet${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'mc' && (
        <div className="l27-mc-opts">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l27-mc-opt${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {grace && <div className="l27-grace">✨ {graceMsg}</div>}
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
    <div className="l27-timed-scene">
      <div className="l27-timer-wrap">
        <div className="l27-timer-label">{prompt}</div>
        <div className={`l27-timer-bar${timerClass}${urgentClass}`}>
          <div className="l27-timer-fill" style={{ width: `${(timeLeft / seconds) * 100}%` }} />
        </div>
        <div className="l27-timer-num">⏱️ {timeLeft}s</div>
      </div>
      <div className="l27-bubble-field">
        {bubbles.map((b, i) => (
          <button key={i}
            style={{ top: `${positions[i].top}%`, left: `${positions[i].left}%`, animationDelay: `${i * 0.15}s` }}
            disabled={collected[i] || revealed[i]}
            className={`l27-bubble${collected[i] || revealed[i] ? ' collected' : ''}${wrongIdx === i ? ' wrong-shake' : ''}`}
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
    <div className="l27-match-scene">
      <div className="l27-match-wrap" ref={containerRef}>
        <svg className="l27-match-svg">
          {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="l27-match-line" />)}
        </svg>
        <div className="l27-match-col l27-match-left">
          {pairs.map((p, i) => (
            <button key={i} ref={el => { leftRefs.current[i] = el }}
              disabled={leftMatched[i]}
              className={`l27-match-item${leftMatched[i] ? ' matched' : ''}${selectedLeft === i ? ' selected' : ''}${wrongFlash?.left === i ? ' wrong-shake' : ''}`}
              onClick={() => tapLeft(i)}>{p.left}</button>
          ))}
        </div>
        <div className="l27-match-col l27-match-right">
          {rightOrder.map((pairIdx, pos) => (
            <button key={pos} ref={el => { rightRefs.current[pos] = el }}
              disabled={rightMatched[pos]}
              className={`l27-match-item${rightMatched[pos] ? ' matched' : ''}${wrongFlash?.rightPos === pos ? ' wrong-shake' : ''}`}
              onClick={() => tapRight(pos)}>{pairs[pairIdx].right}</button>
          ))}
        </div>
      </div>
      {hint && <div className="l27-match-hint">{hint}</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level27({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [whiteBurst, setWhiteBurst] = useState(false)
  const [goldBurst, setGoldBurst]   = useState(false)
  const [amberPulse, setAmberPulse] = useState(false)
  const [laughBurst, setLaughBurst] = useState(false)
  const [elRoiGlow, setElRoiGlow]   = useState(false)
  const [banner, setBannerText]     = useState<string | null>(null)
  const [bannerVariant, setBannerVariant] = useState<Banner>('gold')

  // Cinematic
  const [cinStep, setCinStep] = useState(0)

  // Phase 1
  const [p1Ready, setP1Ready] = useState(false)
  const [p1Sub, setP1Sub]     = useState<P1Sub>('timed')
  const [p1TfSel, setP1TfSel] = useState<number | null>(null)
  const [p1TfGrace, setP1TfGrace] = useState(false)
  const [p1YnSel, setP1YnSel] = useState<number | null>(null)
  const [p1YnGrace, setP1YnGrace] = useState(false)

  // Phase 2
  const [p2Ready, setP2Ready] = useState(false)
  const [p2Sub, setP2Sub]     = useState<P2Sub>('match')
  const [p2TfSel, setP2TfSel] = useState<number | null>(null)
  const [p2TfGrace, setP2TfGrace] = useState(false)

  // Phase 3
  const [p3Ready, setP3Ready] = useState(false)
  const [p3Sub, setP3Sub]     = useState<P3Sub>('timed')
  const [p3YnSel, setP3YnSel] = useState<number | null>(null)
  const [p3YnGrace, setP3YnGrace] = useState(false)
  const [p3McSel, setP3McSel] = useState<number | null>(null)
  const [p3McGrace, setP3McGrace] = useState(false)

  // Phase 4
  const [p4Ready, setP4Ready] = useState(false)
  const [p4Sub, setP4Sub]     = useState<P4Sub>('match')
  const [p4TfSel, setP4TfSel] = useState<number | null>(null)
  const [p4TfGrace, setP4TfGrace] = useState(false)

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
    setShakeClass('l27-shake'); setTimeout(() => setShakeClass(''), 700)
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
  // pending one so at most one utterance is ever audible.
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
        // Failsafe: some browsers never fire onend/onerror (autoplay policy, missing
        // voices, backgrounded tab) — never block the level waiting on that event.
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
        const hue = i % 2 === 0 ? 45 : 340
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 70, hue)
      }, i * 110)
  }, [burst])

  const fireLegendaryBurst = useCallback(() => {
    setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 2000)
    for (let i = 0; i < 16; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 340
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 85, hue)
      }, i * 110)
  }, [burst])

  const fireAmberPulse = useCallback(() => {
    setAmberPulse(true); setTimeout(() => setAmberPulse(false), 1400)
  }, [])

  const fireLaughBurst = useCallback(() => {
    setLaughBurst(true); setTimeout(() => setLaughBurst(false), 2200)
  }, [])

  const fireElRoiGlow = useCallback(() => {
    setElRoiGlow(true); setTimeout(() => setElRoiGlow(false), 2600)
  }, [])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playSunriseTone()
    setTimeout(playBabyCry, 300)
    const ts = [
      setTimeout(() => setCinStep(1), 800),
      setTimeout(() => setCinStep(2), 2000),
      setTimeout(() => setCinStep(3), 3200),
      setTimeout(() => setCinStep(4), 4400),
      setTimeout(() => { setCinStep(5); playGoldLightBurst(); fireLegendaryBurst(); shake() }, 5400),
      setTimeout(() => setCinStep(6), 6000),
      setTimeout(() => setCinStep(7), 6700),
      setTimeout(() => { phaseRef.current = 'phase1'; setPhase('phase1') }, 8300),
    ]
    return () => ts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Ready(false); setP1Sub('timed'); setP1TfSel(null); setP1TfGrace(false); setP1YnSel(null); setP1YnGrace(false)
    speak('After decades of waiting, the impossible happened. God moved. And everything changed in an instant.', () => {
      setP1Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p1TimedCorrect = useCallback(() => { addEarned(8); playPing() }, [addEarned])
  const p1TimedWrong   = useCallback(() => { playBuzz() }, [])
  const p1TimedAll     = useCallback(() => {
    addEarned(25); playGoldPop(); fireGoldBurst(); shake()
    showBanner('THE PROMISE FULFILLED!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP1Sub('tf'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])
  const p1TimedTimeout = useCallback(() => {
    showBanner("God's timing is perfect — and so is yours! Remaining answers revealed.", 'comedic', 3000)
    setTimeout(() => setP1Sub('tf'), 3200)
  }, [showBanner])

  const handleP1Tf = useCallback((idx: number) => {
    if (p1TfSel !== null || p1TfGrace) return
    setP1TfSel(idx)
    if (idx === P1_TF.ans) {
      addEarned(20); playLaughBurst(); fireLaughBurst(); shake()
      showBanner('ISAAC MEANS LAUGHTER!!', 'legendary', 3000)
      setTimeout(() => setP1Sub('yn'), 3200)
    } else {
      setP1TfGrace(true); setP1TfSel(null); playBuzz()
      setTimeout(() => setP1TfGrace(false), 2800)
    }
  }, [p1TfSel, p1TfGrace, addEarned, shake, showBanner, fireLaughBurst])

  const handleP1Yn = useCallback((idx: number) => {
    if (p1YnSel !== null || p1YnGrace) return
    setP1YnSel(idx)
    if (idx === P1_YN.ans) {
      addEarned(15); playGoldPop(); shake()
      showBanner('GOD KEPT HIS WORD!!', 'gold', 3000)
      setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 3400)
    } else {
      setP1YnGrace(true); setP1YnSel(null); playBuzz()
      setTimeout(() => setP1YnGrace(false), 2800)
    }
  }, [p1YnSel, p1YnGrace, addEarned, shake, showBanner])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Ready(false); setP2Sub('match'); setP2TfSel(null); setP2TfGrace(false)
    speak('Sarah could barely contain herself. After everything she had been through, joy completely overtook her. She had something to say about it.', () => {
      setP2Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p2MatchCorrect = useCallback(() => { addEarned(15); playChime() }, [addEarned])
  const p2MatchWrong   = useCallback(() => { playBuzz() }, [])
  const p2MatchAll     = useCallback(() => {
    addEarned(30); playGoldPop(); fireGoldBurst(); shake()
    showBanner('PERFECT MATCH!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP2Sub('tf'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP2Tf = useCallback((idx: number) => {
    if (p2TfSel !== null || p2TfGrace) return
    setP2TfSel(idx)
    if (idx === P2_TF.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner('ABRAHAM HELD HIS MIRACLE SON!!', 'gold', 3000)
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 3400)
    } else {
      setP2TfGrace(true); setP2TfSel(null); playBuzz()
      setTimeout(() => setP2TfGrace(false), 2800)
    }
  }, [p2TfSel, p2TfGrace, addEarned, shake, showBanner])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Ready(false); setP3Sub('timed'); setP3YnSel(null); setP3YnGrace(false); setP3McSel(null); setP3McGrace(false)
    speak('A great celebration was held. But not everyone was celebrating. Tension was rising in the camp.', () => {
      setP3Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p3TimedCorrect = useCallback(() => { addEarned(8); playPing() }, [addEarned])
  const p3TimedWrong   = useCallback(() => { playBuzz() }, [])
  const p3TimedAll     = useCallback(() => {
    addEarned(25); playGoldPop(); fireGoldBurst(); shake()
    showBanner('EVERY TRUE EVENT FOUND!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP3Sub('yn'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])
  const p3TimedTimeout = useCallback(() => {
    showBanner("God's timing is perfect — and so is yours! Remaining answers revealed.", 'comedic', 3000)
    setTimeout(() => setP3Sub('yn'), 3200)
  }, [showBanner])

  const handleP3Yn = useCallback((idx: number) => {
    if (p3YnSel !== null || p3YnGrace) return
    setP3YnSel(idx)
    if (idx === P3_YN.ans) {
      addEarned(15); playAmberPulseTone(); fireAmberPulse(); shake()
      showBanner("ABRAHAM'S HEART WAS TORN!!", 'emotional', 3000)
      setTimeout(() => setP3Sub('mc'), 3400)
    } else {
      setP3YnGrace(true); setP3YnSel(null); playBuzz()
      setTimeout(() => setP3YnGrace(false), 2800)
    }
  }, [p3YnSel, p3YnGrace, addEarned, shake, showBanner, fireAmberPulse])

  const handleP3Mc = useCallback((idx: number) => {
    if (p3McSel !== null || p3McGrace) return
    setP3McSel(idx)
    if (idx === P3_MC.ans) {
      addEarned(20); playGoldPop(); shake()
      fireAffirmation()
      setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 2400)
    } else {
      setP3McGrace(true); setP3McSel(null); playBuzz()
      setTimeout(() => setP3McGrace(false), 2800)
    }
  }, [p3McSel, p3McGrace, addEarned, shake, fireAffirmation])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Ready(false); setP4Sub('match'); setP4TfSel(null); setP4TfGrace(false)
    speak('Hagar and Ishmael were sent into the desert with bread and water. When the water ran out, Hagar placed her son under a bush and walked away. She could not watch him die. Then God showed up again.', () => {
      setP4Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p4MatchCorrect = useCallback(() => { addEarned(15); playChime() }, [addEarned])
  const p4MatchWrong   = useCallback(() => { playBuzz() }, [])
  const p4MatchAll     = useCallback(() => {
    addEarned(30); playElRoiTone(); fireElRoiGlow(); fireGoldBurst(); shake()
    showBanner('GOD SAW HAGAR — AGAIN!!', 'legendary', 3400)
    fireAffirmation()
    setTimeout(() => setP4Sub('tf'), 3600)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation, fireElRoiGlow])

  const handleP4Tf = useCallback((idx: number) => {
    if (p4TfSel !== null || p4TfGrace) return
    setP4TfSel(idx)
    if (idx === P4_TF.ans) {
      addEarned(25); playGoldPop(); shake()
      showBanner('GOD NEVER ABANDONS HIS CHILDREN!!', 'gold', 3000)
      setTimeout(() => setP4Sub('boss'), 3400)
    } else {
      setP4TfGrace(true); setP4TfSel(null); playBuzz()
      setTimeout(() => setP4TfGrace(false), 2800)
    }
  }, [p4TfSel, p4TfGrace, addEarned, shake, showBanner])

  const p4BossCorrect = useCallback(() => { playPing() }, [])
  const p4BossWrong   = useCallback(() => { playBuzz() }, [])
  const p4BossAll     = useCallback(() => {
    addEarned(60); playWhiteBurstSound(); fireLegendaryBurst(); playCoinShower(); shake()
    showBanner(`${playerName} — GOD KEPT EVERY PROMISE!!`, 'legendary', 4200)
    fireAffirmation()
    setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4600)
  }, [addEarned, fireLegendaryBurst, shake, showBanner, playerName, fireAffirmation])
  const p4BossTimeout = useCallback(() => {
    showBanner("God's timing is perfect — and so is yours! Remaining answers revealed.", 'comedic', 3000)
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
      if (cur % (Math.ceil(total / 6)) === 0 || cur === total) playDing(0.8 + (cur / total) * 0.5)
      if (cur >= total) clearInterval(id)
    }, 28)
    for (let i = 0; i < 10; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 340
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.7, 40, hue)
      }, i * 180)
    const ts = [
      setTimeout(() => setStarsShown(1), 1400),
      setTimeout(() => setStarsShown(2), 2100),
      setTimeout(() => setStarsShown(3), 2800),
      setTimeout(() => {
        setShowScripture(true)
        speak('Sarah said, God has brought me laughter, and everyone who hears about this will laugh with me. Genesis chapter 21, verse 6.')
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
        verse="Sarah said, God has brought me laughter, and everyone who hears about this will laugh with me."
        verseRef="Genesis 21:6"
        subtitle={`${playerName} — the wait was worth it`}
        voiceLine={`${playerName}. After twenty five years of waiting, God kept every promise. His timing is always perfect — for you too.`}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`l27-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l27-bg${cinStep >= 5 ? ' visible' : ''}`} />
      {cinStep < 5 && <div className="l27-black" />}
      {cinStep >= 5 && <div className="l27-bg-overlay" />}
      <canvas ref={canvasRef} className="l27-canvas" />
      {whiteBurst && <div className="l27-white-burst" />}
      {goldBurst && <div className="l27-gold-flash" />}
      {amberPulse && <div className="l27-amber-flash" />}

      {/* HUD */}
      {phase !== 'cinematic' && (
        <div className="l27-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && (
        <div className="l27-level-label">1-27 THE MIRACLE</div>
      )}

      {/* Global banner */}
      {banner && <div className={`l27-banner l27-banner-${bannerVariant}`}>{banner}</div>}

      {/* Laugh burst overlay */}
      {laughBurst && (
        <div className="l27-laugh-burst" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="l27-laugh-emoji" style={{ left: `${(i * 29) % 100}%`, animationDelay: `${i * 0.09}s` }}>😂</span>
          ))}
        </div>
      )}

      {/* El Roi glow overlay */}
      {elRoiGlow && (
        <div className="l27-elroi-glow" aria-hidden>
          <span className="l27-elroi-eye">👁️</span>
        </div>
      )}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l27-cin">
          <div className="l27-sunrise-glow" />
          <div className="l27-cin-icons" aria-hidden>
            {['👶', '🎶', '🎉', '🎶', '👶'].map((ic, i) => (
              <span key={i} className="l27-cin-icon" style={{ left: `${(i * 21) % 100}%`, animationDelay: `${i * 0.25}s` }}>{ic}</span>
            ))}
          </div>
          {cinStep === 1 && <div className="l27-cin-line">25 years of waiting.</div>}
          {cinStep === 2 && <div className="l27-cin-line">One impossible promise.</div>}
          {cinStep === 3 && <div className="l27-cin-line">One faithful God.</div>}
          {cinStep >= 6 && (
            <div className="l27-title-card">
              <span className="l27-title-baby">👶</span>
              <span className="l27-title-word">THE MIRACLE</span>
              <span className="l27-title-baby">👶</span>
            </div>
          )}
          {cinStep >= 7 && <div className="l27-title-sub">Laughter. Finally.</div>}
        </div>
      )}

      {/* ── PHASE 1: The Promise Fulfilled ── */}
      {phase === 'phase1' && (
        <div className="l27-phase-wrap l27-promise-scene">
          <div className="l27-phase-header">
            <div className="l27-phase-badge">PHASE 1</div>
            <div className="l27-phase-title">THE PROMISE FULFILLED 🎉</div>
          </div>

          {p1Sub === 'timed' && p1Ready && (
            <TimedSelect key="p1-round1" bubbles={ROUND1_BUBBLES} positions={ROUND1_POS} seconds={12}
              prompt="TAP ALL THE TRUE STATEMENTS!"
              onCorrectTap={p1TimedCorrect} onWrongTap={p1TimedWrong}
              onAllCollected={p1TimedAll} onTimeout={p1TimedTimeout} />
          )}

          {p1Sub === 'tf' && (
            <RoundCard round={P1_TF} sel={p1TfSel} grace={p1TfGrace}
              graceMsg="Think about what the name Isaac means — try again!" onPick={handleP1Tf} />
          )}

          {p1Sub === 'yn' && (
            <RoundCard round={P1_YN} sel={p1YnSel} grace={p1YnGrace}
              graceMsg="Think about what God promised long ago — try again!" onPick={handleP1Yn} />
          )}
        </div>
      )}

      {/* ── PHASE 2: Sarah's Joy ── */}
      {phase === 'phase2' && (
        <div className="l27-phase-wrap l27-joy-scene">
          <div className="l27-phase-header">
            <div className="l27-phase-badge">PHASE 2</div>
            <div className="l27-phase-title">SARAH'S JOY 😂</div>
          </div>

          {p2Sub === 'match' && p2Ready && (
            <MatchRound pairs={P2_PAIRS} rightOrder={P2_RIGHT_ORDER}
              onCorrectMatch={p2MatchCorrect} onWrongMatch={p2MatchWrong} onAllMatched={p2MatchAll} />
          )}

          {p2Sub === 'tf' && (
            <RoundCard round={P2_TF} sel={p2TfSel} grace={p2TfGrace}
              graceMsg="Think about how Abraham felt holding his miracle son — try again!" onPick={handleP2Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 3: The Feast and the Conflict ── */}
      {phase === 'phase3' && (
        <div className="l27-phase-wrap l27-feast-scene">
          <div className="l27-phase-header">
            <div className="l27-phase-badge">PHASE 3</div>
            <div className="l27-phase-title">THE FEAST AND THE CONFLICT ⚡</div>
          </div>

          {p3Sub === 'timed' && p3Ready && (
            <TimedSelect key="p3-round2" bubbles={ROUND2_BUBBLES} positions={ROUND2_POS} seconds={12}
              prompt="TAP ALL THE TRUE EVENTS!"
              onCorrectTap={p3TimedCorrect} onWrongTap={p3TimedWrong}
              onAllCollected={p3TimedAll} onTimeout={p3TimedTimeout} />
          )}

          {p3Sub === 'yn' && (
            <RoundCard round={P3_YN} sel={p3YnSel} grace={p3YnGrace}
              graceMsg="Think about a father's heart — try again!" onPick={handleP3Yn} />
          )}

          {p3Sub === 'mc' && (
            <RoundCard round={P3_MC} sel={p3McSel} grace={p3McGrace}
              graceMsg="Think about what God promised for both sons — try again!" onPick={handleP3Mc} />
          )}
        </div>
      )}

      {/* ── PHASE 4: God Sees Hagar Again ── */}
      {phase === 'phase4' && (
        <div className="l27-phase-wrap l27-desert-scene">
          <div className="l27-phase-header">
            <div className="l27-phase-badge">PHASE 4</div>
            <div className="l27-phase-title">GOD SEES HAGAR AGAIN 👁️</div>
          </div>

          {p4Sub === 'match' && p4Ready && (
            <MatchRound pairs={P4_PAIRS} rightOrder={P4_RIGHT_ORDER}
              onCorrectMatch={p4MatchCorrect} onWrongMatch={p4MatchWrong} onAllMatched={p4MatchAll} />
          )}

          {p4Sub === 'tf' && (
            <RoundCard round={P4_TF} sel={p4TfSel} grace={p4TfGrace}
              graceMsg="Think about El Roi — the God who sees — try again!" onPick={handleP4Tf} />
          )}

          {p4Sub === 'boss' && (
            <TimedSelect key="p4-boss" bubbles={ROUND3_BUBBLES} positions={ROUND3_POS} seconds={15} urgent
              prompt="FINAL ROUND — TAP ALL TRUE STATEMENTS!!"
              onCorrectTap={p4BossCorrect} onWrongTap={p4BossWrong}
              onAllCollected={p4BossAll} onTimeout={p4BossTimeout} onShakeAt3={p4BossShake} />
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <div className="l27-ending-wrap">
          <div className="l27-ending-glow" />
          <div className="l27-emoji-rain" aria-hidden>
            {['👶', '⭐', '👶', '⭐', '👶', '⭐'].map((ic, i) => (
              <span key={i} className="l27-rain-emoji" style={{ left: `${(i * 17 + 4) % 100}%`, animationDelay: `${i * 0.3}s` }}>{ic}</span>
            ))}
          </div>
          <div className="l27-ending-name">{playerName} — THE WAIT WAS WORTH IT!</div>
          <div className="l27-stars-row">
            {starsShown >= 1 && <div className="l27-end-star l27-st1">⭐</div>}
            {starsShown >= 2 && <div className="l27-end-star l27-st2">⭐</div>}
            {starsShown >= 3 && <div className="l27-end-star l27-st3">⭐</div>}
          </div>
          <div className="l27-coin-tally">
            <span className="l27-coin-icon">🪙</span>
            <span className="l27-coin-num">{coinCount}</span>
            <span className="l27-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l27-scripture-card">
              <div className="l27-scripture-footprint" aria-hidden>👣</div>
              <div className="l27-scripture-quote">
                "Sarah said, God has brought me laughter, and everyone who hears about this will laugh with me."
              </div>
              <div className="l27-scripture-ref">— Genesis 21:6</div>
            </div>
          )}
          {showAdvance && (
            <button className="l27-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-28 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
