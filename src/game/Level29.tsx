import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level29.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'timed' | 'yn' | 'mc' | 'tf'
type P2Sub = 'match' | 'yn' | 'mc' | 'tf'
type P3Sub = 'seals' | 'timed'
type P4Sub = 'tree' | 'mc1' | 'mc2' | 'boss'
type RoundT = 'yn' | 'tf' | 'mc'
type Banner = 'gold' | 'warn' | 'comedic' | 'legendary' | 'emotional'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }
interface Bubble { text: string; correct: boolean }
interface MPair { left: string; right: string }
interface Pos { top: number; left: number }
interface Seal { label: string; icon: string }

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'You sealed that like a covenant!!',
  'Even kings would bow to your wisdom!!',
  'You are a natural peace maker!!',
  'You planted that answer like a tamarisk tree!!',
  "God's favour is all over you!!",
  "You saw what even Abimelek couldn't miss!!",
  'Your wisdom just made a deal!!',
  'You are blessed coming and going!!',
  'That answer was deep rooted — just like you!!',
  "You carry God's favour everywhere you go!!",
]

const ROUND1_POS: Pos[] = [
  { top: 8,  left: 18 }, { top: 6,  left: 68 }, { top: 30, left: 42 },
  { top: 40, left: 12 }, { top: 55, left: 78 }, { top: 68, left: 38 },
]
const ROUND1_BUBBLES: Bubble[] = [
  { text: 'Abimelek came to Abraham peacefully', correct: true },
  { text: 'Abimelek came to declare war', correct: false },
  { text: 'Abraham hid from Abimelek', correct: false },
  { text: 'Abimelek brought his army commander Phicol', correct: true },
  { text: "Phicol was Abraham's servant", correct: false },
  { text: 'Abimelek said God is with Abraham in everything he does', correct: true },
]

const ROUND2_POS: Pos[] = ROUND1_POS
const ROUND2_BUBBLES: Bubble[] = [
  { text: 'Abraham and Abimelek made a covenant', correct: true },
  { text: 'The covenant lasted only one day', correct: false },
  { text: 'Abraham refused to make peace', correct: false },
  { text: 'The place was named Beersheba', correct: true },
  { text: 'Phicol stayed with Abraham', correct: false },
  { text: 'Abimelek and Phicol returned to their own land', correct: true },
]

const ROUND3_POS: Pos[] = [
  { top: 5,  left: 15 }, { top: 4,  left: 65 }, { top: 22, left: 40 }, { top: 30, left: 85 },
  { top: 42, left: 10 }, { top: 50, left: 62 }, { top: 65, left: 30 }, { top: 72, left: 78 },
]
const ROUND3_BUBBLES: Bubble[] = [
  { text: "God's favour on you is visible to everyone around you", correct: true },
  { text: "God's favour only works in secret", correct: false },
  { text: 'Peace is possible when both sides act with integrity', correct: true },
  { text: 'Peace is never possible with those outside the faith', correct: false },
  { text: 'Plant something today that will outlast you', correct: true },
  { text: 'Only plant what benefits you today', correct: false },
  { text: 'The Eternal God sees every covenant you make', correct: true },
  { text: 'Covenants with non-believers are always wrong', correct: false },
]

const P1_YN: Round = { type: 'yn', q: 'Did Abimelek say that God was with Abraham in everything he does?', opts: ['YES', 'NO'], ans: 0 }
const P1_MC: Round = {
  type: 'mc',
  q: 'Why did Abimelek come to Abraham?',
  opts: [
    "To take Abraham's land by force",
    'To ask Abraham to leave Gerar',
    'To make a covenant of peace because he saw God was with Abraham',
    'To return Sarah and apologise again',
  ],
  ans: 2,
}
const P1_TF: Round = { type: 'tf', q: "God's favour on Abraham was invisible to everyone around him.", opts: ['TRUE', 'FALSE'], ans: 1 }

const P2_PAIRS: MPair[] = [
  { left: 'The problem Abraham raised',       right: "Abimelek's servants had seized Abraham's well" },
  { left: "Abimelek's response",              right: 'He claimed he knew nothing about it until today' },
  { left: 'The proof Abraham offered',        right: 'Abraham set apart 7 ewe lambs as a witness he dug the well' },
  { left: 'The result of the confrontation',  right: 'Both sides made a covenant together at Beersheba' },
]
const P2_RIGHT_ORDER = [2, 0, 3, 1]
const P2_YN: Round = { type: 'yn', q: 'Did Abraham raise the issue of the seized well with Abimelek?', opts: ['YES', 'NO'], ans: 0 }
const P2_MC: Round = {
  type: 'mc',
  q: 'What did Abraham use as proof that he dug the well?',
  opts: [
    'He showed Abimelek the digging tools',
    'His servants testified as witnesses',
    'He set apart 7 ewe lambs as a witness',
    'He had a written document as proof',
  ],
  ans: 2,
}
const P2_TF: Round = { type: 'tf', q: 'Beersheba means well of the oath or well of seven.', opts: ['TRUE', 'FALSE'], ans: 0 }

const SEALS: Seal[] = [
  { label: 'BOTH MEN SWORE AN OATH!',        icon: '📜' },
  { label: 'ABIMELEK RETURNED THE WELL!',    icon: '💧' },
  { label: 'ABRAHAM GAVE 7 EWE LAMBS!',      icon: '🐑' },
  { label: 'THE PLACE WAS NAMED BEERSHEBA!', icon: '📍' },
  { label: 'THE COVENANT WAS COMPLETE!',     icon: '✨' },
]
const SEAL_POS: Pos[] = [
  { top: 20, left: 20 }, { top: 15, left: 55 }, { top: 45, left: 78 },
  { top: 70, left: 55 }, { top: 60, left: 18 },
]

const P4_MC1: Round = {
  type: 'mc',
  q: 'What did Abraham do after the covenant was made?',
  opts: [
    'He immediately left Beersheba',
    'He built a great altar of stone',
    'He planted a tamarisk tree and called on the name of the LORD',
    'He threw a great feast for Abimelek',
  ],
  ans: 2,
}
const P4_MC2: Round = {
  type: 'mc',
  q: 'What name did Abraham use for God when he called on Him at Beersheba?',
  opts: [
    'El Roi — the God who sees',
    'El Shaddai — God Almighty',
    'Yahweh Jireh — the LORD will provide',
    'El Olam — the Eternal God',
  ],
  ans: 3,
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function playMeetingTone() {
  try {
    const c = new AudioContext()
    ;[261, 329, 392].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'triangle'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.12)
      g.gain.linearRampToValueAtTime(0.16, c.currentTime + i * 0.12 + 0.08)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.9)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 1.0)
    })
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
function playRadiateTone() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(220, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(880, c.currentTime + 1.1)
    g.gain.setValueAtTime(0.16, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.3)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.4)
  } catch (_) {}
}
function playWellPulseTone() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(300, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.4)
    g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.65)
  } catch (_) {}
}
function playSealSound(i: number) {
  try {
    const c = new AudioContext()
    const freqs = [330, 392, 440, 494, 523]
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.value = freqs[i] ?? 440
    g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.55)
  } catch (_) {}
}
function playScrollBlaze() {
  try {
    const c = new AudioContext()
    ;[220, 330, 440, 587, 740, 880].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.07)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.07 + 0.08)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.07 + 1.2)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.07); o.stop(c.currentTime + i * 0.07 + 1.4)
    })
  } catch (_) {}
}
function playTreeGrowTone() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(260, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(520, c.currentTime + 0.3)
    g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.38)
  } catch (_) {}
}
function playTreeCompleteTone() {
  try {
    const c = new AudioContext()
    ;[196, 262, 330, 392, 523].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.08)
      g.gain.linearRampToValueAtTime(0.18, c.currentTime + i * 0.08 + 0.1)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 1.4)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.08); o.stop(c.currentTime + i * 0.08 + 1.6)
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
function playPeacefulChime(pitch = 1.0) {
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
    <div className={`l29-q-card${extraClass ? ' ' + extraClass : ''}`}>
      <div className="l29-round-label">
        {label ?? (round.type === 'yn' ? 'YES OR NO?' : round.type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?')}
      </div>
      <p className="l29-q-text">{round.q}</p>
      {round.type === 'yn' && (
        <div className="l29-yn-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l29-yn-btn${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'tf' && (
        <div className="l29-tf-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l29-tf-tablet${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'mc' && (
        <div className="l29-mc-opts">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l29-mc-opt${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {grace && <div className="l29-grace">✨ {graceMsg}</div>}
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
    <div className="l29-timed-scene">
      {urgent && timeLeft <= 5 && (
        <div className="l29-leaf-sway" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="l29-sway-leaf" style={{ left: `${(i * 17 + 5) % 100}%`, animationDelay: `${i * 0.12}s` }}>🍃</span>
          ))}
        </div>
      )}
      <div className="l29-timer-wrap">
        <div className="l29-timer-label">{prompt}</div>
        <div className={`l29-timer-bar${timerClass}${urgentClass}`}>
          <div className="l29-timer-fill" style={{ width: `${(timeLeft / seconds) * 100}%` }} />
        </div>
        <div className="l29-timer-num">⏱️ {timeLeft}s</div>
      </div>
      <div className="l29-bubble-field">
        {bubbles.map((b, i) => (
          <button key={i}
            style={{ top: `${positions[i].top}%`, left: `${positions[i].left}%`, animationDelay: `${i * 0.15}s` }}
            disabled={collected[i] || revealed[i]}
            className={`l29-bubble${collected[i] || revealed[i] ? ' collected' : ''}${wrongIdx === i ? ' wrong-shake' : ''}`}
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
    <div className="l29-match-scene">
      <div className="l29-match-wrap" ref={containerRef}>
        <svg className="l29-match-svg">
          {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="l29-match-line" />)}
        </svg>
        <div className="l29-match-col l29-match-left">
          {pairs.map((p, i) => (
            <button key={i} ref={el => { leftRefs.current[i] = el }}
              disabled={leftMatched[i]}
              className={`l29-match-item${leftMatched[i] ? ' matched' : ''}${selectedLeft === i ? ' selected' : ''}${wrongFlash?.left === i ? ' wrong-shake' : ''}`}
              onClick={() => tapLeft(i)}>{p.left}</button>
          ))}
        </div>
        <div className="l29-match-col l29-match-right">
          {rightOrder.map((pairIdx, pos) => (
            <button key={pos} ref={el => { rightRefs.current[pos] = el }}
              disabled={rightMatched[pos]}
              className={`l29-match-item${rightMatched[pos] ? ' matched' : ''}${wrongFlash?.rightPos === pos ? ' wrong-shake' : ''}`}
              onClick={() => tapRight(pos)}>{pairs[pairIdx].right}</button>
          ))}
        </div>
      </div>
      {hint && <div className="l29-match-hint">{hint}</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level29({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [whiteBurst, setWhiteBurst] = useState(false)
  const [goldBurst, setGoldBurst]   = useState(false)
  const [radiateFx, setRadiateFx]   = useState(false)
  const [crownBurst, setCrownBurst] = useState(false)
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
  const [p2YnSel, setP2YnSel] = useState<number | null>(null)
  const [p2YnGrace, setP2YnGrace] = useState(false)
  const [p2McSel, setP2McSel] = useState<number | null>(null)
  const [p2McGrace, setP2McGrace] = useState(false)
  const [p2TfSel, setP2TfSel] = useState<number | null>(null)
  const [p2TfGrace, setP2TfGrace] = useState(false)
  const [wellPulse, setWellPulse] = useState(false)

  // Phase 3
  const [p3Ready, setP3Ready] = useState(false)
  const [p3Sub, setP3Sub]     = useState<P3Sub>('seals')
  const [sealsDone, setSealsDone] = useState<boolean[]>(() => SEALS.map(() => false))
  const [sealMsg, setSealMsg] = useState<string | null>(null)
  const [scrollBlazing, setScrollBlazing] = useState(false)

  // Phase 4
  const [p4Ready, setP4Ready] = useState(false)
  const [p4Sub, setP4Sub]     = useState<P4Sub>('tree')
  const [treeTaps, setTreeTaps] = useState(0)
  const [p4Mc1Sel, setP4Mc1Sel] = useState<number | null>(null)
  const [p4Mc1Grace, setP4Mc1Grace] = useState(false)
  const [p4Mc2Sel, setP4Mc2Sel] = useState<number | null>(null)
  const [p4Mc2Grace, setP4Mc2Grace] = useState(false)

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
    setShakeClass('l29-shake'); setTimeout(() => setShakeClass(''), 700)
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
        const hue = i % 2 === 0 ? 45 : 130
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 70, hue)
      }, i * 110)
  }, [burst])

  const fireLegendaryBurst = useCallback(() => {
    setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 2000)
    for (let i = 0; i < 16; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 130
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 85, hue)
      }, i * 110)
  }, [burst])

  const fireRadiate = useCallback(() => {
    setRadiateFx(true); setTimeout(() => setRadiateFx(false), 1600)
  }, [])

  const fireCrownBurst = useCallback(() => {
    setCrownBurst(true); setTimeout(() => setCrownBurst(false), 2200)
  }, [])

  const fireWellPulse = useCallback(() => {
    setWellPulse(true); setTimeout(() => setWellPulse(false), 1800)
  }, [])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playMeetingTone()
    const ts = [
      setTimeout(() => setCinStep(1), 800),
      setTimeout(() => setCinStep(2), 1800),
      setTimeout(() => setCinStep(3), 2800),
      setTimeout(() => setCinStep(4), 3800),
      setTimeout(() => setCinStep(5), 4800),
      setTimeout(() => { setCinStep(6); playGoldLightBurst(); fireLegendaryBurst(); shake() }, 5800),
      setTimeout(() => setCinStep(7), 6400),
      setTimeout(() => setCinStep(8), 7100),
      setTimeout(() => { phaseRef.current = 'phase1'; setPhase('phase1') }, 8700),
    ]
    return () => ts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Ready(false); setP1Sub('timed')
    setP1YnSel(null); setP1YnGrace(false); setP1McSel(null); setP1McGrace(false); setP1TfSel(null); setP1TfGrace(false)
    speak("Someone unexpected showed up at Abraham's camp. And what he said about Abraham revealed something powerful — God's favour doesn't go unnoticed. Even those outside the faith can see it.", () => {
      setP1Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p1TimedCorrect = useCallback(() => { addEarned(8); playPing() }, [addEarned])
  const p1TimedWrong   = useCallback(() => { playBuzz() }, [])
  const p1TimedAll     = useCallback(() => {
    addEarned(25); playGoldPop(); fireGoldBurst(); shake()
    showBanner('GOD IS WITH YOU IN EVERYTHING YOU DO!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP1Sub('yn'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])
  const p1TimedTimeout = useCallback(() => {
    showBanner('Keep going — peace is still being made!', 'comedic', 3000)
    setTimeout(() => setP1Sub('yn'), 3200)
  }, [showBanner])

  const handleP1Yn = useCallback((idx: number) => {
    if (p1YnSel !== null || p1YnGrace) return
    setP1YnSel(idx)
    if (idx === P1_YN.ans) {
      addEarned(20); playGoldPop(); fireCrownBurst(); shake()
      showBanner("EVEN THE KING COULD SEE GOD'S FAVOUR!!", 'gold', 3200)
      setTimeout(() => setP1Sub('mc'), 3400)
    } else {
      setP1YnGrace(true); setP1YnSel(null); playBuzz()
      setTimeout(() => setP1YnGrace(false), 2800)
    }
  }, [p1YnSel, p1YnGrace, addEarned, shake, showBanner, fireCrownBurst])

  const handleP1Mc = useCallback((idx: number) => {
    if (p1McSel !== null || p1McGrace) return
    setP1McSel(idx)
    if (idx === P1_MC.ans) {
      addEarned(20); playGoldPop(); shake()
      fireAffirmation()
      setTimeout(() => setP1Sub('tf'), 2400)
    } else {
      setP1McGrace(true); setP1McSel(null); playBuzz()
      setTimeout(() => setP1McGrace(false), 2800)
    }
  }, [p1McSel, p1McGrace, addEarned, shake, fireAffirmation])

  const handleP1Tf = useCallback((idx: number) => {
    if (p1TfSel !== null || p1TfGrace) return
    setP1TfSel(idx)
    if (idx === P1_TF.ans) {
      addEarned(20); playRadiateTone(); fireRadiate(); shake()
      showBanner('GOD’S FAVOUR CANNOT BE HIDDEN!!', 'legendary', 3200)
      setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 3400)
    } else {
      setP1TfGrace(true); setP1TfSel(null); playBuzz()
      setTimeout(() => setP1TfGrace(false), 2800)
    }
  }, [p1TfSel, p1TfGrace, addEarned, shake, showBanner, fireRadiate])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Ready(false); setP2Sub('match')
    setP2YnSel(null); setP2YnGrace(false); setP2McSel(null); setP2McGrace(false); setP2TfSel(null); setP2TfGrace(false)
    speak('Before the covenant could be made, Abraham had something to say. A wrong had been done. And Abraham was not afraid to raise it — even with a king.', () => {
      setP2Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p2MatchCorrect = useCallback(() => { addEarned(15); playChime() }, [addEarned])
  const p2MatchWrong   = useCallback(() => { playBuzz() }, [])
  const p2MatchAll     = useCallback(() => {
    addEarned(30); playGoldPop(); fireGoldBurst(); shake()
    showBanner('THE DISPUTE IS SETTLED!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP2Sub('yn'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP2Yn = useCallback((idx: number) => {
    if (p2YnSel !== null || p2YnGrace) return
    setP2YnSel(idx)
    if (idx === P2_YN.ans) {
      addEarned(15); playGoldPop(); shake()
      showBanner('ABRAHAM SPOKE UP RESPECTFULLY!!', 'gold', 3000)
      setTimeout(() => setP2Sub('mc'), 3200)
    } else {
      setP2YnGrace(true); setP2YnSel(null); playBuzz()
      setTimeout(() => setP2YnGrace(false), 2800)
    }
  }, [p2YnSel, p2YnGrace, addEarned, shake, showBanner])

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
      addEarned(20); playWellPulseTone(); fireWellPulse(); shake()
      showBanner('BEERSHEBA — WELL OF THE OATH!!', 'legendary', 3200)
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 3400)
    } else {
      setP2TfGrace(true); setP2TfSel(null); playBuzz()
      setTimeout(() => setP2TfGrace(false), 2800)
    }
  }, [p2TfSel, p2TfGrace, addEarned, shake, showBanner, fireWellPulse])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Ready(false); setP3Sub('seals')
    setSealsDone(SEALS.map(() => false)); setSealMsg(null); setScrollBlazing(false)
    speak('Two men from very different worlds knelt together in the desert. And something that would outlast both of them was established. Some agreements change history.', () => {
      setP3Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapSeal = useCallback((i: number) => {
    if (sealsDone[i]) return
    playSealSound(i); addEarned(10)
    setSealMsg(SEALS[i].label)
    setTimeout(() => setSealMsg(m => m === SEALS[i].label ? null : m), 1800)
    setSealsDone(prev => {
      const next = [...prev]; next[i] = true
      if (next.every(Boolean)) {
        setTimeout(() => {
          addEarned(30); playScrollBlaze(); setScrollBlazing(true); fireGoldBurst(); shake()
          showBanner('THE COVENANT IS SEALED!!', 'legendary', 3200)
          fireAffirmation()
          setTimeout(() => setP3Sub('timed'), 3600)
        }, 600)
      }
      return next
    })
  }, [sealsDone, addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const p3TimedCorrect = useCallback(() => { addEarned(8); playPing() }, [addEarned])
  const p3TimedWrong   = useCallback(() => { playBuzz() }, [])
  const p3TimedAll     = useCallback(() => {
    addEarned(25); playGoldPop(); fireGoldBurst(); shake()
    showBanner('PEACE AT BEERSHEBA!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])
  const p3TimedTimeout = useCallback(() => {
    showBanner('Keep going — peace is still being made!', 'comedic', 3000)
    setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 3200)
  }, [showBanner])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Ready(false); setP4Sub('tree'); setTreeTaps(0)
    setP4Mc1Sel(null); setP4Mc1Grace(false); setP4Mc2Sel(null); setP4Mc2Grace(false)
    speak('After the covenant was made, Abraham did something quiet and beautiful. Something that would outlast every agreement, every king, and every generation. He planted something that would keep growing.', () => {
      setP4Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapGround = useCallback(() => {
    if (treeTaps >= 7) return
    playTreeGrowTone(); addEarned(7)
    const next = treeTaps + 1
    setTreeTaps(next)
    if (next >= 7) {
      setTimeout(() => {
        addEarned(30); playTreeCompleteTone(); fireGoldBurst(); shake()
        showBanner('THE TAMARISK TREE IS PLANTED!!', 'legendary', 3200)
        fireAffirmation()
        setTimeout(() => setP4Sub('mc1'), 3400)
      }, 500)
    }
  }, [treeTaps, addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

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
      addEarned(25); playRadiateTone(); fireRadiate(); shake()
      showBanner('EL OLAM — THE ETERNAL GOD!!', 'legendary', 3200)
      setTimeout(() => setP4Sub('boss'), 3400)
    } else {
      setP4Mc2Grace(true); setP4Mc2Sel(null); playBuzz()
      setTimeout(() => setP4Mc2Grace(false), 2800)
    }
  }, [p4Mc2Sel, p4Mc2Grace, addEarned, shake, showBanner, fireRadiate])

  const p4BossCorrect = useCallback(() => { playPing() }, [])
  const p4BossWrong   = useCallback(() => { playBuzz() }, [])
  const p4BossAll     = useCallback(() => {
    addEarned(60); playWhiteBurstSound(); fireLegendaryBurst(); playCoinShower(); shake()
    showBanner(`${playerName} — YOU CARRY GOD'S FAVOUR EVERYWHERE YOU GO!!`, 'legendary', 4200)
    fireAffirmation()
    setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4600)
  }, [addEarned, fireLegendaryBurst, shake, showBanner, playerName, fireAffirmation])
  const p4BossTimeout = useCallback(() => {
    showBanner('Keep going — peace is still being made!', 'comedic', 3000)
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
      if (cur % (Math.ceil(total / 6)) === 0 || cur === total) playPeacefulChime(0.8 + (cur / total) * 0.5)
      if (cur >= total) clearInterval(id)
    }, 28)
    for (let i = 0; i < 10; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 130
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.7, 40, hue)
      }, i * 180)
    const ts = [
      setTimeout(() => setStarsShown(1), 1400),
      setTimeout(() => setStarsShown(2), 2100),
      setTimeout(() => setStarsShown(3), 2800),
      setTimeout(() => {
        setShowScripture(true)
        speak('Abraham planted a tamarisk tree in Beersheba, and there he called on the name of the LORD, the Eternal God. Genesis chapter 21.')
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
        verse="Abraham planted a tamarisk tree in Beersheba, and there he called on the name of the LORD, the Eternal God."
        verseRef="Genesis 21:33"
        subtitle={`${playerName} — plant something that will outlast you`}
        voiceLine={`${playerName}. Abraham planted something that outlasted kings and covenants. Plant something lasting today — God sees it.`}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`l29-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l29-bg${cinStep >= 6 ? ' visible' : ''}`} />
      {cinStep < 6 && <div className="l29-black" />}
      {cinStep >= 6 && <div className="l29-bg-overlay" />}
      <canvas ref={canvasRef} className="l29-canvas" />
      {whiteBurst && <div className="l29-white-burst" />}
      {goldBurst && <div className="l29-gold-flash" />}
      {radiateFx && <div className="l29-radiate-fx" aria-hidden><span className="l29-radiate-ring" /><span className="l29-radiate-ring r2" /><span className="l29-radiate-ring r3" /></div>}
      {wellPulse && <div className="l29-well-pulse-flash" />}

      {/* HUD */}
      {phase !== 'cinematic' && (
        <div className="l29-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && (
        <div className="l29-level-label">1-29 THE COVENANT TREE</div>
      )}

      {/* Global banner */}
      {banner && <div className={`l29-banner l29-banner-${bannerVariant}`}>{banner}</div>}

      {/* Crown burst overlay */}
      {crownBurst && (
        <div className="l29-crown-burst" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="l29-crown-emoji" style={{ left: `${(i * 29) % 100}%`, animationDelay: `${i * 0.1}s` }}>👑</span>
          ))}
        </div>
      )}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l29-cin">
          <div className="l29-sky-glow" />
          {cinStep < 2 && (
            <div className="l29-silhouettes" aria-hidden>
              <span className="l29-sil l29-sil-left">🧍</span>
              <span className="l29-sil l29-sil-right">🧍</span>
            </div>
          )}
          {cinStep === 1 && <div className="l29-cin-line">A king came to Abraham.</div>}
          {cinStep === 2 && <div className="l29-cin-line">Not to fight.</div>}
          {cinStep === 3 && <div className="l29-cin-line">But to make peace.</div>}
          {cinStep === 4 && <div className="l29-cin-line">Because he saw something in Abraham…</div>}
          {cinStep === 5 && <div className="l29-cin-line">That could only come from God.</div>}
          {cinStep >= 7 && (
            <div className="l29-title-card">
              <span className="l29-title-icon">🌳</span>
              <span className="l29-title-word">THE COVENANT TREE</span>
              <span className="l29-title-icon">🌳</span>
            </div>
          )}
          {cinStep >= 8 && <div className="l29-title-sub">Peace at Beersheba.</div>}
        </div>
      )}

      {/* ── PHASE 1: The Recognition ── */}
      {phase === 'phase1' && (
        <div className="l29-phase-wrap l29-recognition-scene">
          <div className="l29-phase-header">
            <div className="l29-phase-badge">PHASE 1</div>
            <div className="l29-phase-title">THE RECOGNITION 👑</div>
          </div>

          {p1Sub === 'timed' && p1Ready && (
            <TimedSelect key="p1-round1" bubbles={ROUND1_BUBBLES} positions={ROUND1_POS} seconds={12}
              prompt="TAP ALL THE TRUE STATEMENTS!"
              onCorrectTap={p1TimedCorrect} onWrongTap={p1TimedWrong}
              onAllCollected={p1TimedAll} onTimeout={p1TimedTimeout} />
          )}

          {p1Sub === 'yn' && (
            <RoundCard round={P1_YN} sel={p1YnSel} grace={p1YnGrace}
              graceMsg="Think about what Abimelek said out loud — try again!" onPick={handleP1Yn} />
          )}

          {p1Sub === 'mc' && (
            <RoundCard round={P1_MC} sel={p1McSel} grace={p1McGrace}
              graceMsg="Think about why a king would visit peacefully — try again!" onPick={handleP1Mc} />
          )}

          {p1Sub === 'tf' && (
            <RoundCard round={P1_TF} sel={p1TfSel} grace={p1TfGrace}
              graceMsg="Think about who noticed God's favour — try again!" onPick={handleP1Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 2: The Well Dispute ── */}
      {phase === 'phase2' && (
        <div className="l29-phase-wrap l29-dispute-scene">
          <div className="l29-phase-header">
            <div className="l29-phase-badge">PHASE 2</div>
            <div className="l29-phase-title">THE WELL DISPUTE 💧⚔️</div>
          </div>

          {p2Sub === 'match' && p2Ready && (
            <MatchRound pairs={P2_PAIRS} rightOrder={P2_RIGHT_ORDER}
              onCorrectMatch={p2MatchCorrect} onWrongMatch={p2MatchWrong} onAllMatched={p2MatchAll} />
          )}

          {p2Sub === 'yn' && (
            <RoundCard round={P2_YN} sel={p2YnSel} grace={p2YnGrace}
              graceMsg="Think about whether Abraham stayed silent — try again!" onPick={handleP2Yn} />
          )}

          {p2Sub === 'mc' && (
            <RoundCard round={P2_MC} sel={p2McSel} grace={p2McGrace}
              graceMsg="Think about the animals Abraham set apart — try again!" onPick={handleP2Mc} />
          )}

          {p2Sub === 'tf' && (
            <RoundCard round={P2_TF} sel={p2TfSel} grace={p2TfGrace}
              graceMsg="Think about the number of lambs Abraham gave — try again!" onPick={handleP2Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 3: The Covenant Is Sealed ── */}
      {phase === 'phase3' && (
        <div className="l29-phase-wrap l29-covenant-scene">
          <div className="l29-phase-header">
            <div className="l29-phase-badge">PHASE 3</div>
            <div className="l29-phase-title">THE COVENANT IS SEALED 🤝</div>
          </div>

          {p3Sub === 'seals' && p3Ready && (
            <div className="l29-scroll-mechanic">
              <div className={`l29-scroll${scrollBlazing ? ' blazing' : ''}`}>
                {SEALS.map((seal, i) => (
                  <button key={i}
                    style={{ top: `${SEAL_POS[i].top}%`, left: `${SEAL_POS[i].left}%` }}
                    disabled={sealsDone[i]}
                    className={`l29-seal-point${sealsDone[i] ? ' sealed' : ''}`}
                    onClick={() => tapSeal(i)}>
                    {sealsDone[i] ? seal.icon : '✦'}
                  </button>
                ))}
              </div>
              <div className="l29-seal-progress">{sealsDone.filter(Boolean).length} / 5 seals</div>
              {sealMsg && <div className="l29-seal-msg">{sealMsg}</div>}
            </div>
          )}

          {p3Sub === 'timed' && (
            <TimedSelect key="p3-round2" bubbles={ROUND2_BUBBLES} positions={ROUND2_POS} seconds={10}
              prompt="TAP ALL THE TRUE STATEMENTS!"
              onCorrectTap={p3TimedCorrect} onWrongTap={p3TimedWrong}
              onAllCollected={p3TimedAll} onTimeout={p3TimedTimeout} />
          )}
        </div>
      )}

      {/* ── PHASE 4: The Tamarisk Tree ── */}
      {phase === 'phase4' && (
        <div className="l29-phase-wrap l29-tree-scene">
          <div className="l29-phase-header">
            <div className="l29-phase-badge">PHASE 4</div>
            <div className="l29-phase-title">THE TAMARISK TREE 🌳</div>
          </div>

          {p4Sub === 'tree' && p4Ready && (
            <div className="l29-tree-mechanic">
              <div className="l29-tree-hint">Tap the ground to plant the tamarisk tree</div>
              <button className={`l29-tree-btn l29-tree-stage-${treeTaps}`} onClick={tapGround} disabled={treeTaps >= 7}>
                <span className="l29-tree-icon">🌱</span>
              </button>
              <div className="l29-tree-progress">{treeTaps} / 7</div>
            </div>
          )}

          {p4Sub === 'mc1' && (
            <RoundCard round={P4_MC1} sel={p4Mc1Sel} grace={p4Mc1Grace}
              graceMsg="Think about what Abraham planted — try again!" onPick={handleP4Mc1} />
          )}

          {p4Sub === 'mc2' && (
            <RoundCard round={P4_MC2} sel={p4Mc2Sel} grace={p4Mc2Grace}
              graceMsg="Think about the name that means the Eternal God — try again!" onPick={handleP4Mc2} />
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
        <div className="l29-ending-wrap">
          <div className="l29-ending-glow" />
          <div className="l29-ending-bloom" aria-hidden>
            {['🌸', '🌿', '🌸', '🌿', '🌸'].map((ic, i) => (
              <span key={i} className="l29-bloom-item" style={{ left: `${(i * 21 + 4) % 100}%`, animationDelay: `${i * 0.25}s` }}>{ic}</span>
            ))}
          </div>
          <div className="l29-ending-name">{playerName} — PLANT SOMETHING THAT WILL OUTLAST YOU!</div>
          <div className="l29-stars-row">
            {starsShown >= 1 && <div className="l29-end-star l29-st1">⭐</div>}
            {starsShown >= 2 && <div className="l29-end-star l29-st2">⭐</div>}
            {starsShown >= 3 && <div className="l29-end-star l29-st3">⭐</div>}
          </div>
          <div className="l29-coin-tally">
            <span className="l29-coin-icon">🪙</span>
            <span className="l29-coin-num">{coinCount}</span>
            <span className="l29-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l29-scripture-card">
              <div className="l29-scripture-watermark" aria-hidden>🌳</div>
              <div className="l29-scripture-quote">
                "Abraham planted a tamarisk tree in Beersheba, and there he called on the name of the LORD, the Eternal God."
              </div>
              <div className="l29-scripture-ref">— Genesis 21:33</div>
            </div>
          )}
          {showAdvance && (
            <button className="l29-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-30 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
