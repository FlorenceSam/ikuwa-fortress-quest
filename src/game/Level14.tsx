import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins, penalizeCoins } from './coins'
import './level14.css'

// ── Data ──────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'game' | 'collapse' | 'voiceover' | 'complete'

const LANG_WORDS  = ['YORUBA','OKO','HAUSA','ENGLISH','FRENCH','PORTUGUESE','SPANISH','SWAHILI','GERMAN','ARABIC']
const BUBBLE_COLS = ['#FF6B9D','#9B59B6','#3498DB','#E74C3C','#F39C12','#1ABC9C','#E67E22','#2ECC71','#E91E63','#00BCD4']

const BRICK_VO   = ['Block it!', 'Nice reflexes!', 'Stay sharp!', 'Quick hands!']
const BUBBLE_VO  = ['Languages scattered!', 'Confusion spreading!', 'The earth fills!', 'Nations forming!']
const BMISS_VO   = ['The tower weakens!', 'Stay focused!']
const BLMISS_VO  = ['They scattered!', 'Keep tapping!']

function rndVO(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)]
}

// Chaos stages: [brickInterval ms, bubbleInterval ms]
const CHAOS = [
  { brickMs: 3000, bubbleMs: 4000 },   // 0–60 s
  { brickMs: 2000, bubbleMs: 3000 },   // 60–120 s
  { brickMs: 1500, bubbleMs: 2000 },   // 120–180 s
  { brickMs: 900,  bubbleMs: 1400 },   // 180 s+
]

interface Q { q: string; opts: string[]; ans: string; vo: string }
interface Brick  { id: number; x: number; y: number; vy: number; el: HTMLDivElement | null }
interface Bubble { id: number; x: number; y: number; vx: number; vy: number; word: string; color: string; el: HTMLDivElement | null }
interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }

const QUESTIONS: Q[] = [
  { q: "Where did the people of Babel originally come from after the flood?",
    opts: ['Egypt','The East','Canaan','The mountains'], ans: 'The East',
    vo: 'Child of the King!' },
  { q: "What material did the people of Babel use to build instead of stone?",
    opts: ['Wood and clay','Bricks and tar','Sand and limestone','Iron and bronze'],
    ans: 'Bricks and tar', vo: 'Giant slayer energy!' },
  { q: "What was the main motivation behind building the Tower of Babel?",
    opts: ['To worship God','To make a name for themselves','To escape another flood','To honour Noah'],
    ans: 'To make a name for themselves', vo: "That's royalty right there!" },
  { q: "What did God say would happen if humanity remained united in this prideful pursuit?",
    opts: ['They would find God','Nothing they plan would be impossible for them',
           'They would destroy the earth','They would reach heaven physically'],
    ans: 'Nothing they plan would be impossible for them', vo: 'Heaven just cheered!' },
  { q: "What was God's divine solution to stop the tower construction?",
    opts: ['He sent fire','He confused their language','He destroyed the tower directly','He flooded the area again'],
    ans: 'He confused their language', vo: 'Brain like a saint!' },
  { q: "What does the name Babel mean?",
    opts: ['Tower of pride','Gateway of God','Confusion','City of men'],
    ans: 'Confusion', vo: 'Born for this!' },
  { q: "After the language confusion what did God do to the people?",
    opts: ['Punished them with fire','Scattered them over all the earth','Brought them back to Eden','Made them rebuild'],
    ans: 'Scattered them over all the earth', vo: 'Spirit of David!' },
  { q: "The Tower of Babel teaches us that human pride without God leads to what?",
    opts: ['Great achievement','Confusion and division','Peace and unity','Stronger nations'],
    ans: 'Confusion and division', vo: "That's DIVINE!" },
  { q: "In what land was the Tower of Babel built?",
    opts: ['Canaan','Egypt','Shinar','Mesopotamia only'],
    ans: 'Shinar', vo: 'Mic drop moment!' },
  { q: "What New Testament event REVERSED the confusion of Babel — when people heard God's word in their own language?",
    opts: ['The Crucifixion','The Resurrection','The Day of Pentecost','The Transfiguration'],
    ans: 'The Day of Pentecost', vo: 'Next level!' },
]

function mkBurst(cx: number, cy: number, hue: number, cnt: number): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random() * Math.PI * 2
    const s = Math.random() * 11 + 3
    return {
      x: cx + (Math.random() - .5) * 22, y: cy + (Math.random() - .5) * 22,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
      r: Math.random() * 3.5 + 1, life: 0, max: Math.random() * 50 + 35, hue,
    }
  })
}

// Monotone IDs
let _bid = 0, _blid = 0

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Level14({ onComplete }: Props) {
  const name = localStorage.getItem('iq_character') || 'Warrior'

  const [phase,        setPhase]        = useState<Phase>('intro')
  const [showLightning, setShowLightning] = useState(false)
  const [coins,        setCoins]        = useState(getCoins)
  const [towerHealth,  setTowerHealth]  = useState(100)
  const [shakeKey,     setShakeKey]     = useState(0)
  const [activeQuiz,   setActiveQuiz]   = useState<Q | null>(null)
  const [selectedOpt,  setSelectedOpt]  = useState<string | null>(null)
  const [quizReady,    setQuizReady]    = useState(false)
  const [quizReadyKey, setQuizReadyKey] = useState(0)  // restarts timer arc
  const [quizTimer,    setQuizTimer]    = useState(15)
  const [affirmation,  setAffirmation]  = useState<string | null>(null)
  const [affKey,       setAffKey]       = useState(0)
  const [brickTick,    setBrickTick]    = useState(0)
  const [bubbleTick,   setBubbleTick]   = useState(0)
  const [voicePhrase,  setVoicePhrase]  = useState<string | null>(null)
  const [voPhraseKey,  setVoPhraseKey]  = useState(0)
  const [showBanner,   setShowBanner]   = useState(false)
  const [qCount,       setQCount]       = useState(0)

  // ── Refs (mutable game state) ─────────────────────────────────────────────
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const rafRef           = useRef(0)
  const phaseRef         = useRef<Phase>('intro')
  const towerRef         = useRef(100)
  const quizActiveRef    = useRef(false)
  const quizAnsweredRef  = useRef(false)
  const questionIdxRef   = useRef(0)
  const elapsedRef       = useRef(0)
  const lastTickRef      = useRef(Date.now())
  const chaosRef         = useRef(0)
  const collapseRef      = useRef(false)
  const bricksRef        = useRef<Brick[]>([])
  const brickElsRef      = useRef(new Map<number, HTMLDivElement>())
  const bubblesRef       = useRef<Bubble[]>([])
  const bubbleElsRef     = useRef(new Map<number, HTMLDivElement>())
  const brickTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bubbleTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const qTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const qCountdownRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const qTimeoutRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const particlesRef     = useRef<Pt[]>([])
  const activeQuizRef    = useRef<Q | null>(null)
  const speakGameRef     = useRef<(text: string) => void>(() => {})
  const lastMissVORef    = useRef(0)

  // Stable refs to quiz scheduling functions (avoids circular deps)
  const scheduleQRef     = useRef<() => void>(() => {})
  const afterQuizRef     = useRef<(correct: boolean) => void>(() => {})

  // ── Helpers ───────────────────────────────────────────────────────────────

  const applyCoins = useCallback((delta: number) => {
    if (delta > 0) addCoins(delta); else penalizeCoins(Math.abs(delta))
    setCoins(getCoins())
  }, [])

  const speak = useCallback((text: string, rate = 0.82) => {
    try {
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = rate; utt.pitch = 1.0; utt.volume = 1
      window.speechSynthesis?.speak(utt)
    } catch (_) {}
  }, [])

  // Bold celebratory affirmation — cancels everything, high pitch, loud
  const speakAffirm = useCallback((text: string) => {
    try {
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = 0.88; utt.pitch = 1.45; utt.volume = 1
      window.speechSynthesis?.speak(utt)
    } catch (_) {}
  }, [])

  const triggerShake = useCallback(() => setShakeKey(k => k + 1), [])

  const damageHealth = useCallback((amt: number) => {
    const newH = Math.max(0, towerRef.current - amt)
    towerRef.current = newH
    setTowerHealth(newH)
    triggerShake()
    if (newH <= 0 && !collapseRef.current) {
      collapseRef.current = true
      phaseRef.current = 'collapse'
      setPhase('collapse')
    }
  }, [triggerShake])

  // ── Particle burst ────────────────────────────────────────────────────────

  const burst = useCallback((x: number, y: number, hue: number, cnt = 55) => {
    particlesRef.current.push(...mkBurst(x, y, hue, cnt))
  }, [])

  // ── Brick tap ─────────────────────────────────────────────────────────────

  const handleBrickTap = useCallback((id: number) => {
    const idx = bricksRef.current.findIndex(b => b.id === id)
    if (idx === -1) return
    const el = brickElsRef.current.get(id)
    const cx = el ? parseFloat(el.style.left) + 34 : bricksRef.current[idx].x
    const cy = el ? parseFloat(el.style.top)  + 14 : bricksRef.current[idx].y
    bricksRef.current.splice(idx, 1)
    brickElsRef.current.delete(id)
    setBrickTick(k => k + 1)
    burst(cx, cy, 28, 60)
    applyCoins(2)
    speakGameRef.current(rndVO(BRICK_VO))
  }, [burst, applyCoins])

  // ── Bubble tap ────────────────────────────────────────────────────────────

  const handleBubbleTap = useCallback((id: number) => {
    const idx = bubblesRef.current.findIndex(b => b.id === id)
    if (idx === -1) return
    const el = bubbleElsRef.current.get(id)
    const cx = el ? parseFloat(el.style.left) + 50 : bubblesRef.current[idx].x
    const cy = el ? parseFloat(el.style.top)  + 22 : bubblesRef.current[idx].y
    bubblesRef.current.splice(idx, 1)
    bubbleElsRef.current.delete(id)
    setBubbleTick(k => k + 1)
    burst(cx, cy, Math.random() * 360, 50)
    applyCoins(2)
    speakGameRef.current(rndVO(BUBBLE_VO))
  }, [burst, applyCoins])

  // ── Quiz answer ───────────────────────────────────────────────────────────

  const handleAnswer = useCallback((opt: string) => {
    if (!quizReady || selectedOpt !== null || quizAnsweredRef.current) return
    quizAnsweredRef.current = true
    if (qCountdownRef.current) clearInterval(qCountdownRef.current)
    if (qTimeoutRef.current)   clearTimeout(qTimeoutRef.current)
    setSelectedOpt(opt)

    const q = activeQuizRef.current!
    const correct = opt === q.ans
    if (correct) {
      applyCoins(5)
      speakAffirm(q.vo)
      setAffirmation(q.vo)
      setAffKey(k => k + 1)
      setTimeout(() => setAffirmation(null), 3000)
    } else {
      applyCoins(-50)
      damageHealth(5)
    }

    setTimeout(() => afterQuizRef.current(correct), 1800)
  }, [quizReady, selectedOpt, applyCoins, speakAffirm, damageHealth])

  // ── Intro phase (3 s dramatic thunder + lightning before chaos) ──────────

  useEffect(() => {
    if (phase !== 'intro') return
    // Chain God's voice → narrator; VOs continue playing after game starts (bricks only appear 2.2s later)
    try {
      window.speechSynthesis?.cancel()
      const god = new SpeechSynthesisUtterance(
        "Come, let us go down and confuse their language so they will not understand each other!"
      )
      god.rate = 0.72; god.pitch = 0.80; god.volume = 1
      god.onend = () => {
        try {
          const narrator = new SpeechSynthesisUtterance(
            "TAP the falling bricks and language bubbles before they escape! Survive the chaos of Babel!"
          )
          narrator.rate = 1.05; narrator.pitch = 1.15; narrator.volume = 1
          window.speechSynthesis?.speak(narrator)
        } catch (_) {}
      }
      window.speechSynthesis?.speak(god)
    } catch (_) {}
    const flashes = [
      setTimeout(() => setShowLightning(true),  350),
      setTimeout(() => setShowLightning(false), 680),
      setTimeout(() => setShowLightning(true),  1150),
      setTimeout(() => setShowLightning(false), 1430),
      setTimeout(() => setShowLightning(true),  2100),
      setTimeout(() => setShowLightning(false), 2380),
    ]
    const trans = setTimeout(() => {
      phaseRef.current = 'game'
      setPhase('game')
    }, 3200)
    return () => { flashes.forEach(clearTimeout); clearTimeout(trans) }
  }, [phase])

  // ── Main game effect (spawning, RAF, quiz scheduling) ─────────────────────

  useEffect(() => {
    if (phase !== 'game') return

    const cv = canvasRef.current
    if (cv) { cv.width = window.innerWidth; cv.height = window.innerHeight }
    const onResize = () => { if (cv) { cv.width = window.innerWidth; cv.height = window.innerHeight } }
    window.addEventListener('resize', onResize)

    // Non-interrupting quick VO — skips if something important is already speaking
    speakGameRef.current = (text: string) => {
      try {
        if (window.speechSynthesis?.speaking) return
        const utt = new SpeechSynthesisUtterance(text)
        utt.rate = 1.10; utt.pitch = 1.12; utt.volume = 0.95
        window.speechSynthesis?.speak(utt)
      } catch (_) {}
    }

    // ── Spawn helpers
    const spawnBrick = () => {
      if (phaseRef.current !== 'game') return
      const id = ++_bid
      const mx = 80
      const x  = mx + Math.random() * (window.innerWidth - mx * 2)
      const vy = 0.075 + chaosRef.current * 0.025
      const brick: Brick = { id, x, y: -70, vy, el: null }
      bricksRef.current.push(brick)
      setBrickTick(k => k + 1)
    }

    const spawnBubble = () => {
      if (phaseRef.current !== 'game') return
      const id    = ++_blid
      const right = Math.random() < 0.5
      const x     = right ? -110 : window.innerWidth + 30
      const y     = 90 + Math.random() * (window.innerHeight - 240)
      const spd   = 0.075 + chaosRef.current * 0.028
      const vx    = right ? spd : -spd
      const vy    = (Math.random() - 0.5) * 0.025
      const word  = LANG_WORDS[Math.floor(Math.random() * LANG_WORDS.length)]
      const color = BUBBLE_COLS[Math.floor(Math.random() * BUBBLE_COLS.length)]
      bubblesRef.current.push({ id, x, y, vx, vy, word, color, el: null })
      setBubbleTick(k => k + 1)
    }

    // ── Scheduling helpers
    const scheduleBrick = () => {
      if (brickTimerRef.current) clearTimeout(brickTimerRef.current)
      brickTimerRef.current = setTimeout(() => {
        if (phaseRef.current !== 'game') return
        if (!quizActiveRef.current) {
          spawnBrick()
          if (chaosRef.current >= 2) spawnBrick()
        }
        scheduleBrick()
      }, CHAOS[chaosRef.current].brickMs)
    }

    const scheduleBubble = () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
      bubbleTimerRef.current = setTimeout(() => {
        if (phaseRef.current !== 'game') return
        if (!quizActiveRef.current) spawnBubble()
        scheduleBubble()
      }, CHAOS[chaosRef.current].bubbleMs)
    }

    // ── "After quiz" logic (shared by answer + timeout)
    afterQuizRef.current = (_correct: boolean) => {
      const newIdx = questionIdxRef.current + 1
      questionIdxRef.current = newIdx
      setQCount(newIdx)
      setActiveQuiz(null)
      activeQuizRef.current = null
      setSelectedOpt(null)
      setQuizReady(false)
      quizActiveRef.current = false

      const allDone = newIdx >= QUESTIONS.length
      if ((towerRef.current <= 0 || allDone) && !collapseRef.current) {
        collapseRef.current = true
        phaseRef.current = 'collapse'
        setPhase('collapse')
      } else {
        scheduleQRef.current()
      }
    }

    // ── Question scheduling
    scheduleQRef.current = () => {
      if (qTimerRef.current) clearTimeout(qTimerRef.current)
      if (questionIdxRef.current >= QUESTIONS.length) return
      qTimerRef.current = setTimeout(() => {
        if (phaseRef.current !== 'game') return
        quizActiveRef.current = true
        quizAnsweredRef.current = false
        const q = QUESTIONS[questionIdxRef.current]
        activeQuizRef.current = q
        setActiveQuiz(q)
        speak("CHAOS PAUSED — answer wisely!", 0.95)
        setSelectedOpt(null)
        setQuizReady(false)
        setQuizTimer(15)
        setTimeout(() => { setQuizReady(true); setQuizReadyKey(k => k + 1) }, 1500)

        // Countdown display
        let t = 15
        if (qCountdownRef.current) clearInterval(qCountdownRef.current)
        qCountdownRef.current = setInterval(() => {
          t = Math.max(0, t - 1)
          setQuizTimer(t)
          if (t <= 0 && qCountdownRef.current) clearInterval(qCountdownRef.current)
        }, 1000)

        // Auto-timeout after 16.5 s (1.5 s delay + 15 s)
        if (qTimeoutRef.current) clearTimeout(qTimeoutRef.current)
        qTimeoutRef.current = setTimeout(() => {
          if (quizAnsweredRef.current) return
          quizAnsweredRef.current = true
          if (qCountdownRef.current) clearInterval(qCountdownRef.current)
          setSelectedOpt('__timeout__')
          penalizeCoins(50); setCoins(getCoins())
          const newH = Math.max(0, towerRef.current - 5)
          towerRef.current = newH; setTowerHealth(newH)
          triggerShake()
          if (newH <= 0 && !collapseRef.current) {
            collapseRef.current = true; phaseRef.current = 'collapse'; setPhase('collapse')
          }
          setTimeout(() => afterQuizRef.current(false), 1500)
        }, 16500)
      }, 30000)
    }

    // ── RAF loop
    lastTickRef.current = Date.now()

    const tick = () => {
      const now = Date.now()
      const dt  = Math.min(now - lastTickRef.current, 80)
      lastTickRef.current = now

      // Elapsed active time (excluding quiz pauses)
      if (!quizActiveRef.current && phaseRef.current === 'game') {
        elapsedRef.current += dt
        const e = elapsedRef.current
        chaosRef.current = e < 60000 ? 0 : e < 120000 ? 1 : e < 180000 ? 2 : 3
      }

      // Particle canvas
      const ctx = cv?.getContext('2d')
      if (ctx && cv) {
        ctx.clearRect(0, 0, cv.width, cv.height)
        particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
        for (const p of particlesRef.current) {
          p.x += p.vx; p.y += p.vy; p.vx *= .92; p.vy *= .92; p.vy += .10; p.life++
          const t = p.life / p.max, op = Math.pow(1 - t, .5) * .9
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},100%,62%,${op * .2})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue},100%,90%,${op})`; ctx.fill()
        }
      }

      // Freeze during quiz
      if (quizActiveRef.current || phaseRef.current !== 'game') {
        rafRef.current = requestAnimationFrame(tick); return
      }

      // Move bricks — miss = health -5
      let bChanged = false
      const bAlive: Brick[] = []
      for (const b of bricksRef.current) {
        b.y += b.vy * dt
        const el = brickElsRef.current.get(b.id)
        if (el) el.style.top = b.y + 'px'
        if (b.y > window.innerHeight + 50) {
          brickElsRef.current.delete(b.id)
          bChanged = true
          const missNow = Date.now()
          if (missNow - lastMissVORef.current > 2800) {
            lastMissVORef.current = missNow
            speakGameRef.current(rndVO(BMISS_VO))
          }
          const nH = Math.max(0, towerRef.current - 5)
          towerRef.current = nH; setTowerHealth(nH); triggerShake()
          if (nH <= 0 && !collapseRef.current) {
            collapseRef.current = true; phaseRef.current = 'collapse'; setPhase('collapse')
          }
        } else {
          bAlive.push(b)
        }
      }
      if (bChanged) { bricksRef.current = bAlive; setBrickTick(k => k + 1) }

      // Move bubbles — miss = health -3
      let blChanged = false
      const blAlive: Bubble[] = []
      for (const b of bubblesRef.current) {
        b.x += b.vx * dt; b.y += b.vy * dt
        const el = bubbleElsRef.current.get(b.id)
        if (el) { el.style.left = b.x + 'px'; el.style.top = b.y + 'px' }
        if (b.x > window.innerWidth + 130 || b.x < -130) {
          bubbleElsRef.current.delete(b.id)
          blChanged = true
          const missNow = Date.now()
          if (missNow - lastMissVORef.current > 2800) {
            lastMissVORef.current = missNow
            speakGameRef.current(rndVO(BLMISS_VO))
          }
          const nH = Math.max(0, towerRef.current - 3)
          towerRef.current = nH; setTowerHealth(nH)
          if (nH <= 0 && !collapseRef.current) {
            collapseRef.current = true; phaseRef.current = 'collapse'; setPhase('collapse')
          }
        } else {
          blAlive.push(b)
        }
      }
      if (blChanged) { bubblesRef.current = blAlive; setBubbleTick(k => k + 1) }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    // ── Start game
    const initTimer = setTimeout(() => {
      spawnBrick(); spawnBubble()
      scheduleBrick(); scheduleBubble()
      scheduleQRef.current()
    }, 2200)

    // Progressive screen shake every 5 s at max chaos
    const shakeInterval = setInterval(() => {
      if (chaosRef.current >= 3 && phaseRef.current === 'game' && !quizActiveRef.current) {
        triggerShake()
      }
    }, 5000)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(initTimer)
      clearInterval(shakeInterval)
      window.removeEventListener('resize', onResize)
    }
  }, [phase, speak, triggerShake]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Collapse phase ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'collapse') return
    if (brickTimerRef.current)  clearTimeout(brickTimerRef.current)
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
    if (qTimerRef.current)      clearTimeout(qTimerRef.current)
    if (qCountdownRef.current)  clearInterval(qCountdownRef.current)
    if (qTimeoutRef.current)    clearTimeout(qTimeoutRef.current)
    bricksRef.current = []; bubblesRef.current = []
    setBrickTick(k => k + 1); setBubbleTick(k => k + 1)

    addCoins(100); setCoins(getCoins())
    // Chain: God's thunderous line → warm narrator line
    try {
      window.speechSynthesis?.cancel()
      const god = new SpeechSynthesisUtterance(
        "What man builds in pride — God redirects for purpose!"
      )
      god.rate = 0.72; god.pitch = 0.78; god.volume = 1
      god.onend = () => {
        try {
          const narrator = new SpeechSynthesisUtterance("Even in chaos — God always has a plan!")
          narrator.rate = 0.82; narrator.pitch = 1.05; narrator.volume = 1
          window.speechSynthesis?.speak(narrator)
        } catch (_) {}
      }
      window.speechSynthesis?.speak(god)
    } catch (_) {}
    setShowBanner(true)

    const t = setTimeout(() => {
      setShowBanner(false)
      phaseRef.current = 'voiceover'
      setPhase('voiceover')
    }, 6500)
    return () => clearTimeout(t)
  }, [phase])

  // ── Voiceover phase ───────────────────────────────────────────────────────

  const VO_TEXT = `Even in the chaos of confusion, ${name}, God always has a plan. What looks like scattering is often God's sovereign positioning. You are exactly where He needs you. You are stronger than you imagine.`

  const VO_PHRASES = [
    { text: 'Even in the chaos of confusion —', ms: 4200 },
    { text: `${name}, God always has a plan.`, ms: 4000 },
    { text: 'What looks like scattering', ms: 3200 },
    { text: "is often God's sovereign positioning.", ms: 4500 },
    { text: 'You are exactly where He needs you.', ms: 4500 },
    { text: 'You are stronger than you imagine.', ms: 5000 },
  ]

  useEffect(() => {
    if (phase !== 'voiceover') return
    const timers: ReturnType<typeof setTimeout>[] = []
    let done = false
    const triggerComplete = () => {
      if (done) return; done = true
      setVoicePhrase(null); phaseRef.current = 'complete'; setPhase('complete')
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

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    if (brickTimerRef.current)  clearTimeout(brickTimerRef.current)
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
    if (qTimerRef.current)      clearTimeout(qTimerRef.current)
    if (qCountdownRef.current)  clearInterval(qCountdownRef.current)
    if (qTimeoutRef.current)    clearTimeout(qTimeoutRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="So the LORD scattered them from there over all the earth."
        verseRef="Genesis 11:8"
        voiceLine={`Even in the chaos of confusion, ${name}, God always has a plan. You are exactly where He needs you.`}
        onComplete={onComplete}
      />
    )
  }

  if (phase === 'intro') {
    return (
      <div className="l14-wrap">
        <div className="l14-bg" />
        <div className="l14-intro-dark" />
        {showLightning && <div className="l14-lightning" />}
        <div className="l14-intro-stage">
          <p className="l14-intro-voice">
            "Come — let us confuse<br />their language!"
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'voiceover') {
    return (
      <div className="l14-wrap">
        <div className="l14-bg" />
        <div className="l14-dark-overlay" />
        <div className="l14-golden-flood animate" />
        <canvas ref={canvasRef} className="l14-canvas" />
        <div className="l14-vo-stage">
          {voicePhrase && (
            <p key={voPhraseKey} className="l14-vo-phrase">{voicePhrase}</p>
          )}
        </div>
      </div>
    )
  }

  const shakeClass = shakeKey > 0 ? ` l14-shake-${shakeKey % 2}` : ''

  return (
    <div className={`l14-wrap${shakeClass}`}>
      <div className="l14-bg" />
      <div className="l14-dark-overlay" />
      {phase === 'collapse' && <div className="l14-golden-flood animate" />}
      <canvas ref={canvasRef} className="l14-canvas" />

      {/* ── HUD ── */}
      <div className="l14-hud">
        <div className="l14-health-wrap">
          <div className="l14-tower-label">
            <span className="l14-tower-icon">🗼</span>
            <span className="l14-tower-falling-txt">TOWER FALLING</span>
          </div>
          <div className="l14-bar-row">
            <div className="l14-bar-track">
              <div
                className="l14-bar-fill"
                style={{
                  width: `${towerHealth}%`,
                  background: towerHealth > 50 ? '#44DD66' : towerHealth > 25 ? '#FFAA00' : '#FF3333',
                }}
              />
            </div>
            <span className="l14-bar-pct">{Math.round(towerHealth)}%</span>
          </div>
        </div>
        <div className="l14-q-badge">⚡ {qCount}/10</div>
        <CoinHUD
          coins={coins}
          hint="TAP bricks and bubbles to earn coins! Answer questions correctly for +5 coins!"
          onCoinsChange={setCoins}
          disabled={!!activeQuiz}
        />
      </div>

      {/* ── Instruction banner ── */}
      <div className="l14-instruct-banner">
        TAP falling bricks and language bubbles before they escape! Answer questions to survive the chaos!
      </div>

      {/* ── Debris + bubbles layer ── */}
      <div className="l14-debris">
        {bricksRef.current.map(brick => (
          <div
            key={brick.id}
            className="l14-brick"
            style={{ left: brick.x, top: brick.y }}
            onPointerDown={e => { e.stopPropagation(); handleBrickTap(brick.id) }}
            ref={el => {
              if (el) { brick.el = el; brickElsRef.current.set(brick.id, el) }
              else    { brickElsRef.current.delete(brick.id); brick.el = null }
            }}
          />
        ))}
        {bubblesRef.current.map(bubble => (
          <div
            key={bubble.id}
            className="l14-bubble"
            style={{ left: bubble.x, top: bubble.y, background: bubble.color }}
            onPointerDown={e => { e.stopPropagation(); handleBubbleTap(bubble.id) }}
            ref={el => {
              if (el) { bubble.el = el; bubbleElsRef.current.set(bubble.id, el) }
              else    { bubbleElsRef.current.delete(bubble.id); bubble.el = null }
            }}
          >
            {bubble.word}
          </div>
        ))}
      </div>

      {/* ── Affirmation ── */}
      {affirmation && (
        <div key={affKey} className="l14-affirmation">{affirmation}</div>
      )}

      {/* ── Collapse banner ── */}
      {showBanner && (
        <div className="l14-collapse-banner">
          <p className="l14-banner-top">BABEL HAS FALLEN</p>
          <p className="l14-banner-sub">GOD REIGNS!</p>
        </div>
      )}

      {/* ── Quiz modal ── */}
      {activeQuiz && (
        <div className="l14-quiz-overlay">
          <div className="l14-quiz-card">
            <div className="l14-quiz-top">
              <p className="l14-quiz-q">{activeQuiz.q}</p>
              <div className="l14-timer-wrap">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" className="l14-timer-bg" />
                  {quizReady && (
                    <circle key={quizReadyKey} cx="28" cy="28" r="22" className="l14-timer-arc" />
                  )}
                </svg>
                <span className="l14-timer-num">{quizReady ? quizTimer : '…'}</span>
              </div>
            </div>
            {!quizReady && <p className="l14-quiz-loading">⚡ CHAOS PAUSING…</p>}
            <div className="l14-quiz-opts">
              {activeQuiz.opts.map((opt, i) => {
                let cls = 'l14-opt'
                if (selectedOpt !== null) {
                  if (opt === activeQuiz.ans) cls += ' l14-opt-correct'
                  else if (opt === selectedOpt && opt !== activeQuiz.ans) cls += ' l14-opt-wrong'
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
