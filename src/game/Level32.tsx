import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level32.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub = 'timed' | 'yn' | 'mc' | 'tf'
type P2Sub = 'prayer' | 'yn' | 'mc' | 'tf'
type P3Sub = 'water' | 'match' | 'mc' | 'yn'
type P4Sub = 'match' | 'boss' | 'isaac'
type RoundT = 'yn' | 'tf' | 'mc'
type Banner = 'gold' | 'warn' | 'comedic' | 'legendary' | 'emotional'
interface Round { type: RoundT; q: string; opts: string[]; ans: number }
interface Bubble { text: string; correct: boolean }
interface MPair { left: string; right: string }
interface Pos { top: number; left: number }
interface PrayerCard { icon: string; text: string }

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'You prayed before you acted — just like Eliezer!!',
  'God answered before you finished asking!!',
  'You recognised the sign — brilliant!!',
  'Your faithfulness just found its Rebekah!!',
  'You trusted God with the details!!',
  'That answered prayer was faster than you thought!!',
  'You served with your whole heart!!',
  'God guided every step — and you followed!!',
  'Rebekah said yes — and so did you!!',
  "Your obedience just changed someone's destiny!!",
]

const ROUND1_POS: Pos[] = [
  { top: 8,  left: 18 }, { top: 6,  left: 68 }, { top: 30, left: 42 },
  { top: 40, left: 12 }, { top: 55, left: 78 }, { top: 68, left: 38 },
]
const ROUND1_BUBBLES: Bubble[] = [
  { text: 'Abraham made his servant swear a solemn oath', correct: true },
  { text: 'Abraham went on the journey himself', correct: false },
  { text: 'Isaac chose his own wife from Canaan', correct: false },
  { text: 'The servant took 10 camels loaded with gifts', correct: true },
  { text: 'The servant took only one camel', correct: false },
  { text: "The servant was sent to Abraham's homeland to find a wife", correct: true },
]

const ROUND2_POS: Pos[] = [
  { top: 5,  left: 15 }, { top: 4,  left: 65 }, { top: 22, left: 40 }, { top: 30, left: 85 },
  { top: 42, left: 10 }, { top: 50, left: 62 }, { top: 65, left: 30 }, { top: 72, left: 78 },
]
const ROUND2_BUBBLES: Bubble[] = [
  { text: 'Rebekah agreed to leave immediately', correct: true },
  { text: "Rebekah's family refused to let her go", correct: false },
  { text: 'The servant worshipped God when he heard the answer', correct: true },
  { text: 'The servant forgot to tell the family about his prayer', correct: false },
  { text: 'Isaac saw Rebekah coming and she became his wife', correct: true },
  { text: "Isaac was not happy with Rebekah's arrival", correct: false },
  { text: "Isaac was comforted after his mother's death", correct: true },
  { text: 'The servant took a different girl back to Isaac', correct: false },
]

const P1_YN: Round = { type: 'yn', q: 'Did Abraham want Isaac to marry a Canaanite woman?', opts: ['YES', 'NO'], ans: 1 }
const P1_MC: Round = {
  type: 'mc',
  q: 'What did Abraham make his servant do before sending him?',
  opts: [
    "Write a letter to Rebekah's family",
    'Pack gifts for the journey',
    "Swear a solemn oath under Abraham's hand",
    'Pray together at the altar',
  ],
  ans: 2,
}
const P1_TF: Round = { type: 'tf', q: 'Abraham said that if the woman refused to come, the servant would be released from his oath.', opts: ['TRUE', 'FALSE'], ans: 0 }

const PRAYER_CARDS: PrayerCard[] = [
  { icon: '🐪', text: 'Let her offer to water my camels' },
  { icon: '👤', text: 'Show kindness to my master Abraham' },
  { icon: '✨', text: 'Let this be the sign' },
  { icon: '🙏', text: 'LORD God of my master Abraham' },
  { icon: '🌟', text: 'Give me success today' },
]

const P2_YN: Round = { type: 'yn', q: 'Did the servant pray before approaching any of the women?', opts: ['YES', 'NO'], ans: 0 }
const P2_MC: Round = {
  type: 'mc',
  q: 'What was the specific sign the servant asked God for?',
  opts: [
    'The woman would be wearing a gold headband',
    'The woman would come alone to the well',
    'The woman who offered to water his camels would be the chosen one',
    "The woman would call out his name first",
  ],
  ans: 2,
}
const P2_TF: Round = { type: 'tf', q: 'The servant finished his entire prayer before Rebekah arrived.', opts: ['TRUE', 'FALSE'], ans: 1 }

const P3_PAIRS: MPair[] = [
  { left: 'Rebekah came to the well',            right: 'She was hardworking and diligent' },
  { left: 'She offered water to the servant',    right: 'She was hospitable and generous' },
  { left: 'She offered to water the camels',     right: 'She went above and beyond what was asked' },
  { left: 'She ran to tell her family',          right: 'She was decisive and enthusiastic' },
]
const P3_RIGHT_ORDER = [2, 0, 3, 1]
const P3_MC: Round = {
  type: 'mc',
  q: 'What did the servant give Rebekah immediately after she watered the camels?',
  opts: ['A letter from Abraham', 'Silver coins as payment', 'A gold nose ring and two gold bracelets', 'A blessing and a prayer'],
  ans: 2,
}
const P3_YN: Round = { type: 'yn', q: "Was Rebekah from Abraham's own family line?", opts: ['YES', 'NO'], ans: 0 }

const P4_PAIRS: MPair[] = [
  { left: 'Laban saw the nose ring and bracelets',  right: 'He ran to meet the servant at the well' },
  { left: 'The servant told the whole story',       right: 'He gave all the glory to God and said this is from the LORD' },
  { left: 'Laban and Bethuel responded',            right: 'This is from the LORD — take Rebekah and go' },
  { left: 'The family asked Rebekah',               right: 'Will you go with this man? And she said I will go' },
]
const P4_RIGHT_ORDER = [2, 0, 3, 1]

const ISAAC_LINES = [
  "Isaac brought her into his mother's tent.",
  'He married Rebekah.',
  'And he loved her.',
  "And Isaac was comforted after his mother's death.",
]

// ── Audio ─────────────────────────────────────────────────────────────────────
function playCamelCross() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.setValueAtTime(200, c.currentTime)
    o.frequency.linearRampToValueAtTime(260, c.currentTime + 0.5)
    g.gain.setValueAtTime(0.001, c.currentTime); g.gain.linearRampToValueAtTime(0.10, c.currentTime + 0.3)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.0)
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
function playSplash() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(320, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(680, c.currentTime + 0.22)
    g.gain.setValueAtTime(0.14, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.26)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3)
  } catch (_) {}
}
function playDrinkSound() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.setValueAtTime(420, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(260, c.currentTime + 0.3)
    g.gain.setValueAtTime(0.12, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.38)
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
function playWarmChime(pitch = 1.0) {
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
    <div className={`l32-q-card${extraClass ? ' ' + extraClass : ''}`}>
      <div className="l32-round-label">
        {label ?? (round.type === 'yn' ? 'YES OR NO?' : round.type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?')}
      </div>
      <p className="l32-q-text">{round.q}</p>
      {round.type === 'yn' && (
        <div className="l32-yn-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l32-yn-btn${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'tf' && (
        <div className="l32-tf-row">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l32-tf-tablet${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {round.type === 'mc' && (
        <div className="l32-mc-opts">
          {round.opts.map((o, i) => (
            <button key={i} disabled={sel !== null || grace}
              className={`l32-mc-opt${sel === i ? (i === round.ans ? ' correct' : ' wrong') : ''}`}
              onClick={() => onPick(i)}>{o}</button>
          ))}
        </div>
      )}
      {grace && <div className="l32-grace">✨ {graceMsg}</div>}
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
    <div className="l32-timed-scene">
      {urgent && timeLeft <= 5 && (
        <div className="l32-camel-gallop" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="l32-gallop-camel" style={{ animationDelay: `${i * 0.3}s` }}>🐪</span>
          ))}
        </div>
      )}
      <div className="l32-timer-wrap">
        <div className="l32-timer-label">{prompt}</div>
        <div className={`l32-timer-bar${timerClass}${urgentClass}`}>
          <div className="l32-timer-fill" style={{ width: `${(timeLeft / seconds) * 100}%` }} />
        </div>
        <div className="l32-timer-num">⏱️ {timeLeft}s</div>
      </div>
      <div className="l32-bubble-field">
        {bubbles.map((b, i) => (
          <button key={i}
            style={{ top: `${positions[i].top}%`, left: `${positions[i].left}%`, animationDelay: `${i * 0.15}s` }}
            disabled={collected[i] || revealed[i]}
            className={`l32-bubble${collected[i] || revealed[i] ? ' collected' : ''}${wrongIdx === i ? ' wrong-shake' : ''}`}
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
    <div className="l32-match-scene">
      <div className="l32-match-wrap" ref={containerRef}>
        <svg className="l32-match-svg">
          {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="l32-match-line" />)}
        </svg>
        <div className="l32-match-col l32-match-left">
          {pairs.map((p, i) => (
            <button key={i} ref={el => { leftRefs.current[i] = el }}
              disabled={leftMatched[i]}
              className={`l32-match-item${leftMatched[i] ? ' matched' : ''}${selectedLeft === i ? ' selected' : ''}${wrongFlash?.left === i ? ' wrong-shake' : ''}`}
              onClick={() => tapLeft(i)}>{p.left}</button>
          ))}
        </div>
        <div className="l32-match-col l32-match-right">
          {rightOrder.map((pairIdx, pos) => (
            <button key={pos} ref={el => { rightRefs.current[pos] = el }}
              disabled={rightMatched[pos]}
              className={`l32-match-item${rightMatched[pos] ? ' matched' : ''}${wrongFlash?.rightPos === pos ? ' wrong-shake' : ''}`}
              onClick={() => tapRight(pos)}>{pairs[pairIdx].right}</button>
          ))}
        </div>
      </div>
      {hint && <div className="l32-match-hint">{hint}</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level32({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Champion'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
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
  const [p2Sub, setP2Sub]     = useState<P2Sub>('prayer')
  const [prayerNext, setPrayerNext] = useState(0)
  const [prayerHint, setPrayerHint] = useState<string | null>(null)
  const [prayerWrongIdx, setPrayerWrongIdx] = useState<number | null>(null)
  const [p2YnSel, setP2YnSel] = useState<number | null>(null)
  const [p2YnGrace, setP2YnGrace] = useState(false)
  const [p2McSel, setP2McSel] = useState<number | null>(null)
  const [p2McGrace, setP2McGrace] = useState(false)
  const [p2TfSel, setP2TfSel] = useState<number | null>(null)
  const [p2TfGrace, setP2TfGrace] = useState(false)

  // Phase 3
  const [p3Ready, setP3Ready] = useState(false)
  const [p3Sub, setP3Sub]     = useState<P3Sub>('water')
  const [jarFilled, setJarFilled] = useState(false)
  const [camelsWatered, setCamelsWatered] = useState<boolean[]>(() => Array(10).fill(false))
  const [p3McSel, setP3McSel] = useState<number | null>(null)
  const [p3McGrace, setP3McGrace] = useState(false)
  const [p3YnSel, setP3YnSel] = useState<number | null>(null)
  const [p3YnGrace, setP3YnGrace] = useState(false)

  // Phase 4
  const [p4Ready, setP4Ready] = useState(false)
  const [p4Sub, setP4Sub]     = useState<P4Sub>('match')
  const [isaacLineIdx, setIsaacLineIdx] = useState(-1)

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
    setShakeClass('l32-shake'); setTimeout(() => setShakeClass(''), 700)
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
        const hue = i % 2 === 0 ? 45 : 340
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 70, hue)
      }, i * 110)
  }, [burst])

  const fireLegendaryBurst = useCallback(() => {
    setGoldBurst(true); setTimeout(() => setGoldBurst(false), 2000)
    for (let i = 0; i < 16; i++)
      setTimeout(() => {
        const hue = i % 2 === 0 ? 46 : 340
        burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 85, hue)
      }, i * 110)
  }, [burst])

  const addEarned = useCallback((n: number) => {
    if (n <= 0) return
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playCamelCross()
    const ts = [
      setTimeout(() => setCinStep(1), 700),
      setTimeout(() => setCinStep(2), 1700),
      setTimeout(() => setCinStep(3), 2700),
      setTimeout(() => setCinStep(4), 3700),
      setTimeout(() => setCinStep(5), 4700),
      setTimeout(() => setCinStep(6), 5900),
      setTimeout(() => { setCinStep(7); playGoldLightBurst(); fireLegendaryBurst(); shake() }, 7400),
      setTimeout(() => setCinStep(8), 8100),
      setTimeout(() => setCinStep(9), 8900),
      setTimeout(() => { phaseRef.current = 'phase1'; setPhase('phase1') }, 10600),
    ]
    return () => ts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Ready(false); setP1Sub('timed')
    setP1YnSel(null); setP1YnGrace(false); setP1McSel(null); setP1McGrace(false); setP1TfSel(null); setP1TfGrace(false)
    speak('Abraham gave his most trusted servant the most important mission of his life. The instructions were very specific. And the servant took them seriously.', () => {
      setP1Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p1TimedCorrect = useCallback(() => { addEarned(8); playPing() }, [addEarned])
  const p1TimedWrong   = useCallback(() => { playBuzz() }, [])
  const p1TimedAll     = useCallback(() => {
    addEarned(25); playGoldPop(); fireGoldBurst(); shake()
    showBanner('THE MISSION HAS BEGUN!!', 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP1Sub('yn'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])
  const p1TimedTimeout = useCallback(() => {
    showBanner('Keep trusting — the answer is on its way!', 'comedic', 3000)
    setTimeout(() => setP1Sub('yn'), 3200)
  }, [showBanner])

  const handleP1Yn = useCallback((idx: number) => {
    if (p1YnSel !== null || p1YnGrace) return
    setP1YnSel(idx)
    if (idx === P1_YN.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner('NOT FROM CANAAN — FROM HIS OWN PEOPLE!!', 'gold', 3200)
      setTimeout(() => setP1Sub('mc'), 3400)
    } else {
      setP1YnGrace(true); setP1YnSel(null); playBuzz()
      setTimeout(() => setP1YnGrace(false), 2800)
    }
  }, [p1YnSel, p1YnGrace, addEarned, shake, showBanner])

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
      addEarned(20); playGoldPop(); shake()
      showBanner('ABRAHAM GAVE A GRACIOUS WAY OUT!!', 'gold', 3200)
      setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 3400)
    } else {
      setP1TfGrace(true); setP1TfSel(null); playBuzz()
      setTimeout(() => setP1TfGrace(false), 2800)
    }
  }, [p1TfSel, p1TfGrace, addEarned, shake, showBanner])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Ready(false); setP2Sub('prayer'); setPrayerNext(0); setPrayerHint(null); setPrayerWrongIdx(null)
    setP2YnSel(null); setP2YnGrace(false); setP2McSel(null); setP2McGrace(false); setP2TfSel(null); setP2TfGrace(false)
    speak('The servant arrived at the well outside the city. He did something remarkable before doing anything else. He prayed. Not a vague prayer — a very specific one.', () => {
      setP2Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapPrayerCard = useCallback((i: number) => {
    if (i < prayerNext) return
    if (i === prayerNext) {
      playChime(); addEarned(10)
      const next = prayerNext + 1
      setPrayerNext(next)
      if (next >= PRAYER_CARDS.length) {
        setTimeout(() => {
          addEarned(30); playGoldPop(); fireGoldBurst(); shake()
          showBanner('SPECIFIC PRAYER — SPECIFIC ANSWER!!', 'legendary', 3200)
          fireAffirmation()
          setTimeout(() => setP2Sub('yn'), 3400)
        }, 600)
      }
    } else {
      setPrayerWrongIdx(i); playBuzz()
      setPrayerHint('Build the prayer in order!')
      setTimeout(() => setPrayerWrongIdx(idx => idx === i ? null : idx), 500)
      setTimeout(() => setPrayerHint(null), 1600)
    }
  }, [prayerNext, addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP2Yn = useCallback((idx: number) => {
    if (p2YnSel !== null || p2YnGrace) return
    setP2YnSel(idx)
    if (idx === P2_YN.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner('PRAYER BEFORE ACTION — WISDOM!!', 'gold', 3000)
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
      addEarned(25); playGoldPop(); shake()
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
      addEarned(25); playWhiteBurstSound(); fireLegendaryBurst(); shake()
      showBanner('GOD ANSWERED BEFORE THE PRAYER WAS DONE!!', 'legendary', 3600)
      fireAffirmation()
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 3800)
    } else {
      setP2TfGrace(true); setP2TfSel(null); playBuzz()
      setTimeout(() => setP2TfGrace(false), 2800)
    }
  }, [p2TfSel, p2TfGrace, addEarned, shake, showBanner, fireLegendaryBurst, fireAffirmation])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Ready(false); setP3Sub('water'); setJarFilled(false); setCamelsWatered(Array(10).fill(false))
    setP3McSel(null); setP3McGrace(false); setP3YnSel(null); setP3YnGrace(false)
    speak("A young woman arrived at the well. What happened next was extraordinary. She didn't just do the minimum — she went above and beyond. That is always the sign of someone God has prepared.", () => {
      setP3Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const wateredCount = camelsWatered.filter(Boolean).length
  const tapWell = useCallback(() => {
    if (jarFilled || wateredCount >= 10) return
    playSplash(); addEarned(3); setJarFilled(true)
  }, [jarFilled, wateredCount, addEarned])

  const tapCamel = useCallback((i: number) => {
    if (!jarFilled || camelsWatered[i]) return
    playDrinkSound(); addEarned(5); setJarFilled(false)
    setCamelsWatered(prev => {
      const next = [...prev]; next[i] = true
      if (next.every(Boolean)) {
        setTimeout(() => {
          addEarned(40); playGoldPop(); fireGoldBurst(); shake()
          showBanner('REBEKAH WENT ABOVE AND BEYOND!!', 'legendary', 3200)
          fireAffirmation()
          setTimeout(() => setP3Sub('match'), 3400)
        }, 500)
      }
      return next
    })
  }, [jarFilled, camelsWatered, addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const p3MatchCorrect = useCallback(() => { addEarned(15); playChime() }, [addEarned])
  const p3MatchWrong   = useCallback(() => { playBuzz() }, [])
  const p3MatchAll     = useCallback(() => {
    addEarned(30); playGoldPop(); fireGoldBurst(); shake()
    showBanner("REBEKAH'S CHARACTER REVEALED!!", 'legendary', 3000)
    fireAffirmation()
    setTimeout(() => setP3Sub('mc'), 3200)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const handleP3Mc = useCallback((idx: number) => {
    if (p3McSel !== null || p3McGrace) return
    setP3McSel(idx)
    if (idx === P3_MC.ans) {
      addEarned(20); playGoldPop(); shake()
      setTimeout(() => setP3Sub('yn'), 2200)
    } else {
      setP3McGrace(true); setP3McSel(null); playBuzz()
      setTimeout(() => setP3McGrace(false), 2800)
    }
  }, [p3McSel, p3McGrace, addEarned, shake])

  const handleP3Yn = useCallback((idx: number) => {
    if (p3YnSel !== null || p3YnGrace) return
    setP3YnSel(idx)
    if (idx === P3_YN.ans) {
      addEarned(20); playGoldPop(); shake()
      showBanner("SHE WAS FAMILY — GOD'S PERFECT PLAN!!", 'gold', 3200)
      setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 3400)
    } else {
      setP3YnGrace(true); setP3YnSel(null); playBuzz()
      setTimeout(() => setP3YnGrace(false), 2800)
    }
  }, [p3YnSel, p3YnGrace, addEarned, shake, showBanner])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Ready(false); setP4Sub('match'); setIsaacLineIdx(-1)
    speak("The servant told the whole story to Rebekah's family. Every detail. Every prayer. Every answered sign. And then came the moment that would change everything — the decision was Rebekah's to make.", () => {
      setP4Ready(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p4MatchCorrect = useCallback(() => { addEarned(15); playChime() }, [addEarned])
  const p4MatchWrong   = useCallback(() => { playBuzz() }, [])
  const p4MatchAll     = useCallback(() => {
    addEarned(30); playGoldPop(); fireGoldBurst(); shake()
    showBanner('REBEKAH SAID YES!!', 'legendary', 3200)
    fireAffirmation()
    setTimeout(() => setP4Sub('boss'), 3400)
  }, [addEarned, fireGoldBurst, shake, showBanner, fireAffirmation])

  const p4BossCorrect = useCallback(() => { playPing() }, [])
  const p4BossWrong   = useCallback(() => { playBuzz() }, [])
  const p4BossAll     = useCallback(() => {
    addEarned(60); playWhiteBurstSound(); fireLegendaryBurst(); playCoinShower(); shake()
    showBanner(`${playerName} — YOUR OBEDIENCE JUST CHANGED SOMEONE'S DESTINY!!`, 'legendary', 4200)
    fireAffirmation()
    setTimeout(() => setP4Sub('isaac'), 4600)
  }, [addEarned, fireLegendaryBurst, shake, showBanner, playerName, fireAffirmation])
  const p4BossTimeout = useCallback(() => {
    showBanner('Keep trusting — the answer is on its way!', 'comedic', 3000)
    setTimeout(() => setP4Sub('isaac'), 3200)
  }, [showBanner])
  const p4BossShake = useCallback(() => { shake() }, [shake])

  // Isaac & Rebekah moment — tender, no coins, auto-advances
  useEffect(() => {
    if (phase !== 'phase4' || p4Sub !== 'isaac') return
    playWarmChime()
    const timers: number[] = []
    let t = 900
    ISAAC_LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setIsaacLineIdx(i), t))
      t += 2200
    })
    timers.push(window.setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, t + 1400))
    return () => timers.forEach(clearTimeout)
  }, [phase, p4Sub])

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
        speak('Before he had finished praying, Rebekah came out with her jar on her shoulder. Genesis chapter 24, verse 15.')
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
        verse="Before he had finished praying, Rebekah came out with her jar on her shoulder."
        verseRef="Genesis 24:15"
        subtitle={`${playerName} — God answers specific prayers specifically`}
        voiceLine={`${playerName}. God answered before the prayer was even finished. He's already working on the answer to yours too.`}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`l32-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l32-bg${cinStep >= 7 ? ' visible' : ''}`} />
      {cinStep < 7 && <div className="l32-black" />}
      {cinStep >= 7 && <div className="l32-bg-overlay" />}
      <canvas ref={canvasRef} className="l32-canvas" />
      {goldBurst && <div className="l32-gold-flash" />}

      {/* HUD */}
      {phase !== 'cinematic' && (
        <div className="l32-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && (
        <div className="l32-level-label">1-32 THE SIGN</div>
      )}

      {/* Global banner */}
      {banner && <div className={`l32-banner l32-banner-${bannerVariant}`}>{banner}</div>}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l32-cin">
          <div className="l32-sunset-glow" />
          <div className="l32-camel-horizon" aria-hidden>
            {['🐪', '🐪', '🐪'].map((ic, i) => (
              <span key={i} className="l32-horizon-camel" style={{ animationDelay: `${i * 0.5}s` }}>{ic}</span>
            ))}
          </div>
          {cinStep === 1 && <div className="l32-cin-line">Abraham was old.</div>}
          {cinStep === 2 && <div className="l32-cin-line">Isaac needed a wife.</div>}
          {cinStep === 3 && <div className="l32-cin-line">One servant.</div>}
          {cinStep === 4 && <div className="l32-cin-line">Ten camels.</div>}
          {cinStep === 5 && <div className="l32-cin-line">One prayer.</div>}
          {cinStep === 6 && <div className="l32-cin-line">And God already had the answer waiting.</div>}
          {cinStep >= 8 && (
            <div className="l32-title-card">
              <span className="l32-title-icon">💍</span>
              <span className="l32-title-word">THE SIGN</span>
              <span className="l32-title-icon">💍</span>
            </div>
          )}
          {cinStep >= 9 && <div className="l32-title-sub">God answers specific prayers specifically.</div>}
        </div>
      )}

      {/* ── PHASE 1: The Oath and the Mission ── */}
      {phase === 'phase1' && (
        <div className="l32-phase-wrap l32-oath-scene">
          <div className="l32-phase-header">
            <div className="l32-phase-badge">PHASE 1</div>
            <div className="l32-phase-title">THE OATH AND THE MISSION 🤝</div>
          </div>

          {p1Sub === 'timed' && p1Ready && (
            <TimedSelect key="p1-round1" bubbles={ROUND1_BUBBLES} positions={ROUND1_POS} seconds={12}
              prompt="TAP ALL THE TRUE STATEMENTS!"
              onCorrectTap={p1TimedCorrect} onWrongTap={p1TimedWrong}
              onAllCollected={p1TimedAll} onTimeout={p1TimedTimeout} />
          )}

          {p1Sub === 'yn' && (
            <RoundCard round={P1_YN} sel={p1YnSel} grace={p1YnGrace}
              graceMsg="Think about where Abraham wanted the wife to come from — try again!" onPick={handleP1Yn} />
          )}

          {p1Sub === 'mc' && (
            <RoundCard round={P1_MC} sel={p1McSel} grace={p1McGrace}
              graceMsg="Think about the solemn promise Abraham required — try again!" onPick={handleP1Mc} />
          )}

          {p1Sub === 'tf' && (
            <RoundCard round={P1_TF} sel={p1TfSel} grace={p1TfGrace}
              graceMsg="Think about what would happen if the woman refused — try again!" onPick={handleP1Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 2: The Specific Prayer ── */}
      {phase === 'phase2' && (
        <div className="l32-phase-wrap l32-prayer-scene">
          <div className="l32-phase-header">
            <div className="l32-phase-badge">PHASE 2</div>
            <div className="l32-phase-title">THE SPECIFIC PRAYER 🙏</div>
          </div>

          {p2Sub === 'prayer' && p2Ready && (
            <div className="l32-prayer-mechanic">
              <div className="l32-prayer-scroll">
                {PRAYER_CARDS.map((card, i) => i < prayerNext && (
                  <div key={i} className="l32-prayer-scroll-line">{card.icon} {card.text}</div>
                ))}
                {prayerNext === 0 && <div className="l32-prayer-scroll-placeholder">The scroll awaits your prayer…</div>}
              </div>
              <div className="l32-prayer-cards">
                {PRAYER_CARDS.map((card, i) => i >= prayerNext && (
                  <button key={i}
                    className={`l32-prayer-card${prayerWrongIdx === i ? ' wrong-shake' : ''}`}
                    onClick={() => tapPrayerCard(i)}>
                    <span className="l32-prayer-card-icon">{card.icon}</span>
                    <span className="l32-prayer-card-text">{card.text}</span>
                  </button>
                ))}
              </div>
              <div className="l32-prayer-hint">
                {prayerHint ?? 'Tap the cards in order to build the prayer'}
              </div>
            </div>
          )}

          {p2Sub === 'yn' && (
            <RoundCard round={P2_YN} sel={p2YnSel} grace={p2YnGrace}
              graceMsg="Think about what the servant did first at the well — try again!" onPick={handleP2Yn} />
          )}

          {p2Sub === 'mc' && (
            <RoundCard round={P2_MC} sel={p2McSel} grace={p2McGrace}
              graceMsg="Think about the camels — try again!" onPick={handleP2Mc} />
          )}

          {p2Sub === 'tf' && (
            <RoundCard round={P2_TF} sel={p2TfSel} grace={p2TfGrace}
              graceMsg="Think about how quickly Rebekah arrived — try again!" onPick={handleP2Tf} />
          )}
        </div>
      )}

      {/* ── PHASE 3: Rebekah Passes the Test ── */}
      {phase === 'phase3' && (
        <div className="l32-phase-wrap l32-well-scene">
          <div className="l32-phase-header">
            <div className="l32-phase-badge">PHASE 3</div>
            <div className="l32-phase-title">REBEKAH PASSES THE TEST 💧</div>
          </div>

          {p3Sub === 'water' && p3Ready && (
            <div className="l32-water-mechanic">
              <div className="l32-water-hint">
                {jarFilled ? 'Now water a camel!' : 'Tap the well to fill the jar'}
              </div>
              <button className={`l32-well-btn${jarFilled ? ' filled' : ''}`} onClick={tapWell} disabled={jarFilled || wateredCount >= 10}>
                <span className="l32-well-icon">🪣</span>
              </button>
              <div className="l32-camel-row">
                {camelsWatered.map((watered, i) => (
                  <button key={i} disabled={!jarFilled || watered}
                    className={`l32-camel-btn${watered ? ' watered' : ''}`}
                    onClick={() => tapCamel(i)}>🐪</button>
                ))}
              </div>
              <div className="l32-water-progress">{wateredCount} / 10 camels watered</div>
            </div>
          )}

          {p3Sub === 'match' && (
            <MatchRound pairs={P3_PAIRS} rightOrder={P3_RIGHT_ORDER}
              onCorrectMatch={p3MatchCorrect} onWrongMatch={p3MatchWrong} onAllMatched={p3MatchAll} />
          )}

          {p3Sub === 'mc' && (
            <RoundCard round={P3_MC} sel={p3McSel} grace={p3McGrace}
              graceMsg="Think about the gold gifts the servant carried — try again!" onPick={handleP3Mc} />
          )}

          {p3Sub === 'yn' && (
            <RoundCard round={P3_YN} sel={p3YnSel} grace={p3YnGrace}
              graceMsg="Think about Nahor, Abraham's brother — try again!" onPick={handleP3Yn} />
          )}
        </div>
      )}

      {/* ── PHASE 4: Rebekah Says Yes ── */}
      {phase === 'phase4' && (
        <div className="l32-phase-wrap l32-decision-scene">
          <div className="l32-phase-header">
            <div className="l32-phase-badge">PHASE 4</div>
            <div className="l32-phase-title">REBEKAH SAYS YES 💍</div>
          </div>

          {p4Sub === 'match' && p4Ready && (
            <MatchRound pairs={P4_PAIRS} rightOrder={P4_RIGHT_ORDER}
              onCorrectMatch={p4MatchCorrect} onWrongMatch={p4MatchWrong} onAllMatched={p4MatchAll} />
          )}

          {p4Sub === 'boss' && (
            <TimedSelect key="p4-boss" bubbles={ROUND2_BUBBLES} positions={ROUND2_POS} seconds={15} urgent
              prompt="FINAL ROUND — TAP ALL TRUE STATEMENTS!!"
              onCorrectTap={p4BossCorrect} onWrongTap={p4BossWrong}
              onAllCollected={p4BossAll} onTimeout={p4BossTimeout} onShakeAt3={p4BossShake} />
          )}

          {p4Sub === 'isaac' && (
            <div className="l32-isaac-moment">
              <div className="l32-isaac-silhouettes" aria-hidden>
                <span className="l32-isaac-fig">🧔</span>
                <span className="l32-isaac-fig">👰</span>
              </div>
              {isaacLineIdx >= 0 && <div className="l32-isaac-line">{ISAAC_LINES[isaacLineIdx]}</div>}
            </div>
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <div className="l32-ending-wrap">
          <div className="l32-ending-glow" />
          <div className="l32-ending-camels" aria-hidden>
            {['🐪', '🐪', '🐪'].map((ic, i) => (
              <span key={i} className="l32-ending-camel" style={{ animationDelay: `${i * 0.6}s` }}>{ic}</span>
            ))}
          </div>
          <div className="l32-ending-petals" aria-hidden>
            {['🌹', '✨', '🌹', '✨', '🌹'].map((ic, i) => (
              <span key={i} className="l32-petal-item" style={{ left: `${(i * 21 + 4) % 100}%`, animationDelay: `${i * 0.4}s` }}>{ic}</span>
            ))}
          </div>
          <div className="l32-ending-name">{playerName} — GOD ANSWERS SPECIFIC PRAYERS SPECIFICALLY!</div>
          <div className="l32-stars-row">
            {starsShown >= 1 && <div className="l32-end-star l32-st1">⭐</div>}
            {starsShown >= 2 && <div className="l32-end-star l32-st2">⭐</div>}
            {starsShown >= 3 && <div className="l32-end-star l32-st3">⭐</div>}
          </div>
          <div className="l32-coin-tally">
            <span className="l32-coin-icon">🪙</span>
            <span className="l32-coin-num">{coinCount}</span>
            <span className="l32-coin-label">COINS EARNED</span>
          </div>
          {showScripture && (
            <div className="l32-scripture-card">
              <div className="l32-scripture-watermark" aria-hidden>💍</div>
              <div className="l32-scripture-quote">
                "Before he had finished praying, Rebekah came out with her jar on her shoulder."
              </div>
              <div className="l32-scripture-ref">— Genesis 24:15</div>
            </div>
          )}
          {showAdvance && (
            <button className="l32-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-33 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
