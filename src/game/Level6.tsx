import { useEffect, useRef, useState } from 'react'
import './level6.css'
import './FailScreen.css'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { getCoins, addCoins } from './coins'

const HINT = 'Click the next glowing waypoint on the map in order — answer each question to guide Abram to Canaan!'

type Phase = 'intro' | 'journey' | 'quiz' | 'completion'

interface WP {
  x: number; y: number
  color: string; glow: string
  question: string; options: string[]; correct: number; hint: string
}

const WPS: WP[] = [
  {
    x: 16, y: 67, color: '#FF4444', glow: 'rgba(255,68,68,0.65)',
    question: 'Where was Abram born?',
    options: ['Ur', 'Canaan', 'Egypt', 'Babel'],
    correct: 0,
    hint: 'Abram\'s starting city is the first stop on the map — bottom left.',
  },
  {
    x: 32, y: 56, color: '#FF8C00', glow: 'rgba(255,140,0,0.65)',
    question: 'Who did God tell Abram to leave behind?',
    options: ['His enemies', 'His country and people', 'His animals', 'His servants'],
    correct: 1,
    hint: '"Leave your COUNTRY, your PEOPLE and your father\'s household." — Genesis 12:1',
  },
  {
    x: 49, y: 46, color: '#FFD700', glow: 'rgba(255,215,0,0.70)',
    question: 'How old was Abram when he left?',
    options: ['55', '65', '75', '85'],
    correct: 2,
    hint: 'Genesis 12:4 — Abram was 75 years old when he departed from Haran.',
  },
  {
    x: 65, y: 36, color: '#22CC55', glow: 'rgba(34,204,85,0.65)',
    question: 'Who went with Abram on the journey?',
    options: ['Nobody', 'Just Sarai', 'Sarai and Lot', 'Only servants'],
    correct: 2,
    hint: 'Both his wife Sarai AND his nephew Lot journeyed alongside him.',
  },
  {
    x: 81, y: 26, color: '#4488FF', glow: 'rgba(68,136,255,0.65)',
    question: 'What did God promise to make Abram?',
    options: ['A king', 'A great nation', 'A prophet', 'A priest'],
    correct: 1,
    hint: '"I will make you into a GREAT NATION and I will bless you." — Genesis 12:2',
  },
]

// Abram starts at Ur, then advances to each cleared waypoint
const ABRAM_POS = [
  { x: 7, y: 73 },
  { x: 16, y: 67 },
  { x: 32, y: 56 },
  { x: 49, y: 46 },
  { x: 65, y: 36 },
  { x: 81, y: 26 },
]

const FW_COLORS = ['#FFD700', '#FF88CC', '#44FFFF', '#CC88FF', '#FF8C00', '#88FF88', '#FF4444', '#44CCFF']

interface FWParticle {
  x: number; y: number; vx: number; vy: number
  r: number; alpha: number; color: string
}

// ─── Audio ───────────────────────────────────────────────────────────────────

function playThunder() {
  try {
    const ctx = new AudioContext()
    const len = Math.floor(ctx.sampleRate * 2.8)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.52)
    const src = ctx.createBufferSource(); src.buffer = buf
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8)
    src.connect(lp); lp.connect(g); g.connect(ctx.destination)
    src.start(); src.stop(ctx.currentTime + 2.8)
  } catch (_) {}
}

function playFireworkSound() {
  try {
    const ctx = new AudioContext()
    ;[880, 1108, 1319, 1760, 2093].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx.currentTime + i * 0.045
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.9)
    })
  } catch (_) {}
}

function playCorrect() {
  try {
    const ctx = new AudioContext()
    ;[523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx.currentTime + i * 0.08
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.06)
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 1.5)
    })
  } catch (_) {}
}

function playWrong() {
  try {
    const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(200, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5)
    g.gain.setValueAtTime(0.09, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.55)
  } catch (_) {}
}

function speakGod(text: string) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.58; utt.pitch = 0.32; utt.volume = 1
    speechSynthesis.cancel(); speechSynthesis.speak(utt)
  } catch (_) {}
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Level6({ onComplete, onFail, showHint }: {
  onComplete?: () => void
  onFail?: (hint: string) => void
  showHint?: boolean
}) {
  const [phase,       setPhase]       = useState<Phase>('intro')
  const [wpDone,      setWpDone]      = useState(0)
  const [curWP,       setCurWP]       = useState(0)
  const [sel,         setSel]         = useState<number | null>(null)
  const [locked,      setLocked]      = useState(false)
  const [wrongFlash,  setWrongFlash]  = useState(false)
  const [coins,       setCoins]       = useState(() => getCoins())
  const [godVisible,  setGodVisible]  = useState(false)

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rafRef      = useRef<number>(0)
  const fwRef       = useRef<FWParticle[]>([])
  const wrongCount  = useRef(0)

  // ── Canvas: starry sky + desert + fireworks ──────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    cv.width = window.innerWidth; cv.height = window.innerHeight
    const W = cv.width, H = cv.height

    const SCOLS = ['#FFD700', '#E8E0FF', '#CC88FF', '#44FFFF', '#FF88CC', '#FFBBAA', '#88FFEE']
    interface Star { x: number; y: number; r: number; color: string; base: number; amp: number; spd: number; ph: number }
    const stars: Star[] = Array.from({ length: 300 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.74,
      r: Math.random() * 2.1 + 0.3,
      color: SCOLS[Math.floor(Math.random() * SCOLS.length)],
      base: Math.random() * 0.45 + 0.25,
      amp:  Math.random() * 0.32 + 0.08,
      spd:  Math.random() * 0.022 + 0.004,
      ph:   Math.random() * Math.PI * 2,
    }))

    let frame = 0

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Deep midnight blue sky
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75)
      sky.addColorStop(0,    '#03011c')
      sky.addColorStop(0.30, '#08032a')
      sky.addColorStop(0.60, '#0c0535')
      sky.addColorStop(1,    '#18083a')
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.75)

      // Horizon warm glow (desert heat meeting night sky)
      const hg = ctx.createLinearGradient(0, H * 0.60, 0, H * 0.78)
      hg.addColorStop(0, 'transparent')
      hg.addColorStop(0.4, 'rgba(160,55,12,0.14)')
      hg.addColorStop(1, 'transparent')
      ctx.fillStyle = hg; ctx.fillRect(0, H * 0.60, W, H * 0.18)

      // Purple dusk strip at horizon
      const ph = ctx.createLinearGradient(0, H * 0.72, 0, H * 0.77)
      ph.addColorStop(0, 'transparent')
      ph.addColorStop(0.5, 'rgba(75,20,80,0.40)')
      ph.addColorStop(1, 'transparent')
      ctx.fillStyle = ph; ctx.fillRect(0, H * 0.72, W, H * 0.05)

      // Rich desert ground — terracotta, sandy orange, deep rust
      const gr = ctx.createLinearGradient(0, H * 0.73, 0, H)
      gr.addColorStop(0,    '#5c2210')
      gr.addColorStop(0.12, '#7a3318')
      gr.addColorStop(0.35, '#6b2d12')
      gr.addColorStop(0.65, '#4a1e0c')
      gr.addColorStop(1,    '#200a04')
      ctx.fillStyle = gr; ctx.fillRect(0, H * 0.73, W, H * 0.27)

      // Sandy dunes
      const dunes: [number, number, number, number, string][] = [
        [0.12, 0.79, 0.30, 0.74, '#8a4518'],
        [0.38, 0.77, 0.22, 0.72, '#7a3d14'],
        [0.62, 0.80, 0.26, 0.75, '#8c4a1a'],
        [0.82, 0.78, 0.20, 0.73, '#7a3818'],
      ]
      for (const [cx, cy, rw, ry, col] of dunes) {
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.ellipse(cx * W, cy * H, rw * W * 0.5, (cy - ry) * H * 0.6, 0, Math.PI, 0, true)
        ctx.fill()
      }

      // Colorful twinkling stars
      frame++
      for (const s of stars) {
        const op = Math.max(0.06, Math.min(1, s.base + Math.sin(frame * s.spd + s.ph) * s.amp))
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.8, 0, Math.PI * 2)
        ctx.fillStyle = `${s.color}${Math.floor(op * 38).toString(16).padStart(2, '0')}`; ctx.fill()
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = s.color; ctx.globalAlpha = op; ctx.fill(); ctx.globalAlpha = 1
      }

      // Firework particles
      for (let i = fwRef.current.length - 1; i >= 0; i--) {
        const p = fwRef.current[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.alpha -= 0.016
        if (p.alpha <= 0) { fwRef.current.splice(i, 1); continue }
        // Glow halo
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.8, 0, Math.PI * 2)
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha * 0.22; ctx.fill(); ctx.globalAlpha = 1
        // Core
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill(); ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // ── Launch fireworks ──────────────────────────────────────────────────────

  const launchFireworks = () => {
    const W = window.innerWidth, H = window.innerHeight
    const bursts: FWParticle[] = []
    for (let b = 0; b < 7; b++) {
      const bx = W * (0.08 + Math.random() * 0.84)
      const by = H * (0.05 + Math.random() * 0.58)
      const col = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)]
      for (let j = 0; j < 32; j++) {
        const angle = Math.random() * Math.PI * 2
        const spd = Math.random() * 9 + 2
        bursts.push({
          x: bx, y: by,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
          r: Math.random() * 3.5 + 1,
          alpha: 0.85 + Math.random() * 0.15,
          color: col,
        })
      }
    }
    fwRef.current.push(...bursts)
  }

  // ── Intro sequence ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'intro') return
    const t1 = setTimeout(() => {
      playThunder()
      setGodVisible(true)
      speakGod('Leave your country, your people and your father\'s household, and go to the land I will show you.')
    }, 1400)
    const t2 = setTimeout(() => {
      setGodVisible(false)
      setPhase('journey')
    }, 8000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase])

  // ── Waypoint click ────────────────────────────────────────────────────────

  const handleWaypoint = (i: number) => {
    if (i !== wpDone) return
    setCurWP(i)
    setSel(null)
    setLocked(false)
    setWrongFlash(false)
    setPhase('quiz')
  }

  // ── Answer ────────────────────────────────────────────────────────────────

  const handleAnswer = (idx: number) => {
    if (locked) return
    setSel(idx)
    const wp = WPS[curWP]

    if (idx === wp.correct) {
      setLocked(true)
      setCoins(addCoins(10))
      playCorrect()
      playFireworkSound()
      launchFireworks()

      setTimeout(() => {
        const next = wpDone + 1
        setWpDone(next)
        setSel(null)
        setLocked(false)

        if (next >= WPS.length) {
          launchFireworks()
          launchFireworks()
          setTimeout(() => setPhase('completion'), 4200)
        } else {
          setPhase('journey')
        }
      }, 2200)
    } else {
      setWrongFlash(true)
      playWrong()
      wrongCount.current += 1
      if (wrongCount.current >= 3) {
        setTimeout(() => onFail?.(WPS[curWP].hint), 900)
      } else {
        setTimeout(() => { setWrongFlash(false); setSel(null) }, 1800)
      }
    }
  }

  // ── Completion ────────────────────────────────────────────────────────────

  if (phase === 'completion') {
    const name = localStorage.getItem('iq_character') || 'Warrior'
    return (
      <CompletionScreen
        verse="By faith Abraham obeyed when he was called to go out to a place that he was to receive as an inheritance."
        verseRef="Hebrews 11:8"
        subtitle="your obedience opens doors nobody can shut"
        voiceLine={`Like Abram, your obedience opens doors nobody can shut — ${name}. You are stronger than you think.`}
        onComplete={onComplete}
      />
    )
  }

  const abramPos = ABRAM_POS[Math.min(wpDone, ABRAM_POS.length - 1)]

  return (
    <div className="level6">
      <canvas ref={canvasRef} className="l6-canvas" />

      <CoinHUD
        coins={coins}
        hint={HINT}
        onCoinsChange={setCoins}
        disabled={phase !== 'journey'}
      />

      {showHint && phase === 'journey' && (
        <div className="level-hint-banner">💡 {HINT}</div>
      )}

      {/* Header */}
      <header className="l6-header">
        <p className="l6-label">LEVEL 1-6</p>
        <h1 className="l6-title">The Call of Abram</h1>
      </header>

      {/* ── INTRO PHASE ─────────────────────────────────────────────────── */}
      {phase === 'intro' && (
        <>
          <div className="l6-abram-intro">
            <div className="l6-abram-glow" />
            <span className="l6-abram-figure-lg">🧎</span>
            <span className="l6-abram-name-tag">ABRAM</span>
          </div>

          <div className="l6-god-beam" />

          {godVisible && (
            <div className="l6-god-words">
              <p className="l6-god-quote">
                "Leave your country, your people and your father's household
                and go to the land I will show you."
              </p>
              <p className="l6-god-ref">— God to Abram &nbsp;·&nbsp; Genesis 12:1</p>
            </div>
          )}
        </>
      )}

      {/* ── JOURNEY PHASE ───────────────────────────────────────────────── */}
      {phase === 'journey' && (
        <div className="l6-map-wrap">
          <div className="l6-map-corner l6-mc--tl">✦</div>
          <div className="l6-map-corner l6-mc--tr">✦</div>
          <div className="l6-map-corner l6-mc--bl">✦</div>
          <div className="l6-map-corner l6-mc--br">✦</div>

          <p className="l6-map-title">✦ THE JOURNEY OF ABRAM ✦</p>

          {/* Instruction */}
          <p className="l6-map-instruction">Click the next glowing waypoint to continue Abram's journey!</p>

          {/* SVG path */}
          <svg
            className="l6-map-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="l6PathGold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#FFD700" />
                <stop offset="50%"  stopColor="#FFE84D" />
                <stop offset="100%" stopColor="#FFB000" />
              </linearGradient>
              <filter id="l6Glow">
                <feGaussianBlur stdDeviation="0.8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Shadow base */}
            <path
              d="M 6,76 C 10,72 13,69 16,67 C 23,62 28,59 32,56 C 40,51 44,48 49,46 C 57,41 61,38 65,36 C 73,31 77,28 81,26 C 86,22 89,20 92,18"
              stroke="rgba(25,10,0,0.9)" strokeWidth="3.5" fill="none" strokeLinecap="round"
            />
            {/* Gold path */}
            <path
              d="M 6,76 C 10,72 13,69 16,67 C 23,62 28,59 32,56 C 40,51 44,48 49,46 C 57,41 61,38 65,36 C 73,31 77,28 81,26 C 86,22 89,20 92,18"
              stroke="url(#l6PathGold)" strokeWidth="1.8" fill="none" strokeLinecap="round"
              strokeDasharray="2,1" filter="url(#l6Glow)"
            />
          </svg>

          {/* City: Ur */}
          <div className="l6-city" style={{ left: '4%', top: '72%' }}>
            <div className="l6-city-dot" style={{ background: '#FFB84D', boxShadow: '0 0 12px 4px rgba(255,184,77,0.75)' }} />
            <span className="l6-city-label">UR</span>
          </div>

          {/* City: Haran */}
          <div className="l6-city" style={{ left: '46%', top: '43%' }}>
            <div className="l6-city-dot" style={{ background: '#CC88FF', boxShadow: '0 0 12px 4px rgba(204,136,255,0.70)' }} />
            <span className="l6-city-label">HARAN</span>
          </div>

          {/* City: Canaan */}
          <div className="l6-city l6-city--promise" style={{ left: '88%', top: '15%' }}>
            <div className="l6-city-dot" style={{ background: '#44FFCC', boxShadow: '0 0 16px 6px rgba(68,255,204,0.80)' }} />
            <span className="l6-city-label l6-city-label--promise">CANAAN ✦</span>
          </div>

          {/* Waypoints */}
          {WPS.map((wp, i) => (
            <button
              key={i}
              className={[
                'l6-waypoint',
                wpDone > i  ? 'l6-wp--done'   : '',
                wpDone === i ? 'l6-wp--active' : '',
                wpDone < i  ? 'l6-wp--locked' : '',
              ].filter(Boolean).join(' ')}
              style={{
                left: `${wp.x}%`,
                top: `${wp.y}%`,
                '--wpc': wp.color,
                '--wpg': wp.glow,
              } as React.CSSProperties}
              onClick={() => handleWaypoint(i)}
              disabled={wpDone !== i}
              aria-label={`Waypoint ${i + 1}`}
            >
              {wpDone > i ? '✓' : i + 1}
            </button>
          ))}

          {/* Abram figure on map */}
          <div
            className="l6-abram-map"
            style={{ left: `${abramPos.x}%`, top: `${abramPos.y}%` }}
          >
            🧎
          </div>

          {/* Progress */}
          <p className="l6-progress">{wpDone} / {WPS.length} waypoints reached</p>
        </div>
      )}

      {/* ── QUIZ PHASE ──────────────────────────────────────────────────── */}
      {phase === 'quiz' && (
        <div className="l6-quiz-overlay">
          <div
            className="l6-quiz-card"
            style={{ '--wpc': WPS[curWP].color, '--wpg': WPS[curWP].glow } as React.CSSProperties}
          >
            <p className="l6-quiz-wpnum" style={{ color: WPS[curWP].color }}>
              ⬤ WAYPOINT {curWP + 1} OF {WPS.length}
            </p>
            <h2 className="l6-quiz-q">{WPS[curWP].question}</h2>
            <div className="l6-quiz-grid">
              {WPS[curWP].options.map((opt, i) => (
                <button
                  key={i}
                  className={[
                    'l6-quiz-btn',
                    sel === i && locked    ? 'l6-qb--correct' : '',
                    sel === i && wrongFlash ? 'l6-qb--wrong'   : '',
                  ].filter(Boolean).join(' ')}
                  style={{ '--wpc': WPS[curWP].color } as React.CSSProperties}
                  onClick={() => handleAnswer(i)}
                  disabled={locked}
                >
                  {opt}
                </button>
              ))}
            </div>
            {wrongFlash && (
              <p className="l6-quiz-feedback">
                Search the scriptures — try again! 📖
                {wrongCount.current >= 2 && <span> (last chance)</span>}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

