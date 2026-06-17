import { useEffect, useRef, useState } from 'react'
import './level9.css'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins, penalizeCoins } from './coins'

type Phase = 'intro' | 'quiz' | 'building' | 'mockery' | 'climax' | 'outro' | 'completion'

interface Mocker  { id: number; x: number; text: string }
interface Section { id: number; label: string; left: number; top: number; width: number; height: number }

// ─── Static data ──────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  { id:0, label:'THE HULL',        left:24, top:66, width:52, height:10 },
  { id:1, label:'PITCH COATING',   left:24, top:66, width:52, height:10 },
  { id:2, label:'DECK 1',          left:25, top:57, width:50, height:9  },
  { id:3, label:'THE DOOR',        left:26, top:43, width:8,  height:24 },
  { id:4, label:'THE WINDOW',      left:63, top:41, width:8,  height:7  },
  { id:5, label:'DECK 2',          left:25, top:48, width:50, height:9  },
  { id:6, label:'THE ROOMS',       left:35, top:48, width:36, height:18 },
  { id:7, label:'ANIMAL PENS',     left:35, top:57, width:22, height:9  },
  { id:8, label:'FOOD STORES',     left:58, top:57, width:20, height:9  },
  { id:9, label:'THE RAMP',        left:16, top:58, width:10, height:18 },
]

const QS = [
  { q:'What wood did God tell Noah to use to build the ark?',
    opts:['Cedar wood','Oak wood','Cypress wood','Pine wood'], c:2,
    vo:"Cypress — strong, durable and resistant to water. God chose perfectly!", coins:5 },
  { q:'What did God tell Noah to coat the ark with inside and out?',
    opts:['Clay','Pitch','Oil','Mud'], c:1,
    vo:"Pitch — a natural waterproof sealant. God thought of everything!", coins:5 },
  { q:'How many decks did God instruct Noah to build in the ark?',
    opts:['One','Two','Three','Four'], c:2,
    vo:"Three decks — lower middle and upper. Built to divine specification!", coins:5 },
  { q:'Where did God tell Noah to put the door of the ark?',
    opts:['On the roof','On the bottom','In the side','At the front'], c:2,
    vo:"The door in the side — the single entrance to salvation!", coins:10 },
  { q:'What did God tell Noah to put near the top of the ark?',
    opts:['A chimney','A window','A flag','A ladder'], c:1,
    vo:"A window for light and air — God provided for every need!", coins:10 },
  { q:'How long was Noah to make the ark in cubits?',
    opts:['100 cubits','200 cubits','300 cubits','400 cubits'], c:2,
    vo:"300 cubits long — roughly the size of one and a half football fields!", coins:10 },
  { q:"What did God say He was going to bring on the earth?",
    opts:['Fire','Darkness','Floodwaters','Earthquakes'], c:2,
    vo:"Floodwaters — a cleansing of the corrupted earth. But salvation was prepared!", coins:10 },
  { q:'How many of each unclean animal did God tell Noah to bring?',
    opts:['One pair — two of every kind','Four of each','Seven pairs','Ten of each'], c:0,
    vo:"Two of every kind — male and female — to keep their kinds alive!", coins:15 },
  { q:'What else did God tell Noah to bring onto the ark besides animals?',
    opts:['Gold and silver','Weapons','Every kind of food','Books and scrolls'], c:2,
    vo:"Every kind of food — for Noah his family and all the animals. God provided!", coins:15 },
  { q:'What did Noah do with everything God commanded him?',
    opts:['Questioned God','Did only some of it','Did everything just as God commanded','Asked for more time'], c:2,
    vo:"EVERYTHING just as God commanded! Complete obedience — complete protection!", coins:20 },
]

const NOAH_VOS = [
  "We walk by faith not by sight! Keep building!",
  "God said it — that settles it!",
  "The storm is coming — keep your hands on the work!",
  "Faith does not need an audience!",
]

const JEERS = [
  "It has never rained before!",
  "Noah has lost his mind!",
  "Nobody believes this crazy man!",
  "What is an ark anyway?!",
  "Build a boat on dry land?!",
  "This man is completely crazy!",
]

// Mockery fires after completing questions at these 0-based indices
const MOCKERY_AFTER = new Set([1, 3, 5, 7])

let _mId = 0; let _noahVo = 0

// ─── Audio helpers ────────────────────────────────────────────────────────────

function mkNote(ctx: AudioContext, freq: number, vol: number, start: number, end: number, type: OscillatorType = 'sine') {
  const o = ctx.createOscillator(); const g = ctx.createGain()
  o.type = type; o.frequency.value = freq
  o.connect(g); g.connect(ctx.destination)
  g.gain.setValueAtTime(vol, ctx.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + end)
  o.start(ctx.currentTime + start); o.stop(ctx.currentTime + end + 0.01)
}

function playCorrect(ctx: AudioContext) {
  ;[523, 659, 784].forEach((f, i) => mkNote(ctx, f, 0.20, i * 0.10, i * 0.10 + 0.45))
}

function playBuild(ctx: AudioContext) {
  // Thud + hammer clicks
  const o = ctx.createOscillator(); const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(220, ctx.currentTime)
  o.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.28)
  o.connect(g); g.connect(ctx.destination)
  g.gain.setValueAtTime(0.55, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
  o.start(); o.stop(ctx.currentTime + 0.46)
  ;[0.08, 0.20, 0.34, 0.50, 0.68].forEach(t => mkNote(ctx, 750, 0.12, t, t + 0.07, 'square'))
}

function playWrong(ctx: AudioContext) {
  mkNote(ctx, 185, 0.24, 0, 0.38, 'sawtooth')
  mkNote(ctx, 145, 0.17, 0.12, 0.42, 'sawtooth')
}

function playJeerSound(ctx: AudioContext) {
  mkNote(ctx, 255, 0.09, 0, 0.30, 'sawtooth')
  mkNote(ctx, 195, 0.06, 0.07, 0.32, 'sawtooth')
}

function playNoahSound(ctx: AudioContext) {
  ;[440, 660, 880, 1100].forEach((f, i) => mkNote(ctx, f, 0.22, i * 0.09, i * 0.09 + 0.48))
}

function playFanfare(ctx: AudioContext) {
  ;[523, 659, 784, 1047].forEach((f, i) => mkNote(ctx, f, 0.20, i * 0.13, i * 0.13 + 0.60))
}

function playDoorThud(ctx: AudioContext) {
  const o = ctx.createOscillator(); const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(90, ctx.currentTime)
  o.frequency.exponentialRampToValueAtTime(22, ctx.currentTime + 1.8)
  o.connect(g); g.connect(ctx.destination)
  g.gain.setValueAtTime(0.78, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.4)
  o.start(); o.stop(ctx.currentTime + 2.5)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Level9({
  onComplete, onFail, showHint,
}: { onComplete?: () => void; onFail?: (hint: string) => void; showHint?: boolean }) {

  const [phase,        setPhase]        = useState<Phase>('intro')
  const [qIdx,         setQIdx]         = useState(0)
  const [builtSections,setBuiltSections]= useState<number[]>([])
  const [selected,     setSelected]     = useState<number | null>(null)
  const [isCorrect,    setIsCorrect]    = useState<boolean | null>(null)
  const [faith,        setFaith]        = useState(80)
  const [mockers,      setMockers]      = useState<Mocker[]>([])
  const [noahShock,    setNoahShock]    = useState(false)
  const [coins,        setCoins]        = useState(getCoins)
  const [shaking,      setShaking]      = useState(false)
  const [doorSealing,  setDoorSealing]  = useState(false)
  const [goldenShield, setGoldenShield] = useState(false)
  const [crowdFlee,    setCrowdFlee]    = useState(false)
  const [rainLevel,    setRainLevel]    = useState(0)
  const [barDanger,    setBarDanger]    = useState(false)

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const phaseRef     = useRef(phase)
  const qIdxRef      = useRef(qIdx)
  const noahBusy     = useRef(false)
  const climaxFired  = useRef(false)
  const acRef        = useRef<AudioContext | null>(null)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { qIdxRef.current  = qIdx  }, [qIdx])

  const getAC = () => {
    if (!acRef.current) acRef.current = new AudioContext()
    return acRef.current
  }

  const speak = (text: string, rate = 0.76, pitch = 1.0) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate; u.pitch = pitch; u.volume = 1
    window.speechSynthesis.speak(u)
  }
  const speakGod = (t: string) => speak(t, 0.46, 0.24)
  const speakVO  = (t: string) => speak(t, 0.76, 1.06)

  // ── Intro ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    speakGod("So make yourself an ark of cypress wood; make rooms in it and coat it with pitch inside and out. I am going to bring floodwaters on the earth.")
    const t = setTimeout(() => setPhase('quiz'), 5500)
    return () => clearTimeout(t)
  }, [])

  // ── Faith danger ──────────────────────────────────────────────────────────
  useEffect(() => {
    setBarDanger(faith <= 25)
    if (faith <= 0 && phaseRef.current === 'mockery') {
      setTimeout(() => onFail?.("Keep faith strong! Tap Noah to silence the mockers before they win!"), 50)
    }
  }, [faith])

  // ── Mocker spawn during mockery phase ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'mockery') return
    const spawn = () => {
      setMockers(m => [...m.slice(-6), {
        id: _mId++,
        x:  8 + Math.random() * 64,
        text: JEERS[Math.floor(Math.random() * JEERS.length)],
      }])
      playJeerSound(getAC())
      setFaith(f => Math.max(0, f - 14))
    }
    spawn()
    const t = setInterval(spawn, 5000)
    return () => clearInterval(t)
  }, [phase])

  // ── Canvas: rain ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    if (rainLevel === 0) { ctx.clearRect(0,0,canvas.width,canvas.height); return }
    const drops: { x:number; y:number; spd:number; len:number }[] = []
    let raf: number
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize(); window.addEventListener('resize', resize)
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cnt = rainLevel===1?4:rainLevel===2?10:25
      for (let i=0;i<cnt;i++)
        drops.push({ x:Math.random()*canvas.width, y:-28, spd:10+Math.random()*8, len:18+Math.random()*28 })
      const alpha = rainLevel===1?0.55:rainLevel===2?0.78:0.96
      ctx.strokeStyle = `rgba(160,220,255,${alpha})`; ctx.lineWidth = rainLevel===3?2:1
      for (let i=drops.length-1;i>=0;i--) {
        const d=drops[i]
        ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-2,d.y+d.len); ctx.stroke()
        d.y+=d.spd; if(d.y>canvas.height) drops.splice(i,1)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize) }
  }, [rainLevel])

  // ── Handle answer ─────────────────────────────────────────────────────────
  const handleAnswer = (optIdx: number) => {
    if (selected !== null || phase !== 'quiz') return
    const q = QS[qIdx]
    const correct = optIdx === q.c
    setSelected(optIdx); setIsCorrect(correct)

    if (correct) {
      playCorrect(getAC())
      // Short pause to show green, then switch to building
      setTimeout(() => {
        setPhase('building')
        addCoins(q.coins); setCoins(getCoins())
        speakVO(q.vo)
        playBuild(getAC())
      }, 900)
      // After build animation, resolve
      setTimeout(() => {
        setBuiltSections(b => [...b, qIdx])
        setSelected(null); setIsCorrect(null)
        if (MOCKERY_AFTER.has(qIdx)) {
          setPhase('mockery')
        } else if (qIdx === 9) {
          if (!climaxFired.current) { climaxFired.current = true; triggerClimax() }
        } else {
          setQIdx(qIdx + 1); setPhase('quiz')
        }
      }, 3500)
    } else {
      playWrong(getAC())
      setCoins(penalizeCoins(50))
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
      setTimeout(() => { setSelected(null); setIsCorrect(null) }, 1300)
    }
  }

  // ── Tap Noah ──────────────────────────────────────────────────────────────
  const tapNoah = () => {
    if (noahBusy.current || phaseRef.current !== 'mockery') return
    noahBusy.current = true
    setNoahShock(true)
    setMockers([])
    setFaith(f => Math.min(100, f + 55))
    speakVO(NOAH_VOS[_noahVo % NOAH_VOS.length]); _noahVo++
    playNoahSound(getAC())
    setTimeout(() => setNoahShock(false), 1100)
    setTimeout(() => {
      noahBusy.current = false
      const next = qIdxRef.current + 1
      if (next >= 10) {
        if (!climaxFired.current) { climaxFired.current = true; triggerClimax() }
      } else {
        setQIdx(next); setPhase('quiz')
      }
    }, 2200)
  }

  // ── Climax ────────────────────────────────────────────────────────────────
  const triggerClimax = () => {
    setPhase('climax')
    setTimeout(() => setRainLevel(1), 600)
    setTimeout(() => setRainLevel(2), 2200)
    setTimeout(() => { setRainLevel(3); setCrowdFlee(true) }, 3800)
    setTimeout(() => {
      setDoorSealing(true); playDoorThud(getAC())
      setShaking(true); setTimeout(() => setShaking(false), 1000)
      speakGod("And the LORD shut him in.")
    }, 5200)
    setTimeout(() => {
      setDoorSealing(false); setGoldenShield(true); playFanfare(getAC())
    }, 7800)
    setTimeout(() => setPhase('outro'), 8400)
  }

  // ── Outro ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'outro') return
    const name = localStorage.getItem('iq_character') || 'Warrior'
    speakVO(`When the world doubts God's word your faith builds things that will outlast the storm, ${name}. See — you are smarter than you imagine.`)
    const t = setTimeout(() => setPhase('completion'), 5500)
    return () => clearTimeout(t)
  }, [phase])

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === 'completion') {
    const name = localStorage.getItem('iq_character') || 'Warrior'
    return (
      <CompletionScreen
        verse='"Noah did everything just as God commanded him."'
        verseRef="Genesis 6:22"
        subtitle="The Ark Is Complete"
        voiceLine={`When the world doubts God's word your faith builds things that will outlast the storm, ${name}. See — you are smarter than you imagine.`}
        onComplete={onComplete}
      />
    )
  }

  const currentQ = QS[qIdx]

  return (
    <div className={`l9-root${shaking ? ' l9-shake' : ''}`}>
      <div className="l9-bg" />
      <div className="l9-overlay" />
      <canvas ref={canvasRef} className="l9-canvas" />
      {goldenShield && <div className="l9-shield" />}
      {noahShock    && <div className="l9-noah-shockwave" />}

      {/* ── HUD ── */}
      <div className="l9-hud">
        <div className="l9-faith-wrap">
          <span className="l9-faith-lbl">FAITH</span>
          <div className={`l9-faith-bar${barDanger ? ' l9-faith-bar--danger' : ''}`}>
            <div className="l9-faith-fill"   style={{ width:`${faith}%` }} />
            <div className="l9-mockery-fill" style={{ width:`${100-faith}%` }} />
          </div>
          <span className="l9-mock-lbl">MOCKERY</span>
        </div>

        <div className="l9-prog-wrap">
          <span className="l9-prog-lbl">ARK PROGRESS</span>
          <div className="l9-prog-dots">
            {QS.map((_, i) => (
              <div
                key={i}
                className={`l9-dot${builtSections.includes(i) ? ' l9-dot--done' : i === qIdx && phase !== 'climax' ? ' l9-dot--active' : ''}`}
              />
            ))}
          </div>
        </div>

        <CoinHUD coins={coins} hint={showHint} onCoinsChange={setCoins} />
      </div>

      {/* ── Ark section overlays ── */}
      {phase !== 'intro' && SECTIONS.map((s, i) => {
        const isBuilt    = builtSections.includes(i)
        const isCurrent  = i === qIdx && (phase === 'quiz' || phase === 'building')
        const isBuilding = i === qIdx && phase === 'building'
        if (!isBuilt && !isCurrent) return null
        return (
          <div
            key={i}
            className={`l9-section${isBuilding ? ' l9-section--building' : isBuilt ? ' l9-section--built' : isCurrent ? ' l9-section--active' : ''}`}
            style={{ left:`${s.left}%`, top:`${s.top}%`, width:`${s.width}%`, height:`${s.height}%` }}
          >
            {isBuilding && (
              <>
                <span className="l9-spark l9-spark--0">✨</span>
                <span className="l9-spark l9-spark--1">⚡</span>
                <span className="l9-spark l9-spark--2">✨</span>
                <span className="l9-spark l9-spark--3">⚡</span>
                <span className="l9-spark l9-spark--4">✨</span>
                <span className="l9-spark l9-spark--5">⚡</span>
                <span className="l9-worker-a">👷</span>
                <span className="l9-worker-b">🔨</span>
              </>
            )}
            {isBuilt && <span className="l9-built-check">✓</span>}
          </div>
        )
      })}

      {/* ── Noah ── */}
      {phase !== 'intro' && phase !== 'climax' && phase !== 'outro' && (
        <button
          className={`l9-noah${noahShock ? ' l9-noah--pulsing' : phase === 'mockery' ? ' l9-noah--urgent' : ''}`}
          onClick={tapNoah}
          aria-label="Tap Noah"
        >
          <span className="l9-noah-fig">🧔</span>
          <span className="l9-noah-tag">{phase === 'mockery' ? '⚠ TAP NOAH!' : 'NOAH'}</span>
        </button>
      )}

      {/* ── Mockers ── */}
      {mockers.map(m => (
        <div key={m.id} className="l9-mocker" style={{ left:`${m.x}%` }}>
          <div className="l9-bubble">{m.text}</div>
          <span className="l9-crowd-fig">😤</span>
        </div>
      ))}

      {/* ── Intro overlay ── */}
      {phase === 'intro' && (
        <div className="l9-intro">
          <p className="l9-intro-text">
            "So make yourself an ark of cypress wood; make rooms in it and coat it with pitch inside and out.
            I am going to bring floodwaters on the earth."
          </p>
          <p className="l9-intro-ref">— Genesis 6:14</p>
        </div>
      )}

      {/* ── Quiz card ── */}
      {(phase === 'quiz' || phase === 'building') && (
        <div className="l9-quiz-card">
          <div className="l9-section-tag">
            SECTION {qIdx + 1} / 10 — {SECTIONS[qIdx].label}
          </div>
          <div className="l9-quiz-q">{currentQ.q}</div>
          <div className="l9-quiz-grid">
            {currentQ.opts.map((opt, i) => (
              <button
                key={i}
                className={`l9-opt${selected === i ? (isCorrect ? ' l9-opt--correct' : ' l9-opt--wrong') : ''}`}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
              >
                {opt}
              </button>
            ))}
          </div>
          {phase === 'building' && (
            <div className="l9-building-banner">
              🔨 BUILDING {SECTIONS[qIdx].label}... ✦
            </div>
          )}
        </div>
      )}

      {/* ── Mockery panel ── */}
      {phase === 'mockery' && (
        <div className="l9-mockery-panel">
          <div className="l9-mockery-title">⚠ THE CROWD JEERS ⚠</div>
          <div className="l9-mockery-sub">Tap Noah to restore faith and silence the mockers!</div>
        </div>
      )}

      {/* ── Climax ── */}
      {doorSealing && <div className="l9-door-seal" />}
      {crowdFlee && (
        <div className="l9-crowd-flee">
          {['😱','🏃','😰','🏃‍♀️','😨','🏃‍♂️','😱','🏃'].map((e, i) => (
            <div key={i} className="l9-flee-fig" style={{ animationDelay:`${i*0.13}s` }}>{e}</div>
          ))}
        </div>
      )}
    </div>
  )
}
