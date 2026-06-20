import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level18.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase     = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'ending' | 'complete'
type LotDrop   = 'center' | 'jordan' | 'canaan'
type CompassDir = 'n' | 's' | 'e' | 'w'
type P3Stage   = 'words' | 'compass' | 'quiz'

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'SAVE SOME WISDOM FOR THE REST OF US!',
  'WHO LET YOU BE THIS SMART?!',
  "YOU'RE MAKING US LOOK BAD!",
  'OKAY, SHOW OFF!',
  "THAT'S NOT EVEN FAIR!",
  'SLOW DOWN, GENIUS!',
  'GOD GAVE YOU TOO MUCH!',
  "YOU'RE MAKING THE ANGELS JEALOUS!",
  'THAT WAS E P I C!',
]
const randAffirm = () => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]

const NAR_WORDS = [
  'The','land...','could','not','support','them','both.',
  'Quarrelling','broke','out.','Tension','was','rising.',
  'Someone','had','to','make','a','decision','—','FAST.',
]

const P1_OPTS = [
  '"GET OFF MY LAND, LOT!"',
  '"Choose whatever land you want — I\'ll take what\'s left"',
  '"Let\'s fight for it!"',
  '"We\'ll ask Pharaoh to decide"',
]
const P1_ANS = 1

const GOD_LINES = [
  'LOOK... NORTH. SOUTH. EAST. WEST.',
  'EVERYTHING... YOU... SEE...',
  'IS... YOURS. FOREVER.',
]

const P3_OPTS = [
  "You'll get Lot's land back someday",
  'All land he could see + descendants like dust of the earth',
  'A great palace in Egypt',
  "Protection from Lot's herdsmen",
]
const P3_ANS = 1

const COMPASS_DIRS: CompassDir[] = ['n', 's', 'e', 'w']
const COMPASS_EMOJI: Record<CompassDir, string> = { n: '⬆️', s: '⬇️', e: '➡️', w: '⬅️' }

// ── Audio ─────────────────────────────────────────────────────────────────────
function playBoom() {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(100, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(18, ctx.currentTime + 2)
    g.gain.setValueAtTime(0.72, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5)
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 3)
  } catch (_) {}
}
function playClink() {
  try {
    const ctx = new AudioContext()
    ;[1200, 1500, 1800].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'triangle'; o.frequency.value = f
      g.gain.setValueAtTime(0, ctx.currentTime + i*0.07); g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i*0.07 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.07 + 0.3)
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i*0.07); o.stop(ctx.currentTime + i*0.07 + 0.4)
    })
  } catch (_) {}
}
function playGoldPop() {
  try {
    const ctx = new AudioContext()
    ;[330, 415, 523, 659].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, ctx.currentTime + i*0.06); g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + i*0.06 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.06 + 0.6)
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i*0.06); o.stop(ctx.currentTime + i*0.06 + 0.8)
    })
  } catch (_) {}
}
function playFanfare() {
  try {
    const ctx = new AudioContext()
    ;[261, 330, 392, 523, 659, 784].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, ctx.currentTime + i*0.09); g.gain.linearRampToValueAtTime(0.20, ctx.currentTime + i*0.09 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.09 + 0.9)
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i*0.09); o.stop(ctx.currentTime + i*0.09 + 1.1)
    })
  } catch (_) {}
}
function playDing(pitch = 1.0) {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'triangle'; o.frequency.value = 880 * pitch
    g.gain.setValueAtTime(0.25, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.5)
  } catch (_) {}
}
function playWhoosh() {
  try {
    const ctx = new AudioContext()
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) { const t = i / d.length; d[i] = (Math.random()*2-1)*t*(1-t)*4 }
    const src = ctx.createBufferSource(); src.buffer = buf
    const g = ctx.createGain(); g.gain.value = 0.35
    src.connect(g); g.connect(ctx.destination); src.start()
  } catch (_) {}
}
function playWhiteBurst() {
  try {
    const ctx = new AudioContext()
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0.18, ctx.currentTime + i*0.04); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.04 + 1.0)
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i*0.04); o.stop(ctx.currentTime + i*0.04 + 1.2)
    })
    playBoom()
  } catch (_) {}
}

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }

function mkBurst(cx: number, cy: number, cnt: number, hue = 45): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random() * Math.PI * 2; const s = Math.random() * 10 + 2
    return { x: cx, y: cy, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 3, r: Math.random()*3+1, life: 0, max: Math.random()*70+50, hue }
  })
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level18({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Warrior'

  // Core
  const [phase, setPhase]         = useState<Phase>('cinematic')
  const [coins, setCoins]         = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [affirm, setAffirm]       = useState<string | null>(null)
  const [affKey, setAffKey]       = useState(0)

  // Cinematic  0=black+coins  1=text  2=shake  3=bg-burst  4=silhouettes  5=title
  const [cinStep, setCinStep]     = useState(0)

  // Phase 1
  const [narIdx, setNarIdx]       = useState(0)
  const [narDone, setNarDone]     = useState(false)
  const [showP1Q, setShowP1Q]     = useState(false)
  const [p1Sel, setP1Sel]         = useState<number | null>(null)
  const [p1Grace, setP1Grace]     = useState(false)
  const [p1Done, setP1Done]       = useState(false)
  const [lightKey, setLightKey]   = useState(0)
  const [herdsClash, setHerdsClash] = useState(false)

  // Phase 2
  const [lotX, setLotX]           = useState(50)
  const [lotY, setLotY]           = useState(48)
  const [isDragging, setIsDragging] = useState(false)
  const [lotDrop, setLotDrop]     = useState<LotDrop>('center')
  const [p2Redirect, setP2Redirect] = useState(false)
  const [p2Ominous, setP2Ominous] = useState(false)

  // Phase 3
  const [p3Stage, setP3Stage]     = useState<P3Stage>('words')
  const [godLineIdx, setGodLineIdx] = useState(0)
  const [cmpDone, setCmpDone]     = useState<CompassDir[]>([])
  const [sweepDir, setSweepDir]   = useState<CompassDir | null>(null)
  const [p3Sel, setP3Sel]         = useState<number | null>(null)
  const [p3Grace, setP3Grace]     = useState(false)
  const [whiteBurst, setWhiteBurst] = useState(false)

  // Ending
  const [coinCount, setCoinCount]   = useState(0)
  const [starsShown, setStarsShown] = useState(0)
  const [showScripture, setShowScripture] = useState(false)
  const [showAdvance, setShowAdvance]     = useState(false)
  const [endCoins]                        = useState(() => Array.from({ length: 20 }, (_, i) => i))

  // Refs
  const phaseRef   = useRef<Phase>('cinematic')
  const earnedRef  = useRef(0)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef(0)
  const particlesRef = useRef<Pt[]>([])

  // Canvas resize
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    setShakeClass('l18-shake'); setTimeout(() => setShakeClass(''), 700)
  }, [])

  const showAffirm = useCallback((text: string) => {
    setAffirm(text); setAffKey(k => k + 1); setTimeout(() => setAffirm(null), 2600)
  }, [])

  const speak = useCallback((text: string, rate = 0.80, pitch = 1.0) => {
    try {
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = rate; utt.pitch = pitch; utt.volume = 1
      window.speechSynthesis?.speak(utt)
    } catch (_) {}
  }, [])

  const speakAffirm = useCallback((text: string) => {
    try {
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = 0.88; utt.pitch = 1.45; utt.volume = 1
      window.speechSynthesis?.speak(utt)
    } catch (_) {}
  }, [])

  const runParticles = useCallback(() => {
    const cv = canvasRef.current; if (!cv || rafRef.current !== 0) return
    const tick = () => {
      const ctx = cv.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, cv.width, cv.height)
        particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
        for (const p of particlesRef.current) {
          p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy *= 0.93; p.vy += 0.14; p.life++
          const op = Math.pow(1 - p.life / p.max, 0.55) * 0.95
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r*4, 0, Math.PI*2)
          ctx.fillStyle = `hsla(${p.hue},95%,60%,${op*0.18})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r*1.6, 0, Math.PI*2)
          ctx.fillStyle = `hsla(${p.hue},90%,75%,${op*0.70})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r*0.6, 0, Math.PI*2)
          ctx.fillStyle = `hsla(${p.hue},70%,97%,${op})`; ctx.fill()
        }
      }
      if (particlesRef.current.length > 0) rafRef.current = requestAnimationFrame(tick)
      else rafRef.current = 0
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const burst = useCallback((cx: number, cy: number, cnt = 80, hue = 45) => {
    particlesRef.current.push(...mkBurst(cx, cy, cnt, hue))
    runParticles()
  }, [runParticles])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── Cinematic ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playClink()
    const ts = [
      setTimeout(() => setCinStep(1), 800),
      setTimeout(() => { setCinStep(2); shake(); playBoom() }, 1600),
      setTimeout(() => { setCinStep(3); playWhoosh() }, 2400),
      setTimeout(() => setCinStep(4), 3200),
      setTimeout(() => { setCinStep(5); playWhoosh() }, 4000),
      setTimeout(() => {
        phaseRef.current = 'phase1'; setPhase('phase1')
        speak('The land could not support them both. Quarrelling broke out. Tension was rising. Someone had to make a decision — FAST.', 0.82, 0.92)
      }, 5200),
    ]
    return () => ts.forEach(clearTimeout)
  }, [phase, shake, speak])

  // ── Phase 1: word-by-word narration ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1' || narDone) return
    if (narIdx >= NAR_WORDS.length) { setNarDone(true); return }
    const delay = narIdx === 0 ? 1800 : 320
    const t = setTimeout(() => setNarIdx(i => i + 1), delay)
    return () => clearTimeout(t)
  }, [phase, narIdx, narDone])

  useEffect(() => {
    if (!narDone || showP1Q) return
    const t = setTimeout(() => { setShowP1Q(true); playWhoosh() }, 700)
    return () => clearTimeout(t)
  }, [narDone, showP1Q])

  // Lightning flicker in phase 1
  useEffect(() => {
    if (phase !== 'phase1' || p1Done) return
    const id = setInterval(() => setLightKey(k => k + 1), 1800)
    return () => clearInterval(id)
  }, [phase, p1Done])

  const handleP1Answer = useCallback((idx: number) => {
    if (p1Sel !== null) return
    setP1Sel(idx)
    if (idx === P1_ANS) {
      addEarned(40)
      const af = randAffirm(); speakAffirm(af); showAffirm(af)
      playGoldPop(); shake()
      burst(window.innerWidth / 2, window.innerHeight / 2, 140, 45)
      setP1Done(true)
      setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 3200)
    } else {
      setHerdsClash(true)
      setTimeout(() => {
        setHerdsClash(false); setP1Grace(true); setP1Sel(null)
        setTimeout(() => setP1Grace(false), 2800)
      }, 1200)
    }
  }, [p1Sel, addEarned, burst, shake, showAffirm, speakAffirm])

  // ── Phase 2: drag Lot ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setLotX(50); setLotY(48); setLotDrop('center')
    setP2Redirect(false); setP2Ominous(false)
    speak('Lot lifted his eyes and saw the whole plain of the Jordan — well watered, like the garden of the LORD. Where will Lot go?', 0.80, 0.95)
  }, [phase, speak])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (lotDrop !== 'center') return
    setIsDragging(true)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {}
  }, [lotDrop])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setLotX(e.clientX / window.innerWidth * 100)
    setLotY(e.clientY / window.innerHeight * 100)
  }, [isDragging])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    const xPct = e.clientX / window.innerWidth
    const dropX = e.clientX / window.innerWidth * 100
    const dropY = e.clientY / window.innerHeight * 100
    if (xPct < 0.50) {
      // Jordan Plain — correct
      setLotDrop('jordan'); setLotX(dropX); setLotY(dropY)
      addEarned(30)
      const af = randAffirm(); speakAffirm(af); showAffirm(af)
      playGoldPop()
      burst(window.innerWidth * 0.25, window.innerHeight * 0.48, 110, 120)
      setTimeout(() => {
        setP2Ominous(true)
        speak('But the men of Sodom were very wicked and were sinning greatly against the LORD.', 0.76, 0.85)
      }, 2000)
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 7000)
    } else {
      // Canaan Hills — Grace mechanic, no penalty
      setLotDrop('canaan'); setLotX(dropX); setLotY(dropY)
      setP2Redirect(true)
      setTimeout(() => {
        setLotDrop('center'); setLotX(50); setLotY(48); setP2Redirect(false)
      }, 2800)
    }
  }, [isDragging, addEarned, burst, showAffirm, speakAffirm, speak])

  const handlePointerCancel = useCallback(() => {
    setIsDragging(false)
  }, [])

  // ── Phase 3: God's promise ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Stage('words'); setGodLineIdx(0); setCmpDone([]); setSweepDir(null)
    setP3Sel(null); setP3Grace(false); setWhiteBurst(false)
    const ts = [
      setTimeout(() => { setGodLineIdx(1); speak(GOD_LINES[0], 0.68, 0.85) }, 1000),
      setTimeout(() => { setGodLineIdx(2); speak(GOD_LINES[1], 0.68, 0.85) }, 4500),
      setTimeout(() => { setGodLineIdx(3); speak(GOD_LINES[2], 0.68, 0.85) }, 8000),
      setTimeout(() => { setP3Stage('compass'); playWhoosh() }, 11500),
    ]
    return () => ts.forEach(clearTimeout)
  }, [phase, speak])

  const handleCompass = useCallback((dir: CompassDir) => {
    setCmpDone(prev => {
      if (prev.includes(dir)) return prev
      const next = [...prev, dir]
      setSweepDir(dir); setTimeout(() => setSweepDir(null), 800)
      addEarned(10); playGoldPop()
      const cx = dir === 'e' ? window.innerWidth*0.88 : dir === 'w' ? window.innerWidth*0.12 : window.innerWidth/2
      const cy = dir === 'n' ? window.innerHeight*0.12 : dir === 's' ? window.innerHeight*0.88 : window.innerHeight/2
      burst(cx, cy, 60)
      if (next.length === 4) {
        setTimeout(() => {
          playBoom(); shake()
          for (let i = 0; i < 9; i++) {
            setTimeout(() => burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 80), i*130)
          }
          setTimeout(() => { setP3Stage('quiz'); playWhoosh() }, 1600)
        }, 300)
      }
      return next
    })
  }, [addEarned, burst, shake])

  const handleP3Answer = useCallback((idx: number) => {
    if (p3Sel !== null) return
    setP3Sel(idx)
    if (idx === P3_ANS) {
      addEarned(60)
      const af = randAffirm(); speakAffirm(af); showAffirm(af)
      playWhiteBurst(); shake()
      setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 1400)
      for (let i = 0; i < 12; i++) {
        setTimeout(() => burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 80, 45 + Math.random()*20), i*110)
      }
      setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 3800)
    } else {
      setP3Grace(true)
      setTimeout(() => { setP3Grace(false); setP3Sel(null) }, 3000)
    }
  }, [p3Sel, addEarned, burst, shake, showAffirm, speakAffirm])

  // ── Ending sequence ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ending') return
    playFanfare()
    const total = earnedRef.current
    let current = 0
    const step = Math.max(1, Math.ceil(total / 60))
    const id = setInterval(() => {
      current = Math.min(current + step, total)
      setCoinCount(current)
      if (current % Math.ceil(total / 5) === 0 || current === total) playDing(0.8 + (current / total) * 0.5)
      if (current >= total) clearInterval(id)
    }, 28)
    const ts = [
      setTimeout(() => setStarsShown(1), 1400),
      setTimeout(() => setStarsShown(2), 2000),
      setTimeout(() => setStarsShown(3), 2700),
      setTimeout(() => {
        setShowScripture(true)
        speak('"Abram built an altar to the LORD at Hebron." — Genesis 13:18', 0.78, 0.90)
      }, 3500),
      setTimeout(() => setShowAdvance(true), 5800),
    ]
    return () => { clearInterval(id); ts.forEach(clearTimeout) }
  }, [phase, speak])

  // Cleanup
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); window.speechSynthesis?.cancel() }, [])

  // ── Render ────────────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="Abram built an altar to the LORD at Hebron."
        verseRef="Genesis 13:18"
        subtitle="Generosity is not loss — it is the door to multiplication"
        voiceLine={`${playerName}, when Abram let go of what was his by right, God gave him everything. You chose like Abram today. You are wiser than you know.`}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className={`l18-wrap ${shakeClass}`}>
      {/* Background */}
      <div className={`l18-bg${cinStep >= 3 ? ' visible' : ''}`} />
      {cinStep === 3 && <div className="l18-bg-flash" />}
      {cinStep < 3  && <div className="l18-black" />}

      <canvas ref={canvasRef} className="l18-canvas" />

      {whiteBurst && <div className="l18-white-burst" />}

      {phase !== 'cinematic' && phase !== 'complete' && (
        <div className="l18-coin-hud"><CoinHUD coins={coins} /></div>
      )}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l18-cin">
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} className="l18-cin-coin"
              style={{ left: `${5 + (i*6.8) % 92}%`, animationDelay: `${(i*0.12) % 1.2}s`, animationDuration: `${0.9 + (i*0.07) % 0.8}s` }}>
              🪙
            </div>
          ))}
          {cinStep >= 1 && <div className="l18-cin-text">TWO MEN. ONE LAND. ONE CHOICE.</div>}
          {cinStep >= 4 && (
            <div className="l18-silhouettes">
              <span className="l18-sil-abram">🧙‍♂️</span>
              <span className="l18-sil-lot">🧍</span>
            </div>
          )}
          {cinStep >= 5 && (
            <div className="l18-title-card">
              <div className="l18-title-main">⚔️ THE GREAT DIVIDE ⚔️</div>
              <div className="l18-title-sub">Who will choose wisely?</div>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 1: Clash of the Herdsmen ── */}
      {phase === 'phase1' && (
        <>
          <div className="l18-phase-banner">🐄 CLASH OF THE HERDSMEN ⚔️</div>

          <div className={`l18-herds${herdsClash ? ' clashing' : ''}`}>
            <div className={`l18-herd-left${herdsClash ? ' clash' : ''}`}>
              <div>🐄🐄🐑</div><div>🐄🐑🐄</div>
            </div>
            <div key={lightKey} className="l18-lightning">⚡</div>
            <div className={`l18-herd-right${herdsClash ? ' clash' : ''}`}>
              <div>🐑🐄🐄</div><div>🐄🐑🐑</div>
            </div>
          </div>

          {!p1Done && (
            <div className="l18-narration">
              {NAR_WORDS.slice(0, narIdx).map((w, i) => (
                <span key={i} className="l18-nar-word">{w} </span>
              ))}
            </div>
          )}

          {showP1Q && !p1Done && (
            <div className="l18-question-card">
              <div className="l18-q-label">🔥 WHAT DID ABRAM DO? 🔥</div>
              <p className="l18-q-text">Abram turned to Lot and said...</p>
              <div className="l18-opts">
                {P1_OPTS.map((opt, i) => (
                  <button
                    key={i}
                    className={`l18-opt${p1Sel === i ? (i === P1_ANS ? ' correct' : ' wrong') : ''}`}
                    disabled={p1Sel !== null && p1Sel !== i || p1Grace}
                    onClick={() => handleP1Answer(i)}
                  >{opt}</button>
                ))}
              </div>
              {p1Grace && <div className="l18-grace">✨ Not quite — try again! You've got this!</div>}
            </div>
          )}

          {p1Done && (
            <div className="l18-p1-victory">
              <div className="l18-p1-banner">ABRAM CHOSE GENEROSITY!</div>
              <div className="l18-p1-sub">+40 🪙</div>
            </div>
          )}
        </>
      )}

      {/* ── PHASE 2: Lot's Big Mistake ── */}
      {phase === 'phase2' && (
        <>
          <div className="l18-map">
            <div className="l18-map-left">
              <div className="l18-map-label">THE JORDAN PLAIN</div>
              <div className="l18-map-icons">💧🌳🌾✨💧🌳</div>
            </div>
            <div className="l18-map-crack">⚡</div>
            <div className="l18-map-right">
              <div className="l18-map-label">THE HILLS OF CANAAN</div>
              <div className="l18-map-icons">⛰️🌿⛰️🌵⛰️</div>
            </div>
          </div>

          {!p2Ominous && lotDrop === 'center' && (
            <div className="l18-drag-hint">👆 DRAG LOT TO HIS CHOICE!</div>
          )}

          {!p2Ominous && (
            <div
              className={`l18-lot-char${isDragging ? ' dragging' : ''}${lotDrop !== 'center' ? ' dropped' : ''}`}
              style={{ left: `${lotX}%`, top: `${lotY}%` }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <span className="l18-lot-fig">🧍</span>
              {lotDrop === 'center' && !isDragging && <div className="l18-lot-think">❓❓</div>}
            </div>
          )}

          {p2Redirect && (
            <div className="l18-redirect">
              Not quite! Lot chose the greener side — drag him to the Jordan Plain! 🌿
            </div>
          )}

          {p2Ominous && (
            <div className="l18-ominous">
              <div className="l18-ominous-stain" />
              <div className="l18-ominous-text">
                ⚠️ "The men of Sodom were very wicked." — Genesis 13:13
              </div>
              <div className="l18-ominous-sub">
                Lot chose with his EYES.<br/>Abram chose with his FAITH.
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PHASE 3: God's Insane Promise ── */}
      {phase === 'phase3' && (
        <>
          <div className="l18-god-lights">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className={`l18-beam l18-beam-${i}`} />)}
          </div>

          <div className="l18-abram-alone">🧙‍♂️</div>

          <div className="l18-god-words">
            {GOD_LINES.slice(0, godLineIdx).map((line, i) => (
              <div key={i} className={`l18-god-line l18-gl-${i+1}`}>{line}</div>
            ))}
          </div>

          {p3Stage === 'compass' && (
            <div className="l18-compass">
              <button className={`l18-cmp-btn l18-cmp-n${cmpDone.includes('n') ? ' done' : ''}`} onClick={() => handleCompass('n')}>{COMPASS_EMOJI.n}</button>
              <button className={`l18-cmp-btn l18-cmp-w${cmpDone.includes('w') ? ' done' : ''}`} onClick={() => handleCompass('w')}>{COMPASS_EMOJI.w}</button>
              <div className="l18-cmp-center">🌍</div>
              <button className={`l18-cmp-btn l18-cmp-e${cmpDone.includes('e') ? ' done' : ''}`} onClick={() => handleCompass('e')}>{COMPASS_EMOJI.e}</button>
              <button className={`l18-cmp-btn l18-cmp-s${cmpDone.includes('s') ? ' done' : ''}`} onClick={() => handleCompass('s')}>{COMPASS_EMOJI.s}</button>
              {sweepDir && <div key={sweepDir} className={`l18-sweep l18-sweep-${sweepDir}`} />}
              <div className="l18-cmp-hint">
                {cmpDone.length < 4
                  ? `Tap all 4 directions! (${cmpDone.length}/4)`
                  : '✨ ALL DIRECTIONS CLAIMED!'}
              </div>
            </div>
          )}

          {p3Stage === 'quiz' && (
            <div className="l18-question-card l18-quiz-float">
              <div className="l18-q-label">🌟 WHAT DID GOD PROMISE ABRAM? 🌟</div>
              <div className="l18-opts">
                {P3_OPTS.map((opt, i) => (
                  <button
                    key={i}
                    className={`l18-opt${p3Sel === i ? (i === P3_ANS ? ' correct' : ' wrong') : ''}`}
                    disabled={p3Sel !== null && p3Sel !== i || p3Grace}
                    onClick={() => handleP3Answer(i)}
                  >{opt}</button>
                ))}
              </div>
              {p3Grace && <div className="l18-grace">✨ Almost! Think about what God said — try again!</div>}
            </div>
          )}
        </>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <>
          {endCoins.map(i => (
            <div key={i} className="l18-end-coin"
              style={{ left: `${4 + (i*4.6) % 92}%`, animationDuration: `${1.2 + (i*0.15) % 1.5}s`, animationDelay: `${(i*0.08) % 0.9}s` }}>
              🪙
            </div>
          ))}

          <div className="l18-end-name">{playerName} — YOU CHOSE LIKE ABRAM TODAY!</div>

          <div className="l18-end-tally">
            <div className="l18-tally-label">COINS EARNED THIS LEVEL</div>
            <div className="l18-tally-count">{coinCount} 🪙</div>
          </div>

          <div className="l18-end-stars">
            {[0, 1, 2].map(i => (
              <span key={i} className={`l18-star${starsShown > i ? ' visible' : ''}`}>⭐</span>
            ))}
          </div>

          {showScripture && (
            <div className="l18-scripture-card">
              <p className="l18-scripture-text">"Abram built an altar to the LORD at Hebron."</p>
              <p className="l18-scripture-ref">— Genesis 13:18</p>
            </div>
          )}

          {showAdvance && (
            <button className="l18-advance-btn" onClick={() => { phaseRef.current = 'complete'; setPhase('complete') }}>
              ADVANCE TO LEVEL 1-19 ➡️
            </button>
          )}
        </>
      )}

      {/* Affirmation overlay */}
      {affirm && <div key={affKey} className="l18-affirm">{affirm}</div>}
    </div>
  )
}
