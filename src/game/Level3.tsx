import { useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { getCoins, addCoins } from './coins'
import './level3.css'

const HINTS: Record<string, string> = {
  drag:    'Drag the lamb 🐑 to the altar — Abel offered a lamb in faith and God accepted it.',
  quiz1:   'Cain was a farmer. He brought crops. Abel was a shepherd. He brought a lamb.',
  quiz2:   'Jealousy filled Cain when his offering was rejected. He turned on his own brother.',
  quiz3:   'Cain rose against the person closest to him — his brother Abel.',
  victory: '',
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase     = 'drag' | 'quiz1' | 'jealousy' | 'quiz2' | 'quiz3' | 'victory'
type AltarState = 'lit' | 'correct' | 'wrong'
type ItemId    = 'grain' | 'lamb' | 'fruit' | 'gold'

interface Item { id: ItemId; emoji: string; label: string; floatCls: string }

const ITEMS: Item[] = [
  { id: 'grain', emoji: '🌾', label: 'Grain',      floatCls: 'float-a' },
  { id: 'lamb',  emoji: '🐑', label: 'Lamb',        floatCls: 'float-b' },
  { id: 'fruit', emoji: '🍎', label: 'Fruit',       floatCls: 'float-c' },
  { id: 'gold',  emoji: '💰', label: 'Gold Coins',  floatCls: 'float-d' },
]

const QUIZ1 = {
  text: 'What did Cain offer to God?',
  options: ['Lamb', 'Grain', 'Fruit', 'Gold'],
  correct: 1,
}
const QUIZ2 = {
  text: 'Who was the first murderer?',
  options: ['Abel', 'Noah', 'Cain', 'Adam'],
  correct: 2,
}
const QUIZ3 = {
  text: 'Who did the murderer murder?',
  options: ['Noah', 'Adam', 'Abel', 'Seth'],
  correct: 2,
}

// ─── Audio ──────────────────────────────────────────────────────────────────

function playHeavenSound() {
  try {
    const ctx = new AudioContext()
    ;[261.63, 329.63, 392.00, 523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx.currentTime + i * 0.07
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.20, t + 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, t + 4)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + 4.5)
    })
  } catch (_) {}
}

function playWrongOfferingSound() {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(180, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 0.45)
    g.gain.setValueAtTime(0.10, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    o.connect(g); g.connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + 0.5)
  } catch (_) {}
}

function playQuizCorrectSound() {
  try {
    const ctx = new AudioContext()
    ;[523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx.currentTime + i * 0.09
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.18, t + 0.06)
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.3)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + 1.3)
    })
  } catch (_) {}
}

function playVictorySound() {
  try {
    const ctx = new AudioContext()
    ;[261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx.currentTime + i * 0.075
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.16, t + 0.1)
      g.gain.exponentialRampToValueAtTime(0.001, t + 3.5)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + 3.5)
    })
  } catch (_) {}
}

function speakVoice(text: string, rate = 0.88, pitch = 1.1) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = rate; utt.pitch = pitch; utt.volume = 1
    const warm = speechSynthesis.getVoices()
      .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
    if (warm) utt.voice = warm
    speechSynthesis.cancel()
    speechSynthesis.speak(utt)
  } catch (_) {}
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Level3({ onComplete }: { onComplete?: () => void }) {
  const [phase,       setPhase]       = useState<Phase>('drag')
  const [timeLeft,    setTimeLeft]    = useState(30)
  const [altarState,  setAltarState]  = useState<AltarState>('lit')
  const [shaking,     setShaking]     = useState(false)
  const [heavenLight, setHeavenLight] = useState(false)
  const [removed,     setRemoved]     = useState<Set<ItemId>>(new Set())
  const [draggingId,  setDraggingId]  = useState<ItemId|null>(null)
  const [wrongId,     setWrongId]     = useState<ItemId|null>(null)

  // Quiz 1
  const [q1Sel,    setQ1Sel]    = useState<number|null>(null)
  const [q1Locked, setQ1Locked] = useState(false)
  const [q1Wrong,  setQ1Wrong]  = useState(false)
  // Quiz 2
  const [q2Sel,    setQ2Sel]    = useState<number|null>(null)
  const [q2Locked, setQ2Locked] = useState(false)
  const [q2Wrong,  setQ2Wrong]  = useState(false)
  // Quiz 3
  const [q3Sel,    setQ3Sel]    = useState<number|null>(null)
  const [q3Locked, setQ3Locked] = useState(false)
  const [q3Wrong,  setQ3Wrong]  = useState(false)

  const [coins, setCoins] = useState(() => getCoins())

  const bgRef        = useRef<HTMLCanvasElement>(null)
  const jealousyRef  = useRef<HTMLCanvasElement>(null)
  const jRafRef      = useRef<number>(0)
  const ghostRef     = useRef<HTMLDivElement|null>(null)
  const dragRef      = useRef<{ id: ItemId; ox: number; oy: number }|null>(null)
  const timerRef     = useRef<ReturnType<typeof setInterval>|null>(null)

  // Always-fresh drop logic
  const doDropRef = useRef<(id: ItemId) => void>(null!)
  doDropRef.current = (id: ItemId) => {
    if (id === 'lamb') {
      if (timerRef.current) clearInterval(timerRef.current)
      setRemoved(s => { const n = new Set(s); n.add(id); return n })
      setAltarState('correct')
      setHeavenLight(true)
      setShaking(true)
      setCoins(addCoins(10))
      playHeavenSound()
      speakVoice('Heaven approves your offering!')
      setTimeout(() => setShaking(false), 1300)
      setTimeout(() => setHeavenLight(false), 3200)
      setTimeout(() => {
        setPhase('quiz1')
        setTimeout(() => speakVoice('What did Cain offer to God?'), 400)
      }, 3600)
    } else {
      setAltarState('wrong')
      setWrongId(id)
      playWrongOfferingSound()
      speakVoice('God looks at the heart — try again!')
      setTimeout(() => { setAltarState('lit'); setWrongId(null) }, 2000)
    }
  }

  // ── Static landscape canvas ──────────────────────────────────────────────

  useEffect(() => {
    const cv = bgRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    cv.width = window.innerWidth; cv.height = window.innerHeight
    const W = cv.width, H = cv.height

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.63)
    sky.addColorStop(0,   '#00000a')
    sky.addColorStop(0.65,'#09050f')
    sky.addColorStop(1,   '#110608')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)

    // Stars
    for (let i = 0; i < 300; i++) {
      const x = Math.random()*W, y = Math.random()*H*0.60
      const r = Math.random()*1.1+0.1, op = Math.random()*0.65+0.18
      const hue = Math.random()<0.7 ? Math.random()*20+38 : 210
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2)
      ctx.fillStyle = `hsla(${hue},70%,90%,${op})`; ctx.fill()
    }

    // Ground
    const ground = ctx.createLinearGradient(0, H*0.62, 0, H)
    ground.addColorStop(0, '#0f0604'); ground.addColorStop(1, '#020100')
    ctx.fillStyle = ground; ctx.fillRect(0, H*0.62, W, H)

    // Perspective grid
    const vx = W/2, vy = H*0.625
    for (let i = 0; i <= 20; i++) {
      const x = W*i/20
      ctx.beginPath(); ctx.moveTo(vx,vy); ctx.lineTo(x,H)
      ctx.strokeStyle = 'rgba(212,160,23,0.07)'; ctx.lineWidth=1; ctx.stroke()
    }
    for (let i = 1; i <= 9; i++) {
      const t = Math.pow(i/9, 1.7), y = vy+(H-vy)*t
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y)
      ctx.strokeStyle = `rgba(212,160,23,${0.11*(1-t*0.55)})`
      ctx.lineWidth=0.8; ctx.stroke()
    }

    // Horizon glow
    const hg = ctx.createLinearGradient(0, H*0.55, 0, H*0.70)
    hg.addColorStop(0,'transparent'); hg.addColorStop(0.5,'rgba(180,55,8,0.08)'); hg.addColorStop(1,'transparent')
    ctx.fillStyle=hg; ctx.fillRect(0,H*0.55,W,H*0.15)

    // Altar ground glow
    const ag = ctx.createRadialGradient(W/2,H*0.67,0,W/2,H*0.67,W*0.24)
    ag.addColorStop(0,'rgba(220,95,8,0.20)'); ag.addColorStop(0.5,'rgba(180,60,5,0.08)'); ag.addColorStop(1,'transparent')
    ctx.fillStyle=ag; ctx.fillRect(0,0,W,H)
  }, [])

  // ── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'drag') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          speakVoice('Hurry! Place the correct offering!', 1.05, 1.2)
          return 30
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // ── Jealousy canvas animation ────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'jealousy') return
    const cv = jealousyRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    cv.width = window.innerWidth; cv.height = window.innerHeight
    const W = cv.width, H = cv.height
    const start = performance.now()
    const DUR = 4800

    const draw = (now: number) => {
      const p = Math.min(1, (now - start) / DUR)
      const ease = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2, 2)/2

      ctx.clearRect(0, 0, W, H)

      // Dark green shadow radiating from bottom-left corner
      const sr = ease * W * 1.7
      const sg = ctx.createRadialGradient(W*0.08, H, 0, W*0.08, H, sr)
      sg.addColorStop(0,    `rgba(0,65,8,${0.94*ease})`)
      sg.addColorStop(0.28, `rgba(0,42,5,${0.78*ease})`)
      sg.addColorStop(0.58, `rgba(0,22,2,${0.48*ease})`)
      sg.addColorStop(1,    'transparent')
      ctx.fillStyle = sg; ctx.fillRect(0,0,W,H)

      // Cain silhouette growing from bottom
      if (ease > 0.04) {
        const fh = ease * H * 0.70
        const fw = fh * 0.26
        const fx = W * 0.20
        const fy = H
        const green = Math.round(Math.min(55, ease * 65))
        const alpha = Math.min(0.97, ease * 1.25)
        ctx.fillStyle = `rgba(0,${green},3,${alpha})`

        // Legs
        ctx.beginPath()
        ctx.moveTo(fx-fw*0.25, fy); ctx.lineTo(fx, fy-fh*0.46); ctx.lineTo(fx+fw*0.25, fy)
        ctx.closePath(); ctx.fill()

        // Torso
        ctx.beginPath()
        ctx.moveTo(fx-fw*0.46, fy-fh*0.43); ctx.lineTo(fx+fw*0.46, fy-fh*0.43)
        ctx.lineTo(fx+fw*0.34, fy-fh*0.73); ctx.lineTo(fx-fw*0.34, fy-fh*0.73)
        ctx.closePath(); ctx.fill()

        // Head
        ctx.beginPath(); ctx.arc(fx, fy-fh*0.73-fw*0.32, fw*0.35, 0, Math.PI*2); ctx.fill()

        // Left arm (raised — envy gesture)
        ctx.beginPath()
        ctx.moveTo(fx-fw*0.46, fy-fh*0.62); ctx.lineTo(fx-fw*1.12, fy-fh*0.40)
        ctx.lineTo(fx-fw*0.88, fy-fh*0.64); ctx.closePath(); ctx.fill()

        // Right arm (lowered — heavy)
        ctx.beginPath()
        ctx.moveTo(fx+fw*0.46, fy-fh*0.60); ctx.lineTo(fx+fw*1.08, fy-fh*0.42)
        ctx.lineTo(fx+fw*0.82, fy-fh*0.64); ctx.closePath(); ctx.fill()

        // Eerie green pulse around figure
        if (ease > 0.38) {
          const ga = (ease - 0.38) * 0.32
          const gg = ctx.createRadialGradient(fx, fy-fh*0.5, 0, fx, fy-fh*0.5, fh*0.72)
          gg.addColorStop(0, `rgba(0,120,12,${ga})`); gg.addColorStop(1,'transparent')
          ctx.fillStyle=gg; ctx.fillRect(0,0,W,H)
        }
      }

      if (p < 1) jRafRef.current = requestAnimationFrame(draw)
    }

    jRafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(jRafRef.current)
  }, [phase])


  // ── Drag handlers ────────────────────────────────────────────────────────

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, id: ItemId) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = { id, ox: e.clientX-rect.left, oy: e.clientY-rect.top }
    setDraggingId(id)
    e.currentTarget.setPointerCapture(e.pointerId)

    const item = ITEMS.find(i => i.id === id)!
    const ghost = document.createElement('div')
    ghost.innerHTML =
      `<span style="font-size:clamp(2rem,5vw,3.2rem);line-height:1;display:block">${item.emoji}</span>` +
      `<span style="color:#D4A017;font-family:Georgia,serif;font-size:0.62rem;display:block;text-align:center;margin-top:0.2rem">${item.label}</span>`
    Object.assign(ghost.style, {
      position:'fixed', left:`${rect.left}px`, top:`${rect.top}px`,
      width:`${rect.width}px`, height:`${rect.height}px`,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(155deg,#1c1800,#2a1500)',
      border:'2px solid #D4A017', borderRadius:'10px',
      pointerEvents:'none', zIndex:'9999', opacity:'0.95',
      boxShadow:'0 10px 35px rgba(212,160,23,0.65)', transform:'scale(1.08)',
    })
    document.body.appendChild(ghost)
    ghostRef.current = ghost
  }

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>, id: ItemId) => {
    const dr = dragRef.current
    if (!dr || dr.id !== id || !ghostRef.current) return
    ghostRef.current.style.left = `${e.clientX - dr.ox}px`
    ghostRef.current.style.top  = `${e.clientY - dr.oy}px`
    ghostRef.current.style.visibility = 'hidden'
    const under = document.elementFromPoint(e.clientX, e.clientY)
    ghostRef.current.style.visibility = ''
    ghostRef.current.style.boxShadow = under?.closest('[data-altar]')
      ? '0 0 55px rgba(255,220,60,0.95), 0 0 100px rgba(255,200,30,0.55)'
      : '0 10px 35px rgba(212,160,23,0.65)'
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>, id: ItemId) => {
    const dr = dragRef.current
    if (!dr || dr.id !== id) return
    if (ghostRef.current) ghostRef.current.style.visibility = 'hidden'
    const under = document.elementFromPoint(e.clientX, e.clientY)
    if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null }
    if (under?.closest('[data-altar]')) doDropRef.current(id)
    dragRef.current = null; setDraggingId(null)
  }

  const cancelDrag = () => {
    if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null }
    dragRef.current = null; setDraggingId(null)
  }

  // ── Quiz handlers ────────────────────────────────────────────────────────

  const handleQ1 = (idx: number) => {
    if (q1Locked) return
    setQ1Sel(idx)
    if (idx === QUIZ1.correct) {
      setQ1Locked(true)
      setCoins(addCoins(10))
      playQuizCorrectSound()
      speakVoice('Correct! Cain offered grain from his harvest.')
      setTimeout(() => {
        setPhase('jealousy')
        setTimeout(() => speakVoice('Sin is crouching at your door. You must master it.'), 900)
        setTimeout(() => {
          setPhase('quiz2')
          setTimeout(() => speakVoice('Who was the first murderer?'), 400)
        }, 5800)
      }, 2000)
    } else {
      setQ1Wrong(true)
      playWrongOfferingSound()
      speakVoice('Search the scriptures — try again!')
      setTimeout(() => { setQ1Wrong(false); setQ1Sel(null) }, 1800)
    }
  }

  const handleQ2 = (idx: number) => {
    if (q2Locked) return
    setQ2Sel(idx)
    if (idx === QUIZ2.correct) {
      setQ2Locked(true)
      setCoins(addCoins(10))
      playQuizCorrectSound()
      speakVoice('Yes — Cain. Jealousy led him to commit the first murder.')
      setTimeout(() => {
        setPhase('quiz3')
        setTimeout(() => speakVoice('Who did the murderer murder?'), 400)
      }, 2500)
    } else {
      setQ2Wrong(true)
      playWrongOfferingSound()
      speakVoice('Who let jealousy lead them to sin? Try again!')
      setTimeout(() => { setQ2Wrong(false); setQ2Sel(null) }, 1800)
    }
  }

  const handleQ3 = (idx: number) => {
    if (q3Locked) return
    setQ3Sel(idx)
    if (idx === QUIZ3.correct) {
      setQ3Locked(true)
      setCoins(addCoins(10))
      playQuizCorrectSound()
      speakVoice('Correct! Cain killed his brother Abel.')
      setTimeout(() => {
        playVictorySound()
        setPhase('victory')
      }, 2500)
    } else {
      setQ3Wrong(true)
      playWrongOfferingSound()
      speakVoice('Remember — who was the victim? Try again!')
      setTimeout(() => { setQ3Wrong(false); setQ3Sel(null) }, 1800)
    }
  }

  // Torch colour based on time remaining
  const torchPct = timeLeft / 30
  const torchHue = Math.round(5 + torchPct * 35)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`level3${shaking ? ' level3--shake' : ''}`}>
      <canvas ref={bgRef} className="level3-bg" />
      <CoinHUD
        coins={coins}
        hint={HINTS[phase] ?? ''}
        onCoinsChange={setCoins}
        disabled={phase === 'jealousy' || phase === 'victory'}
      />

      <header className="level3-header">
        <p className="level3-label">LEVEL 1-3</p>
        <h1 className="level3-title">Cain and Abel — The First Offering</h1>
      </header>

      {/* ── DRAG PHASE ─────────────────────────────────────────────────── */}
      {phase === 'drag' && (
        <>
          {/* Torch timer */}
          <div className={`torch-timer${timeLeft <= 10 ? ' torch-timer--warn' : ''}`}>
            <span
              className="torch-flame"
              style={{ opacity: 0.35 + torchPct * 0.65, filter: `saturate(${0.4 + torchPct * 1.4})` }}
            >🔥</span>
            <span
              className="torch-count"
              style={{ color: `hsl(${torchHue},90%,${55 + torchPct * 20}%)` }}
            >{timeLeft}s</span>
          </div>

          <p className="drag-hint">Drag the correct offering onto the altar</p>

          {/* Altar */}
          <div
            data-altar="true"
            className={`altar${altarState === 'correct' ? ' altar--correct' : ''}${altarState === 'wrong' ? ' altar--wrong' : ''}`}
          >
            <div className="altar-fire-wrap">
              <div className="altar-fire" />
              <div className="altar-fire altar-fire--2" />
              <div className="altar-fire altar-fire--3" />
            </div>
            <div className="altar-stone" />
            <div className="altar-name-label">ALTAR</div>
          </div>

          {/* Heaven beam */}
          {heavenLight && <div className="heaven-light" />}

          {/* Floating offering items */}
          {ITEMS.filter(it => !removed.has(it.id)).map(it => (
            <div
              key={it.id}
              className={[
                'offering-item',
                `offering-item--${it.id}`,
                it.floatCls,
                draggingId === it.id ? 'offering-item--dragging' : '',
              ].filter(Boolean).join(' ')}
              onPointerDown={e => startDrag(e, it.id)}
              onPointerMove={e => moveDrag(e, it.id)}
              onPointerUp={e => endDrag(e, it.id)}
              onPointerCancel={cancelDrag}
            >
              {wrongId === it.id && <div className="offering-wrong-flash" />}
              <span className="offering-emoji">{it.emoji}</span>
              <span className="offering-label">{it.label}</span>
            </div>
          ))}
        </>
      )}

      {/* ── QUIZ 1 ─────────────────────────────────────────────────────── */}
      {phase === 'quiz1' && (
        <div className="quiz-card l3-quiz">
          <p className="quiz-q-num">The Offering</p>
          <h2 className="quiz-question">{QUIZ1.text}</h2>
          <div className="quiz-options">
            {QUIZ1.options.map((opt, i) => (
              <button
                key={i}
                disabled={q1Locked}
                className={[
                  'quiz-option',
                  q1Locked && q1Sel === i          ? 'quiz-option--correct' : '',
                  q1Wrong  && q1Sel === i           ? 'quiz-option--wrong'   : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleQ1(i)}
              >{opt}</button>
            ))}
          </div>
          {q1Wrong && (
            <p className="quiz-feedback quiz-feedback--wrong">Search the scriptures — try again!</p>
          )}
        </div>
      )}

      {/* ── JEALOUSY CINEMATIC ──────────────────────────────────────────── */}
      {phase === 'jealousy' && (
        <div className="jealousy-screen">
          <canvas ref={jealousyRef} className="jealousy-canvas" />
          <p className="jealousy-line jealousy-line--1">Sin is crouching at your door.</p>
          <p className="jealousy-line jealousy-line--2">You must master it.</p>
        </div>
      )}

      {/* ── QUIZ 2 ─────────────────────────────────────────────────────── */}
      {phase === 'quiz2' && (
        <div className="quiz-card l3-quiz">
          <p className="quiz-q-num">The Murder</p>
          <h2 className="quiz-question">{QUIZ2.text}</h2>
          <div className="quiz-options">
            {QUIZ2.options.map((opt, i) => (
              <button
                key={i}
                disabled={q2Locked}
                className={[
                  'quiz-option',
                  q2Locked && q2Sel === i ? 'quiz-option--correct' : '',
                  q2Wrong  && q2Sel === i ? 'quiz-option--wrong'   : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleQ2(i)}
              >{opt}</button>
            ))}
          </div>
          {q2Wrong && (
            <p className="quiz-feedback quiz-feedback--wrong">Who let jealousy win? Try again!</p>
          )}
        </div>
      )}

      {/* ── QUIZ 3 ─────────────────────────────────────────────────────── */}
      {phase === 'quiz3' && (
        <div className="quiz-card l3-quiz">
          <p className="quiz-q-num">The Victim</p>
          <h2 className="quiz-question">{QUIZ3.text}</h2>
          <div className="quiz-options">
            {QUIZ3.options.map((opt, i) => (
              <button
                key={i}
                disabled={q3Locked}
                className={[
                  'quiz-option',
                  q3Locked && q3Sel === i ? 'quiz-option--correct' : '',
                  q3Wrong  && q3Sel === i ? 'quiz-option--wrong'   : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleQ3(i)}
              >{opt}</button>
            ))}
          </div>
          {q3Wrong && (
            <p className="quiz-feedback quiz-feedback--wrong">Remember who the victim was — try again!</p>
          )}
        </div>
      )}

      {/* ── COMPLETION ─────────────────────────────────────────────────── */}
      {phase === 'victory' && (
        <CompletionScreen
          verse="By faith Abel brought God a better offering than Cain did."
          verseRef="Hebrews 11:4"
          onComplete={onComplete}
        />
      )}
    </div>
  )
}
