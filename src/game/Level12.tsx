import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins, penalizeCoins } from './coins'
import './level12.css'

// ── Questions ─────────────────────────────────────────────────────────────────

interface Q {
  q: string
  opts: string[]
  correct: number
  ptype: string
  aff: string
}

const QUESTIONS: Q[] = [
  {
    q: 'According to Genesis 9:20 what did Noah begin to do as a man of the soil after the Ark rested?',
    opts: ['He immediately built a new city', 'He proceeded to plant a vineyard', 'He constructed a monument to the old world', 'He focused entirely on raising livestock'],
    correct: 1, ptype: 'golden-flash', aff: "You're Spirit Filled!",
  },
  {
    q: 'When a person loses self-control through strong drink what is the primary moral danger to their character and relationships?',
    opts: ['It temporarily lowers their social status', 'It makes them lose interest in daily labour', 'It breaks down moral boundaries leading to reckless speech, compromised integrity, and dishonour toward loved ones', 'It strictly prevents them from fulfilling ritual sacrifices'],
    correct: 2, ptype: 'sapphire-burst', aff: 'Enjoy Overflowing Joy!',
  },
  {
    q: 'When Shem and Japheth went to cover their father how did they physically walk into the tent to show absolute honour?',
    opts: ['They walked in quickly with heads bowed', 'They sent their wives ahead to look first', 'They walked backward with a garment on their shoulders so they would not see him', 'They closed their eyes tight and walked in side by side'],
    correct: 2, ptype: 'emerald-streak', aff: 'Victorious Living is your portion!',
  },
  {
    q: "From a medical standpoint how does alcohol scientifically affect the human brain's decision making centres?",
    opts: ['It permanently sharpens peripheral vision and memory', 'It depresses the central nervous system slowing judgment, impulse control, and motor functions', 'It increases speed of electrical signals in the prefrontal cortex', 'It strictly targets emotions without affecting coordination'],
    correct: 1, ptype: 'ruby-explosion', aff: 'Faithful and True child of God!',
  },
  {
    q: 'When Noah awoke and realised what had happened which specific descendant did he explicitly pronounce a curse upon?',
    opts: ['Ham', 'Kush', 'Canaan', 'Nimrod'],
    correct: 2, ptype: 'amber-flare', aff: 'Unstoppable beloved of God!',
  },
  {
    q: 'Instead of allowing strong drink to alter your mood and choices what does a person of moral wisdom choose to be influenced by?',
    opts: ['Seeking constant approval of peers', 'Strictly relying on human willpower alone', 'Living intentionally under daily guidance of the Holy Spirit which brings clarity peace and self-restraint', 'Focusing solely on accumulating material success'],
    correct: 2, ptype: 'indigo-lightning', aff: 'You are Blessed and Empowered!',
  },
  {
    q: "What was the distinct spiritual breakthrough in Noah's prophetic blessing over his son Shem?",
    opts: ['He promised Shem would discover massive gold reserves', 'He declared Praise be to the LORD the God of Shem linking the true line of worship to him', 'He prophesied Shem would become ultimate king of the earth', "He stated Shem's descendants would never experience hardship"],
    correct: 1, ptype: 'white-gold-beam', aff: "God's Delight!",
  },
  {
    q: 'According to Proverbs 31:4–5 why are kings and leaders specifically warned to stay completely clear of strong drink?',
    opts: ['Because it sets a poor example for foreign dignitaries', 'Because the ingredients are too expensive for the royal treasury', 'Lest they drink and forget what has been decreed and pervert the justice due to all the afflicted', 'Because it diminishes physical strength during battle'],
    correct: 2, ptype: 'coin-shower', aff: 'Unstoppable Faith!',
  },
  {
    q: 'What was the precise promise made regarding the territory and future of Japheth?',
    opts: ['That he would return to live in the Garden of Eden', "That his line would surpass Shem's spiritual inheritance", 'That God would extend his territory and let him live in the tents of Shem', 'That he would build the largest fleet of ships on the Mediterranean'],
    correct: 2, ptype: 'violet-shockwave', aff: 'Radiating Glory!',
  },
  {
    q: 'Which vital internal organ bears the primary long-term toxic burden of filtering out alcohol risking irreversible scarring called cirrhosis?',
    opts: ['The kidneys', 'The liver', 'The lungs', 'The gall bladder'],
    correct: 1, ptype: 'diamond-shimmer', aff: 'Anointed and Equipped!',
  },
  {
    q: 'What is the most effective mental shield a person can use to stay morally awake and protected against harmful worldly influences?',
    opts: ['Constructing rigid social rules and avoiding the outside world', 'Believing an outstanding reputation alone prevents bad choices', 'Cultivating active faith, practising genuine love for others, and keeping a clear sober focus on ultimate purpose', 'Ignoring difficult emotions and pretending challenges do not exist'],
    correct: 2, ptype: 'nebula-flare', aff: 'Blessed with Purpose!',
  },
  {
    q: 'When faced with peer pressure or temptation to indulge to excess which internal moral strength allows a person to say no and protect their future?',
    opts: ['Relying on high self-esteem to make others change', 'Possessing great physical strength and social dominance', 'Exercising active self-control which masters temporary impulses to preserve long-term health and honour', 'Hoping someone else will fix a poor decision later'],
    correct: 2, ptype: 'rainbow-sweep', aff: 'Enjoy Unstoppable Power!',
  },
  {
    q: 'What makes the actions of Shem and Japheth a living example of honouring your parents even in their moments of weakness?',
    opts: ['They corrected him publicly so neighbours would learn', 'They ignored the situation completely', 'They protected his dignity and treated his authority with reverent care rather than exploiting his mistake', 'They demanded he step down as patriarch'],
    correct: 2, ptype: 'gold-ribbons', aff: "God's Favored One!",
  },
]

// Hue palette per particle type  [hueMin, hueMax, count, speed]
const FX_CANVAS: Record<string, [number, number, number, number]> = {
  'golden-flash':   [40,  58,  120, 14],
  'sapphire-burst': [205, 230, 100, 11],
  'emerald-streak': [110, 145,  90, 12],
  'ruby-explosion': [  0,  15, 130, 15],
  'amber-flare':    [ 28,  45, 110, 12],
  'indigo-lightning':[248, 270, 90, 18],
  'white-gold-beam':[ 40,  62, 100, 13],
  'coin-shower':    [ 42,  52,  80,  7],
  'violet-shockwave':[275, 298, 100, 13],
  'diamond-shimmer':[175, 215, 150,  9],
  'nebula-flare':   [  0, 360, 200, 12],
  'rainbow-sweep':  [  0, 360, 120, 11],
  'gold-ribbons':   [ 38,  56, 150, 14],
}

// These types also get a CSS overlay class
const FX_OVERLAY: Record<string, string> = {
  'emerald-streak':   'l12-fx-streak',
  'indigo-lightning': 'l12-fx-lightning',
  'white-gold-beam':  'l12-fx-beam',
  'rainbow-sweep':    'l12-fx-rainbow',
  'gold-ribbons':     'l12-fx-flash',
}

// ── Particles ─────────────────────────────────────────────────────────────────

interface Pt { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number }

function mkBurst(cx: number, cy: number, hMin: number, hMax: number, count: number, speed: number, shower = false): Pt[] {
  return Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2
    const s = Math.random() * speed + 2
    const hue = Math.random() < 0.9 ? hMin + Math.random() * (hMax - hMin) : Math.random() * 360
    return {
      x: cx + (Math.random() - 0.5) * 20,
      y: shower ? -10 - Math.random() * 40 : cy + (Math.random() - 0.5) * 20,
      vx: shower ? (Math.random() - 0.5) * 4 : Math.cos(a) * s,
      vy: shower ? Math.random() * 8 + 3 : Math.sin(a) * s - 2,
      r: Math.random() * 4 + 0.8,
      life: 0,
      max: Math.random() * 60 + 45,
      hue,
    }
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'quiz' | 'cascade' | 'complete'
interface Props { onComplete: () => void; onFail?: (h: string) => void; showHint?: boolean }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Level12({ onComplete }: Props) {
  const name = localStorage.getItem('iq_character') || 'Warrior'

  const [phase,          setPhase]          = useState<Phase>('intro')
  const [qIndex,         setQIndex]         = useState(0)
  const [correctCount,   setCorrectCount]   = useState(0)
  const [coins,          setCoins]          = useState(getCoins)
  const [quizAnswer,     setQuizAnswer]     = useState<number | null>(null)
  const [affirmation,    setAffirmation]    = useState<string | null>(null)
  const [affirmationKey, setAffirmationKey] = useState(0)
  const [fxOverlay,      setFxOverlay]      = useState<string | null>(null)
  const [fxOverlayKey,   setFxOverlayKey]   = useState(0)
  const [cascadeAll,     setCascadeAll]     = useState(false)
  const [showBanner,     setShowBanner]     = useState(false)

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Pt[]>([])
  const rafRef       = useRef<number>(0)
  const grapeRefs    = useRef<(HTMLDivElement | null)[]>(Array(13).fill(null))

  // ── Canvas particle loop ───────────────────────────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      particlesRef.current = particlesRef.current.filter(p => p.life < p.max)
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.955; p.vy *= 0.955; p.vy += 0.08
        p.life++
        const t = p.life / p.max
        const op = Math.pow(1 - t, 0.6) * 0.9
        const rN = p.r * (1 + t * 0.8)
        ctx.beginPath(); ctx.arc(p.x, p.y, rN * 3, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},100%,65%,${op * 0.18})`; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, rN, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},100%,84%,${op})`; ctx.fill()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const speakVoice = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = 0.82; utt.pitch = 0.96; utt.volume = 1
      const warm = speechSynthesis.getVoices()
        .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
      if (warm) utt.voice = warm
      window.speechSynthesis.speak(utt)
    } catch (_) {}
  }, [])

  const triggerEffect = useCallback((ptype: string, cx: number, cy: number) => {
    const preset = FX_CANVAS[ptype] ?? [45, 55, 80, 10]
    const [hMin, hMax, count, speed] = preset
    const shower = ptype === 'coin-shower'
    const burstCx = shower ? cx : cx
    const burstCy = shower ? 0 : cy
    particlesRef.current.push(...mkBurst(burstCx, burstCy, hMin, hMax, count, speed, shower))

    const overlayClass = FX_OVERLAY[ptype]
    if (overlayClass) {
      setFxOverlay(overlayClass)
      setFxOverlayKey(k => k + 1)
      setTimeout(() => setFxOverlay(null), 1100)
    }
  }, [])

  // ── Intro voice ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => speakVoice(
      'And Noah, a man of the soil, planted a vineyard. ' +
      'When he drank some of its wine, he became drunk and lay uncovered inside his tent. ' +
      'Ham saw his father naked and told his two brothers outside. ' +
      'But Shem and Japheth took a garment and laid it across their shoulders — ' +
      'and walking backward — they covered their father\'s nakedness.'
    ), 900)
    return () => clearTimeout(t)
  }, [phase, speakVoice])

  // ── Answer handler ─────────────────────────────────────────────────────────

  const handleAnswer = useCallback((optIndex: number) => {
    if (quizAnswer !== null) return
    setQuizAnswer(optIndex)

    const q = QUESTIONS[qIndex]
    const isCorrect = optIndex === q.correct

    if (isCorrect) {
      const newCoins = addCoins(5); setCoins(newCoins)
      const newCorrect = correctCount + 1
      setCorrectCount(newCorrect)

      // Find approximate center of screen for particle burst
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      triggerEffect(q.ptype, cx, cy)

      setAffirmation(q.aff)
      setAffirmationKey(k => k + 1)
      speakVoice(q.aff)
      setTimeout(() => setAffirmation(null), 3200)

      setTimeout(() => {
        setQuizAnswer(null)
        if (newCorrect === 13) {
          // COMPLETION CASCADE
          setCascadeAll(true)
          const bonus = addCoins(100); setCoins(bonus)
          // Burst particles from each grape position
          for (let i = 0; i < 13; i++) {
            const el = grapeRefs.current[i]
            if (el) {
              const br = el.getBoundingClientRect()
              setTimeout(() => {
                particlesRef.current.push(...mkBurst(br.left + br.width / 2, br.top + br.height / 2, 260, 300, 60, 12))
              }, i * 120)
            }
          }
          setTimeout(() => setShowBanner(true), 1400)
          setTimeout(() => { try { window.speechSynthesis.cancel() } catch (_) {} }, 200)
          setTimeout(() => speakVoice('MASTER OF WISDOM AND HONOUR! You have sealed the covenant of honour!'), 1600)
          setTimeout(() => setPhase('complete'), 5500)
        } else {
          setQIndex(qIndex + 1)
        }
      }, 2000)
    } else {
      const c = penalizeCoins(50); setCoins(c)
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
      setTimeout(() => {
        setQuizAnswer(null)
        setQIndex(qIndex + 1)
      }, 2000)
    }
  }, [quizAnswer, qIndex, correctCount, triggerEffect, speakVoice])

  // ── Completion ─────────────────────────────────────────────────────────────

  if (phase === 'complete') {
    return (
      <CompletionScreen
        verse="Wine is a mocker, strong drink is a brawler, and whoever is led astray by it is not wise."
        verseRef="Proverbs 20:1"
        subtitle="you have walked the path of wisdom and honour"
        voiceLine={`Like Shem and Japheth, ${name}, you have chosen the path of honour, wisdom, and self-control. True strength does not mock the fallen — it builds a bridge of respect to protect the legacy. You are smarter than you imagine.`}
        onComplete={onComplete}
      />
    )
  }

  // ── Intro ──────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div className="l12-wrap">
        <div className="l12-bg" />
        <div className="l12-vignette" />
        <CoinHUD coins={coins} />
        <div className="l12-intro">
          <h1 className="l12-intro-title">THE MANTLE OF HONOUR<br />AND WISDOM</h1>
          <p className="l12-intro-sub">
            After the flood, Noah planted a vineyard. In a moment of weakness, his son Ham dishonoured him —
            but Shem and Japheth walked backward to cover their father with dignity.
            This level teaches honour, self-control, and respect for parents.
          </p>
          <p className="l12-intro-verse">
            "Wine is a mocker, strong drink is a brawler, and whoever is led astray by it is not wise." — Proverbs 20:1
          </p>
          <button
            className="l12-intro-btn"
            onClick={() => { try { window.speechSynthesis?.cancel() } catch (_) {}; setPhase('quiz') }}
          >
            ENTER THE VINEYARD ›
          </button>
        </div>
      </div>
    )
  }

  // ── Quiz phase ─────────────────────────────────────────────────────────────

  const q = QUESTIONS[Math.min(qIndex, 12)]

  return (
    <div className="l12-wrap">
      <div className={`l12-bg${cascadeAll ? ' l12-bg-cascade' : ''}`} />
      <div className="l12-vignette" />
      <canvas ref={canvasRef} className="l12-canvas" />
      <CoinHUD coins={coins} />

      {/* CSS overlay FX */}
      {fxOverlay && <div key={fxOverlayKey} className={`l12-fx-overlay ${fxOverlay}`} />}

      {/* ── LEFT: Vineyard tracker ── */}
      <div className="l12-vine-panel">
        <div className="l12-vine-count">
          <span className="l12-vine-num">{correctCount}</span>
          <span className="l12-vine-of">/13</span>
        </div>
        <div className="l12-vine-stem">
          {Array.from({ length: 13 }, (_, i) => {
            // Render 13..1 top-to-bottom; cluster n is lit if n <= correctCount
            const clusterNum = 13 - i
            const isLit = clusterNum <= correctCount
            return (
              <div
                key={i}
                ref={el => { grapeRefs.current[12 - i] = el }}
                className={`l12-grape${isLit ? ' lit' : ''}${cascadeAll ? ' cascade' : ''}`}
              >
                <span className="l12-grape-emoji">🍇</span>
                <span className="l12-grape-n">{clusterNum}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MAIN: quiz ── */}
      <div className="l12-main">
        <div className="l12-header">
          <p className="l12-label">LEVEL 1-12</p>
          <h1 className="l12-title">The Mantle of Honour &amp; Wisdom</h1>
        </div>

        <div className="l12-quiz-card">
          <div className="l12-q-num">Question {qIndex + 1} of 13</div>
          <p className="l12-q-text">{q.q}</p>
          <div className="l12-opts">
            {q.opts.map((opt, i) => (
              <button
                key={i}
                className={`l12-opt${
                  quizAnswer === i
                    ? i === q.correct ? ' correct' : ' wrong'
                    : quizAnswer !== null && i === q.correct ? ' correct' : ''
                }`}
                onClick={() => handleAnswer(i)}
                disabled={quizAnswer !== null}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Affirmation burst */}
      {affirmation && (
        <div key={affirmationKey} className="l12-affirmation">{affirmation}</div>
      )}

      {/* Cascade banner */}
      {showBanner && (
        <div className="l12-cascade-banner">
          ⭐ MASTER OF WISDOM AND HONOUR! ⭐
        </div>
      )}

      {/* +5 coin indicator on correct */}
      {affirmation && (
        <div key={`coin-${affirmationKey}`} className="l12-coin-burst">+5 🪙</div>
      )}
    </div>
  )
}
