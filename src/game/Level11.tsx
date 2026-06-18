import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins, penalizeCoins } from './coins'
import './level11.css'

// ── Segment data ──────────────────────────────────────────────────────────────

const SEGMENTS = [
  { color: '#FF2200', name: 'Red',    promise: 'I will never again curse the ground\nbecause of mankind!' },
  { color: '#FF8C00', name: 'Orange', promise: 'As long as the earth endures,\nseasons and days will never cease!' },
  { color: '#FFD700', name: 'Yellow', promise: 'Every living creature on earth —\nI establish my covenant with you!' },
  { color: '#00CC44', name: 'Green',  promise: 'Never again will floodwaters\ndestroy all life on the earth!' },
  { color: '#0088FF', name: 'Blue',   promise: 'The rainbow will appear in the clouds\nas my sign to you!' },
  { color: '#5500DD', name: 'Indigo', promise: 'I will remember my covenant\nbetween me and you!' },
  { color: '#BB00FF', name: 'Violet', promise: 'This is the sign of the covenant\nI have established with all life on earth!' },
]

const FAMILY = ['👴', '👵', '👨', '👩', '👨‍🦱', '👩‍🦱', '🧔', '👱‍♀️']

interface Q { q: string; opts: string[]; correct: number; feedback: string }

const ALL_Q: Q[] = [
  { q: 'What did God promise He would NEVER do again?',
    opts: ['Destroy the earth with a flood', 'Create new animals', 'Plant a new garden', 'Rest on the seventh day'],
    correct: 0,
    feedback: '"Never again will I destroy all living creatures." — Genesis 8:21' },
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
    feedback: '"I have set my rainbow in the clouds, it will be the sign." — Genesis 9:13' },
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
    opts: ['Everlasting, for all future generations', 'Until the next flood', 'For one thousand years', 'Until the new earth'],
    correct: 0,
    feedback: '"I establish my covenant with you as an everlasting covenant." — Genesis 9:16' },
]

// Questions to show after each segment (by ALL_Q index)
const QUIZ_AFTER: number[][] = [
  [],        // after Red
  [0],       // after Orange
  [4],       // after Yellow
  [1, 7],    // after Green
  [5],       // after Blue
  [2, 8],    // after Indigo
  [3, 6, 9], // after Violet
]

// ── SVG arc geometry ──────────────────────────────────────────────────────────

const CX = 350, CY = 340, R = 250, SW = 54, STEP = 180 / 7

const toRad = (d: number) => d * Math.PI / 180

function arcPt(angleDeg: number) {
  const a = toRad(angleDeg)
  return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }
}

function segPath(i: number) {
  const a1 = 180 - i * STEP
  const a2 = 180 - (i + 1) * STEP
  const p1 = arcPt(a1), p2 = arcPt(a2)
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${R} ${R} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
}

function segMid(i: number) { return arcPt(180 - (i + 0.5) * STEP) }

function hitTestSeg(svgEl: SVGSVGElement, clientX: number, clientY: number): number {
  const rect = svgEl.getBoundingClientRect()
  const sx = (clientX - rect.left) * (700 / rect.width)
  const sy = (clientY - rect.top)  * (340 / rect.height)
  const dx = sx - CX, dy = CY - sy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < R - SW / 2 - 8 || dist > R + SW / 2 + 8) return -1
  const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI
  if (angleDeg < 0 || angleDeg > 180) return -1
  return Math.min(6, Math.floor((180 - angleDeg) / STEP))
}

// ── Particles ─────────────────────────────────────────────────────────────────

interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }

function mkBurst(sx: number, sy: number, hue: number, count = 70): Pt[] {
  return Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2
    const s = Math.random() * 9 + 2
    return {
      x: sx + (Math.random() - 0.5) * 20, y: sy + (Math.random() - 0.5) * 20,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
      r: Math.random() * 3 + 1, life: 0,
      max: Math.random() * 55 + 35,
      hue: hue + Math.random() * 40 - 20,
    }
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'tracing' | 'altar' | 'complete'

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Level11({ onComplete }: Props) {
  const name = localStorage.getItem('iq_character') || 'Warrior'

  const [phase,       setPhase]       = useState<Phase>('intro')
  const [traced,      setTraced]      = useState<boolean[]>(Array(7).fill(false))
  const [currentSeg,  setCurrentSeg]  = useState(0)
  const [coins,       setCoins]       = useState(getCoins)
  const [promiseInfo, setPromiseInfo] = useState<{ text: string; color: string } | null>(null)
  const [coinBurstKey, setCoinBurstKey] = useState(0)
  const [celebFamily, setCelebFamily] = useState(false)
  const [activeQuiz,  setActiveQuiz]  = useState<Q | null>(null)
  const [quizQueue,   setQuizQueue]   = useState<Q[]>([])
  const [quizAnswer,  setQuizAnswer]  = useState<number | null>(null)
  const [showKeeper,  setShowKeeper]  = useState(false)

  const wrongCountRef   = useRef(0)
  const tracedSegRef    = useRef(-1)
  const isDragging      = useRef(false)
  const svgRef          = useRef<SVGSVGElement>(null)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const particlesRef    = useRef<Pt[]>([])
  const rafRef          = useRef<number>(0)

  // ── Particle canvas loop ──────────────────────────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)

    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.96; p.vy *= 0.96; p.vy += 0.06
        p.life++
        const t = p.life / p.max
        const op = Math.pow(1 - t, 0.65) * 0.9
        const rN = p.r * (1 + t * 1.2)
        ctx.beginPath(); ctx.arc(p.x, p.y, rN * 3, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},100%,65%,${op * 0.22})`; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, rN, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},100%,80%,${op})`; ctx.fill()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const speakVoice = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.82; utt.pitch = 0.95; utt.volume = 1
    const warm = speechSynthesis.getVoices().find(v => /female|woman|zira|samantha|karen|victoria/i.test(v.name))
    if (warm) utt.voice = warm
    window.speechSynthesis.speak(utt)
  }, [])

  const burst = useCallback((segIndex: number) => {
    const cv = canvasRef.current; const sg = svgRef.current; if (!cv || !sg) return
    const svgRect = sg.getBoundingClientRect()
    const mid = segMid(segIndex)
    const scaleX = svgRect.width / 700, scaleY = svgRect.height / 340
    const sx = svgRect.left + mid.x * scaleX
    const sy = svgRect.top  + mid.y * scaleY
    const hue = [0, 33, 51, 120, 210, 255, 280][segIndex]
    particlesRef.current.push(...mkBurst(sx, sy, hue))
  }, [])

  // ── Advance after a segment and its quizzes ───────────────────────────────

  const advanceAfterSegment = useCallback((i: number) => {
    if (i === 6) {
      if (wrongCountRef.current === 0) {
        const bonus = addCoins(100); setCoins(bonus)
        setShowKeeper(true)
        setTimeout(() => { setShowKeeper(false); setPhase('altar') }, 2800)
      } else {
        setTimeout(() => setPhase('altar'), 600)
      }
    } else {
      setCurrentSeg(i + 1)
    }
  }, [])

  // ── Trace a segment ───────────────────────────────────────────────────────

  const traceSegment = useCallback((i: number) => {
    if (traced[i] || i !== currentSeg) return

    setTraced(prev => { const n = [...prev]; n[i] = true; return n })
    burst(i)

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
      } else {
        advanceAfterSegment(i)
      }
    }, 2800)
  }, [traced, currentSeg, burst, speakVoice, advanceAfterSegment])

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

  // ── SVG pointer events ────────────────────────────────────────────────────

  const handleSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault()
    isDragging.current = true
    const seg = hitTestSeg(svgRef.current!, e.clientX, e.clientY)
    if (seg !== -1) traceSegment(seg)
  }, [traceSegment])

  const handleSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging.current) return
    const seg = hitTestSeg(svgRef.current!, e.clientX, e.clientY)
    if (seg !== -1) traceSegment(seg)
  }, [traceSegment])

  useEffect(() => {
    const up = () => { isDragging.current = false }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  // ── Intro voice ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => speakVoice(
      'Then God spoke to Noah and his sons. I now establish my covenant with you and with every living creature. I have set my rainbow in the clouds as a sign of the covenant between me and the earth. Genesis nine, verse thirteen.'
    ), 800)
    return () => clearTimeout(t)
  }, [phase, speakVoice])

  // ── Completion screen ─────────────────────────────────────────────────────

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

  // ── Altar screen ──────────────────────────────────────────────────────────

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

  // ── Intro screen ──────────────────────────────────────────────────────────

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
            Trace each colour of the rainbow to reveal God's precious promises!
          </p>
          <p className="l11-intro-verse">
            "I have set my rainbow in the clouds, and it will be the sign
            of the covenant between me and the earth." — Genesis 9:13
          </p>
          <button
            className="l11-intro-btn"
            onClick={() => { window.speechSynthesis?.cancel(); setPhase('tracing') }}
          >
            TRACE THE RAINBOW ›
          </button>
        </div>
      </div>
    )
  }

  // ── Tracing phase ─────────────────────────────────────────────────────────

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

        {/* Rainbow arc */}
        <div className="l11-arc-wrap">
          <svg
            ref={svgRef}
            className="l11-arc-svg"
            viewBox="0 0 700 340"
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            style={{ touchAction: 'none' }}
          >
            {SEGMENTS.map((seg, i) => (
              <g key={i}>
                <path
                  d={segPath(i)}
                  fill="none"
                  stroke={traced[i] ? seg.color : 'rgba(180,180,180,0.28)'}
                  strokeWidth={SW}
                  strokeLinecap="round"
                  className={traced[i] ? 'l11-seg traced' : 'l11-seg'}
                />
                {/* wider invisible hit area */}
                <path
                  d={segPath(i)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={SW + 24}
                  strokeLinecap="round"
                  style={{ cursor: i === currentSeg && !traced[i] ? 'crosshair' : 'default' }}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Segment progress dots */}
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
            ? '🌈 All seven promises revealed — Glory!'
            : `Trace the ${SEGMENTS[currentSeg]?.name} segment to reveal God's promise!`}
        </p>

        {/* Family row */}
        <div className="l11-family">
          {FAMILY.map((f, i) => (
            <span
              key={i}
              className={`l11-fam${celebFamily ? ' celebrate' : ''}`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Promise banner */}
      {promiseInfo && (
        <div className="l11-promise" style={{ color: promiseInfo.color, borderColor: `${promiseInfo.color}66` }}>
          "{promiseInfo.text}"
        </div>
      )}

      {/* +10 coin burst */}
      {coinBurstKey > 0 && (
        <div key={coinBurstKey} className="l11-coin-burst">+10 🪙</div>
      )}

      {/* COVENANT KEEPER banner */}
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
                  className={`l11-quiz-opt${quizAnswer === i
                    ? (i === activeQuiz.correct ? ' correct' : ' wrong')
                    : (quizAnswer !== null && i === activeQuiz.correct ? ' correct' : '')}`}
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
