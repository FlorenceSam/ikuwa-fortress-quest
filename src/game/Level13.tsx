import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins, penalizeCoins } from './coins'
import './level13.css'

// ── Data ──────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'game' | 'voiceover' | 'complete'

interface Q { q: string; opts: string[]; ans: string; vo: string; nationIdx: number }
interface NationDef { name: string; lon: number; lat: number; color: string; glow: string; r: number; burstHue: number }
interface Tribe { id: number; x: number; vx: number; color: string; captured: boolean; el: HTMLDivElement | null }
interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }

const MAX_HEALTH = 5
const TRIBE_SPEED = 0.052   // px/ms base
const SPAWN_INTERVAL = 5500  // ms between spawns

const NATION_DEFS: NationDef[] = [
  { name: 'Egypt',       lon: 30,  lat: 26,  color: '#D4A017', glow: '#FFD700', r: 0.10, burstHue: 50  },
  { name: 'Middle East', lon: 44,  lat: 32,  color: '#FFD700', glow: '#FFEE66', r: 0.12, burstHue: 55  },
  { name: 'Europe',      lon: 10,  lat: 50,  color: '#3377FF', glow: '#88BBFF', r: 0.15, burstHue: 220 },
  { name: 'Canaan',      lon: 35,  lat: 31,  color: '#CC44FF', glow: '#EE88FF', r: 0.09, burstHue: 280 },
  { name: 'Babylon',     lon: 44,  lat: 30,  color: '#FF6600', glow: '#FFAA44', r: 0.09, burstHue: 25  },
  { name: 'Assyria',     lon: 43,  lat: 36,  color: '#AAAACC', glow: '#CCCCFF', r: 0.09, burstHue: 220 },
  { name: '70 Nations',  lon:  0,  lat:  0,  color: '#FFFFFF', glow: '#FFFFAA', r:  0,   burstHue: 55  },
  { name: 'Egypt ✦',    lon: 28,  lat: 24,  color: '#FFC000', glow: '#FFE066', r: 0.13, burstHue: 48  },
  { name: 'Babel',       lon: 44,  lat: 33,  color: '#FF3300', glow: '#FF8800', r: 0.10, burstHue: 15  },
  { name: 'All Nations', lon:  0,  lat:  0,  color: '#FFD700', glow: '#FFFFFF', r:  0,   burstHue: 50  },
]

const QUESTIONS: Q[] = [
  { q: "Which of Noah's sons became the father of the Hamitic nations including Egypt and Canaan?",
    opts: ['Shem', 'Japheth', 'Ham', 'Nimrod'], ans: 'Ham',
    vo: 'Victorious Through Christ!', nationIdx: 0 },
  { q: "Which son of Noah is considered the ancestor of the Semitic peoples including the Hebrews and Arabs?",
    opts: ['Ham', 'Japheth', 'Nimrod', 'Shem'], ans: 'Shem',
    vo: 'BOOM!', nationIdx: 1 },
  { q: "The descendants of Japheth spread into which major region of the ancient world?",
    opts: ['Africa and Egypt', 'Arabia and Canaan', 'Europe and Asia Minor', 'The Far East only'],
    ans: 'Europe and Asia Minor', vo: 'FIRE!', nationIdx: 2 },
  { q: "How many sons did Noah have whose descendants became the table of nations?",
    opts: ['Two', 'Four', 'Five', 'Three'], ans: 'Three',
    vo: 'YES!', nationIdx: 3 },
  { q: "Which mighty hunter rose to power among the nations and founded the first great cities?",
    opts: ['Canaan', 'Nimrod', 'Asshur', 'Cush'], ans: 'Nimrod',
    vo: 'HALLELUJAH!', nationIdx: 4 },
  { q: "The city of Nineveh — later a great Assyrian capital — descended from which son of Cush?",
    opts: ['Nimrod', 'Mizraim', 'Put', 'Canaan'], ans: 'Nimrod',
    vo: 'ANOINTED!', nationIdx: 5 },
  { q: "How many total nations are listed in the Table of Nations in Genesis 10?",
    opts: ['40', '50', '60', '70'], ans: '70',
    vo: 'KINGDOM!', nationIdx: 6 },
  { q: "Which nation descended from Mizraim — son of Ham — and became one of the most powerful civilisations in the ancient world?",
    opts: ['Babylon', 'Assyria', 'Egypt', 'Persia'], ans: 'Egypt',
    vo: 'UNSTOPPABLE!', nationIdx: 7 },
  { q: "The spread of nations in Genesis 10 happened after which major event that scattered humanity?",
    opts: ['The flood', 'The Exodus', 'The Tower of Babel', 'The death of Noah'],
    ans: 'The Tower of Babel', vo: 'MAINFRAME!', nationIdx: 8 },
  { q: "According to Acts 17:26 God determined the exact times and places where nations would live. What does this tell us?",
    opts: ['God only cares about Israel', 'Nations exist by accident',
           'God sovereignly placed every nation exactly where He wanted them',
           'Nations chose their own locations'],
    ans: 'God sovereignly placed every nation exactly where He wanted them',
    vo: 'WOW!', nationIdx: 9 },
]

// Continent outlines as [lon, lat] arrays
const CONTINENTS: number[][][] = [
  // Africa
  [[37,37],[41,22],[43,10],[41,-5],[35,-26],[28,-34],[18,-35],[12,-28],[8,-18],[-17,5],[-15,15],[0,17],[15,22],[25,30],[37,37]],
  // Europe
  [[-10,36],[0,38],[15,36],[28,40],[35,42],[27,48],[20,55],[10,54],[0,51],[-5,48],[-10,44],[-10,36]],
  // West Asia / Middle East
  [[28,40],[36,42],[44,42],[56,38],[55,25],[48,20],[44,12],[38,20],[34,32],[28,40]],
  // Central / East Asia
  [[56,38],[70,40],[90,50],[120,44],[130,38],[130,30],[110,20],[90,8],[70,14],[56,38]],
  // North America
  [[-55,47],[-65,46],[-75,45],[-80,40],[-88,16],[-85,10],[-100,22],[-110,26],[-120,34],[-125,48],[-114,60],[-100,62],[-85,50],[-65,50],[-55,47]],
  // South America
  [[-35,-5],[-50,2],[-65,12],[-72,8],[-82,0],[-80,-12],[-70,-42],[-68,-55],[-55,-55],[-52,-32],[-38,-20],[-35,-5]],
  // Australia
  [[114,-22],[120,-34],[130,-35],[140,-38],[145,-38],[150,-34],[148,-20],[136,-12],[128,-15],[114,-22]],
]

const TRIBE_COLORS = ['#FF4455','#44FF88','#4499FF','#FFAA00','#FF55FF','#55FFEE','#FFFF44','#FF8844']

// ── Helpers ───────────────────────────────────────────────────────────────────

function project(lon: number, lat: number, rotDeg: number, R: number, cx: number, cy: number) {
  const lonR = (lon - rotDeg) * Math.PI / 180
  const latR = lat * Math.PI / 180
  return {
    x: cx + Math.sin(lonR) * Math.cos(latR) * R,
    y: cy - Math.sin(latR) * R,
    z: Math.cos(lonR) * Math.cos(latR),
  }
}

function mkBurst(cx: number, cy: number, hue: number, cnt: number, spd: number): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random() * Math.PI * 2
    const s = Math.random() * spd + 2
    return {
      x: cx + (Math.random() - .5) * 24, y: cy + (Math.random() - .5) * 24,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
      r: Math.random() * 3.5 + 0.6, life: 0, max: Math.random() * 55 + 40, hue,
    }
  })
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Level13({ onComplete, onFail }: Props) {
  const name = localStorage.getItem('iq_character') || 'Warrior'

  const [phase,        setPhase]        = useState<Phase>('intro')
  const [coins,        setCoins]        = useState(getCoins)
  const [health,       setHealth]       = useState(MAX_HEALTH)
  const [nationCount,  setNationCount]  = useState(0)
  const [activeQuiz,   setActiveQuiz]   = useState<Q | null>(null)
  const [selectedOpt,  setSelectedOpt]  = useState<string | null>(null)
  const [quizReady,    setQuizReady]    = useState(false)
  const [affirmation,  setAffirmation]  = useState<string | null>(null)
  const [affKey,       setAffKey]       = useState(0)
  const [voicePhrase,  setVoicePhrase]  = useState<string | null>(null)
  const [voPhraseKey,  setVoPhraseKey]  = useState(0)
  const [tribeTick,    setTribeTick]    = useState(0)

  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const rafRef          = useRef(0)
  const rotRef          = useRef(20)
  const particlesRef    = useRef<Pt[]>([])
  const tribesRef       = useRef<Tribe[]>([])
  const tribeElsRef     = useRef(new Map<number, HTMLDivElement>())
  const tribeIdRef      = useRef(0)
  const spawnTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const quizActiveRef   = useRef(false)
  const unlockedRef     = useRef(new Set<number>())
  const flashRef        = useRef(new Map<number, number>())
  const globalBrightRef = useRef(0)
  const questionIdxRef  = useRef(0)
  const phaseRef        = useRef<Phase>('intro')
  const healthRef       = useRef(MAX_HEALTH)
  const lastTickRef     = useRef(Date.now())
  const capturedIdRef   = useRef<number | null>(null)

  // ── Coin helpers ──────────────────────────────────────────────────────────

  const applyCoins = useCallback((delta: number) => {
    if (delta > 0) addCoins(delta)
    else penalizeCoins(Math.abs(delta))
    setCoins(getCoins())
  }, [])

  // ── Speech ────────────────────────────────────────────────────────────────

  const speak = useCallback((text: string, rate = 0.82) => {
    try {
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = rate; utt.pitch = 1.0; utt.volume = 1
      window.speechSynthesis?.speak(utt)
    } catch (_) {}
  }, [])

  // ── Globe drawing (called from RAF) ──────────────────────────────────────

  const drawGlobe = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const W = cv.width, H = cv.height
    ctx.clearRect(0, 0, W, H)

    const cx = W / 2
    const cy = H * 0.38
    const R  = Math.min(W, H) * 0.27
    const rot = rotRef.current

    // ── Sphere base gradient
    const bg = ctx.createRadialGradient(cx - R * .28, cy - R * .28, R * .04, cx, cy, R)
    bg.addColorStop(0,   '#1e4a7a')
    bg.addColorStop(0.45,'#0d2040')
    bg.addColorStop(0.80,'#060e1e')
    bg.addColorStop(1,   '#020509')
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = bg; ctx.fill()

    // ── Clip to sphere
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2); ctx.clip()

    // Global golden fill for Q10
    if (globalBrightRef.current > 0) {
      ctx.fillStyle = `rgba(255,200,50,${globalBrightRef.current * 0.38})`
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
    }

    // ── Continent outlines
    const flash70    = flashRef.current.get(6) || 0
    const contAlpha  = 0.22 + globalBrightRef.current * 0.50 + Math.min(flash70, 1) * 0.20
    for (const path of CONTINENTS) {
      ctx.beginPath()
      let first = true
      for (const [lon, lat] of path) {
        const p = project(lon, lat, rot, R, cx, cy)
        if (p.z > 0) {
          if (first) { ctx.moveTo(p.x, p.y); first = false }
          else ctx.lineTo(p.x, p.y)
        } else {
          first = true
        }
      }
      ctx.strokeStyle = `rgba(100,150,220,${contAlpha})`
      ctx.lineWidth = 1.6; ctx.stroke()
    }

    // ── Nation blobs
    for (let i = 0; i < NATION_DEFS.length; i++) {
      if (!unlockedRef.current.has(i)) continue
      const n = NATION_DEFS[i]
      if (n.r === 0) continue
      const p = project(n.lon, n.lat, rot, R, cx, cy)
      if (p.z <= 0) continue

      const flAmt = Math.min((flashRef.current.get(i) || 0) + flash70 * 0.4, 2)
      const blobR = n.r * R * (0.55 + 0.45 * p.z)

      ctx.save()
      ctx.shadowColor = n.glow
      ctx.shadowBlur  = 12 + flAmt * 22
      const grad = ctx.createRadialGradient(
        p.x - blobR * .2, p.y - blobR * .2, blobR * .05,
        p.x, p.y, blobR * (1 + flAmt * .35)
      )
      grad.addColorStop(0, n.glow)
      grad.addColorStop(0.65, n.color)
      grad.addColorStop(1, n.color + '55')
      ctx.globalAlpha = 0.88 + flAmt * .12
      ctx.beginPath(); ctx.arc(p.x, p.y, blobR * (1 + flAmt * .25), 0, Math.PI * 2)
      ctx.fillStyle = grad; ctx.fill()
      if (flAmt > 0.3) {
        ctx.globalAlpha = flAmt * 0.5
        ctx.beginPath(); ctx.arc(p.x, p.y, blobR * (1.6 + flAmt * .5), 0, Math.PI * 2)
        ctx.strokeStyle = n.glow; ctx.lineWidth = 2; ctx.stroke()
      }
      ctx.restore()
    }

    ctx.restore() // end sphere clip

    // ── Atmosphere rim
    const rim = ctx.createRadialGradient(cx, cy, R * .82, cx, cy, R * 1.06)
    rim.addColorStop(0, 'transparent')
    rim.addColorStop(0.7, 'rgba(70,140,255,0.13)')
    rim.addColorStop(1,   'rgba(40,80,200,0.05)')
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2)
    ctx.fillStyle = rim; ctx.fill()

    // ── Specular highlight
    const spec = ctx.createRadialGradient(cx - R * .30, cy - R * .30, 0, cx - R * .22, cy - R * .22, R * .52)
    spec.addColorStop(0, 'rgba(255,255,255,0.22)')
    spec.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = spec; ctx.fill()

    // ── Particles
    particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
    for (const p of particlesRef.current) {
      p.x += p.vx; p.y += p.vy; p.vx *= .94; p.vy *= .94; p.vy += .07; p.life++
      const t = p.life / p.max, op = Math.pow(1 - t, .55) * .9
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue},100%,65%,${op * .18})`; ctx.fill()
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue},100%,88%,${op})`; ctx.fill()
    }

    // ── Decay flash values
    for (const [k, v] of flashRef.current) {
      const next = v - 0.014
      if (next <= 0) flashRef.current.delete(k)
      else flashRef.current.set(k, next)
    }

    // ── Grow global brightness toward 1 (Q10 effect)
    if (globalBrightRef.current > 0 && globalBrightRef.current < 1) {
      globalBrightRef.current = Math.min(1, globalBrightRef.current + 0.007)
    }
  }, [])

  // ── Tribe spawning ────────────────────────────────────────────────────────

  const spawnTribe = useCallback(() => {
    if (phaseRef.current !== 'game') return
    if (tribesRef.current.filter(t => !t.captured).length >= 3) return
    const id = ++tribeIdRef.current
    const goRight = Math.random() < 0.5
    const speed = TRIBE_SPEED + Math.random() * 0.035
    const tribe: Tribe = {
      id,
      x: goRight ? -70 : window.innerWidth + 30,
      vx: goRight ? speed : -speed,
      color: TRIBE_COLORS[id % TRIBE_COLORS.length],
      captured: false,
      el: null,
    }
    tribesRef.current.push(tribe)
    setTribeTick(k => k + 1)
  }, [])

  const scheduleSpawn = useCallback(() => {
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
    const delay = SPAWN_INTERVAL + Math.random() * 2000
    spawnTimerRef.current = setTimeout(() => {
      spawnTribe()
      scheduleSpawn()
    }, delay)
  }, [spawnTribe])

  // ── Main RAF (globe + tribe movement) ─────────────────────────────────────

  useEffect(() => {
    if (phase === 'complete') return

    const cv = canvasRef.current
    if (cv) { cv.width = window.innerWidth; cv.height = window.innerHeight }

    const onResize = () => {
      if (cv) { cv.width = window.innerWidth; cv.height = window.innerHeight }
    }
    window.addEventListener('resize', onResize)

    lastTickRef.current = Date.now()

    const tick = () => {
      const now = Date.now()
      const dt  = Math.min(now - lastTickRef.current, 80)
      lastTickRef.current = now

      rotRef.current += dt * 0.006
      drawGlobe()

      if (phaseRef.current === 'game' && !quizActiveRef.current) {
        const escaped: number[] = []
        const alive: Tribe[] = []
        for (const t of tribesRef.current) {
          if (t.captured) { alive.push(t); continue }
          t.x += t.vx * dt
          const el = tribeElsRef.current.get(t.id)
          if (el) el.style.left = t.x + 'px'
          if (t.x < -90 || t.x > window.innerWidth + 90) {
            escaped.push(t.id)
          } else {
            alive.push(t)
          }
        }
        if (escaped.length > 0) {
          tribesRef.current = alive
          const newH = Math.max(0, healthRef.current - escaped.length)
          healthRef.current = newH
          setHealth(newH)
          setTribeTick(k => k + 1)
          if (newH <= 0) {
            phaseRef.current = 'voiceover'
            setPhase('voiceover')
            if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [phase, drawGlobe])

  // ── Tribe tap → quiz ──────────────────────────────────────────────────────

  const handleTribeTap = useCallback((id: number) => {
    if (quizActiveRef.current) return
    if (questionIdxRef.current >= QUESTIONS.length) return
    const tribe = tribesRef.current.find(t => t.id === id)
    if (!tribe || tribe.captured) return

    tribe.captured = true
    capturedIdRef.current = id
    quizActiveRef.current = true
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)

    const q = QUESTIONS[questionIdxRef.current]
    setActiveQuiz(q)
    setSelectedOpt(null)
    setQuizReady(false)
    setTimeout(() => setQuizReady(true), 2000)
  }, [])

  // ── Quiz answer ───────────────────────────────────────────────────────────

  const handleAnswer = useCallback((opt: string) => {
    if (!quizReady || selectedOpt !== null || !activeQuiz) return
    setSelectedOpt(opt)
    const correct = opt === activeQuiz.ans
    const ni = activeQuiz.nationIdx

    if (correct) {
      applyCoins(5)
      unlockedRef.current.add(ni)
      flashRef.current.set(ni, 1.2)
      setNationCount(unlockedRef.current.size)

      if (ni === 6) {
        // 70 nations — flash all existing + continent boost
        for (const existing of unlockedRef.current) flashRef.current.set(existing, 1.5)
        flashRef.current.set(6, 2.2)
      }
      if (ni === 9) {
        globalBrightRef.current = 0.01  // begin global illumination
      }

      const cv = canvasRef.current
      if (cv) {
        const cx = cv.width / 2, cy = cv.height * 0.38
        particlesRef.current.push(...mkBurst(cx, cy, NATION_DEFS[ni].burstHue, 90, 11))
        if (ni === 9) {
          for (let i = 0; i < 6; i++) {
            setTimeout(() => {
              particlesRef.current.push(...mkBurst(
                cx + (Math.random() - .5) * 200,
                cy + (Math.random() - .5) * 150,
                Math.random() * 360, 60, 12
              ))
            }, i * 220)
          }
        }
      }

      speak(activeQuiz.vo, 1.1)
      setAffirmation(activeQuiz.vo)
      setAffKey(k => k + 1)
      setTimeout(() => setAffirmation(null), 3000)

      setTimeout(() => {
        // Remove captured tribe
        const tid = capturedIdRef.current
        if (tid !== null) {
          tribesRef.current = tribesRef.current.filter(t => t.id !== tid)
          tribeElsRef.current.delete(tid)
          capturedIdRef.current = null
        }
        setActiveQuiz(null)
        setSelectedOpt(null)
        quizActiveRef.current = false
        questionIdxRef.current++

        if (questionIdxRef.current >= QUESTIONS.length) {
          if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
          phaseRef.current = 'voiceover'
          setPhase('voiceover')
          setTribeTick(k => k + 1)
        } else {
          setTribeTick(k => k + 1)
          scheduleSpawn()
        }
      }, 1800)

    } else {
      applyCoins(-50)
      const newH = Math.max(0, healthRef.current - 1)
      healthRef.current = newH
      setHealth(newH)

      setTimeout(() => {
        const tid = capturedIdRef.current
        if (tid !== null) {
          tribesRef.current = tribesRef.current.filter(t => t.id !== tid)
          tribeElsRef.current.delete(tid)
          capturedIdRef.current = null
        }
        setActiveQuiz(null)
        setSelectedOpt(null)
        quizActiveRef.current = false

        if (newH <= 0) {
          if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
          phaseRef.current = 'voiceover'
          setPhase('voiceover')
          setTribeTick(k => k + 1)
        } else {
          setTribeTick(k => k + 1)
          scheduleSpawn()
        }
      }, 1800)
    }
  }, [activeQuiz, quizReady, selectedOpt, applyCoins, speak, scheduleSpawn])

  // ── Start game ────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    phaseRef.current = 'game'
    setPhase('game')
    speak(
      "These are the clans of Noah's sons according to their lines of descent within their nations. From these the nations spread out over the earth after the flood.",
      0.70
    )
    spawnTribe()
    setTimeout(() => spawnTribe(), 2500)
    scheduleSpawn()
  }, [speak, spawnTribe, scheduleSpawn])

  // ── Voiceover phase ───────────────────────────────────────────────────────

  const VO_TEXT = `Every nation, every tribe, every language — all part of God's sovereign design. ${name}, you are not an accident. You are exactly where God placed you — on purpose, for purpose. You are stronger than you imagine.`

  const VO_PHRASES = [
    { text: 'Every nation, every tribe, every language —', ms: 4400 },
    { text: "all part of God's sovereign design.", ms: 3800 },
    { text: `${name}, you are not an accident.`, ms: 4000 },
    { text: 'You are exactly where God placed you —', ms: 4500 },
    { text: 'on purpose, for purpose.', ms: 3500 },
    { text: 'You are stronger than you imagine.', ms: 5000 },
  ]

  useEffect(() => {
    if (phase !== 'voiceover') return
    const timers: ReturnType<typeof setTimeout>[] = []
    let done = false

    const triggerComplete = () => {
      if (done) return; done = true
      setVoicePhrase(null)
      phaseRef.current = 'complete'
      setPhase('complete')
    }

    try {
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(VO_TEXT)
      utt.rate = 0.70; utt.pitch = 0.96; utt.volume = 1
      const warm = speechSynthesis.getVoices()
        .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
      if (warm) utt.voice = warm
      utt.onend = triggerComplete
      window.speechSynthesis?.speak(utt)
    } catch (_) {}

    let elapsed = 900
    for (const phrase of VO_PHRASES) {
      const t = elapsed
      timers.push(setTimeout(() => { setVoicePhrase(phrase.text); setVoPhraseKey(k => k + 1) }, t))
      elapsed += phrase.ms
    }
    timers.push(setTimeout(triggerComplete, elapsed + 3000))

    return () => timers.forEach(clearTimeout)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="From one man he made all the nations, that they should inhabit the whole earth; and he marked out their appointed times in history."
        verseRef="Acts 17:26"
        voiceLine={`${name}. Every nation, every people — placed by God with purpose. You are exactly where He wants you.`}
        onComplete={onComplete}
      />
    )
  }

  if (phase === 'voiceover') {
    return (
      <div className="l13-wrap">
        <div className="l13-void" />
        <canvas ref={canvasRef} className="l13-canvas" />
        <div className="l13-vo-overlay" />
        <div className="l13-vo-stage">
          {voicePhrase && (
            <p key={voPhraseKey} className="l13-vo-phrase">{voicePhrase}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="l13-wrap">
      <div className="l13-void" />
      <canvas ref={canvasRef} className="l13-canvas" />

      {/* HUD */}
      <div className="l13-hud">
        <div className="l13-health-row">
          {Array.from({ length: MAX_HEALTH }, (_, i) => (
            <span key={i} className={`l13-heart ${i < health ? 'alive' : 'dim'}`}>🏃</span>
          ))}
        </div>
        <div className="l13-nations-badge">
          🌍 {nationCount} <span className="l13-of-10">/ 10 nations born</span>
        </div>
        <CoinHUD
          coins={coins}
          hint="Tap a tribe figure to stop it, then answer correctly to birth a nation on the globe!"
          onCoinsChange={setCoins}
          disabled={!!activeQuiz}
        />
      </div>

      {/* Level title bar */}
      <div className="l13-title-bar">
        <span className="l13-level-label">1-13</span>
        <span className="l13-level-title">The Birth of Nations</span>
      </div>

      {/* Intro overlay */}
      {phase === 'intro' && (
        <div className="l13-intro-overlay">
          <div className="l13-intro-card">
            <h2 className="l13-intro-heading">The Birth of Nations</h2>
            <p className="l13-intro-ref">Genesis 10 — The Table of Nations</p>
            <p className="l13-intro-body">
              Tribe figures race across the screen. TAP one to stop it and answer a question.
              Each correct answer births a glowing nation on the globe.
              Don't let 5 tribes escape!
            </p>
            <button className="l13-start-btn" onClick={startGame}>
              BEGIN THE NATIONS ✦
            </button>
          </div>
        </div>
      )}

      {/* Affirmation burst */}
      {affirmation && (
        <div key={affKey} className="l13-affirmation">{affirmation}</div>
      )}

      {/* Tribe lane */}
      {phase === 'game' && (
        <div className="l13-tribe-lane">
          {tribesRef.current.map(tribe => (
            <div
              key={tribe.id}
              className="l13-tribe"
              style={{ left: tribe.x, '--tc': tribe.color } as React.CSSProperties}
              onPointerDown={() => handleTribeTap(tribe.id)}
              ref={el => {
                if (el) { tribe.el = el; tribeElsRef.current.set(tribe.id, el) }
                else    { tribeElsRef.current.delete(tribe.id); tribe.el = null }
              }}
            >
              <svg width="46" height="60" viewBox="0 0 46 60" aria-hidden>
                <circle cx="23" cy="10" r="9" fill={tribe.color} />
                <rect x="18" y="19" width="10" height="18" rx="3" fill={tribe.color} />
                <line x1="18" y1="23" x2="8"  y2="35" stroke={tribe.color} strokeWidth="3.5" strokeLinecap="round"/>
                <line x1="28" y1="23" x2="38" y2="35" stroke={tribe.color} strokeWidth="3.5" strokeLinecap="round"/>
                <line x1="21" y1="37" x2="15" y2="56" stroke={tribe.color} strokeWidth="3.5" strokeLinecap="round"/>
                <line x1="25" y1="37" x2="31" y2="56" stroke={tribe.color} strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* Quiz modal */}
      {activeQuiz && (
        <div className="l13-quiz-overlay">
          <div className="l13-quiz-card">
            <p className="l13-quiz-q">{activeQuiz.q}</p>
            {!quizReady && <p className="l13-quiz-loading">Reading the ancient scrolls…</p>}
            <div className="l13-quiz-opts">
              {activeQuiz.opts.map((opt, i) => {
                let cls = 'l13-opt'
                if (selectedOpt !== null) {
                  if (opt === activeQuiz.ans) cls += ' l13-opt-correct'
                  else if (opt === selectedOpt) cls += ' l13-opt-wrong'
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    onClick={() => handleAnswer(opt)}
                    disabled={!quizReady || selectedOpt !== null}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
