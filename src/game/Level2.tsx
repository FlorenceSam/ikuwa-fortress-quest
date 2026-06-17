import { useEffect, useRef, useState } from 'react'
import './level2.css'
import './FailScreen.css'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { getCoins, addCoins, penalizeCoins } from './coins'

const HINTS = [
  'The garden was called Eden — planted by God in the east.',
  'One tree was strictly forbidden. It held the knowledge of good and evil.',
  'A crafty creature tempted Eve — it was not human. It slithered.',
  'Despite their sin, God showed love. He clothed them and sought them out.',
]

// ─── Data ──────────────────────────────────────────────────────────────────

interface Question { text: string; options: string[]; correct: number }

const QUESTIONS: Question[] = [
  {
    text: 'What was the name of the Garden God planted?',
    options: ['Garden of Gethsemane', 'Garden of Eden', 'Garden of Olives', 'Promised Garden'],
    correct: 1,
  },
  {
    text: 'Which tree were Adam and Eve forbidden to eat from?',
    options: ['Tree of Life', 'Tree of Knowledge of Good and Evil', 'Tree of Wisdom', 'Tree of Blessing'],
    correct: 1,
  },
  {
    text: 'Who tempted Eve in the Garden?',
    options: ['Adam', 'An Angel', 'The Serpent', 'Cain'],
    correct: 2,
  },
  {
    text: 'What did God do after Adam and Eve sinned?',
    options: [
      'Abandoned them',
      'Destroyed the Garden',
      'Sought them out and made garments for them',
      'Created another man',
    ],
    correct: 2,
  },
]

// Per-question celebration: unique voice + text + CSS modifier class
const REACTIONS = [
  {
    voice: 'Wisdom overflow!',
    text:  'Wisdom Overflow!',
    cls:   'celeb--overflow',
  },
  {
    voice: 'You are too much!',
    text:  'You Are Too Much!',
    cls:   'celeb--toomuch',
  },
  {
    voice: 'You are worth your onions!',
    text:  'You Are Worth Your Onions!',
    cls:   'celeb--onions',
  },
  {
    voice: 'You make God proud!',
    text:  'You Make God Proud!',
    cls:   'celeb--proud',
  },
]

// ─── Audio ─────────────────────────────────────────────────────────────────

// Four distinct correct-answer chords — one per question
const CORRECT_CHORDS = [
  [523.25, 659.25, 783.99, 1046.50],   // Q1 — ascending bright
  [392.00, 523.25, 659.25, 880.00],    // Q2 — explosive spread
  [440.00, 554.37, 659.25, 880.00],    // Q3 — playful major
  [349.23, 523.25, 698.46, 1046.50],   // Q4 — majestic wide
]

function playCorrectSound(qIdx: number) {
  try {
    const ctx = new AudioContext()
    CORRECT_CHORDS[qIdx].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx.currentTime + i * 0.08
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.18, t + 0.06)
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + 1.5)
    })
  } catch (_) {}
}

function playWrongSound() {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = 200
    g.gain.setValueAtTime(0.12, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
    o.connect(g); g.connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + 0.55)
  } catch (_) {}
}

function playVictorySound() {
  try {
    const ctx = new AudioContext()
    ;[261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx.currentTime + i * 0.075
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.16, t + 0.1)
      g.gain.exponentialRampToValueAtTime(0.001, t + 3.5)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + 3.5)
    })
  } catch (_) {}
}

function speakVoice(text: string) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.88; utt.pitch = 1.12; utt.volume = 1
    const warm = speechSynthesis.getVoices()
      .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
    if (warm) utt.voice = warm
    speechSynthesis.cancel()
    speechSynthesis.speak(utt)
  } catch (_) {}
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function Level2({ onComplete, onFail, showHint }: { onComplete?: () => void; onFail?: (hint: string) => void; showHint?: boolean }) {
  const [currentQ,    setCurrentQ]    = useState(0)
  const [feedback,    setFeedback]    = useState<'correct'|'wrong'|null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number|null>(null)
  const [burstIdx,    setBurstIdx]    = useState<number|null>(null)
  const [celebIdx,    setCelebIdx]    = useState<number|null>(null)
  const [victory,     setVictory]     = useState(false)
  const [coins,       setCoins]       = useState(() => getCoins())

  const bgRef       = useRef<HTMLCanvasElement>(null)
  const bgRafRef    = useRef<number>(0)
  const wrongCountRef = useRef(0)

  // ── Garden background ────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = bgRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const W = canvas.width, H = canvas.height

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r:    Math.random()*1.2+0.2,
      base: Math.random()*0.35+0.1,
      amp:  Math.random()*0.12+0.03,
      spd:  Math.random()*0.018+0.003,
      ph:   Math.random()*Math.PI*2,
      hue: Math.random() < 0.45 ? Math.random()*25+38 : Math.random()*35+105,
    }))

    const fireflies = Array.from({ length: 40 }, () => ({
      x:   Math.random()*W,  y: Math.random()*H,
      vx:  (Math.random()-0.5)*0.45,
      vy:  -(Math.random()*0.28+0.04),
      r:   Math.random()*2.2+0.6,
      hue: Math.random()*50+95,
      ph:  Math.random()*Math.PI*2,
      spd: Math.random()*0.04+0.015,
    }))

    let frame = 0
    const tick = () => {
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H)
      const cg = ctx.createRadialGradient(W/2, H*0.52, 0, W/2, H*0.52, W*0.52)
      cg.addColorStop(0,   'rgba(12,55,8,0.22)')
      cg.addColorStop(0.45,'rgba(8,38,5,0.10)')
      cg.addColorStop(1,   'transparent')
      ctx.fillStyle = cg; ctx.fillRect(0,0,W,H)
      const hg = ctx.createLinearGradient(0, H*0.72, 0, H)
      hg.addColorStop(0,  'transparent')
      hg.addColorStop(0.6,'rgba(18,60,10,0.09)')
      hg.addColorStop(1,  'rgba(10,40,5,0.14)')
      ctx.fillStyle = hg; ctx.fillRect(0,0,W,H)
      frame++
      for (const s of stars) {
        const op = Math.max(0.03, Math.min(1, s.base + Math.sin(frame*s.spd+s.ph)*s.amp))
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r*2.2, 0, Math.PI*2)
        ctx.fillStyle = `hsla(${s.hue},60%,70%,${op*0.14})`; ctx.fill()
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2)
        ctx.fillStyle = `hsla(${s.hue},55%,92%,${op})`; ctx.fill()
      }
      for (const f of fireflies) {
        f.x += f.vx; f.y += f.vy
        if (f.y < -12) { f.y = H+12; f.x = Math.random()*W }
        if (f.x < -12) f.x = W+12
        if (f.x > W+12) f.x = -12
        const op = Math.max(0.08, Math.min(0.72, 0.4 + Math.sin(frame*f.spd+f.ph)*0.32))
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r*4, 0, Math.PI*2)
        ctx.fillStyle = `hsla(${f.hue},80%,55%,${op*0.18})`; ctx.fill()
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2)
        ctx.fillStyle = `hsla(${f.hue},75%,78%,${op})`; ctx.fill()
      }
      bgRafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(bgRafRef.current)
  }, [])


  // ── Answer handler ───────────────────────────────────────────────────────

  const handleAnswer = (idx: number) => {
    if (feedback === 'correct') return

    const q = QUESTIONS[currentQ]
    setSelectedIdx(idx)

    if (idx === q.correct) {
      setFeedback('correct')
      setBurstIdx(idx)
      setCelebIdx(currentQ)
      setCoins(addCoins(10))
      playCorrectSound(currentQ)
      speakVoice(REACTIONS[currentQ].voice)

      // Clear celebration after 2.3s then advance
      setTimeout(() => {
        setCelebIdx(null)
        setBurstIdx(null)
        setFeedback(null)
        setSelectedIdx(null)

        if (currentQ + 1 >= QUESTIONS.length) {
          playVictorySound()
          setTimeout(() => setVictory(true), 500)
        } else {
          setCurrentQ(q => q + 1)
        }
      }, 2300)
    } else {
      setFeedback('wrong')
      playWrongSound()
      setCoins(penalizeCoins(50))
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
      wrongCountRef.current += 1
      if (wrongCountRef.current >= 3) {
        setTimeout(() => onFail?.(HINTS[currentQ]), 900)
      } else {
        setTimeout(() => { setFeedback(null); setSelectedIdx(null) }, 1800)
      }
    }
  }

  const q = QUESTIONS[currentQ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="level2">
      <canvas ref={bgRef} className="level2-bg" />
      <CoinHUD coins={coins} hint={HINTS[currentQ]} onCoinsChange={setCoins} disabled={victory} />

      {showHint && (
        <div className="level-hint-banner">💡 {HINTS[currentQ]}</div>
      )}

      <header className="level2-header">
        <p className="level2-label">LEVEL 1-2</p>
        <h1 className="level2-title">The Garden of Eden</h1>
      </header>

      <div className="quiz-progress">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={[
              'quiz-pip',
              i <  currentQ  ? 'quiz-pip--done'    : '',
              i === currentQ ? 'quiz-pip--current'  : '',
            ].filter(Boolean).join(' ')}
          />
        ))}
      </div>

      {!victory && (
        <div className="quiz-card">
          <p className="quiz-q-num">Question {currentQ + 1} of {QUESTIONS.length}</p>
          <h2 className="quiz-question">{q.text}</h2>

          <div className="quiz-options">
            {q.options.map((opt, i) => (
              <button
                key={i}
                disabled={feedback === 'correct'}
                className={[
                  'quiz-option',
                  selectedIdx === i && feedback === 'correct' ? 'quiz-option--correct' : '',
                  selectedIdx === i && feedback === 'wrong'   ? 'quiz-option--wrong'   : '',
                  burstIdx === i                              ? 'quiz-option--burst'   : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleAnswer(i)}
              >
                {opt}
              </button>
            ))}
          </div>

          {feedback === 'wrong' && (
            <p className="quiz-feedback quiz-feedback--wrong">
              Try again — God believes in you!
            </p>
          )}
        </div>
      )}

      {/* Per-question celebration overlay — key forces remount so animation restarts */}
      {celebIdx !== null && (
        <div
          key={`celeb-${celebIdx}`}
          className={`celeb ${REACTIONS[celebIdx].cls}`}
          aria-live="assertive"
        >
          <span className="celeb-text">{REACTIONS[celebIdx].text}</span>
        </div>
      )}

      {victory && (
        <CompletionScreen
          verse="So God created mankind in his own image; in the image of God he created them."
          verseRef="Genesis 1:27"
          onComplete={onComplete}
        />
      )}
    </div>
  )
}
