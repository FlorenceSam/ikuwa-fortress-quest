import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level21.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase  = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P2Sub  = 'footprints' | 'spring' | 'question'
type P3Sub  = 'angel' | 'questions'
type P4Sub  = 'elroi' | 'question'
type RoundT = 'yn' | 'tf' | 'mc'

interface Round { type: RoundT; q: string; opts: string[]; ans: number }

// ── Data ──────────────────────────────────────────────────────────────────────
const P1_ROUNDS: Round[] = [
  { type:'yn', q:'Did Sarai have any children?',
    opts:['YES','NO'], ans:1 },
  { type:'tf', q:"Sarai gave Hagar to Abram hoping the child would count as her own.",
    opts:['TRUE','FALSE'], ans:0 },
  { type:'mc', q:'What happened when Hagar became pregnant?',
    opts:['She began to despise Sarai','She ran away immediately','She celebrated with Sarai','She returned to Egypt'], ans:0 },
  { type:'yn', q:'Did Abram give Sarai full authority over Hagar?',
    opts:['YES','NO'], ans:0 },
]

const P2_MID_Q: Round = {
  type:'tf',
  q:'Hagar was heading toward Egypt, her homeland.',
  opts:['TRUE','FALSE'], ans:0,
}

const P3_ROUNDS: Round[] = [
  { type:'mc', q:"What did the angel call Hagar?",
    opts:['Servant of Sarai','Queen of the desert','Daughter of Egypt','Woman of faith'], ans:0 },
  { type:'yn', q:"Does Ishmael mean 'God has heard'?",
    opts:['YES','NO'], ans:0 },
  { type:'mc', q:'What did the angel tell Hagar to do?',
    opts:['Return to Sarai and submit','Keep running to Egypt','Stay at the spring forever','Find a new husband'], ans:0 },
]

const P4_Q: Round = {
  type:'tf',
  q:'Hagar is the only person in the Bible who gives God a personal name.',
  opts:['TRUE','FALSE'], ans:0,
}

const AFFIRMATIONS = [
  'SMARTNESS OVERLOAD!',
  'BRAIN LIKE A MAINFRAME!',
  'BRAIN LIKE A SAINT!',
  'YOUR BRAIN IS GLOWING!',
  'WISDOM OVERFLOW!',
  "THAT'S THE GOOD WISDOM!",
  'BIG BRAIN ENERGY!',
  'SMART LIKE SOLOMON!',
  "THAT'S WISDOM SPEAKING!",
  'KNOWLEDGE BOMB!',
]

const TOTAL_STEPS = 10

// ── Audio ─────────────────────────────────────────────────────────────────────
function playSoftWind() {
  try {
    const c = new AudioContext()
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 2.5), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i / d.length; d[i] = (Math.random() * 2 - 1) * 0.18 * t * (1 - t) * 4
    }
    const src = c.createBufferSource(); src.buffer = buf
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 600
    const g = c.createGain(); g.gain.setValueAtTime(0, c.currentTime)
    g.gain.linearRampToValueAtTime(0.5, c.currentTime + 1)
    g.gain.linearRampToValueAtTime(0, c.currentTime + 2.5)
    src.connect(filt); filt.connect(g); g.connect(c.destination); src.start()
  } catch (_) {}
}
function playGoldExplosion() {
  try {
    const c = new AudioContext()
    ;[110,220,330,440,550,880].forEach((f,i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.04)
      g.gain.linearRampToValueAtTime(0.20, c.currentTime + i * 0.04 + 0.08)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.04 + 1.4)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.04); o.stop(c.currentTime + i * 0.04 + 1.6)
    })
    const o2 = c.createOscillator(); const g2 = c.createGain()
    o2.type = 'sine'; o2.frequency.setValueAtTime(80, c.currentTime)
    o2.frequency.exponentialRampToValueAtTime(18, c.currentTime + 1.2)
    g2.gain.setValueAtTime(0.6, c.currentTime); g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.8)
    o2.connect(g2); g2.connect(c.destination); o2.start(); o2.stop(c.currentTime + 2)
  } catch (_) {}
}
function playWhiteBurstSound() {
  try {
    const c = new AudioContext()
    ;[110,165,220,330,440,660,880,1320].forEach((f,i) => {
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
function playHolyChime() {
  try {
    const c = new AudioContext()
    ;[261.6,329.6,392.0,523.3,659.3,784.0].forEach((f,i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.22)
      g.gain.linearRampToValueAtTime(0.10, c.currentTime + i * 0.22 + 0.5)
      g.gain.linearRampToValueAtTime(0.10, c.currentTime + 4.5)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 6.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.22); o.stop(c.currentTime + 7)
    })
  } catch (_) {}
}
function playDustPuff() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(200, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.15)
    g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.25)
  } catch (_) {}
}
function playGoldPop() {
  try {
    const c = new AudioContext()
    ;[330,415,523,659].forEach((f,i) => {
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
function playBuzzer() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(180, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.35)
    g.gain.setValueAtTime(0.4, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5)
  } catch (_) {}
}
function playFanfare() {
  try {
    const c = new AudioContext()
    ;[261,330,392,523,659,784,1047].forEach((f,i) => {
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
function playElRoiPulse() {
  try {
    const c = new AudioContext()
    ;[174.6,220,261.6,349.2].forEach((f,i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i * 0.4)
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + i * 0.4 + 0.6)
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + i * 0.4 + 2.0)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.4 + 3.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i * 0.4); o.stop(c.currentTime + i * 0.4 + 4)
    })
  } catch (_) {}
}

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt { x:number;y:number;vx:number;vy:number;r:number;life:number;max:number;hue:number }
function mkBurst(cx:number,cy:number,cnt:number,hue=45): Pt[] {
  return Array.from({length:cnt},()=>{
    const a = Math.random() * Math.PI * 2; const s = Math.random() * 10 + 2
    return { x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,r:Math.random()*3+1,life:0,max:Math.random()*70+50,hue }
  })
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props { onComplete:()=>void; onFail?:(h:string)=>void; showHint?:boolean }

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level21({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Scholar'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [affirm, setAffirm]         = useState<string|null>(null)
  const [affKey, setAffKey]         = useState(0)
  const [whiteBurst, setWhiteBurst] = useState(false)

  // Cinematic
  const [cinStep, setCinStep]       = useState(0)

  // Phase 1
  const [p1Round, setP1Round]       = useState(0)
  const [p1Sel, setP1Sel]           = useState<number|null>(null)
  const [p1Grace, setP1Grace]       = useState(false)

  // Phase 2
  const [p2Sub, setP2Sub]           = useState<P2Sub>('footprints')
  const [stepsDone, setStepsDone]   = useState(0)
  const [stepActive, setStepActive] = useState(false)
  const [p2QSel, setP2QSel]         = useState<number|null>(null)
  const [p2QGrace, setP2QGrace]     = useState(false)
  const [midQShown, setMidQShown]   = useState(false)
  const [footPos, setFootPos]       = useState<{x:number;y:number}>({x:50,y:60})

  // Phase 3
  const [p3Sub, setP3Sub]           = useState<P3Sub>('angel')
  const [angelStep, setAngelStep]   = useState(0)
  const [p3Round, setP3Round]       = useState(0)
  const [p3Sel, setP3Sel]           = useState<number|null>(null)
  const [p3Grace, setP3Grace]       = useState(false)

  // Phase 4
  const [p4Sub, setP4Sub]           = useState<P4Sub>('elroi')
  const [elroiStep, setElroiStep]   = useState(0)
  const [elroiTapped, setElroiTapped] = useState(false)
  const [p4Sel, setP4Sel]           = useState<number|null>(null)
  const [p4Grace, setP4Grace]       = useState(false)

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
  const stepsDoneRef = useRef(0)

  // Canvas resize
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const r = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    r(); window.addEventListener('resize', r)
    return () => { window.removeEventListener('resize', r); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    setShakeClass('l21-shake'); setTimeout(() => setShakeClass(''), 700)
  }, [])

  const showAffirm = useCallback((t:string) => {
    setAffirm(t); setAffKey(k => k + 1); setTimeout(() => setAffirm(null), 2400)
  }, [])

  const nextAffirm = useCallback(() => {
    const t = AFFIRMATIONS[affIdxRef.current % AFFIRMATIONS.length]
    affIdxRef.current++; return t
  }, [])

  const speak = useCallback((text:string, rate=0.80, pitch=1.0) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())
      const u = new SpeechSynthesisUtterance(fixed); u.rate = rate; u.pitch = pitch; u.volume = 1
      window.speechSynthesis?.speak(u)
    } catch (_) {}
  }, [])

  const speakAffirm = useCallback((text:string) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())
      const u = new SpeechSynthesisUtterance(fixed); u.rate = 0.90; u.pitch = 1.42; u.volume = 1
      window.speechSynthesis?.speak(u)
    } catch (_) {}
  }, [])

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

  const burst = useCallback((cx:number, cy:number, cnt=80, hue=45) => {
    particlesRef.current.push(...mkBurst(cx, cy, cnt, hue)); runParticles()
  }, [runParticles])

  const fireBurstWhite = useCallback(() => {
    setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 1400)
    for (let i = 0; i < 12; i++)
      setTimeout(() => burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 80, 48 + Math.random() * 14), i * 110)
  }, [burst])

  const addEarned = useCallback((n:number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playSoftWind()
    const ts = [
      setTimeout(() => setCinStep(1), 800),
      setTimeout(() => setCinStep(2), 1800),
      setTimeout(() => { setCinStep(3); playSoftWind() }, 2700),
      setTimeout(() => { setCinStep(4); playGoldExplosion(); shake()
        for (let i = 0; i < 18; i++)
          setTimeout(() => burst(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.9, 55, 45 + i * 2), i * 120)
      }, 4200),
      setTimeout(() => setCinStep(5), 5000),
      setTimeout(() => setCinStep(6), 6000),
      setTimeout(() => {
        phaseRef.current = 'phase1'; setPhase('phase1')
        speak('Sarai had no children. But she had a plan. She gave her Egyptian servant Hagar to Abram as a wife.', 0.76, 0.88)
      }, 8200),
    ]
    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1: Sarai's Plan ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Round(0); setP1Sel(null); setP1Grace(false)
  }, [phase])

  const handleP1 = useCallback((idx:number) => {
    if (p1Sel !== null || p1Grace) return
    setP1Sel(idx)
    const round = P1_ROUNDS[p1Round]
    if (idx === round.ans) {
      const coins = p1Round <= 1 ? 15 : 20
      addEarned(coins); playGoldPop(); shake()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      setTimeout(() => {
        setP1Sel(null)
        if (p1Round < P1_ROUNDS.length - 1) {
          setP1Round(r => r + 1)
        } else {
          speak("Abram listened to Sarai. He gave full authority over Hagar — and Hagar conceived a child.", 0.76, 0.92)
          setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 4500)
        }
      }, 2000)
    } else {
      setP1Grace(true); setP1Sel(null); playBuzzer()
      setTimeout(() => setP1Grace(false), 2800)
    }
  }, [p1Sel, p1Grace, p1Round, addEarned, shake, nextAffirm, speakAffirm, showAffirm, speak])

  // ── PHASE 2: The Desert Run ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setP2Sub('footprints'); setStepsDone(0); stepsDoneRef.current = 0
    setStepActive(true); setMidQShown(false)
    setFootPos({ x: 10 + Math.random() * 60, y: 35 + Math.random() * 45 })
    speak('Hagar fled into the wilderness, heading toward her home in Egypt. Follow her path — tap each footprint!', 0.78, 0.88)
  }, [phase, speak])

  const tapFootprint = useCallback(() => {
    if (!stepActive) return
    const current = stepsDoneRef.current
    if (current >= TOTAL_STEPS) return

    playDustPuff()
    const W = window.innerWidth; const H = window.innerHeight
    const px = (footPos.x / 100) * W; const py = (footPos.y / 100) * H
    burst(px, py, 18, 35)

    const next = current + 1
    stepsDoneRef.current = next
    setStepsDone(next)

    if (next === 5 && !midQShown) {
      setMidQShown(true); setStepActive(false)
      setP2Sub('question')
      speak('Hagar was heading toward Egypt, her homeland. True or false?', 0.80)
    } else if (next >= TOTAL_STEPS) {
      setStepActive(false)
      setP2Sub('spring')
      addEarned(20)
      playGoldExplosion(); shake()
      for (let i = 0; i < 10; i++)
        setTimeout(() => burst(Math.random() * W, Math.random() * H * 0.9, 35, 200 + Math.random() * 40), i * 110)
      speak('She made it to the spring! God always knows where we are — even in the wilderness.', 0.76, 0.94)
      setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 4800)
    } else {
      setFootPos({ x: 10 + Math.random() * 60, y: 35 + Math.random() * 45 })
      addEarned(5)
    }
  }, [stepActive, footPos, midQShown, addEarned, burst, shake, speak])

  const handleP2Q = useCallback((idx:number) => {
    if (p2QSel !== null || p2QGrace) return
    setP2QSel(idx)
    if (idx === P2_MID_Q.ans) {
      addEarned(20); playGoldPop(); shake()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      speak('Yes! She was heading home to Egypt — but God had other plans!', 0.80)
      setTimeout(() => {
        setP2QSel(null); setP2Sub('footprints'); setStepActive(true)
        setFootPos({ x: 10 + Math.random() * 60, y: 35 + Math.random() * 45 })
      }, 2800)
    } else {
      setP2QGrace(true); setP2QSel(null); playBuzzer()
      setTimeout(() => setP2QGrace(false), 2800)
    }
  }, [p2QSel, p2QGrace, addEarned, shake, nextAffirm, speakAffirm, showAffirm, speak])

  // ── PHASE 3: The Angel Speaks ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Sub('angel'); setAngelStep(0); setP3Round(0); setP3Sel(null); setP3Grace(false)
    playHolyChime()
    speak('Complete silence fell. Then the angel of the Lord appeared — and called her by name.', 0.70, 0.88)
  }, [phase, speak])

  useEffect(() => {
    if (phase !== 'phase3' || p3Sub !== 'angel') return
    const ts = [
      setTimeout(() => setAngelStep(1), 2400),
      setTimeout(() => { setAngelStep(2); speak('Hagar...', 0.58, 0.82) }, 4000),
      setTimeout(() => setAngelStep(3), 5600),
      setTimeout(() => { setAngelStep(4); speak('Servant of Sarai — where have you come from, and where are you going?', 0.65, 0.85) }, 6800),
      setTimeout(() => setAngelStep(5), 9500),
      setTimeout(() => { setP3Sub('questions') }, 11000),
    ]
    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, p3Sub])

  const handleP3 = useCallback((idx:number) => {
    if (p3Sel !== null || p3Grace) return
    setP3Sel(idx)
    const round = P3_ROUNDS[p3Round]
    if (idx === round.ans) {
      addEarned(20); playGoldPop(); shake()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      setTimeout(() => {
        setP3Sel(null)
        if (p3Round < P3_ROUNDS.length - 1) {
          setP3Round(r => r + 1)
        } else {
          speak('The angel promised Hagar a son — Ishmael. God heard her crying. And then she did something no one else in the Bible ever did.', 0.72, 0.88)
          setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 5500)
        }
      }, 2000)
    } else {
      setP3Grace(true); setP3Sel(null); playBuzzer()
      setTimeout(() => setP3Grace(false), 2800)
    }
  }, [p3Sel, p3Grace, p3Round, addEarned, shake, nextAffirm, speakAffirm, showAffirm, speak])

  // ── PHASE 4: El Roi ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4Sub('elroi'); setElroiStep(0); setElroiTapped(false)
    setP4Sel(null); setP4Grace(false)
    playElRoiPulse()
    speak('She gave this name to the Lord who spoke to her.', 0.62, 0.86)
  }, [phase, speak])

  useEffect(() => {
    if (phase !== 'phase4' || p4Sub !== 'elroi') return
    const ts = [
      setTimeout(() => setElroiStep(1), 2500),
      setTimeout(() => setElroiStep(2), 5000),
      setTimeout(() => setElroiStep(3), 7000),
    ]
    return () => ts.forEach(clearTimeout)
  }, [phase, p4Sub])

  const tapElRoi = useCallback(() => {
    if (elroiTapped) return
    setElroiTapped(true)
    playGoldExplosion(); shake(); addEarned(40)
    const af = nextAffirm(); speakAffirm(af); showAffirm(af)
    const W = window.innerWidth; const H = window.innerHeight
    for (let i = 0; i < 16; i++)
      setTimeout(() => burst(Math.random() * W, Math.random() * H, 55, 45 + i * 3), i * 120)
    speak('El Roi! You are the God who SEES me! She named God herself — the only person in the whole Bible to do this.', 0.72, 1.0)
    setTimeout(() => setP4Sub('question'), 4500)
  }, [elroiTapped, addEarned, burst, shake, nextAffirm, speakAffirm, showAffirm, speak])

  const handleP4Q = useCallback((idx:number) => {
    if (p4Sel !== null || p4Grace) return
    setP4Sel(idx)
    if (idx === P4_Q.ans) {
      addEarned(60); playWhiteBurstSound(); shake()
      fireBurstWhite()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      speak(`${playerName} — your brain is glowing! Hagar is the ONLY person in Scripture to name God. El Roi — the God who sees!`, 0.74, 1.0)
      setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 5500)
    } else {
      setP4Grace(true); setP4Sel(null); playBuzzer()
      setTimeout(() => setP4Grace(false), 2800)
    }
  }, [p4Sel, p4Grace, addEarned, fireBurstWhite, shake, nextAffirm, speakAffirm, showAffirm, speak, playerName])

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
    const ts = [
      setTimeout(() => setStarsShown(1), 1400),
      setTimeout(() => setStarsShown(2), 2100),
      setTimeout(() => setStarsShown(3), 2800),
      setTimeout(() => {
        setShowScripture(true)
        speak('"You are the God who sees me." — Genesis 16 verse 13', 0.74, 0.88)
      }, 3600),
      setTimeout(() => setShowAdvance(true), 6200),
    ]
    return () => { clearInterval(id); ts.forEach(clearTimeout) }
  }, [phase, speak])

  // Cleanup
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse='You are the God who sees me.'
        verseRef='Genesis 16:13'
        subtitle={`${playerName} — you are seen by God today`}
        voiceLine={`${playerName}. You just learned something beautiful. Hagar — alone, afraid, forgotten — gave God a name. El Roi. The God who sees. And He sees YOU too.`}
        onComplete={onComplete}
      />
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className={`l21-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l21-bg${cinStep >= 4 ? ' visible' : ''}`} />
      {cinStep < 4 && <div className="l21-black" />}
      <canvas ref={canvasRef} className="l21-canvas" />
      {whiteBurst && <div className="l21-white-burst" />}

      {/* HUD */}
      {phase !== 'cinematic' && phase !== 'complete' && (
        <div className="l21-coin-hud"><CoinHUD coins={coins} /></div>
      )}
      {phase !== 'cinematic' && phase !== 'complete' && (
        <div className="l21-level-label">1-21 SEEN</div>
      )}

      {/* Affirm toast */}
      {affirm && <div key={affKey} className="l21-affirm">{affirm}</div>}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l21-cin">
          {cinStep >= 1 && <div className="l21-cin-line l21-cin-l1">She ran.</div>}
          {cinStep >= 2 && <div className="l21-cin-line l21-cin-l2">Alone.</div>}
          {cinStep >= 3 && <div className="l21-cin-line l21-cin-l3">Into the wilderness.</div>}
          {cinStep >= 5 && (
            <div className="l21-title-card">
              <div className="l21-title-eye">👁️</div>
              <div className="l21-title-word">SEEN</div>
              <div className="l21-title-eye">👁️</div>
            </div>
          )}
          {cinStep >= 6 && <div className="l21-title-sub">The God who finds you.</div>}
        </div>
      )}

      {/* ── PHASE 1: Sarai's Plan ── */}
      {phase === 'phase1' && (
        <div className="l21-phase-wrap">
          <div className="l21-phase-header">
            <div className="l21-phase-badge">PHASE 1</div>
            <div className="l21-phase-title">SARAI'S PLAN</div>
          </div>

          <div className="l21-q-card">
            <div className="l21-round-label">
              {P1_ROUNDS[p1Round].type === 'yn' ? 'YES OR NO?' : P1_ROUNDS[p1Round].type === 'tf' ? 'TRUE OR FALSE?' : 'WHICH ONE?'}
            </div>
            <p className="l21-q-text">{P1_ROUNDS[p1Round].q}</p>

            {P1_ROUNDS[p1Round].type === 'yn' && (
              <div className="l21-yn-row">
                {P1_ROUNDS[p1Round].opts.map((o,i) => (
                  <button key={i} disabled={p1Sel !== null || p1Grace}
                    className={`l21-yn-btn${p1Sel === i ? (i === P1_ROUNDS[p1Round].ans ? ' correct' : ' wrong') : ''}`}
                    onClick={() => handleP1(i)}>{o}</button>
                ))}
              </div>
            )}
            {P1_ROUNDS[p1Round].type === 'tf' && (
              <div className="l21-tf-row">
                {P1_ROUNDS[p1Round].opts.map((o,i) => (
                  <button key={i} disabled={p1Sel !== null || p1Grace}
                    className={`l21-tf-tablet${p1Sel === i ? (i === P1_ROUNDS[p1Round].ans ? ' correct' : ' wrong') : ''}`}
                    onClick={() => handleP1(i)}>{o}</button>
                ))}
              </div>
            )}
            {P1_ROUNDS[p1Round].type === 'mc' && (
              <div className="l21-mc-opts">
                {P1_ROUNDS[p1Round].opts.map((o,i) => (
                  <button key={i} disabled={p1Sel !== null || p1Grace}
                    className={`l21-mc-opt${p1Sel === i ? (i === P1_ROUNDS[p1Round].ans ? ' correct' : ' wrong') : ''}`}
                    onClick={() => handleP1(i)}>{o}</button>
                ))}
              </div>
            )}
            {p1Grace && <div className="l21-grace">✨ Read the passage again — try once more!</div>}
          </div>

          <div className="l21-scene-icon">👩‍🦱👨‍🦳👧🏾</div>
        </div>
      )}

      {/* ── PHASE 2: The Desert Run ── */}
      {phase === 'phase2' && (
        <div className="l21-phase-wrap l21-desert">
          <div className="l21-phase-header">
            <div className="l21-phase-badge">PHASE 2</div>
            <div className="l21-phase-title">THE DESERT RUN</div>
          </div>

          {p2Sub === 'footprints' && (
            <>
              <div className="l21-step-hud">
                Step {Math.min(stepsDone + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
              </div>
              <div className="l21-step-progress">
                {Array.from({length: TOTAL_STEPS}, (_,i) => (
                  <div key={i} className={`l21-step-dot${i < stepsDone ? ' done' : ''}`} />
                ))}
              </div>

              {stepActive && (
                <button
                  className="l21-footprint"
                  style={{ left: footPos.x + '%', top: footPos.y + '%' }}
                  onClick={tapFootprint}
                >
                  👣
                </button>
              )}

              <div className="l21-desert-scene">
                <div className="l21-hagar-runner">🏃🏾‍♀️</div>
                <div className="l21-spring-far">💧</div>
              </div>
            </>
          )}

          {p2Sub === 'question' && (
            <div className="l21-q-card l21-midq">
              <div className="l21-round-label">MID-JOURNEY QUESTION — TRUE OR FALSE?</div>
              <p className="l21-q-text">{P2_MID_Q.q}</p>
              <div className="l21-tf-row">
                {P2_MID_Q.opts.map((o,i) => (
                  <button key={i} disabled={p2QSel !== null || p2QGrace}
                    className={`l21-tf-tablet${p2QSel === i ? (i === P2_MID_Q.ans ? ' correct' : ' wrong') : ''}`}
                    onClick={() => handleP2Q(i)}>{o}</button>
                ))}
              </div>
              {p2QGrace && <div className="l21-grace">✨ Think about where Hagar was from — try again!</div>}
            </div>
          )}

          {p2Sub === 'spring' && (
            <div className="l21-spring-banner">
              <div className="l21-spring-emoji">💧🌊💧</div>
              <div className="l21-spring-text">SHE MADE IT TO THE SPRING!</div>
              <div className="l21-spring-sub">God always knows where we are.</div>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: The Angel Speaks ── */}
      {phase === 'phase3' && (
        <div className="l21-phase-wrap l21-angel-scene">
          <div className="l21-phase-header">
            <div className="l21-phase-badge">PHASE 3</div>
            <div className="l21-phase-title">THE ANGEL SPEAKS</div>
          </div>

          {p3Sub === 'angel' && (
            <div className="l21-angel-wrap">
              {angelStep >= 1 && <div className="l21-angel-icon">👼</div>}
              {angelStep >= 2 && <div className="l21-angel-ray l21-ray1" />}
              {angelStep >= 2 && <div className="l21-angel-ray l21-ray2" />}
              {angelStep >= 3 && (
                <div className="l21-angel-speech l21-speech-1">
                  "HAGAR, SERVANT OF SARAI,"
                </div>
              )}
              {angelStep >= 4 && (
                <div className="l21-angel-speech l21-speech-2">
                  "WHERE HAVE YOU COME FROM?"
                </div>
              )}
              {angelStep >= 5 && (
                <div className="l21-angel-speech l21-speech-3">
                  "WHERE ARE YOU GOING?"
                </div>
              )}
            </div>
          )}

          {p3Sub === 'questions' && (
            <div className="l21-q-card">
              <div className="l21-round-label">
                {P3_ROUNDS[p3Round].type === 'mc' ? 'WHICH ONE?' : 'YES OR NO?'}
              </div>
              <p className="l21-q-text">{P3_ROUNDS[p3Round].q}</p>

              {P3_ROUNDS[p3Round].type === 'mc' && (
                <div className="l21-mc-opts">
                  {P3_ROUNDS[p3Round].opts.map((o,i) => (
                    <button key={i} disabled={p3Sel !== null || p3Grace}
                      className={`l21-mc-opt${p3Sel === i ? (i === P3_ROUNDS[p3Round].ans ? ' correct' : ' wrong') : ''}`}
                      onClick={() => handleP3(i)}>{o}</button>
                  ))}
                </div>
              )}
              {P3_ROUNDS[p3Round].type === 'yn' && (
                <div className="l21-yn-row">
                  {P3_ROUNDS[p3Round].opts.map((o,i) => (
                    <button key={i} disabled={p3Sel !== null || p3Grace}
                      className={`l21-yn-btn${p3Sel === i ? (i === P3_ROUNDS[p3Round].ans ? ' correct' : ' wrong') : ''}`}
                      onClick={() => handleP3(i)}>{o}</button>
                  ))}
                </div>
              )}
              {p3Grace && <div className="l21-grace">✨ Think carefully — the angel's exact words!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 4: El Roi ── */}
      {phase === 'phase4' && (
        <div className="l21-phase-wrap l21-elroi-scene">
          <div className="l21-elroi-glow" />

          {p4Sub === 'elroi' && (
            <div className="l21-elroi-wrap">
              {elroiStep >= 1 && (
                <div className="l21-elroi-text-1">
                  She gave this name to the LORD:
                </div>
              )}
              {elroiStep >= 2 && !elroiTapped && (
                <button className="l21-elroi-btn" onClick={tapElRoi}>
                  <span className="l21-elroi-eye">👁️</span>
                  <span className="l21-elroi-name">EL ROI</span>
                  <span className="l21-elroi-eye">👁️</span>
                </button>
              )}
              {elroiTapped && (
                <div className="l21-elroi-revealed">
                  <div className="l21-elroi-name-big">👁️ EL ROI 👁️</div>
                  <div className="l21-elroi-meaning">The God Who SEES Me</div>
                </div>
              )}
              {elroiStep >= 3 && !elroiTapped && (
                <div className="l21-elroi-prompt">TAP TO REVEAL GOD'S NAME</div>
              )}
              <div className="l21-ripple l21-rip1" />
              <div className="l21-ripple l21-rip2" />
              <div className="l21-ripple l21-rip3" />
            </div>
          )}

          {p4Sub === 'question' && (
            <div className="l21-q-card l21-final-boss">
              <div className="l21-round-label">⚡ LEGENDARY QUESTION — TRUE OR FALSE? ⚡</div>
              <p className="l21-q-text">{P4_Q.q}</p>
              <div className="l21-tf-row">
                {P4_Q.opts.map((o,i) => (
                  <button key={i} disabled={p4Sel !== null || p4Grace}
                    className={`l21-tf-tablet l21-tf-stone${p4Sel === i ? (i === P4_Q.ans ? ' correct' : ' wrong') : ''}`}
                    onClick={() => handleP4Q(i)}>{o}</button>
                ))}
              </div>
              {p4Grace && <div className="l21-grace">✨ Think about what makes Hagar unique in all of Scripture!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <div className="l21-ending-wrap">
          <div className="l21-ending-name">{playerName}</div>
          <div className="l21-ending-sub">YOU ARE SEEN BY GOD TODAY!</div>

          <div className="l21-stars-row">
            {starsShown >= 1 && <div className="l21-end-star l21-st1">⭐</div>}
            {starsShown >= 2 && <div className="l21-end-star l21-st2">⭐</div>}
            {starsShown >= 3 && <div className="l21-end-star l21-st3">⭐</div>}
          </div>

          <div className="l21-coin-tally">
            <span className="l21-coin-icon">🪙</span>
            <span className="l21-coin-num">{coinCount}</span>
            <span className="l21-coin-label">COINS EARNED</span>
          </div>

          {showScripture && (
            <div className="l21-scripture-card">
              <div className="l21-scripture-quote">
                "You are the God who sees me."
              </div>
              <div className="l21-scripture-ref">— Genesis 16:13</div>
            </div>
          )}

          {showAdvance && (
            <button className="l21-advance-btn" onClick={() => {
              phaseRef.current = 'complete'; setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-22 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
