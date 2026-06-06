import { useEffect, useRef, useState } from 'react'
import './level1.css'

// ─── Creation days data ────────────────────────────────────────────────────

const DAYS = [
  { id: 1, emoji: '🌑', title: 'Darkness & Light',  verse: 'Genesis 1:3-5'  },
  { id: 2, emoji: '🌊', title: 'Sky & Water',        verse: 'Genesis 1:6-8'  },
  { id: 3, emoji: '🌿', title: 'Land & Plants',      verse: 'Genesis 1:9-13' },
  { id: 4, emoji: '⭐', title: 'Sun, Moon & Stars', verse: 'Genesis 1:14-19'},
  { id: 5, emoji: '🐟', title: 'Fish & Birds',       verse: 'Genesis 1:20-23'},
  { id: 6, emoji: '🦁', title: 'Animals & Humans',   verse: 'Genesis 1:24-31'},
  { id: 7, emoji: '😴', title: 'God Rests',          verse: 'Genesis 2:1-3'  },
]

// Pentatonic scale — each correct drop plays the next note up
const NOTES = [523.25, 659.25, 783.99, 880, 1046.50, 1318.51, 1567.98]

// ─── Audio helpers ─────────────────────────────────────────────────────────

function playChime(freq: number) {
  try {
    const ctx = new AudioContext()
    const play = (f: number, vol: number, dur: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(vol, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      o.connect(g); g.connect(ctx.destination)
      o.start(); o.stop(ctx.currentTime + dur)
    }
    play(freq,      0.30, 1.8)
    play(freq * 2,  0.12, 1.2)
    play(freq * 3,  0.05, 0.8)
  } catch (_) {}
}

function playVictory() {
  try {
    const ctx = new AudioContext()
    // Rising arpeggio then held chord
    const arp = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]
    arp.forEach((f, i) => {
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

// ─── Utilities ─────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface VParticle {
  x: number; y: number; vx: number; vy: number
  r: number; life: number; max: number; hue: number
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function Level1() {
  const [hand,       setHand]       = useState<number[]>(() => shuffle([1,2,3,4,5,6,7]))
  const [slots,      setSlots]      = useState<(number|null)[]>(Array(7).fill(null))
  const [correct,    setCorrect]    = useState<Set<number>>(new Set())
  const [dragId,     setDragId]     = useState<number|null>(null)
  const [hoverSlot,  setHoverSlot]  = useState<number|null>(null)
  const [wrongSlots, setWrongSlots] = useState<Set<number>>(new Set())
  const [victory,    setVictory]    = useState(false)

  const bgRef      = useRef<HTMLCanvasElement>(null)
  const victoryRef = useRef<HTMLCanvasElement>(null)
  const bgRafRef   = useRef<number>(0)
  const vRafRef    = useRef<number>(0)
  // Ref holds drag state for both HTML5 drag and touch events
  const dragRef    = useRef<{ cardId: number; from: 'hand' | number } | null>(null)

  // ── Background stars ──────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = bgRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const W = canvas.width, H = canvas.height

    const stars = Array.from({ length: 260 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r:   Math.random() * 1.3 + 0.2,
      base: Math.random() * 0.4 + 0.12,
      amp:  Math.random() * 0.14 + 0.03,
      spd:  Math.random() * 0.02 + 0.003,
      ph:   Math.random() * Math.PI * 2,
      hue:  Math.random() < 0.68 ? Math.random() * 20 + 40 : 210,
    }))

    let frame = 0
    const tick = () => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
      const cg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.45)
      cg.addColorStop(0, 'rgba(212,160,23,0.05)'); cg.addColorStop(1, 'transparent')
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H)
      frame++
      for (const s of stars) {
        const op = Math.max(0.03, Math.min(1, s.base + Math.sin(frame * s.spd + s.ph) * s.amp))
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue},70%,70%,${op * 0.18})`; ctx.fill()
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue},60%,93%,${op})`; ctx.fill()
      }
      bgRafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(bgRafRef.current)
  }, [])

  // ── Victory check ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (correct.size === 7) {
      playVictory()
      setTimeout(() => setVictory(true), 500)
    }
  }, [correct])

  // ── Victory particles canvas ──────────────────────────────────────────────

  useEffect(() => {
    if (!victory) return
    const canvas = victoryRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const W = canvas.width, H = canvas.height

    const parts: VParticle[] = Array.from({ length: 320 }, () => {
      const a = Math.random() * Math.PI * 2
      const s = Math.random() * 9 + 1.5
      return { x: W/2, y: H/2, vx: Math.cos(a)*s, vy: Math.sin(a)*s,
               r: Math.random()*3+0.5, life: 0, max: Math.random()*140+60,
               hue: Math.random()*25+38 }
    })

    const tick = () => {
      ctx.clearRect(0, 0, W, H)
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        if (++p.life >= p.max) { parts.splice(i, 1); continue }
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.962; p.vy *= 0.962; p.vy += 0.08
        const t = p.life / p.max, op = Math.pow(1 - t, 0.82)
        const rN = p.r * (1 + t * 0.9)
        ctx.beginPath(); ctx.arc(p.x, p.y, rN * 3.5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},90%,58%,${op * 0.22})`; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, rN, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},96%,92%,${op})`; ctx.fill()
      }
      vRafRef.current = requestAnimationFrame(tick)
      if (parts.length === 0) cancelAnimationFrame(vRafRef.current)
    }
    tick()
    return () => cancelAnimationFrame(vRafRef.current)
  }, [victory])

  // ── Core drop logic (shared by HTML5 drag and touch) ──────────────────────

  const executeDrop = (cardId: number, from: 'hand' | number, slotIdx: number) => {
    const existing = slots[slotIdx]
    if (existing !== null && correct.has(existing)) return  // slot is locked

    const newSlots = [...slots]
    const newHand  = [...hand]

    if (from === 'hand') {
      newHand.splice(newHand.indexOf(cardId), 1)
    } else {
      newSlots[from as number] = null
    }

    if (existing !== null && !correct.has(existing)) newHand.push(existing)

    newSlots[slotIdx] = cardId

    const isCorrect = cardId === slotIdx + 1
    if (isCorrect) {
      playChime(NOTES[slotIdx])
      setCorrect(prev => new Set([...prev, cardId]))
    } else {
      setWrongSlots(prev => { const n = new Set(prev); n.add(slotIdx); return n })
      setTimeout(() => setWrongSlots(prev => { const n = new Set(prev); n.delete(slotIdx); return n }), 600)
    }

    setSlots(newSlots); setHand(newHand)
    setDragId(null); setHoverSlot(null)
    dragRef.current = null
  }

  const returnToHand = (cardId: number, from: number) => {
    const newSlots = [...slots]; newSlots[from] = null
    setSlots(newSlots); setHand(h => [...h, cardId])
    setDragId(null); dragRef.current = null
  }

  // ── HTML5 drag handlers ───────────────────────────────────────────────────

  const onCardDragStart = (cardId: number, from: 'hand' | number) => {
    dragRef.current = { cardId, from }
    setDragId(cardId)
  }

  const onSlotDrop = (slotIdx: number) => {
    if (!dragRef.current) return
    executeDrop(dragRef.current.cardId, dragRef.current.from, slotIdx)
  }

  const onHandDrop = () => {
    if (!dragRef.current || dragRef.current.from === 'hand') { setDragId(null); return }
    returnToHand(dragRef.current.cardId, dragRef.current.from as number)
  }

  // ── Touch drag handlers ───────────────────────────────────────────────────

  const onCardTouchStart = (e: React.TouchEvent, cardId: number, from: 'hand' | number) => {
    dragRef.current = { cardId, from }
    setDragId(cardId)
  }

  const onCardTouchEnd = (e: React.TouchEvent) => {
    if (!dragRef.current) return
    const touch = e.changedTouches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const slotEl = el?.closest('[data-slot]')
    if (slotEl) {
      const idx = parseInt(slotEl.getAttribute('data-slot') ?? '-1')
      if (idx >= 0) { executeDrop(dragRef.current.cardId, dragRef.current.from, idx); return }
    }
    // Dropped outside a slot — if came from a slot, return to hand
    if (dragRef.current.from !== 'hand') {
      returnToHand(dragRef.current.cardId, dragRef.current.from as number)
    }
    setDragId(null); dragRef.current = null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="level1">
      <canvas ref={bgRef} className="level1-bg" />

      {/* Header */}
      <header className="level1-header">
        <p className="level1-day-label">DAY 1 OF 7</p>
        <h1 className="level1-title">The Seven Days of Creation</h1>
        <p className="level1-hint">Drag each card to its correct day</p>
      </header>

      {/* Cards in hand */}
      <section
        className="cards-hand"
        onDragOver={e => e.preventDefault()}
        onDrop={onHandDrop}
      >
        {hand.map(id => {
          const day = DAYS.find(d => d.id === id)!
          return (
            <div
              key={id}
              className={`card${dragId === id ? ' card--dragging' : ''}`}
              draggable
              onDragStart={() => onCardDragStart(id, 'hand')}
              onDragEnd={() => { setDragId(null); dragRef.current = null }}
              onTouchStart={e => onCardTouchStart(e, id, 'hand')}
              onTouchEnd={onCardTouchEnd}
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

      {/* Progress */}
      <div className="progress-row">
        {[1,2,3,4,5,6,7].map(n => (
          <div key={n} className={`pip${correct.has(n) ? ' pip--lit' : ''}`} />
        ))}
      </div>

      {/* Slots */}
      <section className="slots-row">
        {Array.from({ length: 7 }, (_, i) => {
          const cardId  = slots[i]
          const day     = cardId !== null ? DAYS.find(d => d.id === cardId) : null
          const isOk    = cardId !== null && correct.has(cardId)
          const isWrong = wrongSlots.has(i)

          return (
            <div
              key={i}
              data-slot={i}
              className={[
                'slot',
                isOk                     ? 'slot--correct' : '',
                hoverSlot === i && !isOk ? 'slot--hover'   : '',
                isWrong                  ? 'slot--wrong'   : '',
              ].filter(Boolean).join(' ')}
              onDragOver={e => { e.preventDefault(); if (!isOk) setHoverSlot(i) }}
              onDragLeave={() => setHoverSlot(null)}
              onDrop={() => { onSlotDrop(i); setHoverSlot(null) }}
            >
              <span className="slot-number">{i + 1}</span>

              {day && (
                <div
                  className={`card card--in-slot${isOk ? ' card--correct' : ''}`}
                  draggable={!isOk}
                  onDragStart={() => !isOk && onCardDragStart(cardId!, i)}
                  onDragEnd={() => { setDragId(null); dragRef.current = null }}
                  onTouchStart={e => !isOk && onCardTouchStart(e, cardId!, i)}
                  onTouchEnd={!isOk ? onCardTouchEnd : undefined}
                >
                  <span className="card-emoji">{day.emoji}</span>
                  <span className="card-title">{day.title}</span>
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Victory overlay */}
      {victory && (
        <div className="victory-overlay">
          <canvas ref={victoryRef} className="victory-canvas" />
          <div className="victory-content">
            <h1 className="victory-glory">GLORY!</h1>
            <p className="victory-message">You are a walking miracle!</p>
            <p className="victory-verse">"For we are God's masterpiece" — Ephesians 2:10</p>
          </div>
        </div>
      )}
    </div>
  )
}
