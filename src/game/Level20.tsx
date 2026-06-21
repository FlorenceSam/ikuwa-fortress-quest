import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level20.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase   = 'cinematic' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'ending' | 'complete'
type P1Sub   = 'dialogue' | 'heard'
type P2Sub   = 'stars' | 'grace' | 'revelation' | 'question'
type P3Sub   = 'animals' | 'sleep' | 'questions' | 'covenant'
type P4Sub   = 'boundary' | 'question'
type RoundT  = 'yn' | 'tf' | 'mc'

// ── Data ──────────────────────────────────────────────────────────────────────
interface Round { type: RoundT; q: string; opts: string[]; ans: number }

const P1_ROUNDS: Round[] = [
  { type:'yn', q:"Did Abram stay silent and just accept God's promise?",
    opts:['YES','NO'], ans:1 },
  { type:'tf', q:"Abram told God he still had no children and his servant Eliezer would inherit everything.",
    opts:['TRUE','FALSE'], ans:0 },
  { type:'mc', q:"What was the name of Abram's servant who would have inherited everything?",
    opts:['Eliezer of Damascus','Ishmael','Lot','Melchizedek'], ans:0 },
]

const ANIMALS   = ['🐂','🐐','🐏','🕊️','🐦']
const ANIM_NAME = ['Heifer','Goat','Ram','Dove','Young Pigeon']

const P3Q1 = { q:"Did God warn Abram that his descendants would be slaves in a foreign land?",
               opts:['YES','NO'], ans:0 }
const P3Q2 = { q:"How long did God say Abram's descendants would be enslaved?",
               opts:['400 years','40 years','40 days','4000 years'], ans:0 }
const P4Q  = { q:"The covenant God made with Abram depended on Abram keeping all the rules perfectly.",
               opts:['TRUE','FALSE'], ans:1 }

const AFFIRMATIONS = [
  "FLESH AND BLOOD DIDN'T REVEAL THAT!",
  'HOLY SPIRIT GAVE YOU EXPO!',
  'THE SPIRIT IS TEACHING YOU!',
  "THAT'S HEAVEN'S WISDOM!",
  'GOD JUST WHISPERED THAT TO YOU!',
  "THAT'S THE ANOINTING!",
  'THE FATHER REVEALED THAT!',
  "THAT'S THE SECRET WISDOM!",
  "THAT'S THE SPIRIT OF TRUTH!",
  'EVEN THE ANGELS ARE TAKING NOTES!',
]

// ── Audio ─────────────────────────────────────────────────────────────────────
function playSoftWind() {
  try {
    const c = new AudioContext()
    const buf = c.createBuffer(1, Math.floor(c.sampleRate*2.5), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i/d.length; d[i] = (Math.random()*2-1)*0.18*t*(1-t)*4
    }
    const src = c.createBufferSource(); src.buffer = buf
    const filt = c.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=600
    const g = c.createGain(); g.gain.setValueAtTime(0,c.currentTime); g.gain.linearRampToValueAtTime(0.5,c.currentTime+1); g.gain.linearRampToValueAtTime(0,c.currentTime+2.5)
    src.connect(filt); filt.connect(g); g.connect(c.destination); src.start()
  } catch(_) {}
}
function playGoldExplosion() {
  try {
    const c = new AudioContext()
    ;[110,220,330,440,550,880].forEach((f,i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type='sine'; o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.04)
      g.gain.linearRampToValueAtTime(0.20,c.currentTime+i*0.04+0.08)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.04+1.4)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime+i*0.04); o.stop(c.currentTime+i*0.04+1.6)
    })
    const o2 = c.createOscillator(); const g2 = c.createGain()
    o2.type='sine'; o2.frequency.setValueAtTime(80,c.currentTime); o2.frequency.exponentialRampToValueAtTime(18,c.currentTime+1.2)
    g2.gain.setValueAtTime(0.6,c.currentTime); g2.gain.exponentialRampToValueAtTime(0.001,c.currentTime+1.8)
    o2.connect(g2); g2.connect(c.destination); o2.start(); o2.stop(c.currentTime+2)
  } catch(_) {}
}
function playStarPing() {
  try {
    const c = new AudioContext()
    const f = 660+Math.random()*400
    const o = c.createOscillator(); const g = c.createGain()
    o.type='triangle'; o.frequency.value=f
    g.gain.setValueAtTime(0.18,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.28)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.3)
  } catch(_) {}
}
function playHolyChime() {
  try {
    const c = new AudioContext()
    ;[261.6,329.6,392.0,523.3,659.3,784.0].forEach((f,i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type='sine'; o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.22)
      g.gain.linearRampToValueAtTime(0.10,c.currentTime+i*0.22+0.5)
      g.gain.linearRampToValueAtTime(0.10,c.currentTime+4.5)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+6.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime+i*0.22); o.stop(c.currentTime+7)
    })
  } catch(_) {}
}
function playThud() {
  try {
    const c = new AudioContext()
    const o = c.createOscillator(); const g = c.createGain()
    o.type='sine'; o.frequency.setValueAtTime(120,c.currentTime); o.frequency.exponentialRampToValueAtTime(40,c.currentTime+0.22)
    g.gain.setValueAtTime(0.8,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.35)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.4)
  } catch(_) {}
}
function playOminousRumble() {
  try {
    const c = new AudioContext()
    ;[40,55,80].forEach((f,i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type='sine'; o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.3)
      g.gain.linearRampToValueAtTime(0.18,c.currentTime+i*0.3+0.8)
      g.gain.linearRampToValueAtTime(0.18,c.currentTime+3.0)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+4.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime+i*0.3); o.stop(c.currentTime+5)
    })
  } catch(_) {}
}
function playFirepotWhoosh() {
  try {
    const c = new AudioContext()
    const buf = c.createBuffer(1,Math.floor(c.sampleRate*0.6),c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i=0;i<d.length;i++){const t=i/d.length; d[i]=(Math.random()*2-1)*Math.pow(t<0.5?t/0.5:(1-t)/0.5,0.5)*0.7}
    const src = c.createBufferSource(); src.buffer=buf
    const filt = c.createBiquadFilter(); filt.type='bandpass'; filt.frequency.value=400; filt.Q.value=0.5
    const g = c.createGain(); g.gain.value=0.9
    src.connect(filt); filt.connect(g); g.connect(c.destination); src.start()
  } catch(_) {}
}
function playTorchBlaze() {
  try {
    const c = new AudioContext()
    ;[220,440,660,880].forEach((f,i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type='triangle'; o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.05)
      g.gain.linearRampToValueAtTime(0.18,c.currentTime+i*0.05+0.04)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.05+0.7)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime+i*0.05); o.stop(c.currentTime+i*0.05+0.8)
    })
  } catch(_) {}
}
function playCovenantBurst() {
  try {
    const c = new AudioContext()
    ;[110,165,220,330,440,660,880,1320].forEach((f,i) => {
      const o = c.createOscillator(); const g = c.createGain()
      o.type='sine'; o.frequency.value=f
      g.gain.setValueAtTime(0.22,c.currentTime+i*0.06)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.06+1.8)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime+i*0.06); o.stop(c.currentTime+i*0.06+2.0)
    })
    const o2=c.createOscillator(); const g2=c.createGain()
    o2.type='sine'; o2.frequency.setValueAtTime(80,c.currentTime); o2.frequency.exponentialRampToValueAtTime(14,c.currentTime+3)
    g2.gain.setValueAtTime(0.7,c.currentTime); g2.gain.exponentialRampToValueAtTime(0.001,c.currentTime+3.5)
    o2.connect(g2); g2.connect(c.destination); o2.start(); o2.stop(c.currentTime+4)
  } catch(_) {}
}
function playGoldPop() {
  try {
    const c = new AudioContext()
    ;[330,415,523,659].forEach((f,i) => {
      const o=c.createOscillator(); const g=c.createGain()
      o.type='sine'; o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.06)
      g.gain.linearRampToValueAtTime(0.20,c.currentTime+i*0.06+0.02)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.06+0.55)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime+i*0.06); o.stop(c.currentTime+i*0.06+0.7)
    })
  } catch(_) {}
}
function playFanfare() {
  try {
    const c = new AudioContext()
    ;[261,330,392,523,659,784,1047].forEach((f,i) => {
      const o=c.createOscillator(); const g=c.createGain()
      o.type='sine'; o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.09)
      g.gain.linearRampToValueAtTime(0.18,c.currentTime+i*0.09+0.02)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.09+0.85)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime+i*0.09); o.stop(c.currentTime+i*0.09+1.0)
    })
  } catch(_) {}
}
function playBuzzer() {
  try {
    const c = new AudioContext()
    const o=c.createOscillator(); const g=c.createGain()
    o.type='sawtooth'; o.frequency.setValueAtTime(180,c.currentTime); o.frequency.exponentialRampToValueAtTime(80,c.currentTime+0.35)
    g.gain.setValueAtTime(0.4,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.45)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.5)
  } catch(_) {}
}
function playDing(pitch=1.0) {
  try {
    const c = new AudioContext()
    const o=c.createOscillator(); const g=c.createGain()
    o.type='triangle'; o.frequency.value=880*pitch
    g.gain.setValueAtTime(0.22,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.5)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.55)
  } catch(_) {}
}

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt { x:number;y:number;vx:number;vy:number;r:number;life:number;max:number;hue:number }
function mkBurst(cx:number,cy:number,cnt:number,hue=45): Pt[] {
  return Array.from({length:cnt},()=>{
    const a=Math.random()*Math.PI*2; const s=Math.random()*10+2
    return {x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,r:Math.random()*3+1,life:0,max:Math.random()*70+50,hue}
  })
}

// ── Star ──────────────────────────────────────────────────────────────────────
interface Star { id:number; x:number; y:number; size:number }

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props { onComplete:()=>void; onFail?:(h:string)=>void; showHint?:boolean }

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level20({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Scholar'

  // Core
  const [phase, setPhase]             = useState<Phase>('cinematic')
  const [coins, setCoins]             = useState(getCoins)
  const [shakeClass, setShakeClass]   = useState('')
  const [affirm, setAffirm]           = useState<string|null>(null)
  const [affKey, setAffKey]           = useState(0)
  const [whiteBurst, setWhiteBurst]   = useState(false)

  // Cinematic
  const [cinStep, setCinStep]         = useState(0)

  // Phase 1
  const [p1Sub, setP1Sub]             = useState<P1Sub>('dialogue')
  const [p1Round, setP1Round]         = useState(0)
  const [p1Sel, setP1Sel]             = useState<number|null>(null)
  const [p1Grace, setP1Grace]         = useState(false)

  // Phase 2 — stars
  const [p2Sub, setP2Sub]             = useState<P2Sub>('stars')
  const [stars, setStars]             = useState<Star[]>([])
  const [starCount, setStarCount]     = useState(0)
  const [p2Timer, setP2Timer]         = useState(15)
  const [p2Faster, setP2Faster]       = useState(false)
  const [p2Supernova, setP2Supernova] = useState(false)
  const [revStep, setRevStep]         = useState(0)
  const [p2QSel, setP2QSel]           = useState<number|null>(null)
  const [p2QGrace, setP2QGrace]       = useState(false)

  // Phase 3
  const [p3Sub, setP3Sub]             = useState<P3Sub>('animals')
  const [animalsPlaced, setAnimalsPlaced] = useState(Array(5).fill(false))
  const [animOffered, setAnimOffered] = useState<number|null>(null)
  const [p3QStep, setP3QStep]         = useState(0) // 0=Q1, 1=Q2
  const [p3Sel, setP3Sel]             = useState<number|null>(null)
  const [p3Grace, setP3Grace]         = useState(false)
  const [firepotVisible, setFirepotVisible] = useState(false)
  const [torchVisible, setTorchVisible]     = useState(false)
  const [firepotTapped, setFirepotTapped]   = useState(false)
  const [torchTapped, setTorchTapped]       = useState(false)
  const [covenantTextVisible, setCovenantTextVisible] = useState(false)

  // Phase 4
  const [p4Sub, setP4Sub]             = useState<P4Sub>('boundary')
  const [boundaryTapped, setBoundaryTapped] = useState(Array(4).fill(false))
  const [mapSealed, setMapSealed]     = useState(false)
  const [p4QSel, setP4QSel]           = useState<number|null>(null)
  const [p4Grace, setP4Grace]         = useState(false)

  // Ending
  const [coinCount, setCoinCount]           = useState(0)
  const [starsShown, setStarsShown]         = useState(0)
  const [showScripture, setShowScripture]   = useState(false)
  const [showAdvance, setShowAdvance]       = useState(false)

  // Refs
  const earnedRef            = useRef(0)
  const affIdxRef            = useRef(0)
  const phaseRef             = useRef<Phase>('cinematic')
  const starCountRef         = useRef(0)
  const starIdRef            = useRef(0)
  const p2IntervalRef        = useRef<number|null>(null)
  const lastStarAddRef       = useRef(0)
  const p2FasterRef          = useRef(false)
  const p2AttemptRef         = useRef(0)
  const covenantTriggeredRef = useRef(false)
  const boundaryTriggeredRef = useRef(false)
  const canvasRef            = useRef<HTMLCanvasElement>(null)
  const rafRef               = useRef(0)
  const particlesRef         = useRef<Pt[]>([])

  // Canvas resize
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const r = () => { cv.width=window.innerWidth; cv.height=window.innerHeight }
    r(); window.addEventListener('resize',r)
    return () => { window.removeEventListener('resize',r); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    setShakeClass('l20-shake'); setTimeout(()=>setShakeClass(''),700)
  },[])

  const showAffirm = useCallback((t:string) => {
    setAffirm(t); setAffKey(k=>k+1); setTimeout(()=>setAffirm(null),2400)
  },[])

  const nextAffirm = useCallback(() => {
    const t = AFFIRMATIONS[affIdxRef.current % AFFIRMATIONS.length]
    affIdxRef.current++; return t
  },[])

  const speak = useCallback((text:string, rate=0.80, pitch=1.0) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\b([A-Z]{2,})\b/g, m=>m.toLowerCase())
      const u = new SpeechSynthesisUtterance(fixed); u.rate=rate; u.pitch=pitch; u.volume=1
      window.speechSynthesis?.speak(u)
    } catch(_) {}
  },[])

  const speakAffirm = useCallback((text:string) => {
    try {
      window.speechSynthesis?.cancel()
      const fixed = text.replace(/\b([A-Z]{2,})\b/g, m=>m.toLowerCase())
      const u = new SpeechSynthesisUtterance(fixed); u.rate=0.90; u.pitch=1.42; u.volume=1
      window.speechSynthesis?.speak(u)
    } catch(_) {}
  },[])

  const runParticles = useCallback(() => {
    const cv = canvasRef.current; if (!cv || rafRef.current!==0) return
    const tick = () => {
      const ctx = cv.getContext('2d'); if (ctx) {
        ctx.clearRect(0,0,cv.width,cv.height)
        particlesRef.current = particlesRef.current.filter(p=>p.life<p.max)
        for (const p of particlesRef.current) {
          p.x+=p.vx; p.y+=p.vy; p.vx*=0.93; p.vy*=0.93; p.vy+=0.14; p.life++
          const op = Math.pow(1-p.life/p.max,0.55)*0.95
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r*4,0,Math.PI*2)
          ctx.fillStyle=`hsla(${p.hue},95%,60%,${op*0.18})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r*1.6,0,Math.PI*2)
          ctx.fillStyle=`hsla(${p.hue},90%,75%,${op*0.70})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.6,0,Math.PI*2)
          ctx.fillStyle=`hsla(${p.hue},70%,97%,${op})`; ctx.fill()
        }
      }
      if (particlesRef.current.length>0) rafRef.current=requestAnimationFrame(tick)
      else rafRef.current=0
    }
    rafRef.current=requestAnimationFrame(tick)
  },[])

  const burst = useCallback((cx:number,cy:number,cnt=80,hue=45) => {
    particlesRef.current.push(...mkBurst(cx,cy,cnt,hue)); runParticles()
  },[runParticles])

  const fireBurstWhite = useCallback(() => {
    setWhiteBurst(true); setTimeout(()=>setWhiteBurst(false),1400)
    for (let i=0;i<12;i++)
      setTimeout(()=>burst(Math.random()*window.innerWidth,Math.random()*window.innerHeight,80,48+Math.random()*14),i*110)
  },[burst])

  const addEarned = useCallback((n:number) => {
    addCoins(n); setCoins(getCoins()); earnedRef.current+=n
  },[])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'cinematic') return
    playSoftWind()
    const ts = [
      setTimeout(()=>setCinStep(1), 600),
      setTimeout(()=>setCinStep(2), 2000),
      setTimeout(()=>setCinStep(3), 3100),
      setTimeout(()=>setCinStep(4), 4100),
      setTimeout(()=>{
        setCinStep(5); playGoldExplosion(); shake()
        for (let i=0;i<18;i++)
          setTimeout(()=>burst(Math.random()*window.innerWidth,Math.random()*window.innerHeight,30,50+i*2),i*160)
      }, 4800),
      setTimeout(()=>setCinStep(6), 5500),
      setTimeout(()=>setCinStep(7), 6400),
      setTimeout(()=>{
        phaseRef.current='phase1'; setPhase('phase1')
        speak('In a vision, God spoke to Abram: Do not be afraid. I am your shield and your very great reward.', 0.76, 0.88)
      }, 9200),
    ]
    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PHASE 1: Dialogue ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase1') return
    setP1Sub('dialogue'); setP1Round(0); setP1Sel(null); setP1Grace(false)
  }, [phase])

  const handleP1 = useCallback((idx:number) => {
    if (p1Sel !== null || p1Grace) return
    setP1Sel(idx)
    const round = P1_ROUNDS[p1Round]
    if (idx === round.ans) {
      addEarned(20); playGoldPop(); shake()
      const af=nextAffirm(); speakAffirm(af); showAffirm(af)
      setTimeout(()=>{
        setP1Sel(null)
        if (p1Round < 2) {
          setP1Round(r=>r+1)
        } else {
          setP1Sub('heard')
          speak("God heard Abram's honest heart! This man will not be your heir — your own son will be your heir.", 0.76, 0.92)
          setTimeout(()=>{ phaseRef.current='phase2'; setPhase('phase2') }, 5000)
        }
      }, 2000)
    } else {
      setP1Grace(true); setP1Sel(null); playBuzzer()
      setTimeout(()=>setP1Grace(false), 2800)
    }
  },[p1Sel,p1Grace,p1Round,addEarned,shake,nextAffirm,speakAffirm,showAffirm,speak])

  // ── PHASE 2: Stars ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'phase2' || p2Sub !== 'stars') return
    starCountRef.current=0; setStarCount(0); setStars([]); setP2Timer(15)
    setP2Faster(false); p2FasterRef.current=false; lastStarAddRef.current=0
    const startTime = Date.now()
    speak("Look up at the sky. Count the stars — if you can.", 0.72, 0.88)

    p2IntervalRef.current = window.setInterval(()=>{
      const elapsed = (Date.now()-startTime)/1000
      const remaining = Math.max(0, 15-elapsed)
      setP2Timer(Math.ceil(remaining))
      if (elapsed>5 && !p2FasterRef.current) { p2FasterRef.current=true; setP2Faster(true) }
      if (elapsed>13) shake()

      // Add star based on frequency ramp
      const now = Date.now()
      const addThreshold = elapsed<5 ? 500 : elapsed<10 ? 320 : 170
      if (now - lastStarAddRef.current > addThreshold) {
        lastStarAddRef.current = now
        const id = starIdRef.current++
        const star: Star = { id, x:Math.random()*84+4, y:Math.random()*72+6, size:Math.random()*12+10 }
        setStars(prev=>[...prev.slice(-65), star])
        setTimeout(()=>setStars(prev=>prev.filter(s=>s.id!==id)), 3200)
      }

      if (remaining<=0) {
        clearInterval(p2IntervalRef.current!); p2IntervalRef.current=null
        const count = starCountRef.current
        if (count>=30) {
          addCoins(50); setCoins(getCoins()); earnedRef.current+=50
          setP2Supernova(true); setStars([])
          setTimeout(()=>{ setP2Sub('revelation') }, 4200)
        } else if (p2AttemptRef.current===0) {
          p2AttemptRef.current=1; setP2Sub('grace')
        } else {
          addCoins(25); setCoins(getCoins()); earnedRef.current+=25
          setTimeout(()=>{ setP2Sub('revelation') }, 2800)
        }
      }
    },120)

    return ()=>{ if(p2IntervalRef.current){clearInterval(p2IntervalRef.current);p2IntervalRef.current=null} }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase, p2Sub])

  // Grace retry
  useEffect(() => {
    if (phase!=='phase2' || p2Sub!=='grace') return
    speak("The stars are too many to count — just like God's promises! Keep going!", 0.80)
    const t = setTimeout(()=>setP2Sub('stars'), 3200)
    return ()=>clearTimeout(t)
  },[phase, p2Sub, speak])

  // Supernova particle burst
  useEffect(() => {
    if (!p2Supernova) return
    const W=window.innerWidth; const H=window.innerHeight
    for (let i=0;i<22;i++)
      setTimeout(()=>burst(Math.random()*W, Math.random()*H, 65, 45+i*2), i*120)
    const af=nextAffirm(); speakAffirm(af); showAffirm(af)
    speak("You can't count them all! So shall your offspring be!", 0.76, 1.0)
    const t=setTimeout(()=>setP2Supernova(false), 5000)
    return ()=>clearTimeout(t)
  },[p2Supernova, burst, nextAffirm, speakAffirm, showAffirm, speak])

  const tapStar = useCallback((id:number, sx:number, sy:number)=>{
    setStars(prev=>prev.filter(s=>s.id!==id))
    starCountRef.current++; setStarCount(starCountRef.current)
    playStarPing()
    burst((sx/100)*window.innerWidth, (sy/100)*window.innerHeight, 14, 52)
  },[burst])

  // Revelation
  useEffect(()=>{
    if (phase!=='phase2' || p2Sub!=='revelation') return
    setRevStep(0); playHolyChime()
    speak("Abram believed God... and it was credited to him as righteousness. Genesis chapter 15 verse 6.", 0.64, 0.86)
    const ts=[
      setTimeout(()=>setRevStep(1), 1800),
      setTimeout(()=>setRevStep(2), 5200),
      setTimeout(()=>setRevStep(3), 6600),
      setTimeout(()=>{ addCoins(30); setCoins(getCoins()); earnedRef.current+=30; setRevStep(4) }, 8000),
      setTimeout(()=>{ setP2Sub('question'); setP2QSel(null); setP2QGrace(false) }, 11000),
    ]
    return ()=>ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase, p2Sub])

  const handleP2Q = useCallback((idx:number)=>{
    if (p2QSel!==null || p2QGrace) return
    setP2QSel(idx)
    if (idx===1) { // FALSE is correct
      addEarned(20); playGoldPop(); shake()
      const af=nextAffirm(); speakAffirm(af); showAffirm(af)
      speak("It was faith — not works! Faith is the currency of heaven!", 0.80, 1.0)
      setTimeout(()=>{ phaseRef.current='phase3'; setPhase('phase3') }, 3000)
    } else {
      setP2QGrace(true); setP2QSel(null); playBuzzer()
      setTimeout(()=>setP2QGrace(false), 2800)
    }
  },[p2QSel,p2QGrace,addEarned,shake,nextAffirm,speakAffirm,showAffirm,speak])

  // ── PHASE 3: Firepot ──────────────────────────────────────────────────────
  useEffect(()=>{
    if (phase!=='phase3') return
    setP3Sub('animals'); setAnimalsPlaced(Array(5).fill(false))
    setP3QStep(0); setP3Sel(null); setP3Grace(false)
    setFirepotVisible(false); setTorchVisible(false)
    setFirepotTapped(false); setTorchTapped(false)
    setCovenantTextVisible(false); covenantTriggeredRef.current=false
    speak("God said: Bring me a heifer, a goat, a ram, a dove, and a young pigeon. Offer them on the altar.", 0.78, 0.92)
  },[phase, speak])

  const tapAnimal = useCallback((idx:number)=>{
    if (animalsPlaced[idx]) return
    setAnimOffered(idx)
    setAnimalsPlaced(prev=>{ const n=[...prev]; n[idx]=true; return n })
    playThud()
    addEarned(10)
    burst(window.innerWidth/2, window.innerHeight*0.42, 30, 30)
    setTimeout(()=>setAnimOffered(null), 600)
  },[animalsPlaced, addEarned, burst])

  // All animals placed → sleep transition
  useEffect(()=>{
    if (phase!=='phase3' || p3Sub!=='animals') return
    if (!animalsPlaced.every(Boolean)) return
    speak("The altar blazes! Now a deep, terrifying darkness fell over Abram.", 0.78, 0.92)
    const t=setTimeout(()=>{
      setP3Sub('sleep'); playOminousRumble()
    }, 2000)
    return ()=>clearTimeout(t)
  },[phase, p3Sub, animalsPlaced, speak])

  // Sleep → questions
  useEffect(()=>{
    if (phase!=='phase3' || p3Sub!=='sleep') return
    const t=setTimeout(()=>{ setP3Sub('questions') }, 4500)
    return ()=>clearTimeout(t)
  },[phase, p3Sub])

  const handleP3Q = useCallback((idx:number)=>{
    if (p3Sel!==null || p3Grace) return
    setP3Sel(idx)
    const q = p3QStep===0 ? P3Q1 : P3Q2
    if (idx===q.ans) {
      addEarned(20); playGoldPop(); shake()
      const af=nextAffirm(); speakAffirm(af); showAffirm(af)
      if (p3QStep===0) {
        speak("Yes! God revealed that Abram's descendants would be enslaved — but also freed with great possessions!", 0.78)
        setTimeout(()=>{ setP3Sel(null); setP3QStep(1) }, 2200)
      } else {
        speak("Four hundred years! But God promised He would bring them out!", 0.78)
        setTimeout(()=>{ setP3Sub('covenant') }, 2800)
      }
    } else {
      setP3Grace(true); setP3Sel(null); playBuzzer()
      setTimeout(()=>setP3Grace(false), 2800)
    }
  },[p3Sel,p3Grace,p3QStep,addEarned,shake,nextAffirm,speakAffirm,showAffirm,speak])

  // Covenant fire objects appear
  useEffect(()=>{
    if (phase!=='phase3' || p3Sub!=='covenant') return
    speak("A smoking firepot and a blazing torch appeared and passed between the pieces!", 0.76, 0.88)
    const ts=[
      setTimeout(()=>setFirepotVisible(true), 1800),
      setTimeout(()=>setTorchVisible(true), 2600),
    ]
    return ()=>ts.forEach(clearTimeout)
  },[phase, p3Sub, speak])

  const tapFirepot = useCallback(()=>{
    if (firepotTapped) return
    setFirepotTapped(true); playFirepotWhoosh(); addEarned(15)
    burst(window.innerWidth*0.28, window.innerHeight*0.5, 60, 15)
  },[firepotTapped, addEarned, burst])

  const tapTorch = useCallback(()=>{
    if (torchTapped) return
    setTorchTapped(true); playTorchBlaze(); addEarned(15)
    burst(window.innerWidth*0.72, window.innerHeight*0.5, 60, 45)
  },[torchTapped, addEarned, burst])

  // Both tapped → covenant complete
  useEffect(()=>{
    if (!firepotTapped || !torchTapped || covenantTriggeredRef.current) return
    covenantTriggeredRef.current=true
    fireBurstWhite(); shake(); playCovenantBurst()
    const af=nextAffirm(); speakAffirm(af); showAffirm(af)
    speak("On that day, God made a covenant with Abram! The land was promised forever!", 0.74, 0.94)
    setTimeout(()=>setCovenantTextVisible(true), 2200)
    setTimeout(()=>{ phaseRef.current='phase4'; setPhase('phase4') }, 8500)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[firepotTapped, torchTapped])

  // ── PHASE 4: Land Promise ─────────────────────────────────────────────────
  useEffect(()=>{
    if (phase!=='phase4') return
    setP4Sub('boundary'); setBoundaryTapped(Array(4).fill(false))
    setMapSealed(false); setP4QSel(null); setP4Grace(false)
    boundaryTriggeredRef.current=false
    speak("To your descendants I give this land — from the river of Egypt to the great river Euphrates.", 0.76, 0.90)
  },[phase, speak])

  const tapBoundary = useCallback((idx:number)=>{
    if (boundaryTapped[idx] || mapSealed) return
    setBoundaryTapped(prev=>{ const n=[...prev]; n[idx]=true; return n })
    playDing(0.8+idx*0.1); addEarned(10)
    burst([
      window.innerWidth*0.2,  // SW
      window.innerWidth*0.8,  // SE
      window.innerWidth*0.8,  // NE
      window.innerWidth*0.2,  // NW
    ][idx], [
      window.innerHeight*0.72, // SW
      window.innerHeight*0.72, // SE
      window.innerHeight*0.28, // NE
      window.innerHeight*0.28, // NW
    ][idx], 40, 45)
  },[boundaryTapped, mapSealed, addEarned, burst])

  // All 4 tapped → seal map
  useEffect(()=>{
    if (!boundaryTapped.every(Boolean) || boundaryTriggeredRef.current || mapSealed) return
    boundaryTriggeredRef.current=true
    setMapSealed(true); playFanfare(); shake()
    addCoins(30); setCoins(getCoins()); earnedRef.current+=30
    for (let i=0;i<12;i++)
      setTimeout(()=>burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 55, 45),i*120)
    speak("This land is sealed by God's own promise — forever and ever!", 0.78)
    setTimeout(()=>setP4Sub('question'), 3200)
  // eslint-disable-next-line react-deps
  },[boundaryTapped, mapSealed])

  const handleP4Q = useCallback((idx:number)=>{
    if (p4QSel!==null || p4Grace) return
    setP4QSel(idx)
    if (idx===P4Q.ans) {
      addEarned(60); fireBurstWhite(); shake()
      const af=nextAffirm(); speakAffirm(af); showAffirm(af)
      speak(`${playerName}, God alone passed between the pieces! This was an unconditional covenant — God's promise, not man's performance!`, 0.76, 1.0)
      setTimeout(()=>{ phaseRef.current='ending'; setPhase('ending') }, 5500)
    } else {
      setP4Grace(true); setP4QSel(null); playBuzzer()
      setTimeout(()=>setP4Grace(false), 2800)
    }
  },[p4QSel,p4Grace,addEarned,fireBurstWhite,shake,nextAffirm,speakAffirm,showAffirm,speak,playerName])

  // ── ENDING ────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if (phase!=='ending') return
    playFanfare()
    const total=earnedRef.current; let cur=0
    const step=Math.max(1,Math.ceil(total/60))
    const id=setInterval(()=>{
      cur=Math.min(cur+step,total); setCoinCount(cur)
      if (cur%(Math.ceil(total/6))===0||cur===total) playDing(0.8+(cur/total)*0.5)
      if (cur>=total) clearInterval(id)
    },28)
    const ts=[
      setTimeout(()=>setStarsShown(1), 1400),
      setTimeout(()=>setStarsShown(2), 2100),
      setTimeout(()=>setStarsShown(3), 2800),
      setTimeout(()=>{
        setShowScripture(true)
        speak('"Abram believed God, and it was credited to him as righteousness." — Genesis 15:6', 0.74, 0.88)
      }, 3600),
      setTimeout(()=>setShowAdvance(true), 6200),
    ]
    return ()=>{ clearInterval(id); ts.forEach(clearTimeout) }
  },[phase, speak])

  // Cleanup
  useEffect(()=>()=>{
    cancelAnimationFrame(rafRef.current)
    window.speechSynthesis?.cancel()
    if (p2IntervalRef.current) clearInterval(p2IntervalRef.current)
  },[])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (phase==='complete') {
    return (
      <CompletionScreen
        verse='Abram believed God, and it was credited to him as righteousness.'
        verseRef='Genesis 15:6'
        subtitle='Faith is the currency of heaven — and Abram spent it boldly'
        voiceLine={`${playerName}, you understand the covenant now. God's promise never depends on your performance — it depends on His faithfulness. Keep believing.`}
        onComplete={onComplete}
      />
    )
  }

  const altarGlow = animalsPlaced.filter(Boolean).length

  return (
    <div className={`l20-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l20-bg${cinStep>=5 ? ' visible' : ''}`} />
      {cinStep<5 && <div className="l20-black" />}
      {phase==='phase3' && p3Sub==='sleep' && <div className="l20-sleep-overlay" />}
      {phase==='phase3' && p3Sub==='covenant' && <div className="l20-covenant-overlay" />}
      <canvas ref={canvasRef} className="l20-canvas" />
      {whiteBurst && <div className="l20-white-burst" />}
      {p2Supernova && <div className="l20-supernova-flash" />}

      {phase!=='cinematic' && phase!=='complete' && (
        <div className="l20-coin-hud"><CoinHUD coins={coins} /></div>
      )}

      {/* ── CINEMATIC ── */}
      {phase==='cinematic' && (
        <div className="l20-cin">
          {cinStep>=1 && <div className={`l20-candle${cinStep>=5?' l20-candle-blow':''}`}>🕯️</div>}
          {cinStep>=2 && <div className="l20-cin-line l20-cin-l1">Abram was afraid.</div>}
          {cinStep>=3 && <div className="l20-cin-line l20-cin-l2">He had no son.</div>}
          {cinStep>=4 && <div className="l20-cin-line l20-cin-l3">He had no heir.</div>}
          {cinStep>=6 && (
            <div className="l20-cin-god-text">
              <div className="l20-cin-g1">DO NOT BE AFRAID, ABRAM.</div>
              <div className="l20-cin-g2">I AM YOUR SHIELD.</div>
            </div>
          )}
          {cinStep>=7 && (
            <>
              <div className="l20-title-card">🌟 THE COVENANT 🌟</div>
              <div className="l20-title-sub">When God makes a promise — it's FOREVER.</div>
            </>
          )}
        </div>
      )}

      {/* ── PHASE 1: Dialogue ── */}
      {phase==='phase1' && (
        <div className="l20-p1-wrap">
          <div className="l20-divine-glow" />
          <div className="l20-abram-icon">🧔</div>

          {p1Sub==='dialogue' && (
            <>
              <div className="l20-god-bubble">
                God: "I am your shield. Your reward will be very great."
              </div>

              <div className="l20-p1-q-card">
                <div className="l20-p1-round-label">
                  {p1Round===0 ? 'ROUND 1 — YES OR NO?' : p1Round===1 ? 'ROUND 2 — TRUE OR FALSE?' : 'ROUND 3 — WHO WAS IT?'}
                </div>
                <p className="l20-p1-q">{P1_ROUNDS[p1Round].q}</p>

                {P1_ROUNDS[p1Round].type==='yn' && (
                  <div className="l20-yn-row">
                    {P1_ROUNDS[p1Round].opts.map((o,i)=>(
                      <button key={i} className={`l20-yn-btn${p1Sel===i?(i===P1_ROUNDS[p1Round].ans?' correct':' wrong'):''}`}
                        disabled={p1Sel!==null||p1Grace} onClick={()=>handleP1(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P1_ROUNDS[p1Round].type==='tf' && (
                  <div className="l20-tf-row">
                    {P1_ROUNDS[p1Round].opts.map((o,i)=>(
                      <button key={i} className={`l20-tf-tablet${p1Sel===i?(i===P1_ROUNDS[p1Round].ans?' correct':' wrong'):''}`}
                        disabled={p1Sel!==null||p1Grace} onClick={()=>handleP1(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P1_ROUNDS[p1Round].type==='mc' && (
                  <div className="l20-mc-opts">
                    {P1_ROUNDS[p1Round].opts.map((o,i)=>(
                      <button key={i} className={`l20-mc-opt${p1Sel===i?(i===P1_ROUNDS[p1Round].ans?' correct':' wrong'):''}`}
                        disabled={p1Sel!==null||p1Grace} onClick={()=>handleP1(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {p1Grace && <div className="l20-grace">✨ Check what the text actually says — try again!</div>}
              </div>
            </>
          )}

          {p1Sub==='heard' && (
            <div className="l20-heard-screen">
              <div className="l20-heard-title">GOD HEARD ABRAM'S HONEST HEART!</div>
              <div className="l20-heard-text">
                "THIS MAN WILL NOT BE YOUR HEIR —<br />YOUR OWN SON WILL BE YOUR HEIR."
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 2: Stars ── */}
      {phase==='phase2' && (
        <div className="l20-p2-wrap">
          {/* Ambient stars */}
          {Array.from({length:30},(_,i)=>(
            <div key={i} className="l20-bg-star"
              style={{left:`${(i*3.3)%98}%`,top:`${(i*4.1)%88}%`,animationDelay:`${(i*0.21)%3}s`}} />
          ))}

          {p2Sub==='stars' && (
            <>
              <div className="l20-star-hud">
                <span className="l20-star-count">⭐ {starCount} TAPPED</span>
                <span className="l20-star-goal">GOAL: 30</span>
                <span className={`l20-star-timer${p2Timer<=5?' urgent':''}`}>{p2Timer}s</span>
              </div>
              <div className="l20-star-timer-track">
                <div className="l20-star-timer-fill" style={{width:`${(p2Timer/15)*100}%`}} />
              </div>
              {p2Faster && <div className="l20-faster-flash">FASTER!! ⚡</div>}
              <div className="l20-star-field">
                {stars.map(s=>(
                  <button key={s.id} className="l20-star-dot-tap"
                    style={{left:`${s.x}%`,top:`${s.y}%`,fontSize:`${s.size}px`}}
                    onClick={()=>tapStar(s.id,s.x,s.y)}>⭐</button>
                ))}
              </div>
              <div className="l20-god-voice">
                "LOOK UP AT THE SKY.<br />COUNT THE STARS —<br />IF YOU CAN."
              </div>
            </>
          )}

          {p2Sub==='grace' && (
            <div className="l20-grace-screen">
              <div className="l20-grace-icon">🌟</div>
              <p className="l20-grace-msg">The stars are too many to count — just like God's promises!<br />Keep going!</p>
            </div>
          )}

          {p2Supernova && (
            <div className="l20-supernova-screen">
              <div className="l20-supernova-title">YOU CAN'T COUNT THEM ALL! ✨</div>
              <div className="l20-supernova-coins">+50 🪙</div>
            </div>
          )}

          {(p2Sub==='revelation'||p2Sub==='question') && (
            <div className="l20-revelation-wrap">
              {revStep>=1 && <div className="l20-rev-line1">Abram believed God...</div>}
              {revStep>=2 && <div className="l20-rev-pause" />}
              {revStep>=3 && <div className="l20-rev-line2">...and it was credited to him as <span className="l20-rev-highlight">RIGHTEOUSNESS.</span></div>}
              {revStep>=3 && <div className="l20-rev-ref">— Genesis 15:6</div>}
              {revStep>=4 && <div className="l20-rev-coins">+30 🪙 quietly given</div>}
              {revStep>=4 && <div className="l20-rev-pulse" />}
            </div>
          )}

          {p2Sub==='question' && (
            <div className="l20-q-card l20-q-float">
              <div className="l20-q-label">TRUE OR FALSE? — +20 🪙</div>
              <p className="l20-q-text">"Abram was counted righteous because of his good works and sacrifices."</p>
              <div className="l20-tf-row l20-tf-big">
                {['TRUE','FALSE'].map((o,i)=>(
                  <button key={i} className={`l20-tf-tablet${p2QSel===i?(i===1?' correct':' wrong'):''}`}
                    disabled={p2QSel!==null||p2QGrace} onClick={()=>handleP2Q(i)}>{o}</button>
                ))}
              </div>
              {p2QGrace && <div className="l20-grace">✨ Was it faith or works that God credited? Try again!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: Firepot ── */}
      {phase==='phase3' && (
        <div className="l20-p3-wrap">
          {p3Sub==='animals' && (
            <>
              <div className="l20-altar-wrap">
                <div className="l20-altar-label">THE ALTAR</div>
                <div className="l20-altar" data-glow={altarGlow}>
                  {altarGlow>0 && <div className="l20-altar-fire">{'🔥'.repeat(Math.min(altarGlow,5))}</div>}
                </div>
              </div>
              <div className="l20-p3-narration">
                "Bring me a heifer. A goat. A ram. A dove. A young pigeon."
              </div>
              <div className="l20-animals-row">
                {ANIMALS.map((emoji,i)=>(
                  <button key={i}
                    className={`l20-animal${animalsPlaced[i]?' placed':''}${animOffered===i?' offering':''}`}
                    disabled={animalsPlaced[i]} onClick={()=>tapAnimal(i)}>
                    <span className="l20-anim-emoji">{emoji}</span>
                    <span className="l20-anim-name">{ANIM_NAME[i]}</span>
                    {!animalsPlaced[i] && <span className="l20-anim-hint">TAP TO OFFER</span>}
                    {animalsPlaced[i] && <span className="l20-anim-done">✅</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {p3Sub==='sleep' && (
            <div className="l20-sleep-scene">
              <div className="l20-abram-sleep">🧔💤</div>
              <div className="l20-sleep-text">A DEEP, TERRIFYING DARKNESS FELL OVER ABRAM...</div>
              {Array.from({length:6},(_,i)=>(
                <div key={i} className="l20-dark-shape"
                  style={{top:`${15+i*12}%`,animationDelay:`${i*0.4}s`,animationDuration:`${2.2+(i*0.3)%1.2}s`}}>🦅</div>
              ))}
            </div>
          )}

          {p3Sub==='questions' && (
            <div className="l20-q-card l20-q-sleep-card">
              <div className="l20-q-label l20-q-red">
                {p3QStep===0 ? '⚠️ GOD REVEALS THE FUTURE — +20 🪙' : '⚠️ HOW LONG? — +20 🪙'}
              </div>
              <p className="l20-q-text">{p3QStep===0 ? P3Q1.q : P3Q2.q}</p>
              {p3QStep===0 ? (
                <div className="l20-yn-row">
                  {P3Q1.opts.map((o,i)=>(
                    <button key={i} className={`l20-yn-btn${p3Sel===i?(i===P3Q1.ans?' correct':' wrong'):''}`}
                      disabled={p3Sel!==null||p3Grace} onClick={()=>handleP3Q(i)}>{o}</button>
                  ))}
                </div>
              ) : (
                <div className="l20-mc-opts">
                  {P3Q2.opts.map((o,i)=>(
                    <button key={i} className={`l20-mc-opt${p3Sel===i?(i===P3Q2.ans?' correct':' wrong'):''}`}
                      disabled={p3Sel!==null||p3Grace} onClick={()=>handleP3Q(i)}>{o}</button>
                  ))}
                </div>
              )}
              {p3Grace && <div className="l20-grace">✨ Re-read what God revealed — try again!</div>}
            </div>
          )}

          {p3Sub==='covenant' && (
            <div className="l20-covenant-scene">
              <div className="l20-cov-prompt">TAP BOTH AS THEY PASS BETWEEN THE PIECES!</div>
              <div className="l20-altar-split">
                <div className="l20-split-piece">🥩</div>
                <div className="l20-split-gap" />
                <div className="l20-split-piece">🥩</div>
              </div>

              {firepotVisible && (
                <button className={`l20-firepot${firepotTapped?' tapped':''}`}
                  onClick={tapFirepot} disabled={firepotTapped}>
                  🔥
                  {!firepotTapped && <span className="l20-cov-label">SMOKING FIREPOT</span>}
                  {firepotTapped && <span className="l20-cov-tapped">+15 🪙</span>}
                </button>
              )}

              {torchVisible && (
                <button className={`l20-torch${torchTapped?' tapped':''}`}
                  onClick={tapTorch} disabled={torchTapped}>
                  🕯️
                  {!torchTapped && <span className="l20-cov-label">BLAZING TORCH</span>}
                  {torchTapped && <span className="l20-cov-tapped">+15 🪙</span>}
                </button>
              )}

              {covenantTextVisible && (
                <div className="l20-cov-text">
                  <div className="l20-cov-t1">ON THAT DAY — GOD MADE A COVENANT WITH ABRAM.</div>
                  <div className="l20-cov-t2">— Genesis 15:18</div>
                  <div className="l20-cov-coins">🪙🪙🪙 COINS RAIN DOWN! 🪙🪙🪙</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 4: Land Promise ── */}
      {phase==='phase4' && (
        <div className="l20-p4-wrap">
          <div className="l20-p4-god-text">
            "TO YOUR DESCENDANTS I GIVE THIS LAND —<br />
            FROM THE RIVER OF EGYPT TO THE GREAT RIVER EUPHRATES."
          </div>

          <div className={`l20-map${mapSealed?' sealed':''}`}>
            {/* Edges */}
            <div className={`l20-edge l20-edge-bottom${boundaryTapped[0]?' active':''}`} />
            <div className={`l20-edge l20-edge-right${boundaryTapped[1]?' active':''}`} />
            <div className={`l20-edge l20-edge-top${boundaryTapped[2]?' active':''}`} />
            <div className={`l20-edge l20-edge-left${boundaryTapped[3]?' active':''}`} />
            {/* Map content */}
            <div className="l20-map-inner">
              <div className="l20-map-label">THE PROMISED LAND</div>
              <div className="l20-map-rivers">🌊 Egypt → Euphrates 🌊</div>
            </div>
            {/* Corner buttons */}
            {[{cls:'sw',idx:0,label:'SW'},{cls:'se',idx:1,label:'SE'},{cls:'ne',idx:2,label:'NE'},{cls:'nw',idx:3,label:'NW'}].map(({cls,idx,label})=>(
              <button key={idx}
                className={`l20-corner l20-corner-${cls}${boundaryTapped[idx]?' sealed-corner':''}`}
                disabled={boundaryTapped[idx]||mapSealed||p4Sub==='question'}
                onClick={()=>tapBoundary(idx)}>
                {boundaryTapped[idx] ? '✅' : label}
                {!boundaryTapped[idx] && <span className="l20-corner-pulse" />}
              </button>
            ))}
            {mapSealed && <div className="l20-map-glow-overlay" />}
          </div>

          {p4Sub==='boundary' && !mapSealed && (
            <div className="l20-boundary-hint">TAP ALL 4 CORNERS TO SEAL THE COVENANT! +10 🪙 EACH</div>
          )}

          {p4Sub==='question' && (
            <div className="l20-q-card l20-q-p4">
              <div className="l20-q-label">⚡ FINAL BOSS — TRUE OR FALSE? +60 🪙 ⚡</div>
              <p className="l20-q-text">{P4Q.q}</p>
              <div className="l20-tf-row l20-tf-big">
                {P4Q.opts.map((o,i)=>(
                  <button key={i} className={`l20-tf-tablet${p4QSel===i?(i===P4Q.ans?' correct':' wrong'):''}`}
                    disabled={p4QSel!==null||p4Grace} onClick={()=>handleP4Q(i)}>{o}</button>
                ))}
              </div>
              {p4Grace && (
                <div className="l20-grace">
                  ✨ Who actually walked between the pieces — Abram or God? Try again!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase==='ending' && (
        <>
          {Array.from({length:24},(_,i)=>(
            <div key={i} className="l20-end-coin"
              style={{left:`${5+(i*3.9)%90}%`,animationDuration:`${1.0+(i*0.12)%1.6}s`,animationDelay:`${(i*0.07)%1.0}s`}}>
              🪙
            </div>
          ))}
          {Array.from({length:16},(_,i)=>(
            <div key={i} className="l20-end-star-fall"
              style={{left:`${(i*6.1)%96}%`,animationDuration:`${1.4+(i*0.16)%1.2}s`,animationDelay:`${(i*0.09)%1.0}s`}}>
              ⭐
            </div>
          ))}
          <div className="l20-end-name">{playerName} — YOUR FAITH IS YOUR RIGHTEOUSNESS!</div>
          <div className="l20-end-tally">
            <div className="l20-tally-label">COINS EARNED THIS LEVEL</div>
            <div className="l20-tally-count">{coinCount} 🪙</div>
          </div>
          <div className="l20-end-stars">
            {[0,1,2].map(i=>(
              <span key={i} className={`l20-star${starsShown>i?' visible':''}`}>⭐</span>
            ))}
          </div>
          {showScripture && (
            <div className="l20-scripture-card">
              <p className="l20-scripture-text">
                "Abram believed God, and it was credited to him as righteousness."
              </p>
              <p className="l20-scripture-ref">— Genesis 15:6</p>
            </div>
          )}
          {showAdvance && (
            <button className="l20-advance-btn"
              onClick={()=>{ phaseRef.current='complete'; setPhase('complete') }}>
              ADVANCE TO LEVEL 1-21 ➡️
            </button>
          )}
        </>
      )}

      {affirm && <div key={affKey} className="l20-affirm">{affirm}</div>}
    </div>
  )
}
