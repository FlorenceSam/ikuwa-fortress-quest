import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins, penalizeCoins } from './coins'
import './level11.css'

// ── Segment data ──────────────────────────────────────────────────────────────

const SEGMENTS = [
  { color: '#FF2200', bg: 'rgba(255,34,0,0.30)',   name: 'Red',    icon: '🔴', promise: 'I will never again curse the ground\nbecause of mankind!' },
  { color: '#FF8C00', bg: 'rgba(255,140,0,0.30)',  name: 'Orange', icon: '🟠', promise: 'As long as the earth endures,\nseasons and days will never cease!' },
  { color: '#FFD700', bg: 'rgba(255,215,0,0.28)',  name: 'Yellow', icon: '🟡', promise: 'Every living creature on earth —\nI establish my covenant with you!' },
  { color: '#00CC44', bg: 'rgba(0,204,68,0.28)',   name: 'Green',  icon: '🟢', promise: 'Never again will floodwaters\ndestroy all life on the earth!' },
  { color: '#0088FF', bg: 'rgba(0,136,255,0.28)',  name: 'Blue',   icon: '🔵', promise: 'The rainbow will appear in the clouds\nas my sign to you!' },
  { color: '#6600DD', bg: 'rgba(102,0,221,0.30)',  name: 'Indigo', icon: '🟣', promise: 'I will remember my covenant\nbetween me and you!' },
  { color: '#CC00FF', bg: 'rgba(204,0,255,0.28)',  name: 'Violet', icon: '💜', promise: 'This is the sign of the covenant\nI have established with all life on earth!' },
]

const FAMILY = ['👴', '👵', '👨', '👩', '👨‍🦱', '👩‍🦱', '🧔', '👱‍♀️']

interface Q { q: string; opts: string[]; correct: number; feedback: string }

const ALL_Q: Q[] = [
  { q: 'What did God promise He would NEVER do again?',
    opts: ['Destroy the earth with a flood', 'Create new animals', 'Plant a new garden', 'Rest on the seventh day'],
    correct: 0,
    feedback: '"Never again will I destroy all living creatures as I have done." — Genesis 8:21' },
  { q: 'What was the FIRST thing Noah did when he left the ark?',
    opts: ['Built an altar and offered burnt offerings', 'Planted a vineyard', 'Named all the animals', 'Built a city'],
    correct: 0,
    feedback: '"Then Noah built an altar to the LORD." — Genesis 8:20' },
  { q: 'With WHOM did God establish the Noahic Covenant?',
    opts: ['Every living creature on earth', 'Only Noah', 'Noah and his sons only', 'The clean animals only'],
    correct: 0,
    feedback: '"I establish my covenant with you and with every living creature." — Genesis 9:10' },
  { q: 'What is the SIGN of God\'s covenant with all living things?',
    opts: ['The rainbow', 'The dove', 'The olive branch', 'The altar fire'],
    correct: 0,
    feedback: '"I have set my rainbow in the clouds — it will be the sign of the covenant." — Genesis 9:13' },
  { q: 'How many pairs of CLEAN animals did God tell Noah to bring?',
    opts: ['Seven pairs (14 animals)', 'Two pairs (4 animals)', 'Ten pairs (20 animals)', 'One pair (2 animals)'],
    correct: 0,
    feedback: '"Take with you seven pairs of every kind of clean animal." — Genesis 7:2' },
  { q: 'What did the dove bring back to Noah?',
    opts: ['A freshly plucked olive leaf', 'A piece of bark', 'A fish', 'Nothing — it did not return'],
    correct: 0,
    feedback: '"The dove returned with a freshly plucked olive leaf!" — Genesis 8:11' },
  { q: 'What does God say when He SEES the rainbow in the clouds?',
    opts: ['"I will remember my covenant"', '"Let there be light"', '"Be fruitful and multiply"', '"I will never be angry again"'],
    correct: 0,
    feedback: '"Whenever the rainbow appears... I will remember my everlasting covenant." — Genesis 9:16' },
  { q: 'How many days did the floodwaters prevail upon the earth?',
    opts: ['150 days', '40 days', '7 days', '365 days'],
    correct: 0,
    feedback: '"The waters prevailed on the earth 150 days." — Genesis 7:24' },
  { q: 'Which phrase did God use about the EARTH continuing?',
    opts: ['"Seedtime and harvest shall not cease"', '"Day and night will end"', '"Seasons will merge together"', '"Winter will last forever"'],
    correct: 0,
    feedback: '"As long as the earth endures, seedtime and harvest shall not cease." — Genesis 8:22' },
  { q: 'How long is the Noahic Covenant?',
    opts: ['Everlasting — for all future generations', 'Until the next flood', 'For one thousand years', 'Until the new earth'],
    correct: 0,
    feedback: '"I establish my covenant with you as an everlasting covenant." — Genesis 9:16' },
]

// Quiz questions (by ALL_Q index) to show after each segment
const QUIZ_AFTER: number[][] = [
  [],        // after Red
  [0],       // after Orange
  [4],       // after Yellow
  [1, 7],    // after Green
  [5],       // after Blue
  [2, 8],    // after Indigo
  [3, 6, 9], // after Violet
]

// ── SVG arc geometry (decorative display only) ────────────────────────────────

const CX = 350, CY = 320, R = 255, SW = 50, STEP = 180 / 7

function arcPt(deg: number) {
  const a = deg * Math.PI / 180
  return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }
}

function segPath(i: number) {
  const p1 = arcPt(180 - i * STEP)
  const p2 = arcPt(180 - (i + 1) * STEP)
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${R} ${R} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
}

// ── Particles ─────────────────────────────────────────────────────────────────

interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }

function mkBurst(x: number, y: number, hue: number): Pt[] {
  return Array.from({ length: 90 }, () => {
    const a = Math.random() * Math.PI * 2
    const s = Math.random() * 11 + 2
    return {
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3,
      r: Math.random() * 3.5 + 0.8,
      life: 0, max: Math.random() * 60 + 40,
      hue: hue + Math.random() * 45 - 22,
    }
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'tracing' | 'altar' | 'complete'
interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Level11({ onComplete }: Props) {
  const name = localStorage.getItem('iq_character') || 'Warrior'

  const [phase,        setPhase]        = useState<Phase>('intro')
  const [traced,       setTraced]       = useState<boolean[]>(Array(7).fill(false))
  const [currentSeg,   setCurrentSeg]   = useState(0)
  const [coins,        setCoins]        = useState(getCoins)
  const [promiseInfo,  setPromiseInfo]  = useState<{ text: string; color: string } | null>(null)
  const [coinBurstKey, setCoinBurstKey] = useState(0)
  const [celebFamily,  setCelebFamily]  = useState(false)
  const [activeQuiz,   setActiveQuiz]   = useState<Q | null>(null)
  const [quizQueue,    setQuizQueue]    = useState<Q[]>([])
  const [quizAnswer,   setQuizAnswer]   = useState<number | null>(null)
  const [showKeeper,   setShowKeeper]   = useState(false)
  const [busy,         setBusy]         = useState(false)   // blocks double-tap during animation

  const wrongCountRef = useRef(0)
  const tracedSegRef  = useRef(-1)
  const btnRefs       = useRef<(HTMLButtonElement | null)[]>(Array(7).fill(null))
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const particlesRef  = useRef<Pt[]>([])
  const rafRef        = useRef<number>(0)

  // ── Particle canvas ───────────────────────────────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.96; p.vy *= 0.96; p.vy += 0.07
        p.life++
        const t = p.life / p.max
        const op = Math.pow(1 - t, 0.65) * 0.88
        const rN = p.r * (1 + t)
        ctx.beginPath(); ctx.arc(p.x, p.y, rN * 3.2, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},100%,65%,${op * 0.20})`; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, rN, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},100%,82%,${op})`; ctx.fill()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const speakVoice = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = 0.82; utt.pitch = 0.95; utt.volume = 1
      const warm = speechSynthesis.getVoices()
        .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
      if (warm) utt.voice = warm
      window.speechSynthesis.speak(utt)
    } catch (_) {}
  }, [])

  const burstFromBtn = useCallback((segIndex: number) => {
    const btn = btnRefs.current[segIndex]
    const cv  = canvasRef.current
    if (!btn || !cv) return
    const br = btn.getBoundingClientRect()
    const cx = br.left + br.width / 2
    const cy = br.top  + br.height / 2
    const hue = [0, 33, 51, 120, 210, 255, 285][segIndex]
    particlesRef.current.push(...mkBurst(cx, cy, hue))
  }, [])

  // ── Advance after segment + quizzes ──────────────────────────────────────

  const advanceAfterSegment = useCallback((i: number) => {
    setBusy(false)
    if (i === 6) {
      if (wrongCountRef.current === 0) {
        const bonus = addCoins(100); setCoins(bonus)
        setShowKeeper(true)
        setTimeout(() => { setShowKeeper(false); setPhase('altar') }, 2800)
      } else {
        setTimeout(() => setPhase('altar'), 700)
      }
    } else {
      setCurrentSeg(i + 1)
    }
  }, [])

  // ── Tap a segment button ──────────────────────────────────────────────────

  const handleSegTap = useCallback((i: number) => {
    if (busy || traced[i] || i !== currentSeg) return
    setBusy(true)

    setTraced(prev => { const n = [...prev]; n[i] = true; return n })
    burstFromBtn(i)

    const newCoins = addCoins(10); setCoins(newCoins)
    setCoinBurstKey(k => k + 1)

    setCelebFamily(true)
    setTimeout(() => setCelebFamily(false), 900)

    const seg = SEGMENTS[i]
    setPromiseInfo({ text: seg.promise, color: seg.color })
    speakVoice(seg.promise.replace('\n', ' '))

    setTimeout(() => {
      setPromiseInfo(null)
      const qs = QUIZ_AFTER[i].map(qi => ALL_Q[qi])
      if (qs.length > 0) {
        tracedSegRef.current = i
        setQuizQueue(qs.slice(1))
        setActiveQuiz(qs[0])
        setBusy(false)
      } else {
        advanceAfterSegment(i)
      }
    }, 2800)
  }, [busy, traced, currentSeg, burstFromBtn, speakVoice, advanceAfterSegment])

  // ── Quiz answer ───────────────────────────────────────────────────────────

  const handleAnswer = useCallback((optIndex: number) => {
    if (quizAnswer !== null || !activeQuiz) return
    setQuizAnswer(optIndex)

    if (optIndex !== activeQuiz.correct) {
      wrongCountRef.current++
      const c = penalizeCoins(50); setCoins(c)
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
    }

    setTimeout(() => {
      setQuizAnswer(null)
      if (quizQueue.length > 0) {
        setActiveQuiz(quizQueue[0])
        setQuizQueue(q => q.slice(1))
      } else {
        setActiveQuiz(null)
        advanceAfterSegment(tracedSegRef.current)
      }
    }, 1900)
  }, [quizAnswer, activeQuiz, quizQueue, advanceAfterSegment])

  // ── Intro voice ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() =>
      speakVoice(
        'Then God spoke to Noah and his sons. I now establish my covenant with you and with every living creature. ' +
        'I have set my rainbow in the clouds as a sign of the covenant between me and the earth. Genesis nine, verse thirteen.'
      ), 900)
    return () => clearTimeout(t)
  }, [phase, speakVoice])

  // ── Completion ────────────────────────────────────────────────────────────

  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="I have set my rainbow in the clouds, and it will be the sign of the covenant between me and the earth."
        verseRef="Genesis 9:13"
        subtitle="you have kept the covenant faithfully"
        voiceLine={`Like Noah, ${name}, your faithfulness through the storm has brought you to the rainbow. Well done, covenant keeper!`}
        onComplete={onComplete}
      />
    )
  }

  // ── Altar ─────────────────────────────────────────────────────────────────

  if (phase === 'altar') {
    return (
      <div className="l11-wrap">
        <div className="l11-bg" />
        <div className="l11-vignette" />
        <canvas ref={canvasRef} className="l11-canvas" />
        <CoinHUD coins={coins} />
        <div className="l11-altar">
          <div className="l11-altar-emoji">🌈</div>
          <h2 className="l11-altar-title">The Covenant Sealed</h2>
          <p className="l11-altar-text">
            Noah built an altar to the LORD and offered burnt offerings on it.
            The LORD smelled the pleasing aroma and said in His heart —
            "Never again will I curse the ground because of humans."
            And He set His rainbow in the clouds as an everlasting sign of His promise to all living things.
          </p>
          <div className="l11-family" style={{ marginBottom: '0.6rem' }}>
            {FAMILY.map((f, i) => <span key={i} className="l11-fam">{f}</span>)}
          </div>
          <button className="l11-altar-btn" onClick={() => setPhase('complete')}>
            RECEIVE THE BLESSING ›
          </button>
        </div>
      </div>
    )
  }

  // ── Intro ─────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div className="l11-wrap">
        <div className="l11-bg" />
        <div className="l11-vignette" />
        <CoinHUD coins={coins} />
        <div className="l11-intro">
          <h1 className="l11-intro-title">THE NOAHIC COVENANT</h1>
          <p className="l11-intro-sub">
            After the flood, God spoke to Noah and established an everlasting covenant with all living things.
            Tap each colour of the rainbow to reveal God's precious promises!
          </p>
          <p className="l11-intro-verse">
            "I have set my rainbow in the clouds, and it will be the sign
            of the covenant between me and the earth." — Genesis 9:13
          </p>
          <button
            className="l11-intro-btn"
            onClick={() => { try { window.speechSynthesis?.cancel() } catch (_) {}; setPhase('tracing') }}
          >
            TAP THE RAINBOW ›
          </button>
        </div>
      </div>
    )
  }

  // ── Tracing / tap phase ───────────────────────────────────────────────────

  const allTraced = traced.every(Boolean)

  return (
    <div className="l11-wrap">
      <div className="l11-bg" />
      <div className="l11-vignette" />
      <canvas ref={canvasRef} className="l11-canvas" />
      <CoinHUD coins={coins} />

      <div className="l11-game">
        <div className="l11-hud-space" />

        <header className="l11-header">
          <p className="l11-label">LEVEL 1-11</p>
          <h1 className="l11-title">The Noahic Covenant &amp; the Rainbow</h1>
        </header>

        {/* Decorative rainbow arc — display only, no click events */}
        <div className="l11-arc-wrap">
          <svg className="l11-arc-svg" viewBox="0 0 700 320" preserveAspectRatio="xMidYMid meet">
            {SEGMENTS.map((seg, i) => (
              <path
                key={i}
                d={segPath(i)}
                fill="none"
                stroke={traced[i] ? seg.color : 'rgba(160,160,160,0.22)'}
                strokeWidth={SW}
                strokeLinecap="round"
                className={traced[i] ? 'l11-seg traced' : 'l11-seg'}
              />
            ))}
          </svg>
        </div>

        {/* ── 7 large tap buttons ── */}
        <div className="l11-seg-btns">
          {SEGMENTS.map((seg, i) => {
            const isDone   = traced[i]
            const isActive = !isDone && i === currentSeg
            const isLocked = !isDone && i !== currentSeg

            let stateClass = 'l11-locked'
            if (isDone)   stateClass = 'l11-done'
            if (isActive) stateClass = 'l11-active'

            return (
              <button
                key={i}
                ref={el => { btnRefs.current[i] = el }}
                className={`l11-seg-btn ${stateClass}`}
                style={{
                  background: isDone || isActive ? seg.bg : undefined,
                  color: seg.color,
                  borderColor: isDone ? `${seg.color}88` : isActive ? seg.color : undefined,
                  boxShadow: isActive ? `0 0 22px ${seg.color}88` : isDone ? `0 0 10px ${seg.color}44` : undefined,
                }}
                onClick={() => handleSegTap(i)}
                disabled={isLocked || busy || isDone}
                aria-label={`${seg.name} segment${isDone ? ' — done' : isActive ? ' — tap to reveal God\'s promise' : ' — locked'}`}
              >
                <span className="l11-btn-icon">
                  {isDone ? '✅' : isLocked ? '⚫' : seg.icon}
                </span>
                <span className="l11-btn-name">{seg.name}</span>
                {isActive && <span className="l11-btn-tap">TAP!</span>}
              </button>
            )
          })}
        </div>

        {/* Progress dots */}
        <div className="l11-dots">
          {SEGMENTS.map((seg, i) => (
            <div
              key={i}
              className={`l11-dot${traced[i] ? ' done' : ''}`}
              style={traced[i] ? { background: seg.color, borderColor: seg.color } : {}}
            />
          ))}
        </div>

        {/* Instruction */}
        <p className="l11-instruct">
          {allTraced
            ? '🌈 All seven promises revealed — Glory to God!'
            : `Tap the ${SEGMENTS[currentSeg]?.name} button to reveal God's promise!`}
        </p>

        {/* Family row */}
        <div className="l11-family">
          {FAMILY.map((f, i) => (
            <span
              key={i}
              className={`l11-fam${celebFamily ? ' celebrate' : ''}`}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Promise banner */}
      {promiseInfo && (
        <div
          className="l11-promise"
          style={{ color: promiseInfo.color, borderColor: `${promiseInfo.color}55`, border: `1px solid` }}
        >
          "{promiseInfo.text}"
        </div>
      )}

      {/* +10 coin burst */}
      {coinBurstKey > 0 && (
        <div key={coinBurstKey} className="l11-coin-burst">+10 🪙</div>
      )}

      {/* Covenant Keeper banner */}
      {showKeeper && (
        <div className="l11-keeper">⭐ COVENANT KEEPER! ⭐</div>
      )}

      {/* Quiz overlay */}
      {activeQuiz && (
        <div className="l11-quiz-overlay">
          <div className="l11-quiz-card">
            <p className="l11-quiz-q">{activeQuiz.q}</p>
            <div className="l11-quiz-opts">
              {activeQuiz.opts.map((opt, i) => (
                <button
                  key={i}
                  className={`l11-quiz-opt${
                    quizAnswer === i
                      ? i === activeQuiz.correct ? ' correct' : ' wrong'
                      : quizAnswer !== null && i === activeQuiz.correct ? ' correct' : ''
                  }`}
                  onClick={() => handleAnswer(i)}
                  disabled={quizAnswer !== null}
                >
                  {opt}
                </button>
              ))}
            </div>
            {quizAnswer !== null && (
              <p className="l11-quiz-feedback">{activeQuiz.feedback}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
