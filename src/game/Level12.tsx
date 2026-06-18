import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins, penalizeCoins } from './coins'
import './level12.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const SHAME_WORDS = ['MOCKERY', 'DISGRACE', 'SHAME', 'DISHONOUR', 'RIDICULE', 'EXPOSURE', 'SCORN']
const MAX_HEALTH  = 7
const NOAH_VW     = 76   // Noah sits at 76% from left

interface Q { q: string; opts: string[]; correct: number; ptype: string; aff: string }

const QUESTIONS: Q[] = [
  { q: 'What did Noah plant after the flood?',
    opts: ['A garden', 'A vineyard', 'A forest', 'A wheat field'],
    correct: 1, ptype: 'golden-flash',    aff: "You're Spirit Filled!" },
  { q: 'What is the main moral danger of strong drink?',
    opts: ['Lost social status', 'Breaks moral boundaries and integrity', 'Poor labour', 'Missing sacrifices'],
    correct: 1, ptype: 'sapphire-burst',  aff: 'Enjoy Overflowing Joy!' },
  { q: 'How did Shem and Japheth enter the tent?',
    opts: ['Eyes closed', 'Wives first', 'Walking backward', 'Heads bowed'],
    correct: 2, ptype: 'emerald-streak',  aff: 'Victorious Living is your portion!' },
  { q: 'How does alcohol affect the brain?',
    opts: ['Sharpens memory', 'Slows judgment and self-control', 'Speeds up thinking', 'Only affects emotions'],
    correct: 1, ptype: 'ruby-explosion',  aff: 'Faithful and True child of God!' },
  { q: 'Who did Noah curse after waking?',
    opts: ['Ham', 'Kush', 'Canaan', 'Nimrod'],
    correct: 2, ptype: 'amber-pulse',     aff: 'Unstoppable beloved of God!' },
  { q: 'What should guide us instead of strong drink?',
    opts: ['Peer approval', 'Willpower alone', 'The Holy Spirit daily', 'Material success'],
    correct: 2, ptype: 'indigo-lightning',aff: 'You are Blessed and Empowered!' },
  { q: 'What did Noah prophesy over Shem?',
    opts: ['Great riches', 'Praise be to the LORD God of Shem', 'Kingship over earth', 'No hardship ever'],
    correct: 1, ptype: 'white-gold-beam', aff: "God's Delight!" },
  { q: 'Why must leaders avoid strong drink? (Proverbs 31:4–5)',
    opts: ['Poor example', 'Too expensive', 'It perverts justice for the afflicted', 'Weakens physically'],
    correct: 2, ptype: 'coin-shower',     aff: 'Unstoppable Faith!' },
  { q: "What was God's promise for Japheth?",
    opts: ['Return to Eden', 'Surpass Shem', "Extended territory in Shem's tents", 'Greatest fleet of ships'],
    correct: 2, ptype: 'violet-shockwave',aff: 'Radiating Glory!' },
  { q: 'Which organ is most damaged by alcohol long term?',
    opts: ['Kidneys', 'Liver', 'Lungs', 'Gall bladder'],
    correct: 1, ptype: 'diamond-sparkle', aff: 'Anointed and Equipped!' },
  { q: 'What is the best shield against worldly influences?',
    opts: ['Strict social rules', 'Good reputation alone', 'Active faith, love, and sober purpose', 'Avoiding all contact'],
    correct: 2, ptype: 'nebula-flare',    aff: 'Blessed with Purpose!' },
  { q: 'What allows a person to say no to peer pressure?',
    opts: ['High self-esteem', 'Physical strength', 'Active self-control', 'Hoping others intervene'],
    correct: 2, ptype: 'rainbow-sweep',   aff: 'Enjoy Unstoppable Power!' },
  { q: "What made Shem and Japheth's act truly honourable?",
    opts: ['Public correction', 'Ignoring it', 'Protecting dignity without exploiting the mistake', 'Removing him as patriarch'],
    correct: 2, ptype: 'gold-ribbons',    aff: "God's Favored One!" },
]

// Flat 6-second arrow pace throughout the entire level
const ARROW_INTERVAL = 6000   // ms between arrow spawns
const ARROW_TRAVEL   = 9000   // ms to cross the screen to Noah

// Particle hue presets  [hMin, hMax, count, speed]
const FX: Record<string, [number,number,number,number]> = {
  'golden-flash':   [ 40, 58, 110, 14],
  'sapphire-burst': [205,230, 100, 11],
  'emerald-streak': [110,145,  90, 12],
  'ruby-explosion': [  0, 18, 130, 15],
  'amber-pulse':    [ 28, 45, 110, 12],
  'indigo-lightning':[248,270,  90, 18],
  'white-gold-beam':[ 40, 62, 100, 13],
  'coin-shower':    [ 42, 52,  80,  7],
  'violet-shockwave':[275,298, 100, 13],
  'diamond-sparkle':[175,215, 150,  9],
  'nebula-flare':   [  0,360, 200, 12],
  'rainbow-sweep':  [  0,360, 120, 11],
  'gold-ribbons':   [ 38, 56, 150, 14],
}

// ── Particle helpers ──────────────────────────────────────────────────────────

interface Pt { x:number;y:number;vx:number;vy:number;r:number;life:number;max:number;hue:number }

function mkBurst(cx:number,cy:number,hMin:number,hMax:number,cnt:number,spd:number): Pt[] {
  return Array.from({length:cnt}, () => {
    const a = Math.random()*Math.PI*2
    const s = Math.random()*spd+2
    const h = Math.random()<0.92 ? hMin+Math.random()*(hMax-hMin) : Math.random()*360
    return { x:cx+(Math.random()-.5)*18, y:cy+(Math.random()-.5)*18,
             vx:Math.cos(a)*s, vy:Math.sin(a)*s-3, r:Math.random()*3.5+0.7,
             life:0, max:Math.random()*55+40, hue:h }
  })
}

// ── Arrow objects (managed via refs, not state) ───────────────────────────────

interface Arrow {
  id:number; word:string; y:number   // y in vh
  effectiveMs: number                // accumulated travel time (adjusted for speed)
  travelMs: number                   // total time to reach Noah at full speed
  lastTick: number                   // wall-clock ms of last RAF update
  hit:boolean; blocked:boolean
}

let _aid = 0
function makeArrow(travelMs:number): Arrow {
  return {
    id: ++_aid,
    word: SHAME_WORDS[Math.floor(Math.random()*SHAME_WORDS.length)],
    y: 18 + Math.random()*55,
    effectiveMs: 0,
    travelMs,
    lastTick: Date.now(),
    hit: false, blocked: false,
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'game' | 'redemption' | 'complete'
interface Props { onComplete:()=>void; onFail?:(h:string)=>void; showHint?:boolean }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Level12({ onComplete }: Props) {
  const name = localStorage.getItem('iq_character') || 'Warrior'

  const [phase,         setPhase]         = useState<Phase>('intro')
  const [health,        setHealth]        = useState(MAX_HEALTH)
  const [coins,         setCoins]         = useState(getCoins)
  const [qIndex,        setQIndex]        = useState(0)
  const [activeQuiz,    setActiveQuiz]    = useState<Q|null>(null)
  const [quizAnswer,    setQuizAnswer]    = useState<number|null>(null)
  const [affirmation,   setAffirmation]   = useState<string|null>(null)
  const [affKey,        setAffKey]        = useState(0)
  const [shieldFlash,   setShieldFlash]   = useState<{x:number;y:number;k:number}|null>(null)
  const [hitFlash,      setHitFlash]      = useState(0)   // key to re-trigger hit flash
  const [arrowTick,     setArrowTick]     = useState(0)   // forces arrow re-render
  const [quizReady,     setQuizReady]     = useState(false) // 4s delay before answers unlock

  // Refs for game loop (no state updates per frame)
  const arrowsRef      = useRef<Arrow[]>([])
  const arrowElsRef    = useRef<Map<number,HTMLDivElement>>(new Map())
  const rafRef         = useRef<number>(0)
  const spawnRef       = useRef<ReturnType<typeof setTimeout>|null>(null)
  const quizActiveRef  = useRef(false)
  const qIndexRef      = useRef(0)
  const healthRef      = useRef(MAX_HEALTH)
  const phaseRef       = useRef<Phase>('intro')
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const particlesRef   = useRef<Pt[]>([])
  const canvasRafRef   = useRef<number>(0)

  // Keep refs in sync with state
  useEffect(() => { qIndexRef.current = qIndex }, [qIndex])
  useEffect(() => { healthRef.current = health }, [health])
  useEffect(() => { phaseRef.current  = phase  }, [phase])

  // ── Canvas particle loop ───────────────────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const tick = () => {
      ctx.clearRect(0,0,cv.width,cv.height)
      particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
      for (const p of particlesRef.current) {
        p.x+=p.vx; p.y+=p.vy; p.vx*=.955; p.vy*=.955; p.vy+=.08; p.life++
        const t=p.life/p.max, op=Math.pow(1-t,.6)*.9, rN=p.r*(1+t*.8)
        ctx.beginPath(); ctx.arc(p.x,p.y,rN*3,0,Math.PI*2)
        ctx.fillStyle=`hsla(${p.hue},100%,65%,${op*.18})`; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x,p.y,rN,0,Math.PI*2)
        ctx.fillStyle=`hsla(${p.hue},100%,84%,${op})`; ctx.fill()
      }
      canvasRafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(canvasRafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  // ── Voice helper ───────────────────────────────────────────────────────────
  const speak = useCallback((text:string) => {
    if (!('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate=.82; u.pitch=.96; u.volume=1
      const v = speechSynthesis.getVoices().find(v=>/female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
      if (v) u.voice=v
      window.speechSynthesis.speak(u)
    } catch(_) {}
  }, [])

  // ── Particle burst helper ──────────────────────────────────────────────────
  const burst = useCallback((cx:number, cy:number, ptype:string) => {
    const [hMin,hMax,cnt,spd] = FX[ptype] ?? [45,55,80,10]
    particlesRef.current.push(...mkBurst(cx,cy,hMin,hMax,cnt,spd))
  }, [])

  // ── Spawn arrow ────────────────────────────────────────────────────────────
  const spawnArrow = useCallback(() => {
    if (phaseRef.current !== 'game') return
    arrowsRef.current.push(makeArrow(ARROW_TRAVEL))
    setArrowTick(k => k+1)
  }, [])

  // ── Game RAF loop — moves arrows, checks hits ──────────────────────────────
  const gameLoopRef = useRef<()=>void>(() => {})
  gameLoopRef.current = () => {
    if (phaseRef.current !== 'game') return
    const now = Date.now()
    let needRender = false
    let hitOccurred = false

    for (const a of arrowsRef.current) {
      if (a.hit || a.blocked) continue
      const delta  = now - a.lastTick
      a.lastTick   = now
      a.effectiveMs += delta * (quizActiveRef.current ? 0 : 1.0)  // fully pause during quiz

      const progress = a.effectiveMs / a.travelMs
      const el = arrowElsRef.current.get(a.id)
      if (el) {
        el.style.left = `${Math.min(progress * NOAH_VW, NOAH_VW)}vw`
        needRender = true
      }

      if (progress >= 1) {
        a.hit = true
        hitOccurred = true
      }
    }

    if (hitOccurred) {
      const newHealth = healthRef.current - 1
      healthRef.current = newHealth
      setHealth(newHealth)
      setHitFlash(k => k+1)
      const c = penalizeCoins(50); setCoins(c)
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
      speak('Honour protects. Try again, Warrior!')
      // Remove hit arrows
      arrowsRef.current = arrowsRef.current.filter(a => !a.hit)
      setArrowTick(k => k+1)
      if (newHealth <= 0) {
        // FAIL
        setPhase('complete')  // Use completion screen as graceful exit for now
        return
      }
    }

    rafRef.current = requestAnimationFrame(gameLoopRef.current)
  }

  // ── Restartable spawn loop — call after quiz to resume with fresh 6s cycle ──
  const startSpawning = useCallback((initialDelay: number) => {
    if (spawnRef.current) clearTimeout(spawnRef.current)
    const tick = (delay: number) => {
      spawnRef.current = setTimeout(() => {
        if (phaseRef.current !== 'game') return
        spawnArrow()
        tick(ARROW_INTERVAL)
      }, delay)
    }
    tick(initialDelay)
  }, [spawnArrow])

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    arrowsRef.current = []
    phaseRef.current = 'game'
    setPhase('game')
    setHealth(MAX_HEALTH)
    healthRef.current = MAX_HEALTH
    setQIndex(0)
    qIndexRef.current = 0
    startSpawning(1200)
    rafRef.current = requestAnimationFrame(gameLoopRef.current)
  }, [spawnArrow, startSpawning])

  // ── Tap arrow (block) ──────────────────────────────────────────────────────
  const handleBlock = useCallback((arrowId:number, e:React.MouseEvent|React.TouchEvent) => {
    e.stopPropagation()
    const arrow = arrowsRef.current.find(a => a.id===arrowId && !a.blocked && !a.hit)
    if (!arrow) return
    arrow.blocked = true
    arrowsRef.current = arrowsRef.current.filter(a => a.id!==arrowId)
    setArrowTick(k => k+1)

    // Shield flash position
    const el = arrowElsRef.current.get(arrowId)
    let cx = window.innerWidth*0.5, cy = window.innerHeight*0.5
    if (el) {
      const br = el.getBoundingClientRect()
      cx = br.left + br.width/2; cy = br.top + br.height/2
    }
    setShieldFlash({x:cx, y:cy, k:Date.now()})

    const c = addCoins(2); setCoins(c)
    burst(cx, cy, 'golden-flash')

    // Show quiz if questions remain — stop spawning and freeze arrows
    const qi = qIndexRef.current
    if (qi < 13 && !quizActiveRef.current) {
      if (spawnRef.current) clearTimeout(spawnRef.current)
      quizActiveRef.current = true
      setQuizReady(false)
      setActiveQuiz(QUESTIONS[qi])
      setTimeout(() => setQuizReady(true), 4000)
    }
  }, [burst])

  // ── Answer quiz ────────────────────────────────────────────────────────────
  const handleAnswer = useCallback((optIdx:number) => {
    if (quizAnswer !== null || !activeQuiz) return
    setQuizAnswer(optIdx)
    const qi = qIndexRef.current
    const isCorrect = optIdx === activeQuiz.correct

    if (isCorrect) {
      const c = addCoins(5); setCoins(c)
      burst(window.innerWidth/2, window.innerHeight/2, activeQuiz.ptype)
      setAffirmation(activeQuiz.aff)
      setAffKey(k => k+1)
      speak(activeQuiz.aff)
      setTimeout(() => setAffirmation(null), 3000)

      setTimeout(() => {
        setQuizAnswer(null)
        setActiveQuiz(null)
        setQuizReady(false)
        quizActiveRef.current = false

        const newQi = qi+1
        qIndexRef.current = newQi
        setQIndex(newQi)

        // Reset arrow timestamps so they don't leap forward after the pause
        const now = Date.now()
        for (const a of arrowsRef.current) a.lastTick = now

        if (newQi >= 13) {
          // REDEMPTION
          phaseRef.current = 'redemption'
          setPhase('redemption')
          if (spawnRef.current) clearTimeout(spawnRef.current)
          cancelAnimationFrame(rafRef.current)
          arrowsRef.current = []
          setArrowTick(k => k+1)
          // Burst all particles
          for (let i=0;i<6;i++) {
            setTimeout(() => {
              burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight*.7, 'gold-ribbons')
              burst(Math.random()*window.innerWidth, Math.random()*window.innerHeight*.7, 'violet-shockwave')
            }, i*280)
          }
          speak('HONOUR PREVAILS! You have defended Noah with courage and truth!')
          const bonus = addCoins(100); setCoins(bonus)
          setTimeout(() => setPhase('complete'), 6500)
        } else {
          // Resume arrows after 2-second breather (6s cycle restarts)
          startSpawning(2000)
        }
      }, 2000)
    } else {
      // Wrong answer — resume arrows 2s after dismiss
      const c = penalizeCoins(50); setCoins(c)
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
      setTimeout(() => {
        setQuizAnswer(null)
        setActiveQuiz(null)
        setQuizReady(false)
        quizActiveRef.current = false
        const now = Date.now()
        for (const a of arrowsRef.current) a.lastTick = now
        startSpawning(2000)
      }, 1800)
    }
  }, [quizAnswer, activeQuiz, burst, speak, startSpawning])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(canvasRafRef.current)
      if (spawnRef.current) clearTimeout(spawnRef.current)
      try { window.speechSynthesis.cancel() } catch(_) {}
    }
  }, [])

  // ── Intro voice ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => speak(
      'Noah planted a vineyard. He drank its wine and lay uncovered in his tent. ' +
      'Ham saw and told his brothers. ' +
      'But Shem and Japheth walked backward and covered their father with honour.'
    ), 900)
    return () => clearTimeout(t)
  }, [phase, speak])

  // ── Completion screen ──────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="Wine is a mocker, strong drink is a brawler, and whoever is led astray by it is not wise."
        verseRef="Proverbs 20:1"
        subtitle="you walked the path of honour and wisdom"
        voiceLine={`Like Shem and Japheth, ${name}, you chose honour over mockery. True strength protects the fallen. You are smarter than you imagine.`}
        onComplete={onComplete}
      />
    )
  }

  // ── Redemption screen ──────────────────────────────────────────────────────
  if (phase === 'redemption') {
    return (
      <div className="l12-wrap">
        <div className="l12-bg" />
        <div className="l12-vignette l12-vignette-bright" />
        <canvas ref={canvasRef} className="l12-canvas" />
        <CoinHUD coins={coins} />
        <div className="l12-redemption">
          <div className="l12-noah-redeem">😴</div>
          <div className="l12-garment-glow" />
          <div className="l12-shem">🧔</div>
          <div className="l12-japheth">👱‍♂️</div>
          <div className="l12-reden-banner">⭐ HONOUR PREVAILS! ⭐</div>
          <div className="l12-master-banner">MASTER OF WISDOM AND HONOUR!</div>
        </div>
      </div>
    )
  }

  // ── Intro screen ──────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="l12-wrap">
        <div className="l12-bg" />
        <div className="l12-vignette" />
        <CoinHUD coins={coins} />
        <div className="l12-intro">
          <div className="l12-intro-shield">🛡️</div>
          <h1 className="l12-intro-title">THE MANTLE OF<br/>HONOUR</h1>
          <p className="l12-intro-sub">
            Shame arrows are flying toward Noah. TAP each arrow before it reaches him!
            Block arrows, answer questions, and defend Noah's honour!
          </p>
          <p className="l12-intro-verse">
            "Honour your father and your mother." — Exodus 20:12
          </p>
          <button className="l12-intro-btn" onClick={() => {
            try { window.speechSynthesis?.cancel() } catch(_) {}
            startGame()
          }}>
            DEFEND NOAH'S HONOUR ›
          </button>
        </div>
      </div>
    )
  }

  // ── Game phase ─────────────────────────────────────────────────────────────

  const grapes = Array.from({length:MAX_HEALTH}, (_,i) => i < health)

  return (
    <div className="l12-wrap">
      <div className={`l12-bg${hitFlash ? ' l12-bg-hit' : ''}`} />
      <div className="l12-vignette" />
      <canvas ref={canvasRef} className="l12-canvas" />
      <CoinHUD coins={coins} />

      {/* Vineyard health — top left */}
      <div className="l12-health">
        {grapes.reverse().map((alive,i) => (
          <span key={i} className={`l12-grape${alive ? ' alive' : ' dead'}`}>🍇</span>
        ))}
        <span className="l12-health-label">Honour Shield</span>
      </div>

      {/* Question progress */}
      <div className="l12-q-progress">
        Q {Math.min(qIndex+1,13)}/13
      </div>

      {/* Gameplay instruction banner — always visible, small gold italic */}
      <div className="l12-instruct-banner">
        TAP each shame word before it reaches Noah! Hit all dishonour arrows to protect his legacy.
        Answer each question correctly to keep the vineyard alive!
      </div>

      {/* Noah sleeping — right side */}
      <div className="l12-noah">
        <div className="l12-noah-glow" />
        <span className="l12-noah-emoji">😴</span>
        <span className="l12-noah-label">NOAH</span>
      </div>

      {/* Flying shame arrows */}
      {arrowsRef.current
        .filter(a => !a.hit && !a.blocked)
        .map(a => (
          <div
            key={a.id}
            ref={el => {
              if (el) arrowElsRef.current.set(a.id, el)
              else    arrowElsRef.current.delete(a.id)
            }}
            className="l12-arrow"
            style={{ top: `${a.y}vh` }}
            onClick={e => handleBlock(a.id, e)}
            onTouchStart={e => handleBlock(a.id, e as unknown as React.TouchEvent)}
          >
            <span className="l12-arrow-word">{a.word}</span>
            <span className="l12-arrow-tip">▶</span>
          </div>
        ))
      }
      {/* Invisible re-render trigger */}
      <span style={{display:'none'}}>{arrowTick}</span>

      {/* Shield flash */}
      {shieldFlash && (
        <div
          key={shieldFlash.k}
          className="l12-shield-flash"
          style={{ left: shieldFlash.x, top: shieldFlash.y }}
        >
          🛡️
        </div>
      )}

      {/* Hit flash overlay */}
      {hitFlash > 0 && <div key={hitFlash} className="l12-hit-overlay" />}

      {/* Affirmation burst */}
      {affirmation && (
        <div key={affKey} className="l12-affirmation">{affirmation}</div>
      )}

      {/* Quiz overlay — arrows fully paused while this is visible */}
      {activeQuiz && (
        <div className="l12-quiz-overlay">
          <div className="l12-quiz-card">
            <div className="l12-quiz-qnum">Question {qIndex+1} of 13</div>
            <p className="l12-quiz-q">{activeQuiz.q}</p>
            {!quizReady && (
              <div className="l12-quiz-reading">
                📖 Read the question carefully…
              </div>
            )}
            <div className={`l12-quiz-opts${quizReady ? ' l12-quiz-opts-ready' : ' l12-quiz-opts-locked'}`}>
              {activeQuiz.opts.map((opt,i) => (
                <button
                  key={i}
                  className={`l12-quiz-opt${
                    quizAnswer===i
                      ? i===activeQuiz.correct ? ' correct' : ' wrong'
                      : quizAnswer!==null && i===activeQuiz.correct ? ' correct' : ''
                  }`}
                  onClick={() => handleAnswer(i)}
                  disabled={quizAnswer!==null || !quizReady}
                >
                  {opt}
                </button>
              ))}
            </div>
            {quizReady && quizAnswer === null && (
              <p className="l12-quiz-hint">🛡️ Arrows paused — tap your answer!</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
