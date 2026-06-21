import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level19.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase  = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub  = 'map' | 'result' | 'capture' | 'messenger'
type P2Sub  = 'wave' | 'timeout' | 'question' | 'freed'
type P3Sub  = 'text' | 'blessing' | 'blessingReveal' | 'question'
type BurstT = 'gold' | 'white'

// ── Data ──────────────────────────────────────────────────────────────────────
interface Q { text: string; opts: string[]; ans: number }

const WAVE_CFG = [
  { count: 6,  time: 8,  label: 'WAVE 1 OF 3',    coins: 30 },
  { count: 8,  time: 8,  label: 'WAVE 2 OF 3',    coins: 40 },
  { count: 10, time: 10, label: '⚡ FINAL WAVE ⚡', coins: 50 },
]

const P2Q: Q[] = [
  { text: 'How many trained men did Abram take into battle?',
    opts: ['318', '40', '1000', '12'], ans: 0 },
  { text: 'When did Abram launch his surprise attack?',
    opts: ['At night', 'At noon', 'At dawn', "He didn't attack"], ans: 0 },
]

const P3_NAR = [
  'And','Melchizedek...','King','of','Salem...',
  'brought','out','bread','and','wine.',
  'He','was','priest','of','God','Most','High.',
]
const BLESSING = [
  'BLESSED','BE','ABRAM','BY','GOD','MOST','HIGH,',
  'CREATOR','OF','HEAVEN','AND','EARTH.',
]

const P3Q: Q[] = [
  { text: "What was Melchizedek's title?",
    opts: ['King of Salem and Priest of God Most High','King of Egypt','One of the four kings',"Lot's servant"],
    ans: 0 },
  { text: 'What did Abram give Melchizedek?',
    opts: ['A tenth of everything (a tithe)','Gold and silver','Livestock','Nothing'],
    ans: 0 },
]

const P4Q: Q = {
  text: 'WHAT DID ABRAM SAY TO THE KING OF SODOM?',
  opts: [
    '"Deal! I\'ll take all the treasure!" 💰',
    '"Let me keep half at least." 🤝',
    '"I won\'t take even a sandal strap — so you can NEVER say you made Abram rich." 👟',
    '"I\'ll ask Melchizedek to decide."',
  ],
  ans: 2,
}

const AFFIRMATIONS = [
  'LEGEND STATUS SCHOLAR!',
  'MAIN CHARACTER ENERGY!',
  'THAT WAS A FLEX!',
  'STRAIGHT FIRE!',
  'UNBELIEVABLY SMART!',
  "YOU'RE BUILT DIFFERENT!",
  'OUT OF THE PARK!',
  "AND THAT'S THE TRUTH!",
  'BOOM! SHALOM!',
  'HALLELUJAH... AND WOW!',
]

// ── Audio ─────────────────────────────────────────────────────────────────────
function playWarDrum() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(85, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(32, c.currentTime + 0.22)
    g.gain.setValueAtTime(1.0, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5)
    const o2 = c.createOscillator(); const g2 = c.createGain()
    o2.type = 'square'; o2.frequency.value = 210
    g2.gain.setValueAtTime(0.5, c.currentTime)
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05)
    o2.connect(g2); g2.connect(c.destination); o2.start(); o2.stop(c.currentTime + 0.06)
  } catch (_) {}
}
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
function playClash() {
  try {
    const c = new AudioContext()
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.22), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i / d.length
      d[i] = (Math.random()*2-1) * Math.exp(-t*20) * (t < 0.01 ? t/0.01 : 1)
    }
    const src = c.createBufferSource(); src.buffer = buf
    const filt = c.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2800; filt.Q.value = 0.6
    const g = c.createGain(); g.gain.value = 0.9
    src.connect(filt); filt.connect(g); g.connect(c.destination); src.start()
  } catch (_) {}
}
function playBigClash() {
  try {
    playClash()
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'; o.frequency.value = 120
    g.gain.setValueAtTime(0.5, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3)
  } catch (_) {}
}
function playGoldPop() {
  try {
    const c = new AudioContext()
    ;[330,415,523,659].forEach((f, i) => {
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
    ;[261,330,392,523,659,784].forEach((f, i) => {
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
    ;[523,659,784,1047,1319].forEach((f, i) => {
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
function playChime(pitch = 1.0) {
  try {
    const c = new AudioContext()
    const base = 880 * pitch
    ;[base, base*1.25, base*1.5, base*2].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i*0.09)
      g.gain.linearRampToValueAtTime(0.16, c.currentTime + i*0.09 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i*0.09 + 0.9)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i*0.09); o.stop(c.currentTime + i*0.09 + 1.0)
    })
  } catch (_) {}
}
function playHolyChord() {
  try {
    const c = new AudioContext()
    ;[261.6, 329.6, 392.0, 523.3, 659.3].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i*0.18)
      g.gain.linearRampToValueAtTime(0.09, c.currentTime + i*0.18 + 0.4)
      g.gain.linearRampToValueAtTime(0.09, c.currentTime + 3.8)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 5.2)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i*0.18); o.stop(c.currentTime + 5.5)
    })
  } catch (_) {}
}
function playTreasureBurst() {
  try {
    const c = new AudioContext()
    ;[880,1108,1319,1760,2093].forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'triangle'; o.frequency.value = f
      g.gain.setValueAtTime(0, c.currentTime + i*0.04)
      g.gain.linearRampToValueAtTime(0.14, c.currentTime + i*0.04 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i*0.04 + 0.55)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + i*0.04); o.stop(c.currentTime + i*0.04 + 0.65)
    })
  } catch (_) {}
}

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt { x:number; y:number; vx:number; vy:number; r:number; life:number; max:number; hue:number }

function mkBurst(cx:number, cy:number, cnt:number, hue=45): Pt[] {
  return Array.from({length:cnt}, () => {
    const a = Math.random()*Math.PI*2; const s = Math.random()*10+2
    return {x:cx, y:cy, vx:Math.cos(a)*s, vy:Math.sin(a)*s-3, r:Math.random()*3+1, life:0, max:Math.random()*70+50, hue}
  })
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props { onComplete: () => void; onFail?: (h:string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level19({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Warrior'

  // Core
  const [phase, setPhase]           = useState<Phase>('cinematic')
  const [coins, setCoins]           = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [affirm, setAffirm]         = useState<string|null>(null)
  const [affKey, setAffKey]         = useState(0)
  const [whiteBurst, setWhiteBurst] = useState(false)
  const [redFlash, setRedFlash]     = useState(false)

  // Cinematic
  const [cinStep, setCinStep]       = useState(0)
  const [cinWordIdx, setCinWordIdx] = useState(0)

  // Phase 1
  const [p1Sub, setP1Sub]           = useState<P1Sub>('map')
  const [p1TimerKey, setP1TimerKey] = useState(0)
  const [p1Grace, setP1Grace]       = useState(false)
  const [p1Fires, setP1Fires]       = useState<{id:number;x:number;y:number}[]>([])

  // Phase 2
  const [p2Sub, setP2Sub]           = useState<P2Sub>('wave')
  const [waveNum, setWaveNum]       = useState(0)
  const [waveEnemies, setWaveEnemies] = useState<boolean[]>([])
  const [waveTimer, setWaveTimer]   = useState(0)
  const [waveQIdx, setWaveQIdx]     = useState(0)
  const [waveQSel, setWaveQSel]     = useState<number|null>(null)
  const [waveQGrace, setWaveQGrace] = useState(false)

  // Phase 3
  const [p3Sub, setP3Sub]           = useState<P3Sub>('text')
  const [narIdx, setNarIdx]         = useState(0)
  const [breadTapped, setBreadTapped] = useState(false)
  const [wineTapped, setWineTapped] = useState(false)
  const [blessWordIdx, setBlessWordIdx] = useState(0)
  const [p3QIdx, setP3QIdx]         = useState(0)
  const [p3Sel, setP3Sel]           = useState<number|null>(null)
  const [p3Grace, setP3Grace]       = useState(false)

  // Phase 4
  const [p4TabCount, setP4TabCount] = useState(0)
  const [p4Sel, setP4Sel]           = useState<number|null>(null)
  const [p4Grace, setP4Grace]       = useState(false)
  const [chestOpen, setChestOpen]   = useState(false)

  // Ending
  const [coinCount, setCoinCount]         = useState(0)
  const [starsShown, setStarsShown]       = useState(0)
  const [showScripture, setShowScripture] = useState(false)
  const [showAdvance, setShowAdvance]     = useState(false)

  // Refs
  const earnedRef         = useRef(0)
  const affIdxRef         = useRef(0)
  const waveTimerRef      = useRef<number|null>(null)
  const waveTimerActiveRef = useRef(false)
  const aliveRef          = useRef(0)
  const waveNumRef        = useRef(0)
  const fireIdRef         = useRef(0)
  const fireIntervalRef   = useRef<number|null>(null)
  const p1TimerOutRef     = useRef<number|null>(null)
  const canvasRef         = useRef<HTMLCanvasElement>(null)
  const rafRef            = useRef(0)
  const particlesRef      = useRef<Pt[]>([])
  const phaseRef          = useRef<Phase>('cinematic')

  // Canvas resize
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const r = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    r(); window.addEventListener('resize', r)
    return () => { window.removeEventListener('resize', r); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    setShakeClass('l19-shake'); setTimeout(() => setShakeClass(''), 700)
  }, [])

  const showAffirm = useCallback((t: string) => {
    setAffirm(t); setAffKey(k => k+1); setTimeout(() => setAffirm(null), 2300)
  }, [])

  const nextAffirm = useCallback(() => {
    const t = AFFIRMATIONS[affIdxRef.current % AFFIRMATIONS.length]
    affIdxRef.current++; return t
  }, [])

  const speak = useCallback((text: string, rate = 0.80, pitch = 1.0) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())
      const u = new SpeechSynthesisUtterance(fixed); u.rate = rate; u.pitch = pitch; u.volume = 1
      window.speechSynthesis?.speak(u)
    } catch (_) {}
  }, [])

  const speakAffirm = useCallback((text: string) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())
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

  const burst = useCallback((cx:number, cy:number, cnt=80, hue=45) => {
    particlesRef.current.push(...mkBurst(cx, cy, cnt, hue)); runParticles()
  }, [runParticles])

  const fireBurst = useCallback((type: BurstT) => {
    if (type === 'white') {
      setWhiteBurst(true); setTimeout(() => setWhiteBurst(false), 1400)
      playWhiteBurst()
      for (let i = 0; i < 12; i++)
        setTimeout(() => burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 80, 45+Math.random()*20), i*110)
    } else {
      playGoldPop()
      burst(window.innerWidth/2, window.innerHeight/2, 100, 45)
    }
  }, [burst])

  const addEarned = useCallback((n: number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current += n
  }, [])

  // ── Phase 1 fire explosions ───────────────────────────────────────────────
  const startFires = useCallback(() => {
    if (fireIntervalRef.current) return
    fireIntervalRef.current = window.setInterval(() => {
      const id = fireIdRef.current++
      const x  = Math.random()*82 + 8
      const y  = Math.random()*65 + 15
      setP1Fires(prev => [...prev, {id, x, y}])
      setTimeout(() => setP1Fires(prev => prev.filter(f => f.id !== id)), 900)
    }, 750)
  }, [])

  const stopFires = useCallback(() => {
    if (fireIntervalRef.current) { clearInterval(fireIntervalRef.current); fireIntervalRef.current = null }
    setP1Fires([])
  }, [])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    // Fire rain starts immediately
    startFires()
    const CIN_WORDS = ['WAR.', 'CHAOS.', 'LOT IS GONE.']
    const ts = [
      setTimeout(() => { playWarDrum(); setCinWordIdx(1) }, 600),
      setTimeout(() => { playWarDrum(); setCinWordIdx(2) }, 1500),
      setTimeout(() => { playWarDrum(); shake(); setCinWordIdx(3) }, 2400),
      setTimeout(() => { setCinStep(1) }, 3000),             // messenger runs
      setTimeout(() => { setCinStep(2); stopFires() }, 3900), // white flash
      setTimeout(() => { setCinStep(3) }, 4100),             // bg visible
      setTimeout(() => { setCinStep(4) }, 4500),             // title crashes in
      setTimeout(() => { setCinStep(5) }, 5100),             // subtitle rises
      setTimeout(() => {
        phaseRef.current = 'phase1'; setPhase('phase1')
        speak('Four kings against five. The valley was a battlefield. And Lot was caught in the middle.', 0.82, 0.92)
      }, 6400),
    ]
    void CIN_WORDS
    return () => { ts.forEach(clearTimeout); stopFires() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Sub('map'); setP1Grace(false); setP1TimerKey(k => k+1); startFires()

    // 10-second timer logic
    p1TimerOutRef.current = window.setTimeout(() => {
      if (phaseRef.current === 'phase1') {
        setP1Grace(true); setP1TimerKey(k => k+1)
        setTimeout(() => setP1Grace(false), 3000)
      }
    }, 10000)

    return () => {
      stopFires()
      if (p1TimerOutRef.current) clearTimeout(p1TimerOutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapKingSide = useCallback((side: 'left' | 'right') => {
    if (p1Sub !== 'map' || p1Grace) return
    if (p1TimerOutRef.current) { clearTimeout(p1TimerOutRef.current); p1TimerOutRef.current = null }
    stopFires()

    if (side === 'left') {
      // Correct — 4 kings won
      addEarned(30); playGoldPop()
      for (let i = 0; i < 6; i++)
        setTimeout(() => burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 60, 30), i*100)
      shake()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      setP1Sub('result')
      speak('The four kings crushed them! But in the chaos... Lot was taken.', 0.80, 0.95)
      setTimeout(() => { setP1Sub('capture') }, 3200)
      setTimeout(() => { setP1Sub('messenger') }, 6000)
      setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 9000)
    } else {
      // Wrong
      setP1Grace(true); playBuzzer()
      speak('Almost! The four kings actually overpowered the five — try again!', 0.80, 0.95)
      setP1TimerKey(k => k+1)
      startFires()
      p1TimerOutRef.current = window.setTimeout(() => {
        setP1Grace(true); setP1TimerKey(k => k+1)
        setTimeout(() => setP1Grace(false), 3000)
      }, 10000)
      setTimeout(() => setP1Grace(false), 3500)
    }
  }, [p1Sub, p1Grace, addEarned, burst, shake, nextAffirm, speakAffirm, showAffirm, speak, stopFires, startFires])

  // ── PHASE 2: Wave helper ──────────────────────────────────────────────────
  const startWave = useCallback((wIdx: number) => {
    const cfg = WAVE_CFG[wIdx]
    waveNumRef.current = wIdx
    aliveRef.current   = cfg.count
    setWaveNum(wIdx)
    setWaveEnemies(Array(cfg.count).fill(false))
    setWaveTimer(cfg.time)
    setWaveQSel(null); setWaveQGrace(false)
    setP2Sub('wave')

    let t = cfg.time
    waveTimerActiveRef.current = true
    waveTimerRef.current = window.setInterval(() => {
      t--; setWaveTimer(t)
      if (t <= 0) {
        clearInterval(waveTimerRef.current!); waveTimerRef.current = null
        waveTimerActiveRef.current = false
        if (aliveRef.current > 0) {
          // Timeout — show grace, restart
          playBuzzer(); setP2Sub('timeout')
          speak("Abram never gives up! Try this wave again — you've got this!", 0.80, 0.95)
          setTimeout(() => startWave(waveNumRef.current), 3000)
        }
      }
    }, 1000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak])

  // ── PHASE 2 entry ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2') return
    setWaveQIdx(0)
    speak('Abram heard that Lot was taken. Without hesitation... he called his men.', 0.80, 0.95)
    setTimeout(() => startWave(0), 2000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const tapEnemy = useCallback((idx: number) => {
    if (!waveTimerActiveRef.current || p2Sub !== 'wave') return
    setWaveEnemies(prev => {
      if (prev[idx]) return prev
      const next = [...prev]; next[idx] = true
      return next
    })
    aliveRef.current--

    const wn = waveNumRef.current
    if (wn === 2) { playBigClash() } else { playClash() }
    addEarned(5)
    burst(Math.random()*window.innerWidth*0.7 + window.innerWidth*0.15, Math.random()*window.innerHeight*0.5 + window.innerHeight*0.2, 20, 45)

    if (aliveRef.current === 0) {
      // All enemies tapped — wave cleared
      if (waveTimerRef.current) { clearInterval(waveTimerRef.current); waveTimerRef.current = null }
      waveTimerActiveRef.current = false

      playGoldPop(); shake()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)

      if (wn === 2) {
        // Final wave complete
        addEarned(50) // bonus
        setTimeout(() => {
          setP2Sub('freed')
          playFanfare()
          speak('LOT IS FREE! Abram recovered everything — every person, every possession.', 0.78, 0.96)
          for (let i = 0; i < 10; i++)
            setTimeout(() => burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 70, 45), i*140)
          setTimeout(() => { phaseRef.current = 'phase3'; setPhase('phase3') }, 6000)
        }, 800)
      } else {
        // Show question between waves
        setTimeout(() => {
          setP2Sub('question')
          setWaveQIdx(wn)
          speak(P2Q[wn].text, 0.82, 0.95)
        }, 800)
      }
    }
  }, [p2Sub, addEarned, burst, shake, nextAffirm, speakAffirm, showAffirm, speak])

  const handleWaveQ = useCallback((idx: number) => {
    if (waveQSel !== null || waveQGrace) return
    setWaveQSel(idx)
    const q = P2Q[waveQIdx]
    if (idx === q.ans) {
      addEarned(20); playGoldPop()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af); shake()
      setTimeout(() => {
        setWaveQSel(null)
        startWave(waveQIdx + 1)
      }, 2000)
    } else {
      setWaveQGrace(true); setWaveQSel(null); playBuzzer()
      setTimeout(() => setWaveQGrace(false), 2800)
    }
  }, [waveQSel, waveQGrace, waveQIdx, addEarned, nextAffirm, speakAffirm, showAffirm, shake, startWave])

  // ── PHASE 3: Melchizedek ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase3') return
    setP3Sub('text'); setNarIdx(0); setBreadTapped(false); setWineTapped(false)
    setBlessWordIdx(0); setP3QIdx(0); setP3Sel(null); setP3Grace(false)
    playHolyChord()
    speak('The battle is over. But the greatest moment is yet to come.', 0.78, 0.92)
  }, [phase, speak])

  // Narration word ticker
  useEffect(() => {
    if (phase !== 'phase3' || p3Sub !== 'text') return
    if (narIdx >= P3_NAR.length) {
      setTimeout(() => { setP3Sub('blessing'); playWhoosh() }, 900)
      return
    }
    const delay = narIdx === 0 ? 2200 : 420
    const t = setTimeout(() => setNarIdx(i => i+1), delay)
    return () => clearTimeout(t)
  }, [phase, p3Sub, narIdx])

  const tapBread = useCallback(() => {
    if (breadTapped) return
    setBreadTapped(true); playChime(1.0); addEarned(15)
    burst(window.innerWidth * 0.3, window.innerHeight * 0.5, 50, 45)
  }, [breadTapped, addEarned, burst])

  const tapWine = useCallback(() => {
    if (!breadTapped || wineTapped) return
    setWineTapped(true); playChime(1.25); addEarned(15)
    burst(window.innerWidth * 0.7, window.innerHeight * 0.5, 50, 280)
    // Start blessing text reveal
    setTimeout(() => {
      setP3Sub('blessingReveal')
      speak('Blessed be Abram by God Most High, Creator of heaven and earth.', 0.68, 0.88)
    }, 800)
  }, [breadTapped, wineTapped, addEarned, burst, speak])

  // Blessing word ticker
  useEffect(() => {
    if (phase !== 'phase3' || p3Sub !== 'blessingReveal') return
    if (blessWordIdx >= BLESSING.length) {
      setTimeout(() => { setP3Sub('question'); setP3QIdx(0) }, 1200)
      return
    }
    const t = setTimeout(() => setBlessWordIdx(i => i+1), 360)
    return () => clearTimeout(t)
  }, [phase, p3Sub, blessWordIdx])

  const handleP3Answer = useCallback((idx: number) => {
    if (p3Sel !== null || p3Grace) return
    setP3Sel(idx)
    const q = P3Q[p3QIdx]
    if (idx === q.ans) {
      addEarned(25); playGoldPop(); shake()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      if (p3QIdx === 0) {
        setTimeout(() => { setP3Sel(null); setP3QIdx(1) }, 2200)
      } else {
        setTimeout(() => { phaseRef.current = 'phase4'; setPhase('phase4') }, 2800)
      }
    } else {
      setP3Grace(true); setP3Sel(null); playBuzzer()
      setTimeout(() => setP3Grace(false), 2800)
    }
  }, [p3Sel, p3Grace, p3QIdx, addEarned, shake, nextAffirm, speakAffirm, showAffirm])

  // ── PHASE 4: Integrity Test ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase4') return
    setP4TabCount(0); setP4Sel(null); setP4Grace(false); setChestOpen(false)
    speak('After the battle, the King of Sodom came to Abram with a very tempting offer.', 0.80, 0.92)
    setTimeout(() => { setChestOpen(true); playTreasureBurst() }, 2500)
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        playWarDrum()
        setP4TabCount(i+1)
      }, 4200 + i*850)
    }
  }, [phase, speak])

  const handleP4Answer = useCallback((idx: number) => {
    if (p4Sel !== null || p4Grace) return
    setP4Sel(idx)
    if (idx === P4Q.ans) {
      addEarned(60); fireBurst('white'); shake()
      const af = nextAffirm(); speakAffirm(af); showAffirm(af)
      speak('Abram chose integrity over riches! Some things are worth more than gold.', 0.78, 1.0)
      setTimeout(() => { phaseRef.current = 'ending'; setPhase('ending') }, 4800)
    } else {
      setP4Grace(true); setP4Sel(null); playBuzzer()
      setTimeout(() => setP4Grace(false), 2800)
    }
  }, [p4Sel, p4Grace, addEarned, fireBurst, shake, nextAffirm, speakAffirm, showAffirm, speak])

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
        speak(
          '"I have raised my hand to the Lord, God Most High, Creator of heaven and earth." — Genesis 14:22',
          0.78, 0.90
        )
      }, 3500),
      setTimeout(() => setShowAdvance(true), 5800),
    ]
    return () => { clearInterval(id); ts.forEach(clearTimeout) }
  }, [phase, speak])

  // Cleanup
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    window.speechSynthesis?.cancel()
    if (waveTimerRef.current)  clearInterval(waveTimerRef.current)
    if (fireIntervalRef.current) clearInterval(fireIntervalRef.current)
    if (p1TimerOutRef.current) clearTimeout(p1TimerOutRef.current)
  }, [])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse='I have raised my hand to the LORD, God Most High, Creator of heaven and earth.'
        verseRef='Genesis 14:22'
        subtitle='Real heroes run toward danger — and choose integrity over riches'
        voiceLine={`${playerName}, you fought like Abram today. Loyal, fearless, and full of integrity. The kingdom belongs to people like you.`}
        onComplete={onComplete}
      />
    )
  }

  const curWaveCfg = WAVE_CFG[waveNum]

  return (
    <div className={`l19-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l19-bg${cinStep >= 3 ? ' visible' : ''}`} />
      {cinStep < 3 && <div className="l19-black" />}
      {cinStep === 2 && <div className="l19-bg-flash" />}
      {phase === 'phase2' && <div className="l19-night-overlay" />}
      {phase === 'phase3' && <div className="l19-holy-overlay" />}
      {phase === 'phase4' && <div className="l19-sodom-overlay" />}
      <canvas ref={canvasRef} className="l19-canvas" />
      {whiteBurst && <div className="l19-white-burst" />}
      {redFlash   && <div className="l19-red-flash" />}

      {/* Fire rain (cinematic + phase1) */}
      {p1Fires.map(f => (
        <div key={f.id} className="l19-fire-exp" style={{left:`${f.x}%`, top:`${f.y}%`}}>🔥</div>
      ))}

      {phase !== 'cinematic' && phase !== 'complete' && (
        <div className="l19-coin-hud"><CoinHUD coins={coins} /></div>
      )}

      {/* ── CINEMATIC ── */}
      {phase === 'cinematic' && (
        <div className="l19-cin">
          {/* Fire particles falling */}
          {Array.from({length:12}, (_, i) => (
            <div key={i} className="l19-cin-fire"
              style={{left:`${8+(i*7.5)%90}%`, animationDelay:`${(i*0.18)%1.4}s`, animationDuration:`${1.1+(i*0.09)%0.9}s`}}>
              🔥
            </div>
          ))}

          {/* Words slam in */}
          {cinWordIdx >= 1 && <div className="l19-cin-word w1">WAR.</div>}
          {cinWordIdx >= 2 && <div className="l19-cin-word w2">CHAOS.</div>}
          {cinWordIdx >= 3 && <div className="l19-cin-word w3">LOT IS GONE.</div>}

          {/* Messenger runs */}
          {cinStep >= 1 && cinStep < 2 && (
            <div className="l19-messenger">🏃</div>
          )}

          {/* Title card */}
          {cinStep >= 4 && (
            <div className="l19-title-card">
              <div className="l19-title-main">⚔️ THE RESCUE ⚔️</div>
            </div>
          )}
          {cinStep >= 5 && (
            <div className="l19-title-sub">318 men. One night. No fear.</div>
          )}
        </div>
      )}

      {/* ── PHASE 1: War of Kings ── */}
      {phase === 'phase1' && (
        <>
          <div className="l19-p1-hud">
            ⚔️ 4 KINGS vs 5 KINGS — TAP THE WINNING SIDE! ⚔️
          </div>

          {/* Timer bar */}
          {p1Sub === 'map' && (
            <div className="l19-timer-track">
              <div key={p1TimerKey} className="l19-timer-bar" />
            </div>
          )}

          {p1Sub === 'map' && (
            <div className="l19-battle-map">
              {/* Left — 4 kings (correct) */}
              <button className="l19-side l19-side-left" onClick={() => tapKingSide('left')} disabled={p1Grace}>
                <div className="l19-side-label red">⚔️ 4 KINGS</div>
                <div className="l19-kings-grid">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="l19-king red" style={{animationDelay:`${i*0.22}s`}}>👑</div>
                  ))}
                </div>
                <div className="l19-side-hint">TAP TO CHOOSE</div>
              </button>

              <div className="l19-vs-divider">VS</div>

              {/* Right — 5 kings (wrong) */}
              <button className="l19-side l19-side-right" onClick={() => tapKingSide('right')} disabled={p1Grace}>
                <div className="l19-side-label blue">⚔️ 5 KINGS</div>
                <div className="l19-kings-grid five">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className="l19-king blue" style={{animationDelay:`${i*0.18}s`}}>👑</div>
                  ))}
                </div>
                <div className="l19-side-hint">TAP TO CHOOSE</div>
              </button>
            </div>
          )}

          {p1Grace && (
            <div className="l19-grace-banner">
              ✨ Almost! The four kings actually overpowered the five — try again!
            </div>
          )}

          {p1Sub === 'result' && (
            <div className="l19-p1-result">
              <div className="l19-result-title">💥 THE FOUR KINGS CRUSHED THEM! 💥</div>
              <div className="l19-result-coins">+30 🪙</div>
            </div>
          )}

          {p1Sub === 'capture' && (
            <div className="l19-capture-scene">
              <div className="l19-lot-captured">
                <span className="l19-lot-icon">🧍</span>
                <span className="l19-chains">⛓️</span>
              </div>
              <div className="l19-capture-text">AND THEY TOOK LOT.</div>
            </div>
          )}

          {p1Sub === 'messenger' && (
            <div className="l19-messenger-scene">
              <div className="l19-scene-messenger">🏃</div>
              <div className="l19-messenger-text">
                A survivor escaped...<br />and ran to tell Abram.
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PHASE 2: 318 Warriors ── */}
      {phase === 'phase2' && (
        <>
          {/* Night stars */}
          {Array.from({length:20}, (_, i) => (
            <div key={i} className="l19-star-dot"
              style={{left:`${(i*5.1)%97}%`, top:`${(i*3.7)%35}%`, animationDelay:`${(i*0.4)%3}s`}} />
          ))}

          {(p2Sub === 'wave' || p2Sub === 'timeout') && (
            <>
              <div className="l19-wave-hud">
                <div className="l19-wave-label">{curWaveCfg.label}</div>
                <div className="l19-wave-timer-track">
                  <div className="l19-wave-timer-fill"
                    style={{width:`${(waveTimer/curWaveCfg.time)*100}%`}} />
                </div>
                <div className={`l19-wave-timer-num${waveTimer <= 3 ? ' urgent' : ''}`}>{waveTimer}s</div>
              </div>

              {/* Abram */}
              <div className="l19-abram-warrior">🧙‍♂️⚔️</div>

              {/* Enemy grid */}
              {p2Sub === 'wave' && (
                <div className="l19-enemy-grid" data-count={curWaveCfg.count}>
                  {waveEnemies.map((tapped, i) => (
                    <button
                      key={i}
                      className={`l19-enemy${tapped ? ' defeated' : ''}`}
                      onClick={() => tapEnemy(i)}
                      disabled={tapped}
                    >
                      {tapped ? '💨' : waveNum === 2 ? '👹' : '🗡️'}
                    </button>
                  ))}
                </div>
              )}

              {p2Sub === 'timeout' && (
                <div className="l19-timeout-msg">
                  ✨ Abram never gives up!<br />Try this wave again — you've got this!
                </div>
              )}

              {waveNum === 2 && p2Sub === 'wave' && (
                <div className="l19-boss-warn">⚡ FINAL WAVE — TAP FASTER!! ⚡</div>
              )}
            </>
          )}

          {p2Sub === 'question' && (
            <div className="l19-q-card">
              <div className="l19-q-label">BATTLE KNOWLEDGE CHECK! +20 🪙</div>
              <p className="l19-q-text">{P2Q[waveQIdx].text}</p>
              <div className="l19-opts">
                {P2Q[waveQIdx].opts.map((opt, i) => (
                  <button
                    key={i}
                    className={`l19-opt${waveQSel === i ? (i === P2Q[waveQIdx].ans ? ' correct' : ' wrong') : ''}`}
                    disabled={waveQSel !== null || waveQGrace}
                    onClick={() => handleWaveQ(i)}
                  >{opt}</button>
                ))}
              </div>
              {waveQGrace && <div className="l19-grace">✨ Good try — read carefully and try again!</div>}
            </div>
          )}

          {p2Sub === 'freed' && (
            <div className="l19-lot-freed">
              <div className="l19-freed-icon">🧍✨</div>
              <div className="l19-freed-title">LOT IS FREE!</div>
              <div className="l19-freed-sub">Abram recovered everything. Every person. Every possession.</div>
              <div className="l19-freed-coins">+50 🪙 BONUS!</div>
            </div>
          )}
        </>
      )}

      {/* ── PHASE 3: Melchizedek ── */}
      {phase === 'phase3' && (
        <div className="l19-p3-wrap">
          <div className="l19-holy-beams">
            {[0,1,2,3,4].map(i => <div key={i} className={`l19-beam l19-beam-${i}`} />)}
          </div>

          <div className="l19-melchizedek">🧝</div>

          {(p3Sub === 'text') && (
            <div className="l19-nar-words">
              {P3_NAR.slice(0, narIdx).map((w, i) => (
                <span key={i} className="l19-nar-w">{w} </span>
              ))}
            </div>
          )}

          {(p3Sub === 'blessing' || p3Sub === 'blessingReveal' || p3Sub === 'question') && (
            <div className="l19-blessing-items">
              <button
                className={`l19-bless-item bread${breadTapped ? ' tapped' : ''}`}
                onClick={tapBread}
                disabled={breadTapped}
              >
                <span className="l19-bless-icon">🍞</span>
                <span className="l19-bless-label">BREAD</span>
                {!breadTapped && <span className="l19-bless-hint">TAP FIRST</span>}
              </button>
              <button
                className={`l19-bless-item wine${wineTapped ? ' tapped' : ''}${!breadTapped ? ' locked' : ''}`}
                onClick={tapWine}
                disabled={!breadTapped || wineTapped}
              >
                <span className="l19-bless-icon">🍷</span>
                <span className="l19-bless-label">WINE</span>
                {breadTapped && !wineTapped && <span className="l19-bless-hint">TAP SECOND</span>}
              </button>
            </div>
          )}

          {(p3Sub === 'blessingReveal' || p3Sub === 'question') && (
            <div className="l19-blessing-text">
              {BLESSING.slice(0, blessWordIdx).map((w, i) => (
                <span key={i} className="l19-bless-w">{w} </span>
              ))}
            </div>
          )}

          {p3Sub === 'question' && (
            <div className="l19-q-card l19-q-float">
              <div className="l19-q-label">
                {p3QIdx === 0 ? '✨ QUESTION 1 OF 2 — +25 🪙' : '✨ QUESTION 2 OF 2 — +25 🪙'}
              </div>
              <p className="l19-q-text">{P3Q[p3QIdx].text}</p>
              <div className="l19-opts">
                {P3Q[p3QIdx].opts.map((opt, i) => (
                  <button
                    key={i}
                    className={`l19-opt${p3Sel === i ? (i === P3Q[p3QIdx].ans ? ' correct' : ' wrong') : ''}`}
                    disabled={p3Sel !== null || p3Grace}
                    onClick={() => handleP3Answer(i)}
                  >{opt}</button>
                ))}
              </div>
              {p3Grace && <div className="l19-grace">✨ Think carefully about what the text says — try again!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 4: Integrity Test ── */}
      {phase === 'phase4' && (
        <div className="l19-p4-wrap">
          <div className="l19-p4-title">⚡ THE INTEGRITY TEST ⚡</div>
          <div className="l19-sodom-king">
            <span className="l19-king-icon">👑</span>
            <div className="l19-king-speech">
              "Give me the people.<br />Keep all the goods for yourself."
            </div>
          </div>

          <div className={`l19-chest${chestOpen ? ' open' : ''}`}>
            {chestOpen && (
              <div className="l19-chest-riches">💰💎🏆💰💎🏆💰</div>
            )}
            <div className="l19-chest-icon">{chestOpen ? '📦✨' : '📦'}</div>
          </div>

          <div className="l19-p4-prompt">ABRAM'S RESPONSE?</div>

          <div className="l19-speech-bubbles">
            {P4Q.opts.map((opt, i) => (
              <button
                key={i}
                className={`l19-bubble${i < p4TabCount ? ' visible' : ''}${p4Sel === i ? (i === P4Q.ans ? ' correct-bubble' : ' wrong-bubble') : ''}`}
                disabled={i >= p4TabCount || p4Sel !== null || p4Grace}
                onClick={() => handleP4Answer(i)}
              >
                <span className="l19-bubble-letter">{String.fromCharCode(65+i)}</span>
                <span className="l19-bubble-text">{opt}</span>
              </button>
            ))}
          </div>

          {p4Sel === P4Q.ans && (
            <div className="l19-p4-verdict">
              <div className="l19-verdict-line1">ABRAM CHOSE INTEGRITY OVER RICHES!</div>
              <div className="l19-verdict-line2">SOME THINGS ARE WORTH MORE THAN GOLD.</div>
            </div>
          )}

          {p4Grace && (
            <div className="l19-p4-grace">
              ✨ Think about what Abram stood for — what would he never accept? Try again!
            </div>
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase === 'ending' && (
        <>
          {Array.from({length:22}, (_, i) => (
            <div key={i} className="l19-end-coin"
              style={{left:`${4+(i*4.2)%92}%`, animationDuration:`${1.1+(i*0.14)%1.4}s`, animationDelay:`${(i*0.08)%0.9}s`}}>
              🪙
            </div>
          ))}
          <div className="l19-end-name">{playerName} — YOU HAVE MAIN CHARACTER ENERGY!</div>
          <div className="l19-end-tally">
            <div className="l19-tally-label">COINS EARNED THIS LEVEL</div>
            <div className="l19-tally-count">{coinCount} 🪙</div>
          </div>
          <div className="l19-end-stars">
            {[0,1,2].map(i => (
              <span key={i} className={`l19-star${starsShown > i ? ' visible' : ''}`}>⭐</span>
            ))}
          </div>
          {showScripture && (
            <div className="l19-scripture-card">
              <p className="l19-scripture-text">
                "I have raised my hand to the LORD, God Most High, Creator of heaven and earth."
              </p>
              <p className="l19-scripture-ref">— Genesis 14:22</p>
            </div>
          )}
          {showAdvance && (
            <button className="l19-advance-btn"
              onClick={() => { phaseRef.current = 'complete'; setPhase('complete') }}>
              ADVANCE TO LEVEL 1-20 ➡️
            </button>
          )}
        </>
      )}

      {affirm && <div key={affKey} className="l19-affirm">{affirm}</div>}
    </div>
  )
}
