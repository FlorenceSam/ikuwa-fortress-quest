import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level28.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'timed' | 'yn' | 'mc1' | 'mc2'
type P2Sub = 'match' | 'tf' | 'mc1' | 'mc2'
type P3Sub = 'well' | 'mc1' | 'refl' | 'mc2'
type P4Sub = 'match' | 'mc1' | 'mc2' | 'mc3' | 'boss'
type RoundT = 'yn' | 'tf' | 'mc'
type Banner = 'gold' | 'warn' | 'comedic' | 'legendary' | 'emotional'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }
interface Bubble { text: string; correct: boolean }
interface MPair { left: string; right: string }
interface Pos { top: number; left: number }

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'God is proud of you right now!',
  'You are sharper than an arrow — just like Ishmael!',
  'Heaven is cheering for you!',
  'You just proved you belong here!',
  'God sees you — just like He saw Hagar!',
  'That answer was found in the desert and you found it!',
  'You are not forgotten — and neither was Ishmael!',
  'The angels are high-fiving right now because of you!',
  'You found the well — brilliant!',
  'God was with Ishmael — and He is with you too!',
]

const ROUND1_POS: Pos[] = [
  { top: 8,  left: 18 }, { top: 6,  left: 68 }, { top: 30, left: 42 },
  { top: 40, left: 12 }, { top: 55, left: 78 }, { top: 68, left: 38 },
]
const ROUND1_BUBBLES: Bubble[] = [
  { text: 'Hagar and Ishmael wandered in the desert', correct: true },
  { text: 'They found water immediately', correct: false },
  { text: 'Abraham came to help them', correct: false },
  { text: 'Their water ran out', correct: true },
  { text: 'They returned to Sarah', correct: false },
  { text: 'Hagar placed Ishmael under a shrub', correct: true },
]

const ROUND2_POS: Pos[] = [
  { top: 5,  left: 15 }, { top: 4,  left: 65 }, { top: 22, left: 40 }, { top: 30, left: 85 },
  { top: 42, left: 10 }, { top: 50, left: 62 }, { top: 65, left: 30 }, { top: 72, left: 78 },
]
const ROUND2_BUBBLES: Bubble[] = [
  { text: 'God heard Ishmael crying in the desert', correct: true },
  { text: 'God forgot about Hagar after Genesis 16', correct: false },
  { text: 'God provided water when there was none', correct: true },
  { text: 'Ishmael was punished for being sent away', correct: false },
  { text: 'God kept His promise about Ishmael', correct: true },
  { text: 'Hagar gave up and God did nothing', correct: false },
  { text: 'No one is too forgotten for God to find', correct: true },
  { text: 'Only Isaac mattered to God', correct: false },
]

const P1_YN: Round = { type: 'yn', q: 'Is this the first time Hagar is leaving Abraham’s household?', opts: ['YES', 'NO'], ans: 1 }
const P1_MC1: Round = {
  type: 'mc',
  q: 'Why did Hagar put Ishmael under a shrub?',
  opts: [
    'To hide him from enemies',
    'To keep him cool from the sun',
    'She could not bear to watch him die of thirst',
    'To let him sleep while she found water',
  ],
  ans: 2,
}
const P1_MC2: Round = {
  type: 'mc',
  q: 'How far away did Hagar sit when she wept?',
  opts: [
    'Right beside Ishmael',
    'About a bowshot away',
    'At the edge of the desert',
    'She did not sit — she kept walking',
  ],
  ans: 1,
}

const P2_PAIRS: MPair[] = [
  { left: 'Hagar',            right: 'Wept aloud and could not watch her son die' },
  { left: 'Ishmael',          right: 'His cry was heard by God in heaven' },
  { left: 'The Angel of God', right: '“What is wrong with you, Hagar? Do not be afraid!”' },
  { left: 'God',              right: 'Opened her eyes and showed her a well of water' },
]
const P2_RIGHT_ORDER = [2, 0, 3, 1]
const P2_TF: Round = { type: 'tf', q: 'The angel of God appeared to Hagar in person, standing before her.', opts: ['TRUE', 'FALSE'], ans: 1 }
const P2_MC1: Round = {
  type: 'mc',
  q: 'Who spoke to Hagar in the desert?',
  opts: [
    'Abraham came after them',
    'A passing traveller helped them',
    'The angel of God called to her from heaven',
    'Ishmael found the water himself',
  ],
  ans: 2,
}
const P2_MC2: Round = {
  type: 'mc',
  q: 'How many times has the angel of the Lord appeared to Hagar?',
  opts: [
    'Once — only this time',
    'Twice — once when she fled Sarah and once now',
    'Three times',
    'Never — it was a dream',
  ],
  ans: 1,
}

const P3_MC1: Round = {
  type: 'mc',
  q: 'What did God open Hagar’s eyes to see?',
  opts: [
    'A city nearby where they could live',
    'Angels surrounding them protectively',
    'A well of water right there in the desert',
    'A caravan of travellers passing by',
  ],
  ans: 2,
}
const P3_MC2: Round = {
  type: 'mc',
  q: "What was Ishmael's rough age during this desert event?",
  opts: ['A baby', '5 years old', '10 years old', 'About 14-16 years old'],
  ans: 3,
}
const P3_REFL_Q = 'Do you think Hagar learned her lesson from the first time she ran away?'
const P3_REFL_TRUE  = 'Maybe! But she still ended up in the desert again — God’s grace found her both times!'
const P3_REFL_FALSE = 'Probably not! But God’s mercy met her anyway — grace is greater than our lessons!'

const P4_PAIRS: MPair[] = [
  { left: 'Ishmael grew up in the desert',  right: 'He lived in the Desert of Paran' },
  { left: 'God was with Ishmael',           right: 'He prospered and became father of a great nation' },
  { left: 'Ishmael became skilled',         right: 'He became a great archer' },
  { left: 'His mother found him a wife',    right: 'She found a wife for him from Egypt' },
]
const P4_RIGHT_ORDER = [2, 0, 3, 1]
const P4_MC1: Round = {
  type: 'mc',
  q: 'Where did Hagar and Ishmael end up living?',
  opts: ['Egypt', 'Canaan', 'Beersheba', 'The wilderness of Paran'],
  ans: 3,
}
const P4_MC2: Round = {
  type: 'mc',
  q: 'What nation did Ishmael father?',
  opts: ['The Moabites', 'The Philistines', 'The Ishmaelites — 12 princes and a great nation', 'The Edomites'],
  ans: 2,
}
const P4_MC3: Round = {
  type: 'mc',
  q: '"God was with the boy." What does that mean?',
  opts: [
    'God watched from a distance but did not help',
    'God only helped because Abraham asked Him to',
    'God was physically visible walking beside Ishmael',
    "God actively guided, protected and blessed Ishmael's life as he grew up",
  ],
  ans: 3,
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function playCelebrationTone() {
  try {
    const c = new AudioContext()
    ;[392, 494, 587, 659].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'triangle'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.08)
      g.gain.linearRampToValueAtTime(0.16, c.currentTime + i * 0.08 + 0.05)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.6)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.08); o.stop(c.currentTime + i * 0.08 + 0.7)
    })
  } catch (_) {}
}
function playDesertShift() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(340, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(140, c.currentTime + 1.6)
    g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.9)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 2)
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
function playWellSplash() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(300, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.25)
    g.gain.setValueAtTime(0.16, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.32)
  } catch (_) {}
}
function playWellBlaze() {
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
function playDoublePulseTone() {
  try {
    const c = new AudioContext()
    ;[0, 0.3].forEach(offset => {
      ;[440, 659].forEach((f, i) => {
        const o = c.createOscillator(); const g = c.createGain()
        o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0, c.currentTime + offset + i * 0.05)
        g.gain.linearRampToValueAtTime(0.18, c.currentTime + offset + i * 0.05 + 0.05)
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + i * 0.05 + 0.5)
        o.connect(g); g.connect(c.destination)
        o.start(c.currentTime + offset + i * 0.05); o.stop(c.currentTime + offset + i * 0.05 + 0.55)
      })
    })
  } catch (_) {}
}
function playSurpriseTone() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.setValueAtTime(300, c.currentTime)
    o.frequency.linearRampToValueAtTime(700, c.currentTime + 0.2)
    g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.42)
  } catch (_) {}
}
function playArrowWhoosh() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(900, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.35)
    g.gain.setValueAtTime(0.14, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.42)
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
function playWaterChime(pitch = 1.0) {
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
    <div className={`l28-q-card${extraClass ? ' ' + extraClass : ''}`}>
      <div className="l28-round-label">
        {label ?? (round.type === 'yn' ? 'YES OR NO?' : round.type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?')}
      </div>
      <p className="l28-q-text">{round.q}</p>
      {round.type === 'yn' && (
        <div className="l28-yn-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l28-yn-btn${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'tf' && (
        <div className="l28-tf-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l28-tf-tablet${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'mc' && (
        <div className="l28-mc-opts">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l28-mc-opt${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {grace && <div className="l28-grace">✨ {graceMsg}</div>}
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
    <div className="l28-timed-scene">
      {urgent && timeLeft <= 5 && (
        <div className="l28-sand-swirl" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="l28-sand-mote" style={{ left: `${(i * 17 + 5) % 100}%`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      )}
      <div className="l28-timer-wrap">
        <div className="l28-timer-label">{prompt}</div>
        <div className={`l28-timer-bar${timerClass}${urgentClass}`}>
          <div className="l28-timer-fill" style={{ width: `${(timeLeft / seconds) * 100}%` }} />
        </div>
        <div className="l28-timer-num">⏱️ {timeLeft}s</div>
      </div>
      <div className="l28-bubble-field">
        {bubbles.map((b, i) => (
          <button key={i}
            style={{ top: `${positions[i].top}%`, left: `${positions[i].left}%`, animationDelay: `${i * 0.15}s` }}
            disabled={collected[i] || revealed[i]}
            className={`l28-bubble${collected[i] || revealed[i] ? ' collected' : ''}${wrongIdx === i ? ' wrong-shake' : ''}`}
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
    <div className="l28-match-scene">
      <div className="l28-match-wrap" ref={containerRef}>
        <svg className="l28-match-svg">
          {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="l28-match-line" />)}
        </svg>
        <div className="l28-match-col l28-match-left">
          {pairs.map((p, i) => (
            <button key={i} ref={el => { leftRefs.current[i] = el }}
              disabled={leftMatched[i]}
              className={`l28-match-item${leftMatched[i] ? ' matched' : ''}${selectedLeft === i ? ' selected' : ''}${wrongFlash?.left === i ? ' wrong-shake' : ''}`}
              onClick={() => tapLeft(i)}>{p.left}</button>
          ))}
        </div>
        <div className="l28-match-col l28-match-right">
          {rightOrder.map((pairIdx, pos) => (
            <button key={pos} ref={el => { rightRefs.current[pos] = el }}
              disabled={rightMatched[pos]}
              className={`l28-match-item${rightMatched[pos] ? ' matched' : ''}${wrongFlash?.rightPos === pos ? ' wrong-shake' : ''}`}
              onClick={() => tapRight(pos)}>{pairs[pairIdx].right}</button>
          ))}
        </div>
      </div>
      {hint && <div className="l28-match-hint">{hint}</div>}
    </div>
  )
}

// ── Emoji burst overlay (laugh / surprise / arrow) ──────────────────────────
function EmojiBurst({ emoji, count = 10 }: { emoji: string; count?: number }) {
  return (
    <div className="l28-emoji-burst" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="l28-emoji-burst-item" style={{ left: `${(i * 29) % 100}%`, animationDelay: `${i * 0.09}s` }}>{emoji}</span>
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level28({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [whiteBurst, setWhiteBurst] = useState(false)
  const [goldBurst, setGoldBurst]   = useState(false)
  const [amberPulse, setAmberPulse] = useState(false)
  const [emojiBurst, setEmojiBurst] = useState<string | null>(null)
  const [banner, setBannerText]     = useState<string | null>(null)
  const [bannerVariant, setBannerVariant] = useState<Banner>('gold')

  // Cinematic
  const [cinStep, setCinStep] = useState(0)

  // Phase 1
  const [p1Ready, setP1Ready] = useState(false)
  const [p1Sub, setP1Sub]     = useState<P1Sub>('timed')
  const [p1YnSel, setP1YnSel] = useState<number | null>(null)
  const [p1YnGrace, setP1YnGrace] = useState(false)
  const [p1Mc1Sel, setP1Mc1Sel] = useState<number | null>(null)
  const [p1Mc1Grace, setP1Mc1Grace] = useState(false)
  const [p1Mc2Sel, setP1Mc2Sel] = useState<number | null>(null)
  const [p1Mc2Grace, setP1Mc2Grace] = useState(false)

  // Phase 2
  const [p2Ready, setP2Ready] = useState(false)
  const [p2Sub, setP2Sub]     = useState<P2Sub>('match')
  const [p2TfSel, setP2TfSel] = useState<number | null>(null)
  const [p2TfGrace, setP2TfGrace] = useState(false)
  const [p2Mc1Sel, setP2Mc1Sel] = useState<number | null>(null)
  const [p2Mc1Grace, setP2Mc1Grace] = useState(false)
  const [p2Mc2Sel, setP2Mc2Sel] = useState<number | null>(null)
  const [p2Mc2Grace, setP2Mc2Grace] = useState(false)

  // Phase 3
  const [p3Ready, setP3Ready] = useState(false)
  const [p3Sub, setP3Sub]     = useState<P3Sub>('well')
  const [wellTaps, setWellTaps] = useState(0)
  const [p3Mc1Sel, setP3Mc1Sel] = useState<number | null>(null)
  const [p3Mc1Grace, setP3Mc1Grace] = useState(false)
  const [p3ReflSel, setP3ReflSel] = useState<'true' | 'false' | null>(null)
  const [p3Mc2Sel, setP3Mc2Sel] = useState<number | null>(null)
  const [p3Mc2Grace, setP3Mc2Grace] = useState(false)

  // Phase 4
  const [p4Ready, setP4Ready] = useState(false)
  const [p4Sub, setP4Sub]     = useState<P4Sub>('match')
  const [p4Mc1Sel, setP4Mc1Sel] = useState<number | null>(null)
  const [p4Mc1Grace, setP4Mc1Grace] = useState(false)
  const [p4Mc2Sel, setP4Mc2Sel] = useState<number | null>(null)
  const [p4Mc2Grace, setP4Mc2Grace] = useState(false)
  const [p4Mc3Sel, setP4Mc3Sel] = useState<number | null>(null)
  const [p4Mc3Grace, setP4Mc3Grace] = useState(false)

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
    setShakeClass('l28-shake'); setTimeout(() => setShakeClass(''), 700)
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
        const hue = i % 2 === 0 ? 45 : 205
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 70, hue)
      }, i * 110)
  }, [burst])

  const fireLegendaryBurst = useCallback(() => {
    setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 2000)
    for (let i = 0; i < 16; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 205
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 85, hue)
      }, i * 110)
  }, [burst])

  const fireAmberPulse = useCallback(() => {
    setAmberPulse(true); setTimeout(() => setAmberPulse(false), 1400)
  }, [])

  const fireDoublePulse = useCallback(() => {
    setGoldBurst(true); setTimeout(() => setGoldBurst(false), 500)
    setTimeout(() => { setGoldBurst(true); setTimeout(() => setGoldBurst(false), 700) }, 550)
  }, [])

  const fireEmojiBurst = useCallback((emoji: string) => {
    setEmojiBurst(emoji); setTimeout(() => setEmojiBurst(null), 2200)
  }, [])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playCelebrationTone()
    const ts = [
      setTimeout(() => { setCinStep(1); playDesertShift() }, 800),
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
    setP1Ready(false); setP1Sub('timed')
    setP1YnSel(null); setP1YnGrace(false); setP1Mc1Sel(null); setP1Mc1Grace(false); setP1Mc2Sel(null); setP1Mc2Grace(false)
    speak('Hagar walked into the desert with her son. Every step taking them further from everything they knew. The sun was relentless. The water was running out.', () => {
      setP1Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p1TimedCorrect = useCallback(() => { addEarned(8); playPing() }, [addEarned])
  const p1TimedWrong   = useCallback(() => { playBuzz() }, [])
  const p1TimedAll     = useCallback(() => {
    addEarned(25); playGoldPop(); fireGoldBurst(); shake()
    showBanner('STEP BY STEP THROUGH THE DESERT!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP1Sub('yn'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])
  const p1TimedTimeout = useCallback(() => {
    showBanner('Keep going — God is still in this story!', 'comedic', 3000)
    setTimeout(() => setP1Sub('yn'), 3200)
  }, [showBanner])

  const handleP1Yn = useCallback((idx: number) => {
    if (p1YnSel !== null || p1YnGrace) return
    setP1YnSel(idx)
    if (idx === P1_YN.ans) {
      addEarned(20); playAmberPulseTone(); fireAmberPulse(); shake()
      showBanner('SHE RAN BEFORE — AND HERE SHE IS AGAIN!!', 'emotional', 3200)
      setTimeout(() => setP1Sub('mc1'), 3400)
    } else {
      setP1YnGrace(true); setP1YnSel(null); playBuzz()
      setTimeout(() => setP1YnGrace(false), 2800)
    }
  }, [p1YnSel, p1YnGrace, addEarned, shake, showBanner, fireAmberPulse])

  const handleP1Mc1 = useCallback((idx: number) => {
    if (p1Mc1Sel !== null || p1Mc1Grace) return
    setP1Mc1Sel(idx)
    if (idx === P1_MC1.ans) {
      addEarned(20); playGoldPop(); shake()
      fireAffirmation()
      setTimeout(() => setP1Sub('mc2'), 2400)
    } else {
      setP1Mc1Grace(true); setP1Mc1Sel(null); playBuzz()
      setTimeout(() => setP1Mc1Grace(false), 2800)
    }
  }, [p1Mc1Sel, p1Mc1Grace, addEarned, shake, fireAffirmation])

  const handleP1Mc2 = useCallback((idx: number) => {
    if (p1Mc2Sel !== null || p1Mc2Grace) return
    setP1Mc2Sel(idx)
    if (idx === P1_MC2.ans) {
      addEarned(20); playGoldPop(); shake()
      setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 2200)
    } else {
      setP1Mc2Grace(true); setP1Mc2Sel(null); playBuzz()
      setTimeout(() => setP1Mc2Grace(false), 2800)
    }
  }, [p1Mc2Sel, p1Mc2Grace, addEarned, shake])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Ready(false); setP2Sub('match')
    setP2TfSel(null); setP2TfGrace(false); setP2Mc1Sel(null); setP2Mc1Grace(false); setP2Mc2Sel(null); setP2Mc2Grace(false)
    speak('In the silence of the desert, something happened that changed everything. A cry went up. And heaven responded.', () => {
      setP2Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p2MatchCorrect = useCallback(() => { addEarned(15); playChime() }, [addEarned])
  const p2MatchWrong   = useCallback(() => { playBuzz() }, [])
  const p2MatchAll     = useCallback(() => {
    addEarned(30); playGoldPop(); fireGoldBurst(); shake()
    showBanner('GOD HEARD THE CRY!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP2Sub('tf'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP2Tf = useCallback((idx: number) => {
    if (p2TfSel !== null || p2TfGrace) return
    setP2TfSel(idx)
    if (idx === P2_TF.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner('THE VOICE CAME FROM HEAVEN!!', 'gold', 3000)
      setTimeout(() => setP2Sub('mc1'), 3200)
    } else {
      setP2TfGrace(true); setP2TfSel(null); playBuzz()
      setTimeout(() => setP2TfGrace(false), 2800)
    }
  }, [p2TfSel, p2TfGrace, addEarned, shake, showBanner])

  const handleP2Mc1 = useCallback((idx: number) => {
    if (p2Mc1Sel !== null || p2Mc1Grace) return
    setP2Mc1Sel(idx)
    if (idx === P2_MC1.ans) {
      addEarned(20); playGoldPop(); shake()
      fireAffirmation()
      setTimeout(() => setP2Sub('mc2'), 2400)
    } else {
      setP2Mc1Grace(true); setP2Mc1Sel(null); playBuzz()
      setTimeout(() => setP2Mc1Grace(false), 2800)
    }
  }, [p2Mc1Sel, p2Mc1Grace, addEarned, shake, fireAffirmation])

  const handleP2Mc2 = useCallback((idx: number) => {
    if (p2Mc2Sel !== null || p2Mc2Grace) return
    setP2Mc2Sel(idx)
    if (idx === P2_MC2.ans) {
      addEarned(25); playDoublePulseTone(); fireDoublePulse(); shake()
      showBanner('TWICE GOD SHOWED UP FOR HAGAR!!', 'legendary', 3200)
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 3400)
    } else {
      setP2Mc2Grace(true); setP2Mc2Sel(null); playBuzz()
      setTimeout(() => setP2Mc2Grace(false), 2800)
    }
  }, [p2Mc2Sel, p2Mc2Grace, addEarned, shake, showBanner, fireDoublePulse])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Ready(false); setP3Sub('well'); setWellTaps(0)
    setP3Mc1Sel(null); setP3Mc1Grace(false); setP3ReflSel(null); setP3Mc2Sel(null); setP3Mc2Grace(false)
    speak('Something supernatural happened in that moment. What was hidden became visible. What seemed impossible became real. God provided.', () => {
      setP3Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapWell = useCallback(() => {
    if (wellTaps >= 5) return
    playWellSplash(); addEarned(8)
    const next = wellTaps + 1
    setWellTaps(next)
    if (next >= 5) {
      setTimeout(() => {
        addEarned(20); playWellBlaze(); fireGoldBurst(); shake()
        showBanner('THE WELL IS REVEALED!!', 'legendary', 3200)
        fireAffirmation()
        setTimeout(() => setP3Sub('mc1'), 3400)
      }, 500)
    }
  }, [wellTaps, addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP3Mc1 = useCallback((idx: number) => {
    if (p3Mc1Sel !== null || p3Mc1Grace) return
    setP3Mc1Sel(idx)
    if (idx === P3_MC1.ans) {
      addEarned(20); playGoldPop(); shake()
      setTimeout(() => setP3Sub('refl'), 2200)
    } else {
      setP3Mc1Grace(true); setP3Mc1Sel(null); playBuzz()
      setTimeout(() => setP3Mc1Grace(false), 2800)
    }
  }, [p3Mc1Sel, p3Mc1Grace, addEarned, shake])

  const handleP3Refl = useCallback((choice: 'true' | 'false') => {
    if (p3ReflSel !== null) return
    setP3ReflSel(choice)
    addEarned(15); playChime(); shake()
    fireAffirmation()
    setTimeout(() => setP3Sub('mc2'), 3600)
  }, [p3ReflSel, addEarned, shake, fireAffirmation])

  const handleP3Mc2 = useCallback((idx: number) => {
    if (p3Mc2Sel !== null || p3Mc2Grace) return
    setP3Mc2Sel(idx)
    if (idx === P3_MC2.ans) {
      addEarned(20); playSurpriseTone(); fireEmojiBurst('😲'); shake()
      showBanner('ISHMAEL WAS A TEENAGER!!', 'comedic', 3000)
      setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 3200)
    } else {
      setP3Mc2Grace(true); setP3Mc2Sel(null); playBuzz()
      setTimeout(() => setP3Mc2Grace(false), 2800)
    }
  }, [p3Mc2Sel, p3Mc2Grace, addEarned, shake, showBanner, fireEmojiBurst])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Ready(false); setP4Sub('match')
    setP4Mc1Sel(null); setP4Mc1Grace(false); setP4Mc2Sel(null); setP4Mc2Grace(false); setP4Mc3Sel(null); setP4Mc3Grace(false)
    speak('What happened next was extraordinary. A boy who was cast out became something remarkable. God does not waste anyone.', () => {
      setP4Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p4MatchCorrect = useCallback(() => { addEarned(15); playChime() }, [addEarned])
  const p4MatchWrong   = useCallback(() => { playBuzz() }, [])
  const p4MatchAll     = useCallback(() => {
    addEarned(30); playArrowWhoosh(); fireEmojiBurst('🏹'); fireGoldBurst(); shake()
    showBanner("ISHMAEL'S DESTINY REVEALED!!", 'legendary', 3200)
    fireAffirmation()
    setTimeout(() => setP4Sub('mc1'), 3400)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation, fireEmojiBurst])

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
      addEarned(20); playGoldPop(); shake()
      fireAffirmation()
      setTimeout(() => setP4Sub('mc3'), 2400)
    } else {
      setP4Mc2Grace(true); setP4Mc2Sel(null); playBuzz()
      setTimeout(() => setP4Mc2Grace(false), 2800)
    }
  }, [p4Mc2Sel, p4Mc2Grace, addEarned, shake, fireAffirmation])

  const handleP4Mc3 = useCallback((idx: number) => {
    if (p4Mc3Sel !== null || p4Mc3Grace) return
    setP4Mc3Sel(idx)
    if (idx === P4_MC3.ans) {
      addEarned(25); playGoldPop(); shake()
      showBanner('GOD ACTIVELY WALKS WITH HIS CHILDREN!!', 'gold', 3200)
      setTimeout(() => setP4Sub('boss'), 3400)
    } else {
      setP4Mc3Grace(true); setP4Mc3Sel(null); playBuzz()
      setTimeout(() => setP4Mc3Grace(false), 2800)
    }
  }, [p4Mc3Sel, p4Mc3Grace, addEarned, shake, showBanner])

  const p4BossCorrect = useCallback(() => { playPing() }, [])
  const p4BossWrong   = useCallback(() => { playBuzz() }, [])
  const p4BossAll     = useCallback(() => {
    addEarned(60); playWhiteBurstSound(); fireLegendaryBurst(); playCoinShower(); shake()
    showBanner(`${playerName} — GOD SEES YOU TOO!!`, 'legendary', 4200)
    fireAffirmation()
    setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4600)
  }, [addEarned, fireLegendaryBurst, shake, showBanner, playerName, fireAffirmation])
  const p4BossTimeout = useCallback(() => {
    showBanner('Keep going — God is still in this story!', 'comedic', 3000)
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
      if (cur % (Math.ceil(total / 6)) === 0 || cur === total) playWaterChime(0.8 + (cur / total) * 0.5)
      if (cur >= total) clearInterval(id)
    }, 28)
    for (let i = 0; i < 10; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 205
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.7, 40, hue)
      }, i * 180)
    const ts = [
      setTimeout(() => setStarsShown(1), 1400),
      setTimeout(() => setStarsShown(2), 2100),
      setTimeout(() => setStarsShown(3), 2800),
      setTimeout(() => {
        setShowScripture(true)
        speak('God heard the boy crying, and the angel of God called to Hagar from heaven. Then God opened her eyes and she saw a well of water. Genesis chapter 21.')
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
        verse="God heard the boy crying, and the angel of God called to Hagar from heaven... Then God opened her eyes and she saw a well of water."
        verseRef="Genesis 21:17-19"
        subtitle={`${playerName} — you are never forgotten`}
        voiceLine={`${playerName}. In the driest desert, God still saw Hagar and Ishmael. He sees you too — you are never forgotten.`}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`l28-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l28-bg${cinStep >= 5 ? ' visible' : ''}`} />
      {cinStep < 5 && <div className="l28-black" />}
      {cinStep >= 5 && <div className="l28-bg-overlay" />}
      <canvas ref={canvasRef} className="l28-canvas" />
      {whiteBurst && <div className="l28-white-burst" />}
      {goldBurst && <div className="l28-gold-flash" />}
      {amberPulse && <div className="l28-amber-flash" />}

      {/* HUD */}
      {phase !== 'cinematic' && (
        <div className="l28-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && (
        <div className="l28-level-label">1-28 CAST OUT</div>
      )}

      {/* Global banner */}
      {banner && <div className={`l28-banner l28-banner-${bannerVariant}`}>{banner}</div>}

      {/* Emoji burst overlay */}
      {emojiBurst && <EmojiBurst emoji={emojiBurst} />}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l28-cin">
          <div className={`l28-mood-glow${cinStep >= 1 ? ' shifted' : ''}`} />
          <div className="l28-sand-drift" aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="l28-sand-speck" style={{ left: `${(i * 23) % 100}%`, animationDelay: `${i * 0.35}s` }} />
            ))}
          </div>
          {cinStep === 1 && <div className="l28-cin-line">The feast was over.</div>}
          {cinStep === 2 && <div className="l28-cin-line">The laughter faded.</div>}
          {cinStep === 3 && <div className="l28-cin-line">And for Hagar…</div>}
          {cinStep === 4 && <div className="l28-cin-line">The desert waited.</div>}
          {cinStep >= 6 && (
            <div className="l28-title-card">
              <span className="l28-title-icon">🏜️</span>
              <span className="l28-title-word">CAST OUT</span>
              <span className="l28-title-icon">🏜️</span>
            </div>
          )}
          {cinStep >= 7 && <div className="l28-title-sub">God meets us in our desert moments.</div>}
        </div>
      )}

      {/* ── PHASE 1: The Long Walk ── */}
      {phase === 'phase1' && (
        <div className="l28-phase-wrap l28-walk-scene">
          <div className="l28-phase-header">
            <div className="l28-phase-badge">PHASE 1</div>
            <div className="l28-phase-title">THE LONG WALK 🏜️</div>
          </div>

          {p1Sub === 'timed' && p1Ready && (
            <TimedSelect key="p1-round1" bubbles={ROUND1_BUBBLES} positions={ROUND1_POS} seconds={12}
              prompt="TAP ALL THE TRUE STATEMENTS!"
              onCorrectTap={p1TimedCorrect} onWrongTap={p1TimedWrong}
              onAllCollected={p1TimedAll} onTimeout={p1TimedTimeout} />
          )}

          {p1Sub === 'yn' && (
            <RoundCard round={P1_YN} sel={p1YnSel} grace={p1YnGrace}
              graceMsg="Think back to Genesis 16 — try again!" onPick={handleP1Yn} />
          )}

          {p1Sub === 'mc1' && (
            <RoundCard round={P1_MC1} sel={p1Mc1Sel} grace={p1Mc1Grace}
              graceMsg="Think about a mother's heart — try again!" onPick={handleP1Mc1} />
          )}

          {p1Sub === 'mc2' && (
            <RoundCard round={P1_MC2} sel={p1Mc2Sel} grace={p1Mc2Grace}
              graceMsg="Think about how far she sat from her son — try again!" onPick={handleP1Mc2} />
          )}
        </div>
      )}

      {/* ── PHASE 2: The Cry Heard in Heaven ── */}
      {phase === 'phase2' && (
        <div className="l28-phase-wrap l28-cry-scene">
          <div className="l28-phase-header">
            <div className="l28-phase-badge">PHASE 2</div>
            <div className="l28-phase-title">THE CRY HEARD IN HEAVEN 👼</div>
          </div>

          {p2Sub === 'match' && p2Ready && (
            <MatchRound pairs={P2_PAIRS} rightOrder={P2_RIGHT_ORDER}
              onCorrectMatch={p2MatchCorrect} onWrongMatch={p2MatchWrong} onAllMatched={p2MatchAll} />
          )}

          {p2Sub === 'tf' && (
            <RoundCard round={P2_TF} sel={p2TfSel} grace={p2TfGrace}
              graceMsg="Think about where the voice came from — try again!" onPick={handleP2Tf} />
          )}

          {p2Sub === 'mc1' && (
            <RoundCard round={P2_MC1} sel={p2Mc1Sel} grace={p2Mc1Grace}
              graceMsg="Think about who called out to her — try again!" onPick={handleP2Mc1} />
          )}

          {p2Sub === 'mc2' && (
            <RoundCard round={P2_MC2} sel={p2Mc2Sel} grace={p2Mc2Grace}
              graceMsg="Think back to her first flight from Sarah — try again!" onPick={handleP2Mc2} />
          )}
        </div>
      )}

      {/* ── PHASE 3: The Well Is Opened ── */}
      {phase === 'phase3' && (
        <div className="l28-phase-wrap l28-well-scene">
          <div className="l28-phase-header">
            <div className="l28-phase-badge">PHASE 3</div>
            <div className="l28-phase-title">THE WELL IS OPENED 💧</div>
          </div>

          {p3Sub === 'well' && p3Ready && (
            <div className="l28-well-mechanic">
              <div className="l28-well-hint">Tap the well to reveal what God has provided</div>
              <button className={`l28-well-btn l28-well-stage-${wellTaps}`} onClick={tapWell} disabled={wellTaps >= 5}>
                <span className="l28-well-glow" />
                <span className="l28-well-icon">🕳️</span>
                {wellTaps >= 5 && <span className="l28-well-water">💧</span>}
              </button>
              <div className="l28-well-progress">{wellTaps} / 5</div>
            </div>
          )}

          {p3Sub === 'mc1' && (
            <RoundCard round={P3_MC1} sel={p3Mc1Sel} grace={p3Mc1Grace}
              graceMsg="Think about what was right there all along — try again!" onPick={handleP3Mc1} />
          )}

          {p3Sub === 'refl' && (
            <div className="l28-q-card l28-refl-card">
              <div className="l28-round-label">A MOMENT TO REFLECT</div>
              <p className="l28-q-text">{P3_REFL_Q}</p>
              {p3ReflSel === null && (
                <div className="l28-tf-row">
                  <button className="l28-tf-tablet" onClick={() => handleP3Refl('true')}>TRUE</button>
                  <button className="l28-tf-tablet" onClick={() => handleP3Refl('false')}>FALSE</button>
                </div>
              )}
              {p3ReflSel !== null && (
                <div className="l28-refl-response">
                  {p3ReflSel === 'true' ? P3_REFL_TRUE : P3_REFL_FALSE}
                </div>
              )}
            </div>
          )}

          {p3Sub === 'mc2' && (
            <RoundCard round={P3_MC2} sel={p3Mc2Sel} grace={p3Mc2Grace}
              graceMsg="Think about how many years had passed since his birth — try again!" onPick={handleP3Mc2} />
          )}
        </div>
      )}

      {/* ── PHASE 4: God Was With the Boy ── */}
      {phase === 'phase4' && (
        <div className="l28-phase-wrap l28-destiny-scene">
          <div className="l28-phase-header">
            <div className="l28-phase-badge">PHASE 4</div>
            <div className="l28-phase-title">GOD WAS WITH THE BOY 🏹</div>
          </div>

          {p4Sub === 'match' && p4Ready && (
            <MatchRound pairs={P4_PAIRS} rightOrder={P4_RIGHT_ORDER}
              onCorrectMatch={p4MatchCorrect} onWrongMatch={p4MatchWrong} onAllMatched={p4MatchAll} />
          )}

          {p4Sub === 'mc1' && (
            <RoundCard round={P4_MC1} sel={p4Mc1Sel} grace={p4Mc1Grace}
              graceMsg="Think about where they finally settled — try again!" onPick={handleP4Mc1} />
          )}

          {p4Sub === 'mc2' && (
            <RoundCard round={P4_MC2} sel={p4Mc2Sel} grace={p4Mc2Grace}
              graceMsg="Think about the nation named after Ishmael himself — try again!" onPick={handleP4Mc2} />
          )}

          {p4Sub === 'mc3' && (
            <RoundCard round={P4_MC3} sel={p4Mc3Sel} grace={p4Mc3Grace}
              graceMsg="Think about what it truly means for God to be with someone — try again!" onPick={handleP4Mc3} />
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
        <div className="l28-ending-wrap">
          <div className="l28-ending-glow" />
          <div className="l28-ending-wings" aria-hidden>
            <span className="l28-wing l28-wing-left">🕊️</span>
            <span className="l28-wing l28-wing-right">🕊️</span>
          </div>
          <div className="l28-ending-name">{playerName} — YOU ARE NEVER FORGOTTEN!</div>
          <div className="l28-stars-row">
            {starsShown >= 1 && <div className="l28-end-star l28-st1">⭐</div>}
            {starsShown >= 2 && <div className="l28-end-star l28-st2">⭐</div>}
            {starsShown >= 3 && <div className="l28-end-star l28-st3">⭐</div>}
          </div>
          <div className="l28-coin-tally">
            <span className="l28-coin-icon">🪙</span>
            <span className="l28-coin-num">{coinCount}</span>
            <span className="l28-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l28-scripture-card">
              <div className="l28-scripture-watermark" aria-hidden>💧👼</div>
              <div className="l28-scripture-quote">
                "God heard the boy crying, and the angel of God called to Hagar from heaven... Then God opened her eyes and she saw a well of water."
              </div>
              <div className="l28-scripture-ref">— Genesis 21:17-19</div>
            </div>
          )}
          {showAdvance && (
            <button className="l28-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-29 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
