import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins, penalizeCoins } from './coins'
import './level15.css'

// ── Types & data ──────────────────────────────────────────────────────────────

type Phase = 'intro' | 'game' | 'cascade' | 'voiceover' | 'complete'
type LinkState = 'dim' | 'active' | 'gold' | 'cracked'

const ANCESTORS = ['SHEM','ARPHAXAD','SHELAH','EBER','PELEG','REU','SERUG','NAHOR','TERAH','ABRAM']

interface Q { q: string; opts: string[]; ans: string; vo: string }

const QUESTIONS: Q[] = [
  {
    q: "Shem was the son of Noah who received a special blessing. What did Noah say about the God of Shem?",
    opts: ["He will be the greatest warrior","Praise be to the LORD the God of Shem","Shem will rule all nations","God will abandon Shem's enemies"],
    ans: "Praise be to the LORD the God of Shem", vo: "Keep going!",
  },
  {
    q: "Arphaxad was born how many years after the great flood?",
    opts: ["1 year","5 years","2 years","10 years"],
    ans: "2 years", vo: "Don't stop now!",
  },
  {
    q: "Shelah was the son of Arphaxad. How old was Arphaxad when Shelah was born?",
    opts: ["25 years old","35 years old","45 years old","55 years old"],
    ans: "35 years old", vo: "That's the good stuff!",
  },
  {
    q: "Eber is considered the ancestor of the Hebrew people. What does the name Hebrew likely derive from?",
    opts: ["The name of a city","Eber's own name","A type of language","A mountain range"],
    ans: "Eber's own name", vo: "On fire today!",
  },
  {
    q: "During Peleg's lifetime something significant happened to the earth. What was it?",
    opts: ["The second flood","A great war","The earth was divided","A great earthquake"],
    ans: "The earth was divided", vo: "Nobody does it like you!",
  },
  {
    q: "The name Reu means friend or shepherd. How long did Reu live according to Genesis?",
    opts: ["139 years","207 years","239 years","300 years"],
    ans: "239 years", vo: "That was INCREDIBLE!",
  },
  {
    q: "Serug was Nahor's father. What region did his descendants settle in that later became famous in biblical history?",
    opts: ["Egypt","Canaan","Mesopotamia","Arabia"],
    ans: "Mesopotamia", vo: "Pure genius!",
  },
  {
    q: "Nahor was Terah's father and Abram's grandfather. How old was Nahor when he had his son Terah?",
    opts: ["19 years old","29 years old","39 years old","49 years old"],
    ans: "29 years old", vo: "Wrapped in grace!",
  },
  {
    q: "Terah was Abram's father. Where did Terah originally set out to go with his family before stopping in Haran?",
    opts: ["Egypt","Jerusalem","Canaan","Babylon"],
    ans: "Canaan", vo: "That's how you do it!",
  },
  {
    q: "Abram was the destination of this entire golden chain of generations. What was Abram's name later changed to by God?",
    opts: ["Isaac","Jacob","Abraham","Israel"],
    ans: "Abraham", vo: "Absolutely PERFECT!",
  },
]

interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number }

function mkGoldBurst(cx: number, cy: number, cnt: number): Pt[] {
  return Array.from({ length: cnt }, () => {
    const a = Math.random() * Math.PI * 2
    const s = Math.random() * 9 + 2
    return {
      x: cx + (Math.random() - .5) * 28, y: cy + (Math.random() - .5) * 28,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3,
      r: Math.random() * 3 + 1,
      life: 0, max: Math.random() * 65 + 45,
    }
  })
}

// Link pixel geometry used for burst positioning
const LINK_W = 84, CONN_W = 38
const CHAIN_TOTAL = 10 * LINK_W + 9 * CONN_W  // 1182 px

function linkCentreX(i: number): number {
  return (window.innerWidth - CHAIN_TOTAL) / 2 + i * (LINK_W + CONN_W) + LINK_W / 2
}

interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Level15({ onComplete }: Props) {
  const playerName = localStorage.getItem('iq_character') || 'Warrior'

  const [phase,        setPhase]        = useState<Phase>('intro')
  const [linkStates,   setLinkStates]   = useState<LinkState[]>(Array(10).fill('dim') as LinkState[])
  const [currentLink,  setCurrentLink]  = useState(0)
  const [chainHealth,  setChainHealth]  = useState(3)
  const [coins,        setCoins]        = useState(getCoins)
  const [activeQuiz,   setActiveQuiz]   = useState<Q | null>(null)
  const [selectedOpt,  setSelectedOpt]  = useState<string | null>(null)
  const [quizReady,    setQuizReady]    = useState(false)
  const [affirmation,  setAffirmation]  = useState<string | null>(null)
  const [affKey,       setAffKey]       = useState(0)
  const [voicePhrase,  setVoicePhrase]  = useState<string | null>(null)
  const [voPhraseKey,  setVoPhraseKey]  = useState(0)
  const [showBanner,   setShowBanner]   = useState(false)

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const chainWrapRef = useRef<HTMLDivElement>(null)
  const rafRef       = useRef(0)
  const phaseRef     = useRef<Phase>('intro')
  const particlesRef = useRef<Pt[]>([])

  const unlockedCount   = linkStates.filter(s => s === 'gold').length
  const scrollProgress  = unlockedCount / 10

  // ── Canvas (once on mount) ────────────────────────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── On-demand particle RAF ────────────────────────────────────────────────

  const runParticles = useCallback(() => {
    const cv = canvasRef.current
    if (!cv || rafRef.current !== 0) return
    const tick = () => {
      const ctx = cv.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, cv.width, cv.height)
        particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
        for (const p of particlesRef.current) {
          p.x += p.vx; p.y += p.vy; p.vx *= .93; p.vy *= .93; p.vy += .13; p.life++
          const op = Math.pow(1 - p.life / p.max, .55) * .95
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,200,50,${op * .18})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,235,110,${op * .70})`; ctx.fill()
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,220,${op})`; ctx.fill()
        }
      }
      if (particlesRef.current.length > 0) rafRef.current = requestAnimationFrame(tick)
      else rafRef.current = 0
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const burst = useCallback((cx: number, cy: number, cnt = 90) => {
    particlesRef.current.push(...mkGoldBurst(cx, cy, cnt))
    runParticles()
  }, [runParticles])

  // ── Auto-scroll chain to active link ─────────────────────────────────────

  const activeScrollRef = useCallback((el: HTMLDivElement | null) => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  // ── Speak helpers ─────────────────────────────────────────────────────────

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

  // ── Intro ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => {
      try {
        window.speechSynthesis?.cancel()
        const utt = new SpeechSynthesisUtterance(
          "This is the account of Shem's family line. From the waters of the flood to the call of one man — God was weaving a golden chain of purpose across ten generations. Every name matters. Every life counted. The chain leads to Abram."
        )
        utt.rate = 0.76; utt.pitch = 0.95; utt.volume = 1
        const warm = window.speechSynthesis?.getVoices().find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
        if (warm) utt.voice = warm
        utt.onend = () => { phaseRef.current = 'game'; setPhase('game') }
        window.speechSynthesis?.speak(utt)
      } catch (_) { phaseRef.current = 'game'; setPhase('game') }
    }, 700)
    const fallback = setTimeout(() => {
      if (phaseRef.current === 'intro') { phaseRef.current = 'game'; setPhase('game') }
    }, 26000)
    return () => { clearTimeout(t); clearTimeout(fallback) }
  }, [phase])

  // ── Link tap ─────────────────────────────────────────────────────────────

  const handleLinkTap = useCallback((idx: number) => {
    if (phaseRef.current !== 'game') return
    if (idx !== currentLink) return
    if (linkStates[idx] === 'gold' || activeQuiz) return

    setLinkStates(prev => { const n = [...prev] as LinkState[]; n[idx] = 'active'; return n })
    setTimeout(() => {
      setActiveQuiz(QUESTIONS[idx])
      setSelectedOpt(null)
      setQuizReady(false)
      setTimeout(() => setQuizReady(true), 1200)
    }, 380)
  }, [currentLink, linkStates, activeQuiz])

  // ── Answer ────────────────────────────────────────────────────────────────

  const handleAnswer = useCallback((opt: string) => {
    if (!quizReady || selectedOpt !== null || !activeQuiz) return
    setSelectedOpt(opt)
    const correct = opt === activeQuiz.ans
    const idx = currentLink

    if (correct) {
      addCoins(5); setCoins(getCoins())
      speakAffirm(activeQuiz.vo)
      setAffirmation(activeQuiz.vo)
      setAffKey(k => k + 1)
      setTimeout(() => setAffirmation(null), 3200)

      burst(linkCentreX(idx), window.innerHeight * 0.58, 100)

      setTimeout(() => {
        setLinkStates(prev => { const n = [...prev] as LinkState[]; n[idx] = 'gold'; return n })
        setActiveQuiz(null); setSelectedOpt(null); setQuizReady(false)
        if (idx === 9) { phaseRef.current = 'cascade'; setPhase('cascade') }
        else setCurrentLink(idx + 1)
      }, 1700)
    } else {
      penalizeCoins(50); setCoins(getCoins())
      setLinkStates(prev => { const n = [...prev] as LinkState[]; n[idx] = 'cracked'; return n })
      const newH = chainHealth - 1
      setChainHealth(newH <= 0 ? 3 : newH)  // reset on full break

      setTimeout(() => {
        setLinkStates(prev => { const n = [...prev] as LinkState[]; n[idx] = 'dim'; return n })
        setActiveQuiz(null); setSelectedOpt(null); setQuizReady(false)
      }, 2100)
    }
  }, [quizReady, selectedOpt, activeQuiz, currentLink, chainHealth, burst, speakAffirm])

  // ── Cascade ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'cascade') return

    // Staggered bursts across all link positions
    for (let i = 0; i < 10; i++) {
      setTimeout(() => burst(linkCentreX(i), window.innerHeight * 0.58, 85), i * 110)
    }
    // Golden shower from top
    for (let i = 0; i < 28; i++) {
      setTimeout(() => burst(Math.random() * window.innerWidth, Math.random() * 80, 50), 400 + i * 200)
    }

    // God's voice + bonus coins
    const t1 = setTimeout(() => {
      speak("And from this golden chain — one man would change the world forever. His name was Abram.", 0.72, 0.88)
      addCoins(100); setCoins(getCoins())
    }, 1300)

    const t2 = setTimeout(() => setShowBanner(true), 2300)

    const t3 = setTimeout(() => {
      setShowBanner(false)
      phaseRef.current = 'voiceover'
      setPhase('voiceover')
    }, 9000)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [phase, speak, burst])

  // ── Voiceover ─────────────────────────────────────────────────────────────

  const VO_TEXT  = `Every name in that chain mattered, ${playerName}. Every generation was a link in God's sovereign plan. And just like them — you are a link in God's ongoing story. Your life matters more than you know. You are stronger than you imagine.`
  const VO_PHRASES = [
    { text: 'Every name in that chain mattered —', ms: 4200 },
    { text: `${playerName}, every generation`, ms: 2800 },
    { text: "was a link in God's sovereign plan.", ms: 3800 },
    { text: 'And just like them —', ms: 2600 },
    { text: "you are a link in God's ongoing story.", ms: 4200 },
    { text: 'Your life matters more than you know.', ms: 4400 },
    { text: 'You are stronger than you imagine.', ms: 5000 },
  ]

  useEffect(() => {
    if (phase !== 'voiceover') return
    const timers: ReturnType<typeof setTimeout>[] = []
    let done = false
    const finish = () => { if (done) return; done = true; setVoicePhrase(null); phaseRef.current = 'complete'; setPhase('complete') }
    try {
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(VO_TEXT)
      utt.rate = 0.72; utt.pitch = 0.95; utt.volume = 1
      const warm = window.speechSynthesis?.getVoices().find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
      if (warm) utt.voice = warm
      utt.onend = finish
      window.speechSynthesis?.speak(utt)
    } catch (_) {}
    let ms = 800
    for (const p of VO_PHRASES) {
      const d = ms; timers.push(setTimeout(() => { setVoicePhrase(p.text); setVoPhraseKey(k => k + 1) }, d)); ms += p.ms
    }
    timers.push(setTimeout(finish, ms + 3000))
    return () => timers.forEach(clearTimeout)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); window.speechSynthesis?.cancel() }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="This is the account of Shem's family line."
        verseRef="Genesis 11:10"
        voiceLine={`Every name in that chain mattered, ${playerName}. Your life matters more than you know. You are stronger than you imagine.`}
        onComplete={onComplete}
      />
    )
  }

  const isIntro   = phase === 'intro'
  const isGame    = phase === 'game' || phase === 'cascade'
  const isCascade = phase === 'cascade'
  const isVO      = phase === 'voiceover'

  return (
    <div className={`l15-wrap${isCascade ? ' l15-cascading' : ''}`}>
      <div className="l15-bg" />
      <div className={`l15-overlay${isIntro ? ' l15-overlay-deep' : ''}`} />
      {(isCascade || isVO) && <div className="l15-gold-flood animate" />}
      <canvas ref={canvasRef} className="l15-canvas" />

      {/* ── INTRO ── */}
      {isIntro && (
        <div className="l15-intro-stage">
          <div className="l15-intro-icon">⛓️</div>
          <p className="l15-intro-title">THE GOLDEN CHAIN</p>
          <p className="l15-intro-sub">From Shem to Abram — Ten Generations</p>
          <p className="l15-intro-hint">Listen for your mission…</p>
        </div>
      )}

      {/* ── GAME + CASCADE ── */}
      {isGame && (
        <>
          {/* HUD */}
          <div className="l15-hud">
            <div className="l15-hud-hearts">
              {[0,1,2].map(i => (
                <span key={i} className={`l15-heart${i < chainHealth ? ' alive' : ' dim'}`}>🔗</span>
              ))}
            </div>
            <div className="l15-hud-center">
              <span className="l15-link-progress">
                {currentLink < 10
                  ? `Link ${currentLink + 1} of 10 — ${ANCESTORS[currentLink]}`
                  : 'CHAIN COMPLETE!'}
              </span>
            </div>
            <CoinHUD
              coins={coins}
              hint="TAP each chain link in order to forge the golden chain!"
              onCoinsChange={setCoins}
              disabled={!!activeQuiz}
            />
          </div>

          {/* Parchment scroll */}
          <div className="l15-scroll-area">
            <div
              className="l15-scroll"
              style={{ '--sp': scrollProgress } as React.CSSProperties}
            >
              <p className="l15-scroll-heading">✦ The Line of Shem ✦</p>
              {ANCESTORS.map((n, i) => (
                <p key={i} className={`l15-scroll-name${linkStates[i] === 'gold' ? ' gold' : ''}`}>
                  {n}
                </p>
              ))}
            </div>
          </div>

          {/* THE CHAIN */}
          <div className="l15-chain-wrap" ref={chainWrapRef}>
            <div className="l15-chain">
              {ANCESTORS.map((ancestor, i) => {
                const state = linkStates[i]
                const isNext = i === currentLink && phase === 'game' && !activeQuiz
                return (
                  <div key={i} className="l15-link-cell">
                    {i > 0 && (
                      <div className={`l15-connector${linkStates[i - 1] === 'gold' ? ' gold' : ''}`}>⛓</div>
                    )}
                    <div
                      ref={isNext ? activeScrollRef : undefined}
                      className={`l15-link l15-link-${state}${isNext ? ' l15-link-next' : ''}${isCascade && state === 'gold' ? ' l15-link-cascade' : ''}`}
                      onPointerDown={e => { e.stopPropagation(); handleLinkTap(i) }}
                    >
                      <span className="l15-link-name">{ancestor}</span>
                      {state === 'gold' && <span className="l15-link-star">✦</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Affirmation */}
          {affirmation && <div key={affKey} className="l15-affirmation">{affirmation}</div>}

          {/* Cascade banner */}
          {showBanner && (
            <div className="l15-cascade-banner">
              <p className="l15-banner-main">THE CHAIN IS COMPLETE!</p>
              <p className="l15-banner-sub">Abram is called — the world changes forever</p>
            </div>
          )}

          {/* Quiz modal */}
          {activeQuiz && (
            <div className="l15-quiz-overlay">
              <div className="l15-quiz-card">
                <div className="l15-quiz-ancestor">⛓️ {ANCESTORS[currentLink]}</div>
                <p className="l15-quiz-q">{activeQuiz.q}</p>
                {!quizReady && <p className="l15-quiz-loading">Forging the link…</p>}
                <div className="l15-quiz-opts">
                  {activeQuiz.opts.map((opt, oi) => {
                    let cls = 'l15-opt'
                    if (selectedOpt !== null) {
                      if (opt === activeQuiz.ans) cls += ' l15-opt-correct'
                      else if (opt === selectedOpt) cls += ' l15-opt-wrong'
                    }
                    return (
                      <button
                        key={oi}
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
        </>
      )}

      {/* ── VOICEOVER ── */}
      {isVO && (
        <div className="l15-vo-stage">
          {voicePhrase && <p key={voPhraseKey} className="l15-vo-phrase">{voicePhrase}</p>}
        </div>
      )}
    </div>
  )
}
