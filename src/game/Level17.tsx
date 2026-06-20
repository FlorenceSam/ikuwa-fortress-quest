import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins, penalizeCoins } from './coins'
import './level17.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'phase1' | 'p1trans' | 'phase2' | 'p2trans' | 'phase3' | 'completion' | 'complete'
type ScrollSt = 'waiting' | 'active' | 'answered' | 'burned'

// ── Data ──────────────────────────────────────────────────────────────────────

interface Q { q: string; opts: string[]; ans: string; vo: string; meterShift: number }

const P1: Q[] = [
  {
    q: 'Why did Abram go down to Egypt?',
    opts: ['To establish trade', 'Because of a severe famine', 'To find a bride for Isaac', 'To flee an army'],
    ans: 'Because of a severe famine',
    vo: 'Wait... did you?!', meterShift: 0.12,
  },
  {
    q: 'What did Abram fear would happen if Egyptians knew Sarai was his wife?',
    opts: ['They would tax his wealth', 'Steal his cattle', 'Kill him to take Sarai', 'Enslave his servants'],
    ans: 'Kill him to take Sarai',
    vo: 'Excuse me?!', meterShift: -0.05,
  },
  {
    q: 'Was Abram completely lying when he said Sarai was his sister?',
    opts: ['Yes completely', 'No — Sarai was his paternal half-sister', 'Yes they were unrelated', 'No she was his cousin'],
    ans: 'No — Sarai was his paternal half-sister',
    vo: 'Who ARE you?!', meterShift: 0.18,
  },
  {
    q: 'What did Pharaoh give Abram because of Sarai?',
    opts: ['A military alliance', 'Sheep cattle camels servants silver and gold', 'The throne of Egypt', 'Land in Canaan'],
    ans: 'Sheep cattle camels servants silver and gold',
    vo: 'Okay, I see you!', meterShift: 0.10,
  },
]

const P2: Q[] = [
  {
    q: "How did God respond to Sarai being taken into Pharaoh's palace?",
    opts: ['He did nothing', "Inflicted serious diseases on Pharaoh's household", 'Sent a warrior angel', 'Appeared in a dream'],
    ans: "Inflicted serious diseases on Pharaoh's household",
    vo: 'That was ELITE!', meterShift: 0.12,
  },
  {
    q: "What does God's intervention reveal about His character?",
    opts: ['He only helps perfect people', 'Fiercely guards His purposes even through human weakness', 'Punishes all deception immediately', 'Abandoned Abram for lying'],
    ans: 'Fiercely guards His purposes even through human weakness',
    vo: "You're different!", meterShift: 0.12,
  },
  {
    q: 'God sent plagues even though Abram caused the crisis. What does this prove?',
    opts: ['God was unfair', "God's covenant with Abram was unconditional", 'The plan needed correction', 'Pharaoh had hidden sins'],
    ans: "God's covenant with Abram was unconditional",
    vo: "That's the Spirit!", meterShift: 0.13,
  },
]

const P3: Q[] = [
  {
    q: "What were Pharaoh's first words to Abram?",
    opts: ['You are my eternal enemy!', "What have you done to me? Why didn't you tell me she was your wife?", 'Flee before sundown!', 'Your life is forfeit!'],
    ans: "What have you done to me? Why didn't you tell me she was your wife?",
    vo: 'They broke the mold!', meterShift: 0.08,
  },
  {
    q: 'How did Pharaoh resolve the crisis after confronting Abram?',
    opts: ['Threw Abram in dungeon', 'Commanded his men to send Abram away safely with Sarai and all his wealth', 'Kept Sarai and banished Abram', 'Forced Abram into slavery'],
    ans: 'Commanded his men to send Abram away safely with Sarai and all his wealth',
    vo: 'YES! YES! YES!', meterShift: 0.10,
  },
  {
    q: "What timeless lesson does Abram's experience teach about fear?",
    opts: ['Panic is always the wisest shortcut', 'Fear leads to compromise but God is faithful to redeem our errors', 'God only protects perfect obedience', 'Never interact with the world'],
    ans: 'Fear leads to compromise but God is faithful to redeem our errors',
    vo: 'Heaven is proud!', meterShift: 0.30,
  },
]

const PLAGUE_SYMS = ['🦟', '🔥', '⚡', '🌑', '🤢', '🦗', '🔥', '⚡']
const FUSE_MS   = 10_000
const ANSWER_MS = 15_000

// ── Audio ─────────────────────────────────────────────────────────────────────

function playTones(freqs: number[], vols: number[], dur: number, type: OscillatorType = 'sine', delays?: number[]) {
  try {
    const ctx = new AudioContext()
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.type = type; osc.frequency.value = f
      const d = delays?.[i] ?? 0
      g.gain.setValueAtTime(0, ctx.currentTime + d)
      g.gain.linearRampToValueAtTime(vols[i] ?? 0.2, ctx.currentTime + d + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + dur)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(ctx.currentTime + d); osc.stop(ctx.currentTime + d + dur + 0.05)
    })
  } catch(_) {}
}

function playCorrect(faith: number) {
  const base = 330 + faith * 220
  playTones([base, base*1.25, base*1.5], [0.28, 0.20, 0.14], 0.9, 'sine', [0, 0.1, 0.22])
}
function playWrong() {
  playTones([200, 130, 85], [0.38, 0.30, 0.35], 0.45, 'sawtooth', [0, 0.12, 0.24])
}
function playBoom() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(130, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(18, ctx.currentTime + 2)
    g.gain.setValueAtTime(0.85, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 3)
  } catch(_) {}
}
function playFanfare() {
  const notes = [261, 329, 392, 523, 659, 784, 1047]
  playTones(notes, notes.map(() => 0.22), 1.0, 'sine', notes.map((_, i) => i * 0.11))
}
function playPlagueTap() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(220, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.18)
    g.gain.setValueAtTime(0.5, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.28)
  } catch(_) {}
}
function playFuseBurn() {
  try {
    const ctx = new AudioContext()
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 0.5)
    const src = ctx.createBufferSource(); src.buffer = buf
    const g = ctx.createGain(); g.gain.value = 0.45
    src.connect(g); g.connect(ctx.destination); src.start()
  } catch(_) {}
}

// ── Particles ─────────────────────────────────────────────────────────────────

interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }
interface PlagueFly { id: number; sym: string; x: number; y: number; vx: number; vy: number; tapped: boolean; missed: boolean }

function mkBurst(cx: number, cy: number, cnt: number, hue = 45): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random() * Math.PI * 2; const s = Math.random() * 10 + 2
    return { x: cx, y: cy, vx: Math.cos(a)*s, vy: Math.sin(a)*s-3, r: Math.random()*3+1, life: 0, max: Math.random()*70+50, hue }
  })
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Level17({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Warrior'

  // Core
  const [phase,      setPhase]      = useState<Phase>('intro')
  const [meter,      setMeter]      = useState(0.5)
  const [coins,      setCoins]      = useState(getCoins)
  const [shakeClass, setShakeClass] = useState('')
  const [affirm,     setAffirm]     = useState<string|null>(null)
  const [affKey,     setAffKey]     = useState(0)
  const [failed,     setFailed]     = useState(false)
  const [failReason, setFailReason] = useState('')

  // Phase 1
  const [scrollSt,   setScrollSt]   = useState<ScrollSt[]>(['waiting','waiting','waiting','waiting'])
  const [fuseDisp,   setFuseDisp]   = useState([FUSE_MS, FUSE_MS, FUSE_MS, FUSE_MS])
  const [actScroll,  setActScroll]  = useState<number|null>(null)
  const [p1SelOpt,   setP1SelOpt]   = useState<string|null>(null)
  const [p1Ready,    setP1Ready]    = useState(false)
  const [answerMs,   setAnswerMs]   = useState(ANSWER_MS)

  // Phase 2
  const [plagues,      setPlagues]      = useState<PlagueFly[]>([])
  const [p2Quiz,       setP2Quiz]       = useState<Q|null>(null)
  const [p2SelOpt,     setP2SelOpt]     = useState<string|null>(null)
  const [p2Ready,      setP2Ready]      = useState(false)
  const [pharaohFlinch,setPharaohFlinch]= useState(0)
  const [palaceCracks, setPalaceCracks] = useState(0)

  // Phase 3
  const [p3Idx,      setP3Idx]      = useState(0)
  const [guardWrong, setGuardWrong] = useState(0)
  const [p3SelOpt,   setP3SelOpt]   = useState<string|null>(null)
  const [p3Ready,    setP3Ready]    = useState(false)

  // Completion
  const [showDoors,  setShowDoors]  = useState(false)
  const [showAbram,  setShowAbram]  = useState(false)
  const [showCaravan,setShowCaravan]= useState(false)
  const [showCoins,  setShowCoins]  = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [doorSlam,   setDoorSlam]   = useState(false)
  const [coinDrops,  setCoinDrops]  = useState<number[]>([])

  // Refs
  const phaseRef       = useRef<Phase>('intro')
  const meterRef       = useRef(0.5)
  const scrollStRef    = useRef<ScrollSt[]>(['waiting','waiting','waiting','waiting'])
  const fuseRemRef     = useRef([FUSE_MS, FUSE_MS, FUSE_MS, FUSE_MS])
  const answerMsRef    = useRef(ANSWER_MS)
  const actScrollRef   = useRef<number|null>(null)
  const p2TapRef       = useRef(0)
  const p2QIdxRef      = useRef(0)
  const p2QuizRef      = useRef<Q|null>(null)
  const guardWrongRef  = useRef(0)
  const plagueIdRef    = useRef(0)
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const rafRef         = useRef(0)
  const particlesRef   = useRef<Pt[]>([])

  // ── Canvas setup ─────────────────────────────────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const shake = useCallback(() => {
    setShakeClass('l17-shake')
    setTimeout(() => setShakeClass(''), 700)
  }, [])

  const showAffirm = useCallback((text: string) => {
    setAffirm(text); setAffKey(k => k + 1)
    setTimeout(() => setAffirm(null), 3500)
  }, [])

  const speak = useCallback((text: string, rate = 0.80, pitch = 1.0) => {
    try {
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = rate; utt.pitch = pitch; utt.volume = 1
      window.speechSynthesis?.speak(utt)
    } catch(_) {}
  }, [])

  const speakAffirm = useCallback((text: string) => {
    try {
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = 0.88; utt.pitch = 1.45; utt.volume = 1
      window.speechSynthesis?.speak(utt)
    } catch(_) {}
  }, [])

  const shiftMeter = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(1, meterRef.current + delta))
    meterRef.current = next
    setMeter(next)
    if (next <= 0.05) {
      setFailReason("The Moral Meter reached full FEAR. Trust in God's covenant — try again!")
      setFailed(true)
    }
  }, [])

  const runParticles = useCallback(() => {
    const cv = canvasRef.current
    if (!cv || rafRef.current !== 0) return
    const tick = () => {
      const ctx = cv.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, cv.width, cv.height)
        particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
        for (const p of particlesRef.current) {
          p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy *= 0.93; p.vy += 0.14; p.life++
          const op = Math.pow(1 - p.life/p.max, 0.55) * 0.95
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

  // ── Intro ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => speak(
      "Now there was a famine in the land. And Abram went down to Egypt because the famine was severe. As he was about to enter Egypt he said to Sarai — I know what a beautiful woman you are. When the Egyptians see you they will kill me but let you live. Say you are my sister so that my life will be spared because of you.",
      0.74, 0.90
    ), 700)
    return () => clearTimeout(t)
  }, [phase, speak])

  const startPhase1 = useCallback(() => {
    window.speechSynthesis?.cancel()
    phaseRef.current = 'phase1'; setPhase('phase1')
  }, [])

  // ── Phase 1: fuse interval ────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'phase1') return
    const id = setInterval(() => {
      const ss = scrollStRef.current; const fr = fuseRemRef.current
      let changed = false
      for (let i = 0; i < 4; i++) {
        if (ss[i] !== 'waiting') continue
        fr[i] = Math.max(0, fr[i] - 100)
        changed = true
        if (fr[i] <= 0) {
          ss[i] = 'burned'
          setScrollSt([...ss])
          penalizeCoins(); setCoins(getCoins())
          shiftMeter(-0.15); shake()
          playFuseBurn()
        }
      }
      if (changed) setFuseDisp([...fr])
    }, 100)
    return () => clearInterval(id)
  }, [phase, shake, shiftMeter])

  // Phase 1 completion check
  useEffect(() => {
    if (phase !== 'phase1') return
    if (actScrollRef.current !== null) return
    const all = scrollSt.every(s => s === 'answered' || s === 'burned')
    if (!all) return
    if (scrollSt.every(s => s === 'burned')) {
      setFailReason('All scrolls burned! The wisdom of the ancients is lost.'); setFailed(true); return
    }
    setTimeout(() => { phaseRef.current = 'p1trans'; setPhase('p1trans') }, 700)
  }, [scrollSt, phase])

  // Answer timer (phase 1)
  useEffect(() => {
    if (actScroll === null) return
    answerMsRef.current = ANSWER_MS; setAnswerMs(ANSWER_MS)
    const id = setInterval(() => {
      answerMsRef.current = Math.max(0, answerMsRef.current - 100)
      setAnswerMs(answerMsRef.current)
      if (answerMsRef.current <= 0) {
        clearInterval(id)
        const i = actScrollRef.current!
        penalizeCoins(); setCoins(getCoins())
        shiftMeter(-0.12); playWrong(); shake()
        scrollStRef.current[i] = 'waiting'
        setScrollSt(prev => { const n=[...prev] as ScrollSt[]; n[i]='waiting'; return n })
        actScrollRef.current = null; setActScroll(null)
        setP1SelOpt(null); setP1Ready(false)
      }
    }, 100)
    return () => clearInterval(id)
  }, [actScroll, shake, shiftMeter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScrollTap = useCallback((i: number) => {
    if (phaseRef.current !== 'phase1') return
    if (scrollStRef.current[i] !== 'waiting') return
    if (actScrollRef.current !== null) return
    scrollStRef.current[i] = 'active'
    setScrollSt(prev => { const n=[...prev] as ScrollSt[]; n[i]='active'; return n })
    actScrollRef.current = i; setActScroll(i)
    setP1SelOpt(null); setP1Ready(false)
    setTimeout(() => setP1Ready(true), 800)
  }, [])

  const handleP1Answer = useCallback((opt: string) => {
    if (!p1Ready || p1SelOpt !== null || actScrollRef.current === null) return
    const i = actScrollRef.current
    setP1SelOpt(opt)
    const correct = opt === P1[i].ans
    if (correct) {
      addCoins(5); setCoins(getCoins())
      speakAffirm(P1[i].vo); showAffirm(P1[i].vo)
      shiftMeter(P1[i].meterShift); playCorrect(meterRef.current)
      burst(window.innerWidth/2, window.innerHeight/2)
      setTimeout(() => {
        scrollStRef.current[i] = 'answered'
        setScrollSt(prev => { const n=[...prev] as ScrollSt[]; n[i]='answered'; return n })
        actScrollRef.current = null; setActScroll(null)
        setP1SelOpt(null); setP1Ready(false)
      }, 1500)
    } else {
      penalizeCoins(); setCoins(getCoins())
      shiftMeter(-0.12); playWrong(); shake()
      setTimeout(() => {
        scrollStRef.current[i] = 'waiting'
        setScrollSt(prev => { const n=[...prev] as ScrollSt[]; n[i]='waiting'; return n })
        actScrollRef.current = null; setActScroll(null)
        setP1SelOpt(null); setP1Ready(false)
      }, 1400)
    }
  }, [p1Ready, p1SelOpt, shiftMeter, burst, shake, showAffirm, speakAffirm])

  // ── Phase 1 → 2 transition ────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'p1trans') return
    ;[0.2, 0.4, 0.6, 0.8].forEach((x, i) =>
      setTimeout(() => burst(window.innerWidth*x, window.innerHeight*0.45, 70), i*120)
    )
    speak("God has seen enough — His covenant child needs protecting!", 0.82, 0.88)
    playFanfare()
    const t = setTimeout(() => { phaseRef.current = 'phase2'; setPhase('phase2') }, 3600)
    return () => clearTimeout(t)
  }, [phase, speak, burst])

  // ── Phase 2: plague movement ──────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'phase2') return
    const id = setInterval(() => {
      const slow = p2QuizRef.current !== null
      const factor = slow ? 0.22 : 1
      setPlagues(prev => prev
        .map(p => {
          if (p.tapped || p.missed) return p
          const nx = p.x + p.vx * factor
          const ny = p.y + p.vy * factor
          const off = p.vx > 0 ? nx > window.innerWidth + 110 : nx < -110
          if (off) return { ...p, missed: true }
          return { ...p, x: nx, y: ny }
        })
        .filter(p => !(p.missed && !p.tapped))
      )
    }, 30)
    return () => clearInterval(id)
  }, [phase])

  // Spawn plagues every 4 seconds
  const spawnPlague = useCallback(() => {
    if (phaseRef.current !== 'phase2') return
    const id = ++plagueIdRef.current
    const left = Math.random() > 0.5
    const sym = PLAGUE_SYMS[Math.floor(Math.random() * PLAGUE_SYMS.length)]
    const y = window.innerHeight * (0.15 + Math.random() * 0.55)
    const speed = 3.8 + Math.random() * 2.8
    setPlagues(prev => [...prev, {
      id, sym,
      x: left ? -90 : window.innerWidth + 90, y,
      vx: left ? speed : -speed,
      vy: (Math.random()-0.5) * 1.5,
      tapped: false, missed: false,
    }])
  }, [])

  useEffect(() => {
    if (phase !== 'phase2') return
    if (p2Quiz) return
    spawnPlague()
    const id = setInterval(spawnPlague, 4000)
    return () => clearInterval(id)
  }, [phase, p2Quiz, spawnPlague])

  const handlePlagueTap = useCallback((id: number) => {
    if (phaseRef.current !== 'phase2') return
    if (p2QuizRef.current !== null) return
    setPlagues(prev => prev.map(p => p.id === id ? { ...p, tapped: true } : p))
    shake(); setPharaohFlinch(k => k+1); playPlagueTap()
    burst(window.innerWidth/2, window.innerHeight*0.38, 55, 18)

    const newTap = p2TapRef.current + 1; p2TapRef.current = newTap
    if (newTap % 2 === 0 && p2QIdxRef.current < P2.length) {
      const qIdx = p2QIdxRef.current
      setTimeout(() => {
        setPlagues([])
        const q = P2[qIdx]
        p2QuizRef.current = q; setP2Quiz(q)
        setP2SelOpt(null); setP2Ready(false)
        setTimeout(() => setP2Ready(true), 900)
      }, 500)
    }
  }, [shake, burst])

  // Answer timer (phase 2)
  useEffect(() => {
    if (!p2Quiz || p2SelOpt !== null) return
    answerMsRef.current = ANSWER_MS; setAnswerMs(ANSWER_MS)
    const id = setInterval(() => {
      answerMsRef.current = Math.max(0, answerMsRef.current - 100)
      setAnswerMs(answerMsRef.current)
      if (answerMsRef.current <= 0) {
        clearInterval(id)
        penalizeCoins(); setCoins(getCoins())
        shiftMeter(-0.12); playWrong(); shake()
        p2QuizRef.current = null; setP2Quiz(null)
        setP2SelOpt(null); setP2Ready(false)
      }
    }, 100)
    return () => clearInterval(id)
  }, [p2Quiz, p2SelOpt, shake, shiftMeter])

  const handleP2Answer = useCallback((opt: string) => {
    if (!p2Ready || p2SelOpt !== null || !p2QuizRef.current) return
    const q = p2QuizRef.current
    setP2SelOpt(opt)
    const correct = opt === q.ans
    if (correct) {
      addCoins(5); setCoins(getCoins())
      speakAffirm(q.vo); showAffirm(q.vo)
      shiftMeter(q.meterShift); playCorrect(meterRef.current)
      burst(window.innerWidth/2, window.innerHeight/2, 110); setPalaceCracks(c => c+1)
      setPharaohFlinch(k => k+3); shake()
      p2QIdxRef.current += 1
      setTimeout(() => {
        p2QuizRef.current = null; setP2Quiz(null)
        setP2SelOpt(null); setP2Ready(false)
        if (p2QIdxRef.current >= P2.length) {
          setTimeout(() => { phaseRef.current = 'p2trans'; setPhase('p2trans') }, 500)
        }
      }, 1600)
    } else {
      penalizeCoins(); setCoins(getCoins())
      shiftMeter(-0.12); playWrong(); shake()
      setTimeout(() => {
        setP2SelOpt(null); setP2Ready(false)
        setTimeout(() => setP2Ready(true), 600)
      }, 1300)
    }
  }, [p2Ready, p2SelOpt, shiftMeter, burst, shake, showAffirm, speakAffirm])

  // ── Phase 2 → 3 transition ────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'p2trans') return
    setPlagues([])
    speak("BRING ABRAM TO ME — NOW!", 0.92, 0.75)
    shake(); playBoom()
    const t = setTimeout(() => {
      phaseRef.current = 'phase3'; setPhase('phase3')
      setP3Ready(false); setTimeout(() => setP3Ready(true), 1400)
    }, 3200)
    return () => clearTimeout(t)
  }, [phase, speak, shake])

  // ── Phase 3: answer timer ─────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'phase3' || !p3Ready || p3SelOpt !== null) return
    answerMsRef.current = ANSWER_MS; setAnswerMs(ANSWER_MS)
    const id = setInterval(() => {
      answerMsRef.current = Math.max(0, answerMsRef.current - 100)
      setAnswerMs(answerMsRef.current)
      if (answerMsRef.current <= 0) {
        clearInterval(id)
        const ng = guardWrongRef.current + 1; guardWrongRef.current = ng; setGuardWrong(ng)
        penalizeCoins(); setCoins(getCoins())
        shiftMeter(-0.13); playWrong(); shake()
        speak('Guards step forward!', 0.9, 0.8)
        if (ng >= 3) { setFailReason('The guards surrounded Abram!'); setFailed(true); return }
        setP3SelOpt(null); setP3Ready(false)
        setTimeout(() => setP3Ready(true), 950)
      }
    }, 100)
    return () => clearInterval(id)
  }, [phase, p3Ready, p3SelOpt, shake, shiftMeter, speak])

  const handleP3Answer = useCallback((opt: string) => {
    if (!p3Ready || p3SelOpt !== null) return
    setP3SelOpt(opt)
    const q = P3[p3Idx]; const correct = opt === q.ans
    if (correct) {
      addCoins(5); setCoins(getCoins())
      speakAffirm(q.vo); showAffirm(q.vo)
      shiftMeter(q.meterShift); playCorrect(meterRef.current)
      burst(window.innerWidth/2, window.innerHeight/2, 110)
      if (p3Idx === P3.length - 1) {
        // Final! Golden detonation
        for (let i = 0; i < 10; i++)
          setTimeout(() => burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight, 70, 40+Math.random()*20), i*140)
        setTimeout(() => { phaseRef.current = 'completion'; setPhase('completion') }, 1600)
      } else {
        setTimeout(() => {
          setP3Idx(p => p+1); setP3SelOpt(null); setP3Ready(false)
          setTimeout(() => setP3Ready(true), 950)
        }, 1500)
      }
    } else {
      const ng = guardWrongRef.current + 1; guardWrongRef.current = ng; setGuardWrong(ng)
      penalizeCoins(); setCoins(getCoins())
      shiftMeter(-0.14); playWrong(); shake()
      speak('Guards step forward!', 0.9, 0.8)
      if (ng >= 3) {
        setTimeout(() => { setFailReason('The guards surrounded Abram! Trust God and try again!'); setFailed(true) }, 1200)
        return
      }
      setTimeout(() => {
        setP3SelOpt(null); setP3Ready(false)
        setTimeout(() => setP3Ready(true), 950)
      }, 1400)
    }
  }, [p3Ready, p3SelOpt, p3Idx, shiftMeter, burst, shake, showAffirm, speakAffirm, speak])

  // ── Completion sequence ───────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'completion') return
    meterRef.current = 1; setMeter(1)
    shake()
    const ts = [
      setTimeout(() => setShowDoors(true), 200),
      setTimeout(() => { setShowDoors(false); setShowAbram(true) }, 1300),
      setTimeout(() => { setShowCaravan(true); shake() }, 2200),
      setTimeout(() => { setShowCoins(true); setDoorSlam(true); playBoom() }, 3400),
      setTimeout(() => setDoorSlam(false), 4100),
      setTimeout(() => {
        addCoins(100); setCoins(getCoins())
        setCoinDrops(Array.from({ length: 26 }, (_, i) => i))
        speak("I will bless those who bless you and whoever curses you I will curse!", 0.76, 0.98)
      }, 3900),
      setTimeout(() => { setShowBanner(true); playFanfare() }, 4600),
      setTimeout(() => { phaseRef.current = 'complete'; setPhase('complete') }, 9000),
    ]
    return () => ts.forEach(clearTimeout)
  }, [phase, shake, speak])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current); window.speechSynthesis?.cancel()
  }, [])

  // ── Derived values ────────────────────────────────────────────────────────

  const meterPct    = Math.round(meter * 100)
  const fearOverlay = Math.max(0, (0.5 - meter) * 2 * 0.58)
  const faithGlow   = Math.max(0, (meter - 0.5) * 2 * 0.45)

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="The LORD had said to Abram — I will make you into a great nation and I will bless you."
        verseRef="Genesis 12:2"
        subtitle="even when fear made you stumble — covenant held firm"
        voiceLine={`Even when fear made Abram stumble ${playerName}, God's covenant held firm. God's protection over your life is not based on your flawless perfection — it is anchored entirely to His unbreakable promise. You are stronger and more fiercely protected than you can possibly imagine.`}
        onComplete={onComplete}
      />
    )
  }

  if (failed) {
    return (
      <div className="l17-fail">
        <div className="l17-fail-icon">⚠️</div>
        <h2 className="l17-fail-title">OVERCOME BY FEAR</h2>
        <p className="l17-fail-sub">{failReason}</p>
        <button className="l17-fail-btn" onClick={() => window.location.reload()}>TRY AGAIN</button>
      </div>
    )
  }

  return (
    <div className={`l17-wrap ${shakeClass} ${doorSlam ? 'l17-door-boom' : ''}`}>
      <div className="l17-bg" />
      <div className="l17-base-overlay" />
      <div className="l17-fear-overlay" style={{ opacity: fearOverlay }} />
      <div className="l17-faith-glow"   style={{ opacity: faithGlow }} />
      <canvas ref={canvasRef} className="l17-canvas" />

      {/* Palace crack overlays */}
      {palaceCracks >= 1 && <div className="l17-crack l17-crack-1" />}
      {palaceCracks >= 2 && <div className="l17-crack l17-crack-2" />}
      {palaceCracks >= 3 && <div className="l17-crack l17-crack-3" />}

      {/* ── MORAL METER ── always visible after intro */}
      {phase !== 'intro' && phase !== 'complete' && (
        <div className="l17-meter-bar">
          <span className="l17-meter-fear">⚡ FEAR</span>
          <div className="l17-meter-track">
            <div
              className={`l17-meter-fill ${meterPct < 40 ? 'fear-zone' : meterPct > 60 ? 'faith-zone' : 'mid-zone'}`}
              style={{ width: `${meterPct}%` }}
            />
            <div className="l17-meter-needle" style={{ left: `${meterPct}%` }} />
          </div>
          <span className="l17-meter-faith">FAITH ✨</span>
        </div>
      )}

      {/* Coin HUD */}
      {phase !== 'intro' && phase !== 'complete' && (
        <div className="l17-coin-hud"><CoinHUD coins={coins} /></div>
      )}

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="l17-intro">
          <div className="l17-intro-badge">🏛️</div>
          <h1 className="l17-intro-title">Wife or Half-Sister?</h1>
          <p className="l17-intro-sub">Abram in Egypt — Level 1-17</p>
          <p className="l17-intro-hint">A tale of fear, faith, and covenant protection</p>
          <button className="l17-intro-btn" onClick={startPhase1}>ENTER THE PALACE</button>
        </div>
      )}

      {/* ── PHASE 1 ── */}
      {phase === 'phase1' && (
        <>
          <div className="l17-phase-banner p1">⚖️ THE MORAL CHOICE CHAMBER</div>
          <div className="l17-scrolls">
            {P1.map((_, i) => {
              const st = scrollSt[i]
              const fMs = fuseDisp[i]
              const fusePct = (fMs / FUSE_MS) * 100
              return (
                <div
                  key={i}
                  className={`l17-scroll-card l17-sc-${st}`}
                  onClick={() => handleScrollTap(i)}
                >
                  <div className="l17-sc-icon">
                    {st === 'waiting' ? '📜' : st === 'active' ? '✨' : st === 'answered' ? '✅' : '🔥'}
                  </div>
                  <div className="l17-sc-label">Scroll {i+1}</div>

                  {st === 'waiting' && (
                    <div className="l17-fuse-wrap">
                      <div className="l17-fuse-secs">{Math.ceil(fMs/1000)}s</div>
                      <div className="l17-fuse-track">
                        <div className={`l17-fuse-fill${fusePct < 30 ? ' danger' : ''}`} style={{ width: `${fusePct}%` }} />
                        {fMs > 300 && <span className="l17-fuse-flame">🔥</span>}
                      </div>
                    </div>
                  )}
                  {st === 'answered' && <div className="l17-sc-done">SEALED ✦</div>}
                  {st === 'burned'   && <div className="l17-sc-burned">BURNED</div>}
                  {st === 'waiting'  && <div className="l17-sc-tap">TAP NOW</div>}
                </div>
              )
            })}
          </div>

          {actScroll !== null && (
            <div className="l17-quiz-backdrop">
              <div className="l17-quiz-card">
                <div className="l17-atimer">
                  <div className="l17-atimer-fill" style={{ width: `${(answerMs/ANSWER_MS)*100}%` }} />
                  <span className="l17-atimer-secs">{Math.ceil(answerMs/1000)}s</span>
                </div>
                <div className="l17-quiz-tag">📜 Scroll {actScroll+1}</div>
                <p className="l17-quiz-q">{P1[actScroll].q}</p>
                {!p1Ready && <p className="l17-loading">Unrolling the scroll…</p>}
                <div className="l17-opts">
                  {P1[actScroll].opts.map(opt => {
                    const isSel = p1SelOpt === opt
                    const isAns = opt === P1[actScroll].ans
                    return (
                      <button
                        key={opt}
                        className={`l17-opt${isSel ? (isAns ? ' correct' : ' wrong') : (p1SelOpt && isAns ? ' correct' : '')}`}
                        disabled={!p1Ready || p1SelOpt !== null}
                        onClick={() => handleP1Answer(opt)}
                      >{opt}</button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── P1 TRANSITION ── */}
      {phase === 'p1trans' && (
        <div className="l17-p1trans">
          <p className="l17-p1trans-text">God has seen enough — His covenant child needs protecting!</p>
        </div>
      )}

      {/* ── PHASE 2 ── */}
      {phase === 'phase2' && (
        <>
          <div className="l17-phase-banner p2">🔥 THE PLAGUE STRIKER — TAP EVERY PLAGUE!</div>

          <div className={`l17-pharaoh-wrap${pharaohFlinch > 0 ? ' flinch' : ''}`} key={pharaohFlinch}>
            <span className="l17-pharaoh-fig">👑</span>
            <span className="l17-throne-fig">🏛️</span>
          </div>

          {plagues.filter(p => !p.tapped && !p.missed).map(p => (
            <div
              key={p.id}
              className="l17-plague"
              style={{ left: p.x, top: p.y, position: 'absolute' }}
              onClick={() => handlePlagueTap(p.id)}
            >
              {p.sym}
            </div>
          ))}

          {p2Quiz && (
            <div className="l17-quiz-backdrop">
              <div className="l17-quiz-card">
                <div className="l17-atimer">
                  <div className="l17-atimer-fill" style={{ width: `${(answerMs/ANSWER_MS)*100}%` }} />
                  <span className="l17-atimer-secs">{Math.ceil(answerMs/1000)}s</span>
                </div>
                <div className="l17-quiz-tag">🦟 PLAGUE QUESTION</div>
                <p className="l17-quiz-q">{p2Quiz.q}</p>
                {!p2Ready && <p className="l17-loading">Plagues slowing…</p>}
                <div className="l17-opts">
                  {p2Quiz.opts.map(opt => {
                    const isSel = p2SelOpt === opt; const isAns = opt === p2Quiz.ans
                    return (
                      <button
                        key={opt}
                        className={`l17-opt${isSel ? (isAns ? ' correct' : ' wrong') : (p2SelOpt && isAns ? ' correct' : '')}`}
                        disabled={!p2Ready || p2SelOpt !== null}
                        onClick={() => handleP2Answer(opt)}
                      >{opt}</button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── P2 TRANSITION ── */}
      {phase === 'p2trans' && (
        <div className="l17-p2trans">
          <div className="l17-guards-march">💂💂💂💂</div>
          <p className="l17-p2trans-text">BRING ABRAM TO ME — NOW!</p>
        </div>
      )}

      {/* ── PHASE 3 ── */}
      {phase === 'phase3' && (
        <>
          <div className="l17-phase-banner p3">⚖️ THE ROYAL CONFRONTATION</div>

          <div className="l17-confront-pharaoh">
            <span className="l17-point-fig">🫵</span>
            <span className="l17-pharaoh-crown">👑</span>
          </div>

          <div className="l17-guards-left">
            {[0,1,2].map(i => (
              <div key={i} className={`l17-guard${i < guardWrong ? ' stepped' : ''}`}>💂</div>
            ))}
          </div>
          <div className="l17-guards-right">
            {[0,1,2].map(i => (
              <div key={i} className={`l17-guard${i < guardWrong ? ' stepped' : ''}`}>💂</div>
            ))}
          </div>

          {guardWrong > 0 && (
            <div className="l17-guard-warn">⚠️ {guardWrong}/3 wrong — Guards closing in!</div>
          )}

          <div className="l17-wheel">
            <p className="l17-wheel-q">{P3[p3Idx].q}</p>
            <div className="l17-atimer">
              <div className="l17-atimer-fill" style={{ width: `${(answerMs/ANSWER_MS)*100}%` }} />
              <span className="l17-atimer-secs">{Math.ceil(answerMs/1000)}s</span>
            </div>
            <div className="l17-wheel-opts">
              {P3[p3Idx].opts.map(opt => {
                const isSel = p3SelOpt === opt; const isAns = opt === P3[p3Idx].ans
                return (
                  <button
                    key={opt}
                    className={`l17-opt wheel${isSel ? (isAns ? ' correct' : ' wrong') : (p3SelOpt && isAns ? ' correct' : '')}`}
                    disabled={!p3Ready || p3SelOpt !== null}
                    onClick={() => handleP3Answer(opt)}
                  >{opt}</button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── COMPLETION ── */}
      {phase === 'completion' && (
        <>
          {showDoors  && <div className="l17-doors-burst" />}
          {showAbram  && <div className="l17-exodus"><span className="l17-exodus-chars">🚶‍♂️🚶‍♀️</span></div>}
          {showCaravan && (
            <div className="l17-caravan">
              <div className="l17-caravan-row">🐪🐑🥇🏺💰🐫🐄🎁🪙🐑🐪🛖</div>
            </div>
          )}
          {showCoins && coinDrops.map(i => (
            <div key={i} className="l17-coin-drop" style={{
              left: `${3 + (i * 3.7) % 94}%`,
              animationDuration: `${1.0 + (i*0.13) % 1.6}s`,
              animationDelay: `${(i*0.10) % 0.9}s`,
            }}>🪙</div>
          ))}
          {showBanner && (
            <div className="l17-covenant-banner">
              <div className="l17-banner-text">🛡️ PROTECTED BY COVENANT!</div>
              <div className="l17-banner-coins">+100 🪙</div>
            </div>
          )}
        </>
      )}

      {affirm && <div key={affKey} className="l17-affirm">{affirm}</div>}
    </div>
  )
}
