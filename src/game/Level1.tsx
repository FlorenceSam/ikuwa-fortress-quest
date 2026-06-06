import { useEffect, useRef, useState } from 'react'
import './level1.css'
import CompletionScreen from './CompletionScreen'

// ─── Data ──────────────────────────────────────────────────────────────────

const DAYS = [
  { id: 1, emoji: '🌑', title: 'Day and Night',              verse: 'Genesis 1:3-5'   },
  { id: 2, emoji: '🌊', title: 'Heaven and Water',           verse: 'Genesis 1:6-8'   },
  { id: 3, emoji: '🌿', title: 'Land and Plants',            verse: 'Genesis 1:9-13'  },
  { id: 4, emoji: '⭐', title: 'Sun, Moon and Stars',       verse: 'Genesis 1:14-19' },
  { id: 5, emoji: '🐟', title: 'Fish and Birds',             verse: 'Genesis 1:20-23' },
  { id: 6, emoji: '🦁', title: 'Other Animals and Humans',   verse: 'Genesis 1:24-31' },
  { id: 7, emoji: '😴', title: 'God Rests',                  verse: 'Genesis 2:1-3'   },
]

const NOTES = [523.25, 659.25, 783.99, 880, 1046.50, 1318.51, 1567.98]

// ─── Audio ─────────────────────────────────────────────────────────────────

function playChime(freq: number) {
  try {
    const ctx = new AudioContext()
    const hit = (f: number, vol: number, dur: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(vol, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      o.connect(g); g.connect(ctx.destination)
      o.start(); o.stop(ctx.currentTime + dur)
    }
    hit(freq,     0.30, 1.8)
    hit(freq * 2, 0.12, 1.2)
    hit(freq * 3, 0.05, 0.7)
  } catch (_) {}
}

function playVictory() {
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function Level1({ onComplete }: { onComplete?: () => void }) {
  const [hand,       setHand]       = useState<number[]>(() => shuffle([1,2,3,4,5,6,7]))
  const [slots,      setSlots]      = useState<(number|null)[]>(Array(7).fill(null))
  const [correct,    setCorrect]    = useState<Set<number>>(new Set())
  const [draggingId, setDraggingId] = useState<number|null>(null)
  const [hoverSlot,  setHoverSlot]  = useState<number|null>(null)
  const [wrongSlots, setWrongSlots] = useState<Set<number>>(new Set())
  const [victory,    setVictory]    = useState(false)

  const bgRef      = useRef<HTMLCanvasElement>(null)
  const bgRafRef   = useRef<number>(0)
  // Ghost element follows pointer — direct DOM, no React state (stays smooth)
  const ghostRef   = useRef<HTMLDivElement|null>(null)
  const dragRef    = useRef<{ cardId:number; ox:number; oy:number }|null>(null)

  // Always-fresh drop logic via ref (avoids stale closure in pointer handlers)
  const doDropRef = useRef<(cardId:number, slotIdx:number) => void>(null!)
  doDropRef.current = (cardId, slotIdx) => {
    const isCorrect = cardId === slotIdx + 1
    if (isCorrect) {
      setHand(h => h.filter(id => id !== cardId))
      setSlots(s => { const n=[...s]; n[slotIdx]=cardId; return n })
      setCorrect(c => { const n=new Set(c); n.add(cardId); return n })
      playChime(NOTES[slotIdx])
    } else {
      // Shake the slot, card stays in hand (ghost disappears = visual "return")
      setWrongSlots(w => { const n=new Set(w); n.add(slotIdx); return n })
      setTimeout(() => setWrongSlots(w => { const n=new Set(w); n.delete(slotIdx); return n }), 600)
    }
  }

  // ── Background stars ────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = bgRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const W = canvas.width, H = canvas.height

    const stars = Array.from({ length: 260 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r:    Math.random()*1.3+0.2,
      base: Math.random()*0.4+0.12,
      amp:  Math.random()*0.14+0.03,
      spd:  Math.random()*0.02+0.003,
      ph:   Math.random()*Math.PI*2,
      hue:  Math.random()<0.68 ? Math.random()*20+40 : 210,
    }))

    let frame = 0
    const tick = () => {
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H)
      const cg = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.45)
      cg.addColorStop(0,'rgba(212,160,23,0.05)'); cg.addColorStop(1,'transparent')
      ctx.fillStyle = cg; ctx.fillRect(0,0,W,H)
      frame++
      for (const s of stars) {
        const op = Math.max(0.03, Math.min(1, s.base+Math.sin(frame*s.spd+s.ph)*s.amp))
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r*2.2,0,Math.PI*2)
        ctx.fillStyle=`hsla(${s.hue},70%,70%,${op*0.18})`; ctx.fill()
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2)
        ctx.fillStyle=`hsla(${s.hue},60%,93%,${op})`; ctx.fill()
      }
      bgRafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(bgRafRef.current)
  }, [])

  // ── Victory ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (correct.size === 7) {
      playVictory()
      setTimeout(() => setVictory(true), 500)
    }
  }, [correct])

  // ── Pointer drag handlers ───────────────────────────────────────────────
  //
  //  Strategy: pointer capture routes all pointermove/pointerup back to the
  //  element that called setPointerCapture — works identically for mouse and touch.
  //  A ghost <div> is injected into document.body and moved via direct style
  //  updates (no React re-renders) keeping drag perfectly smooth at 60 fps.
  //  On pointerup the ghost is briefly hidden so elementFromPoint can see the
  //  slot underneath; then it is removed.

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, cardId: number) => {
    if (correct.has(cardId)) return      // locked cards cannot be dragged
    e.preventDefault()

    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = { cardId, ox: e.clientX - rect.left, oy: e.clientY - rect.top }
    setDraggingId(cardId)

    // Capture so all future pointer events come here, even off-element
    e.currentTarget.setPointerCapture(e.pointerId)

    // Build ghost — a DOM clone styled like a gold card
    const day = DAYS.find(d => d.id === cardId)!
    const ghost = document.createElement('div')
    ghost.innerHTML =
      `<span style="font-size:clamp(1.6rem,3.8vw,2.8rem);line-height:1;display:block">${day.emoji}</span>` +
      `<span style="color:#D4A017;font-family:Georgia,serif;font-size:0.62rem;` +
        `text-align:center;padding:0 0.2rem;letter-spacing:0.03em;display:block;margin-top:0.3rem">${day.title}</span>`
    Object.assign(ghost.style, {
      position:      'fixed',
      left:          `${rect.left}px`,
      top:           `${rect.top}px`,
      width:         `${rect.width}px`,
      height:        `${rect.height}px`,
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      justifyContent:'center',
      background:    'linear-gradient(155deg,#1c1800,#2a2000)',
      border:        '2px solid #D4A017',
      borderRadius:  '9px',
      pointerEvents: 'none',
      zIndex:        '9999',
      opacity:       '0.94',
      boxShadow:     '0 10px 35px rgba(212,160,23,0.65), 0 0 55px rgba(212,160,23,0.30)',
      transform:     'scale(1.07)',
      cursor:        'grabbing',
      userSelect:    'none',
    })
    document.body.appendChild(ghost)
    ghostRef.current = ghost
  }

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>, cardId: number) => {
    const dr = dragRef.current
    if (!dr || dr.cardId !== cardId || !ghostRef.current) return

    // Move ghost directly — no setState = no re-render = buttery smooth
    ghostRef.current.style.left = `${e.clientX - dr.ox}px`
    ghostRef.current.style.top  = `${e.clientY - dr.oy}px`

    // Detect which slot is under the pointer
    ghostRef.current.style.visibility = 'hidden'
    const under = document.elementFromPoint(e.clientX, e.clientY)
    ghostRef.current.style.visibility = ''
    const slotEl = under?.closest('[data-slot]')
    const idx = slotEl ? parseInt(slotEl.getAttribute('data-slot') ?? '-1') : -1
    setHoverSlot(idx >= 0 ? idx : null)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>, cardId: number) => {
    const dr = dragRef.current
    if (!dr || dr.cardId !== cardId) return

    // Hide ghost, find target, remove ghost
    if (ghostRef.current) ghostRef.current.style.visibility = 'hidden'
    const under = document.elementFromPoint(e.clientX, e.clientY)
    if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null }

    const slotEl = under?.closest('[data-slot]')
    if (slotEl) {
      const idx = parseInt(slotEl.getAttribute('data-slot') ?? '-1')
      if (idx >= 0) doDropRef.current(cardId, idx)
    }
    // If no slot: card stays in hand (ghost simply vanishes = visual "return")

    dragRef.current = null
    setDraggingId(null)
    setHoverSlot(null)
  }

  const cancelDrag = () => {
    if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null }
    dragRef.current = null
    setDraggingId(null)
    setHoverSlot(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="level1">
      <canvas ref={bgRef} className="level1-bg" />

      <header className="level1-header">
        <p className="level1-day-label">DAY 1 OF 7</p>
        <h1 className="level1-title">The Seven Days of Creation</h1>
        <p className="level1-hint">Drag each card to its correct day below</p>
      </header>

      {/* Cards in hand */}
      <section className="cards-hand">
        {hand.map(id => {
          const day = DAYS.find(d => d.id === id)!
          return (
            <div
              key={id}
              className={`card${draggingId === id ? ' card--dragging' : ''}`}
              onPointerDown={e => startDrag(e, id)}
              onPointerMove={e => moveDrag(e, id)}
              onPointerUp={e => endDrag(e, id)}
              onPointerCancel={cancelDrag}
            >
              <span className="card-emoji">{day.emoji}</span>
              <span className="card-title">{day.title}</span>
              <span className="card-verse">{day.verse}</span>
            </div>
          )
        })}
        {hand.length === 0 && correct.size < 7 && (
          <p className="hand-empty">All cards placed — check the slots below</p>
        )}
      </section>

      {/* Progress pips */}
      <div className="progress-row">
        {[1,2,3,4,5,6,7].map(n => (
          <div key={n} className={`pip${correct.has(n) ? ' pip--lit' : ''}`} />
        ))}
      </div>

      {/* Slots */}
      <section className="slots-row">
        {Array.from({ length: 7 }, (_, i) => {
          const cardId = slots[i]
          const day    = cardId !== null ? DAYS.find(d => d.id === cardId) : null
          const isOk   = cardId !== null && correct.has(cardId)

          return (
            <div
              key={i}
              data-slot={i}
              className={[
                'slot',
                isOk              ? 'slot--correct' : '',
                hoverSlot === i   ? 'slot--hover'   : '',
                wrongSlots.has(i) ? 'slot--wrong'   : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="slot-number">{i + 1}</span>
              {day && isOk && (
                <div className="card card--in-slot card--correct">
                  <span className="card-emoji">{day.emoji}</span>
                  <span className="card-title">{day.title}</span>
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Completion */}
      {victory && (
        <CompletionScreen
          verse="In the beginning, God created the heavens and the earth."
          verseRef="Genesis 1:1"
          onComplete={onComplete}
        />
      )}
    </div>
  )
}
