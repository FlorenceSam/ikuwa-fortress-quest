import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level18.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase  = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type TileS  = 'neutral' | 'gold' | 'green'
type Dir    = 'n' | 's' | 'e' | 'w'
type P2Sub  = 'building' | 'built' | 'crumbling' | 'message'
type BurstT = 'gold' | 'amber' | 'white'

// ── Questions ─────────────────────────────────────────────────────────────────
interface Q { text: string; opts: string[]; ans: number }

const P2Q: Q[] = [
  {
    text: 'What made the Jordan Plain so attractive to Lot?',
    opts: ['It was well-watered like the Garden of Eden', 'It had gold mines', 'It was closer to Egypt', 'It had no enemies'],
    ans: 0,
  },
  {
    text: 'Where did Lot pitch his tents?',
    opts: ['Near Sodom — a very wicked city', 'Near Jerusalem', 'Near the Nile', 'Near Mamre'],
    ans: 0,
  },
  {
    text: "What was wrong with Lot's choice?",
    opts: ['The people of Sodom were very wicked', 'The land was a desert', 'Abram forbade it', 'There was no water'],
    ans: 0,
  },
]

const P3Q: Record<Dir, Q> = {
  n: { text: 'Who gave Abram ALL this land?',                    opts: ['God', 'Lot', 'Pharaoh', 'He bought it'],              ans: 0 },
  s: { text: "How long would Abram's family own this land?",     opts: ['Forever', '40 years', 'Until Lot returned', '100 years'], ans: 0 },
  w: { text: "What were Abram's descendants compared to?",       opts: ['Dust of the earth', 'Stars only', 'Grains of wheat', 'Ocean waves'], ans: 0 },
  e: { text: 'What did Abram build at Hebron to honour God?',    opts: ['An altar', 'A fortress', 'A palace', 'A marketplace'], ans: 0 },
}

const P4Q: Q = {
  text: "WHAT DOES ABRAM'S STORY TEACH US?",
  opts: [
    'Being generous leaves you with nothing',
    'Only fight for what is yours',
    'Let go in generosity — and God multiplies your inheritance',
    "Lot made the smarter choice",
  ],
  ans: 2,
}

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

const GOD_LINES = [
  'LOOK NORTH. SOUTH. EAST. WEST.',
  'EVERYTHING YOU SEE IS YOURS.',
  'YOURS. FOREVER.',
]

const DIR_ORDER: Dir[] = ['n', 's', 'w', 'e']
const DIR_LABEL: Record<Dir, string> = { n: '⬆️ NORTH', s: '⬇️ SOUTH', w: '⬅️ WEST', e: '➡️ EAST' }

// ── Audio ─────────────────────────────────────────────────────────────────────
function playBoom() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(100, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(18, c.currentTime + 2)
    g.gain.setValueAtTime(0.72, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.5)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 3)
  } catch (_) {}
}
function playThud() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(200, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(55, c.currentTime + 0.18)
    g.gain.setValueAtTime(0.60, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3)
  } catch (_) {}
}
function playClink() {
  try {
    const c = new AudioContext()
    ;[1200, 1500, 1800].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'triangle'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i*0.07)
      g.gain.linearRampToValueAtTime(0.15, c.currentTime + i*0.07 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i*0.07 + 0.3)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i*0.07); o.stop(c.currentTime + i*0.07 + 0.4)
    })
  } catch (_) {}
}
function playGoldPop() {
  try {
    const c = new AudioContext()
    ;[330, 415, 523, 659].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i*0.06)
      g.gain.linearRampToValueAtTime(0.22, c.currentTime + i*0.06 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i*0.06 + 0.6)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i*0.06); o.stop(c.currentTime + i*0.06 + 0.8)
    })
  } catch (_) {}
}
function playFanfare() {
  try {
    const c = new AudioContext()
    ;[261, 330, 392, 523, 659, 784].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i*0.09)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i*0.09 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i*0.09 + 0.9)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i*0.09); o.stop(c.currentTime + i*0.09 + 1.1)
    })
  } catch (_) {}
}
function playDing(pitch = 1.0) {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'triangle'; o.frequency.value = 880 * pitch
    g.gain.setValueAtTime(0.25, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5)
  } catch (_) {}
}
function playWhoosh() {
  try {
    const c = new AudioContext()
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) { const t = i/d.length; d[i] = (Math.random()*2-1)*t*(1-t)*4 }
    const src = c.createBufferSource(); src.buffer = buf
    const g = c.createGain(); g.gain.value = 0.35
    src.connect(g); g.connect(c.destination); src.start()
  } catch (_) {}
}
function playWhiteBurst() {
  try {
    const c = new AudioContext()
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0.18, c.currentTime + i*0.04)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i*0.04 + 1.0)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i*0.04); o.stop(c.currentTime + i*0.04 + 1.2)
    })
    playBoom()
  } catch (_) {}
}
function playBuzzer() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(180, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.35)
    g.gain.setValueAtTime(0.4, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5)
  } catch (_) {}
}
function playConstruct() {
  try {
    const c = new AudioContext()
    ;[220, 330, 440].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'square'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i*0.05)
      g.gain.linearRampToValueAtTime(0.12, c.currentTime + i*0.05 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i*0.05 + 0.3)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i*0.05); o.stop(c.currentTime + i*0.05 + 0.35)
    })
  } catch (_) {}
}
function playRumble() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(55, c.currentTime)
    o.frequency.linearRampToValueAtTime(30, c.currentTime + 2.5)
    g.gain.setValueAtTime(0.01, c.currentTime)
    g.gain.linearRampToValueAtTime(0.55, c.currentTime + 0.3)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.8)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 3)
  } catch (_) {}
}
function playLightning() {
  try {
    const c = new AudioContext()
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.55), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i/d.length
      d[i] = (Math.random()*2-1) * Math.exp(-t * 5) * (t < 0.05 ? t/0.05 : 1)
    }
    const src = c.createBufferSource(); src.buffer = buf
    const g = c.createGain(); g.gain.value = 0.75
    src.connect(g); g.connect(c.destination); src.start()
  } catch (_) {}
}

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }

function mkBurst(cx: number, cy: number, cnt: number, hue = 45): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random()*Math.PI*2; const s = Math.random()*10+2
    return { x: cx, y: cy, vx: Math.cos(a)*s, vy: Math.sin(a)*s-3, r: Math.random()*3+1, life: 0, max: Math.random()*70+50, hue }
  })
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level18({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Warrior'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [affirm, setAffirm]         = useState<string | null>(null)
  const [affKey, setAffKey]         = useState(0)
  const [whiteBurst, setWhiteBurst] = useState(false)
  const [redFlash, setRedFlash]     = useState(false)

  // Cinematic
  const [cinStep, setCinStep] = useState(0)

  // Phase 1
  const [tiles, setTiles]         = useState<TileS[]>(() => Array(24).fill('neutral'))
  const [p1Timer, setP1Timer]     = useState(15)
  const [p1Active, setP1Active]   = useState(false)
  const [p1Result, setP1Result]   = useState<'win' | 'loss' | null>(null)
  const [flashIdx, setFlashIdx]   = useState<number | null>(null)

  // Phase 2
  const [p2Sub, setP2Sub]           = useState<P2Sub>('building')
  const [cityFloors, setCityFloors] = useState(0)
  const [p2QIdx, setP2QIdx]         = useState(0)
  const [p2Sel, setP2Sel]           = useState<number | null>(null)
  const [p2Grace, setP2Grace]       = useState(false)
  const [wallCracks, setWallCracks] = useState(0)

  // Phase 3
  const [p3Sub, setP3Sub]                 = useState<'intro' | 'explore' | 'question'>('intro')
  const [godLineIdx, setGodLineIdx]       = useState(0)
  const [revealedZones, setRevealedZones] = useState<Dir[]>([])
  const [answeredZones, setAnsweredZones] = useState<Dir[]>([])
  const [activeDir, setActiveDir]         = useState<Dir | null>(null)
  const [p3Sel, setP3Sel]                 = useState<number | null>(null)
  const [p3Grace, setP3Grace]             = useState(false)
  const [mapBlaze, setMapBlaze]           = useState(false)

  // Phase 4
  const [tabletCount, setTabletCount] = useState(0)
  const [p4Sel, setP4Sel]             = useState<number | null>(null)
  const [p4Grace, setP4Grace]         = useState(false)
  const [lightningFlash, setLightningFlash] = useState(false)

  // Ending
  const [coinCount, setCoinCount]           = useState(0)
  const [starsShown, setStarsShown]         = useState(0)
  const [showScripture, setShowScripture]   = useState(false)
  const [showAdvance, setShowAdvance]       = useState(false)

  // Refs
  const earnedRef      = useRef(0)
  const affIdxRef      = useRef(0)
  const tilesRef       = useRef<TileS[]>(Array(24).fill('neutral'))
  const answeredRef    = useRef<Dir[]>([])
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const rafRef         = useRef(0)
  const particlesRef   = useRef<Pt[]>([])
  const p1TimerIdRef   = useRef<number | null>(null)
  const lotClaimIdRef  = useRef<number | null>(null)
  const phaseRef       = useRef<Phase>('cinematic')

  // Canvas resize
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    setShakeClass('l18-shake'); setTimeout(() => setShakeClass(''), 700)
  }, [])

  const showAffirm = useCallback((text: string) => {
    setAffirm(text); setAffKey(k => k+1); setTimeout(() => setAffirm(null), 2200)
  }, [])

  const nextAffirm = useCallback(() => {
    const t = AFFIRMATIONS[affIdxRef.current % AFFIRMATIONS.length]
    affIdxRef.current++; return t
  }, [])

  const speak = useCallback((text: string, rate = 0.80, pitch = 1.0) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\bIS\b/g, 'is').replace(/\bUS\b/g, 'us')
      const u = new SpeechSynthesisUtterance(fixed); u.rate = rate; u.pitch = pitch; u.volume = 1
      window.speechSynthesis?.speak(u)
    } catch (_) {}
  }, [])

  const speakAffirm = useCallback((text: string) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\bIS\b/g, 'is').replace(/\bUS\b/g, 'us')
      const u = new SpeechSynthesisUtterance(fixed); u.rate = 0.88; u.pitch = 1.45; u.volume = 1
      window.speechSynthesis?.speak(u)
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
          const op = Math.pow(1 - p.life/p.max, 0.55) * 0.95
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r*4,   0, Math.PI*2)
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
    particlesRef.current.push(...mkBurst(cx, cy, cnt, hue)); runParticles()
  }, [runParticles])

  const fireBurst = useCallback((type: BurstT) => {
    if (type === 'white') {
      setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 1400)
      playWhiteBurst()
      for (let i = 0; i < 12; i++) {
        setTimeout(() => burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 80, 45+Math.random()*20), i*110)
      }
    } else {
      playGoldPop()
      burst(window.innerWidth/2, window.innerHeight/2, 100, type === 'amber' ? 120 : 45)
    }
  }, [burst])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
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
        speak('Two men. One land. One choice. You must fight for Abram!', 0.82, 0.92)
      }, 5200),
    ]
    return () => ts.forEach(clearTimeout)
  }, [phase, shake, speak])

  // ── PHASE 1: Land Grab Battle ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    const fresh: TileS[] = Array(24).fill('neutral')
    setTiles(fresh); tilesRef.current = [...fresh]
    setP1Timer(15); setP1Active(false); setP1Result(null); setFlashIdx(null)

    const startT = window.setTimeout(() => {
      setP1Active(true)

      // Countdown timer
      let t = 15
      p1TimerIdRef.current = window.setInterval(() => {
        t -= 1
        setP1Timer(t)
        if (t <= 0) {
          clearInterval(p1TimerIdRef.current!); p1TimerIdRef.current = null
          clearInterval(lotClaimIdRef.current!); lotClaimIdRef.current = null
          const goldCount  = tilesRef.current.filter(s => s === 'gold').length
          const greenCount = tilesRef.current.filter(s => s === 'green').length
          if (goldCount > greenCount) {
            addEarned(40); playGoldPop()
            for (let i = 0; i < 8; i++)
              setTimeout(() => burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 60, 45), i*120)
            setP1Result('win')
            const af = AFFIRMATIONS[affIdxRef.current % AFFIRMATIONS.length]; affIdxRef.current++
            speakAffirm(af); showAffirm(af)
          } else {
            setP1Result('loss')
            speak("Abram gave Lot first choice — but God had a bigger plan!", 0.80, 0.95)
          }
          setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 3600)
        }
      }, 1000)

      // Lot auto-claims neutral tiles
      lotClaimIdRef.current = window.setInterval(() => {
        setTiles(prev => {
          const neutrals = prev.map((s, i) => s === 'neutral' ? i : -1).filter(i => i >= 0)
          if (!neutrals.length) return prev
          const pick = neutrals[Math.floor(Math.random()*neutrals.length)]
          const next = [...prev]; next[pick] = 'green'
          tilesRef.current = next
          setRedFlash(true); setTimeout(() => setRedFlash(false), 280)
          return next
        })
      }, 1300)

    }, 1600)

    return () => {
      clearTimeout(startT)
      if (p1TimerIdRef.current)  { clearInterval(p1TimerIdRef.current);  p1TimerIdRef.current  = null }
      if (lotClaimIdRef.current) { clearInterval(lotClaimIdRef.current); lotClaimIdRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapTile = useCallback((idx: number) => {
    if (!p1Active || p1Result !== null) return
    setTiles(prev => {
      if (prev[idx] === 'gold') return prev
      const next = [...prev]; next[idx] = 'gold'; tilesRef.current = next; return next
    })
    setFlashIdx(idx); setTimeout(() => setFlashIdx(null), 280)
    playThud()
  }, [p1Active, p1Result])

  // ── PHASE 2: Lot's Fall ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Sub('building'); setCityFloors(0); setP2QIdx(0); setP2Sel(null); setP2Grace(false); setWallCracks(0)
    speak("Lot lifted his eyes and saw the whole plain of the Jordan. Beautiful. Lush. But was it wise?", 0.80, 0.95)
  }, [phase, speak])

  const handleP2Answer = useCallback((idx: number) => {
    if (p2Sel !== null || p2Grace) return
    setP2Sel(idx)
    const q = P2Q[p2QIdx]
    if (idx === q.ans) {
      addEarned(10); playConstruct()
      setCityFloors(f => f+1)
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      if (p2QIdx < P2Q.length - 1) {
        setTimeout(() => { setP2Sel(null); setP2QIdx(i => i+1) }, 1800)
      } else {
        // All 3 answered — city complete, then crumble
        setTimeout(() => {
          setP2Sub('built')
          setTimeout(() => {
            setP2Sub('crumbling'); playRumble(); shake()
            speak("But the men of Sodom were VERY wicked... sinning greatly against the LORD.", 0.72, 0.85)
            setTimeout(() => {
              setP2Sub('message')
              setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 4200)
            }, 3000)
          }, 2200)
        }, 1800)
      }
    } else {
      setWallCracks(c => Math.min(c+1, 3)); playBuzzer()
      setP2Grace(true); setP2Sel(null)
      setTimeout(() => setP2Grace(false), 2800)
    }
  }, [p2Sel, p2Grace, p2QIdx, addEarned, nextAffirm, speakAffirm, showAffirm, shake, speak])

  // ── PHASE 3: Survey the Promise ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    answeredRef.current = []
    setP3Sub('intro'); setGodLineIdx(0); setRevealedZones([]); setAnsweredZones([])
    setActiveDir(null); setP3Sel(null); setP3Grace(false); setMapBlaze(false)
    speak("After Lot left, God spoke to Abram.", 0.80, 0.95)
    const ts = [
      setTimeout(() => { setGodLineIdx(1); speak(GOD_LINES[0], 0.68, 0.85) }, 2000),
      setTimeout(() => { setGodLineIdx(2); speak(GOD_LINES[1], 0.68, 0.85) }, 4500),
      setTimeout(() => { setGodLineIdx(3); speak(GOD_LINES[2], 0.68, 0.85) }, 7000),
      setTimeout(() => { setP3Sub('explore'); playWhoosh() }, 9000),
    ]
    return () => ts.forEach(clearTimeout)
  }, [phase, speak])

  const tapDirection = useCallback((dir: Dir) => {
    if (activeDir !== null) return
    setRevealedZones(prev => prev.includes(dir) ? prev : [...prev, dir])
    addEarned(10); playGoldPop()
    const cx = dir === 'e' ? window.innerWidth*0.88 : dir === 'w' ? window.innerWidth*0.12 : window.innerWidth/2
    const cy = dir === 'n' ? window.innerHeight*0.14 : dir === 's' ? window.innerHeight*0.86 : window.innerHeight/2
    burst(cx, cy, 90, 45); shake()
    setTimeout(() => { setActiveDir(dir); setP3Sub('question'); setP3Sel(null); setP3Grace(false) }, 700)
  }, [activeDir, addEarned, burst, shake])

  const handleP3Answer = useCallback((idx: number) => {
    if (p3Sel !== null || p3Grace || activeDir === null) return
    setP3Sel(idx)
    const q = P3Q[activeDir]
    const dir = activeDir
    if (idx === q.ans) {
      addEarned(10); playGoldPop()
      burst(window.innerWidth/2, window.innerHeight/2, 80, 45); shake()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      setTimeout(() => {
        const updated = [...answeredRef.current, dir]
        answeredRef.current = updated
        setAnsweredZones(updated)
        setActiveDir(null); setP3Sel(null); setP3Sub('explore')
        if (updated.length === 4) {
          setTimeout(() => {
            setMapBlaze(true); playFanfare(); shake()
            for (let i = 0; i < 10; i++)
              setTimeout(() => burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 80, 45), i*130)
            speak("The promised land — ALL of it — is Abram's!", 0.76, 0.90)
            setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 5200)
          }, 600)
        }
      }, 2000)
    } else {
      setP3Grace(true); setP3Sel(null); playBuzzer()
      setTimeout(() => setP3Grace(false), 2800)
    }
  }, [p3Sel, p3Grace, activeDir, addEarned, burst, shake, nextAffirm, speakAffirm, showAffirm, speak])

  // ── PHASE 4: Generosity Verdict ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setTabletCount(0); setP4Sel(null); setP4Grace(false)
    speak("One final question. The greatest lesson of all.", 0.78, 0.88)
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        playLightning(); setLightningFlash(true); setTimeout(() => setLightningFlash(false), 350)
        setTabletCount(i+1)
      }, 1800 + i*900)
    }
  }, [phase, speak])

  const handleP4Answer = useCallback((idx: number) => {
    if (p4Sel !== null || p4Grace) return
    setP4Sel(idx)
    if (idx === P4Q.ans) {
      addEarned(60); fireBurst('white'); shake()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      speak(`${playerName} — YOU CHOSE LIKE ABRAM TODAY!`, 0.80, 1.1)
      setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4500)
    } else {
      setP4Grace(true); setP4Sel(null); playBuzzer()
      setTimeout(() => setP4Grace(false), 2800)
    }
  }, [p4Sel, p4Grace, addEarned, fireBurst, shake, nextAffirm, speakAffirm, showAffirm, speak, playerName])

  // ── ENDING ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ending') return
    playFanfare()
    const total = earnedRef.current; let current = 0
    const step  = Math.max(1, Math.ceil(total/60))
    const id    = setInterval(() => {
      current = Math.min(current+step, total)
      setCoinCount(current)
      if (current % Math.ceil(total/5) === 0 || current === total) playDing(0.8 + (current/total)*0.5)
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

  // Cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    window.speechSynthesis?.cancel()
    if (p1TimerIdRef.current)  clearInterval(p1TimerIdRef.current)
    if (lotClaimIdRef.current) clearInterval(lotClaimIdRef.current)
  }, [])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
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

  // Derived
  const goldCount  = tiles.filter(s => s === 'gold').length
  const greenCount = tiles.filter(s => s === 'green').length

  return (
    <div className={`l18-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l18-bg${cinStep >= 3 ? ' visible' : ''}`} />
      {cinStep === 3 && <div className="l18-bg-flash" />}
      {cinStep < 3   && <div className="l18-black" />}
      <canvas ref={canvasRef} className="l18-canvas" />
      {whiteBurst    && <div className="l18-white-burst" />}
      {redFlash      && <div className="l18-red-flash" />}
      {lightningFlash && <div className="l18-lightning-flash" />}

      {phase !== 'cinematic' && phase !== 'complete' && (
        <div className="l18-coin-hud"><CoinHUD coins={coins} /></div>
      )}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l18-cin">
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} className="l18-cin-coin"
              style={{ left: `${5+(i*6.8)%92}%`, animationDelay: `${(i*0.12)%1.2}s`, animationDuration: `${0.9+(i*0.07)%0.8}s` }}>
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

      {/* ── PHASE 1: Land Grab Battle ── */}
      {phase === 'phase1' && (
        <>
          <div className="l18-p1-header">
            <div className="l18-p1-banner">🐑 LAND GRAB BATTLE 🐄</div>
            {p1Active && !p1Result && (
              <div className={`l18-timer${p1Timer <= 5 ? ' urgent' : ''}`}>⏱️ {p1Timer}s</div>
            )}
          </div>

          {!p1Active && !p1Result && (
            <div className="l18-p1-intro">
              <div className="l18-p1-intro-text">
                ⚡ Tap tiles to claim them for ABRAM!<br />
                Before Lot's cattle steal them! ⚡
              </div>
            </div>
          )}

          {p1Active && !p1Result && (
            <>
              <div className="l18-army-left">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="l18-sheep" style={{ animationDelay: `${i*0.28}s` }}>🐑</span>
                ))}
              </div>
              <div className="l18-army-right">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="l18-cow" style={{ animationDelay: `${i*0.28}s` }}>🐄</span>
                ))}
              </div>
            </>
          )}

          <div className="l18-grid">
            {tiles.map((s, i) => (
              <button
                key={i}
                className={`l18-tile l18-tile-${s}${flashIdx === i ? ' flash' : ''}`}
                onClick={() => tapTile(i)}
                disabled={!p1Active || p1Result !== null || s === 'gold'}
              >
                {s === 'gold' ? '✨' : s === 'green' ? '🐄' : ''}
              </button>
            ))}
          </div>

          {p1Active && (
            <div className="l18-score-bar">
              <div className="l18-score-gold">🐑 Abram: {goldCount}</div>
              <div className="l18-vs">VS</div>
              <div className="l18-score-green">Lot: {greenCount} 🐄</div>
            </div>
          )}

          {p1Result === 'win' && (
            <div className="l18-p1-result win">
              <div className="l18-result-title">💥 YOU FOUGHT FOR ABRAM! 💥</div>
              <div className="l18-result-coins">+40 🪙</div>
            </div>
          )}
          {p1Result === 'loss' && (
            <div className="l18-p1-result loss">
              <div className="l18-result-title">Abram gave Lot first choice...</div>
              <div className="l18-result-sub">🙏 God had a BIGGER plan!</div>
            </div>
          )}
        </>
      )}

      {/* ── PHASE 2: Lot's Fall ── */}
      {phase === 'phase2' && (
        <div className="l18-p2-wrap">
          <div className="l18-p2-banner">🏗️ LOT'S FALL</div>

          <div className="l18-split">
            {/* Jordan Plain */}
            <div className={`l18-jordan${p2Sub === 'crumbling' || p2Sub === 'message' ? ' dark' : ''}`}>
              <div className="l18-jordan-label">🌿 THE JORDAN PLAIN</div>
              <div className="l18-city">
                {[0, 1, 2].map(f => (
                  <div
                    key={f}
                    className={`l18-floor${cityFloors > f ? ' built' : ''}${p2Sub === 'crumbling' ? ' crumble' : ''}${wallCracks > 0 && cityFloors > f ? ` cracked-${wallCracks}` : ''}`}
                    style={{ animationDelay: p2Sub === 'crumbling' ? `${f*0.22}s` : '0s' }}
                  >
                    {f === 2 ? '🏛️' : f === 1 ? '🏠' : '🏢'}
                  </div>
                ))}
              </div>
              {(p2Sub === 'crumbling') && (
                <div className="l18-cracks">
                  <div className="l18-crack l18-crack-a" />
                  <div className="l18-crack l18-crack-b" />
                  <div className="l18-crack l18-crack-c" />
                </div>
              )}
              {p2Sub === 'message' && (
                <div className="l18-lot-verdict">
                  <div className="l18-verdict-warn">⚠️ "The men of Sodom were VERY wicked..."</div>
                  <div className="l18-verdict-moral">Lot chose with his EYES.<br />Abram chose with his FAITH.</div>
                </div>
              )}
            </div>

            {/* Canaan hills */}
            <div className="l18-canaan">
              <div className="l18-canaan-label">⛰️ THE HILLS OF CANAAN</div>
              <div className="l18-abram-hills">🧙‍♂️</div>
              <div className="l18-hills-icons">⛰️🌿⛰️🌵⛰️</div>
            </div>
          </div>

          {p2Sub === 'building' && (
            <div className="l18-q-card">
              <div className="l18-q-label">QUESTION {p2QIdx+1} OF 3 — BUILD THE CITY!</div>
              <p className="l18-q-text">{P2Q[p2QIdx].text}</p>
              <div className="l18-opts">
                {P2Q[p2QIdx].opts.map((opt, i) => (
                  <button
                    key={i}
                    className={`l18-opt${p2Sel === i ? (i === P2Q[p2QIdx].ans ? ' correct' : ' wrong') : ''}`}
                    disabled={p2Sel !== null || p2Grace}
                    onClick={() => handleP2Answer(i)}
                  >{opt}</button>
                ))}
              </div>
              {p2Grace && <div className="l18-grace">✨ Think about what the Bible says — try again!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: Survey the Promise ── */}
      {phase === 'phase3' && (
        <div className={`l18-p3-wrap${mapBlaze ? ' blaze' : ''}`}>
          <div className="l18-p3-banner">🗺️ SURVEY THE PROMISE</div>
          <div className="l18-abram-hill">🧙‍♂️</div>

          <div className="l18-god-words">
            {GOD_LINES.slice(0, godLineIdx).map((line, i) => (
              <div key={i} className="l18-god-line">{line}</div>
            ))}
          </div>

          {(p3Sub === 'explore' || p3Sub === 'question') && !mapBlaze && (
            <div className="l18-fog-map">
              {/* Fog quadrants */}
              {(['n','s','w','e'] as Dir[]).map(dir => (
                !revealedZones.includes(dir) && (
                  <div key={dir} className={`l18-fog-cell l18-fog-${dir}`} />
                )
              ))}

              {/* Zone buttons */}
              {DIR_ORDER.map(dir => {
                const revealed  = revealedZones.includes(dir)
                const answered  = answeredZones.includes(dir)
                const isActiveQ = activeDir === dir
                return (
                  <button
                    key={dir}
                    className={`l18-zone l18-zone-${dir}${revealed ? ' revealed' : ' pulse'}${answered ? ' answered' : ''}${isActiveQ ? ' active-q' : ''}`}
                    onClick={() => !revealed && activeDir === null ? tapDirection(dir) : undefined}
                    disabled={revealed || activeDir !== null}
                  >
                    {answered ? '✅' : DIR_LABEL[dir]}
                  </button>
                )
              })}

              <div className="l18-fog-abram">🧙‍♂️</div>
              <div className="l18-fog-hint">
                {answeredZones.length < 4
                  ? `Tap a direction to explore! (${answeredZones.length}/4 revealed)`
                  : '✨ ALL DIRECTIONS CLAIMED!'}
              </div>
            </div>
          )}

          {mapBlaze && (
            <div className="l18-map-blaze">
              <div className="l18-blaze-text">THE PROMISED LAND —<br />ALL OF IT — IS ABRAM'S! 🌟</div>
              <div className="l18-blaze-glow" />
            </div>
          )}

          {activeDir && (
            <div className="l18-q-card l18-q-float">
              <div className="l18-q-label">{DIR_LABEL[activeDir]} — QUICK QUESTION! +10 🪙</div>
              <p className="l18-q-text">{P3Q[activeDir].text}</p>
              <div className="l18-opts">
                {P3Q[activeDir].opts.map((opt, i) => (
                  <button
                    key={i}
                    className={`l18-opt${p3Sel === i ? (i === P3Q[activeDir].ans ? ' correct' : ' wrong') : ''}`}
                    disabled={p3Sel !== null || p3Grace}
                    onClick={() => handleP3Answer(i)}
                  >{opt}</button>
                ))}
              </div>
              {p3Grace && <div className="l18-grace">✨ Almost! Think about what God promised — try again!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 4: Generosity Verdict ── */}
      {phase === 'phase4' && (
        <div className="l18-p4-wrap">
          <div className="l18-p4-sky" />
          <div className="l18-lightning-bg">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`l18-bolt l18-bolt-${i}`} />
            ))}
          </div>
          <div className="l18-p4-title">⚡ THE FINAL VERDICT ⚡</div>
          <div className="l18-p4-q">{P4Q.text}</div>
          <div className="l18-tablets">
            {P4Q.opts.map((opt, i) => (
              <button
                key={i}
                className={`l18-tablet${i < tabletCount ? ' visible' : ''}${p4Sel === i ? (i === P4Q.ans ? ' shatter' : ' wrong-tablet') : ''}`}
                disabled={i >= tabletCount || p4Sel !== null || p4Grace}
                onClick={() => handleP4Answer(i)}
              >
                <span className="l18-tablet-letter">{String.fromCharCode(65+i)}</span>
                <span className="l18-tablet-text">{opt}</span>
              </button>
            ))}
          </div>
          {p4Grace && (
            <div className="l18-p4-grace">
              ✨ Think about what Abram's generosity reveals... try again!
            </div>
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <>
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="l18-end-coin"
              style={{ left: `${4+(i*4.6)%92}%`, animationDuration: `${1.2+(i*0.15)%1.5}s`, animationDelay: `${(i*0.08)%0.9}s` }}>
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
            <button className="l18-advance-btn"
              onClick={() => { phaseRef.current = 'complete'; setPhase('complete') }}>
              ADVANCE TO LEVEL 1-19 ➡️
            </button>
          )}
        </>
      )}

      {affirm && <div key={affKey} className="l18-affirm">{affirm}</div>}
    </div>
  )
}
