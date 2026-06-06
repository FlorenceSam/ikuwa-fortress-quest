import { useEffect, useRef } from 'react'
import './completion.css'

interface Props {
  verse: string
  verseRef: string
  onComplete?: () => void
}

interface Ember {
  x: number; y: number
  vy: number            // upward speed (positive = up after negation)
  driftAmp: number      // horizontal sine amplitude
  driftPhase: number
  driftFreq: number
  r: number
  opacity: number
  targetOp: number
  hue: number
}

function makeEmber(W: number, H: number, randomY = false): Ember {
  return {
    x:          Math.random() * W,
    y:          randomY ? Math.random() * H : H + Math.random() * 30,
    vy:         Math.random() * 0.85 + 0.28,
    driftAmp:   Math.random() * 0.7 + 0.08,
    driftPhase: Math.random() * Math.PI * 2,
    driftFreq:  Math.random() * 0.016 + 0.005,
    r:          Math.random() * 2.0 + 0.5,
    opacity:    0,
    targetOp:   Math.random() * 0.48 + 0.14,
    hue:        Math.random() * 24 + 38,   // gold: 38–62
  }
}

function speakCompletion(name: string) {
  try {
    const utt = new SpeechSynthesisUtterance(
      `${name}. You have walked faithfully today.`
    )
    utt.rate = 0.72; utt.pitch = 0.96; utt.volume = 1
    const warm = speechSynthesis.getVoices()
      .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
    if (warm) utt.voice = warm
    speechSynthesis.cancel()
    speechSynthesis.speak(utt)
  } catch (_) {}
}

export default function CompletionScreen({ verse, verseRef, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const name      = localStorage.getItem('iq_character') || 'Warrior'

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    cv.width  = window.innerWidth
    cv.height = window.innerHeight
    const W = cv.width, H = cv.height

    // Pre-populate with embers spread across screen so it isn't bare on load
    const embers: Ember[] = Array.from({ length: 80 }, () => makeEmber(W, H, true))
    embers.forEach(e => { e.opacity = Math.random() * e.targetOp })

    let frame = 0

    const tick = () => {
      frame++
      ctx.clearRect(0, 0, W, H)

      // Subtle warm canvas glow
      const g = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, W * 0.52)
      g.addColorStop(0, 'rgba(212,160,23,0.038)'); g.addColorStop(1, 'transparent')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i]

        e.y -= e.vy
        e.x += Math.sin(frame * e.driftFreq + e.driftPhase) * e.driftAmp

        // Wrap x
        if (e.x < -6) e.x = W + 6
        if (e.x > W + 6) e.x = -6

        // Fade in from bottom 20%, fade out to top 12%
        const rel = e.y / H
        if (rel > 0.80)      e.opacity = Math.min(e.targetOp, e.opacity + 0.007)
        else if (rel < 0.12) e.opacity = Math.max(0, e.opacity - 0.012)
        else                 e.opacity = Math.min(e.targetOp, e.opacity + 0.003)

        // Respawn when off top
        if (e.y < -20) {
          Object.assign(e, makeEmber(W, H))
        }

        if (e.opacity < 0.005) continue

        // Outer glow
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 3.8, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${e.hue},88%,60%,${e.opacity * 0.20})`; ctx.fill()
        // Core
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${e.hue},92%,90%,${e.opacity})`; ctx.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    tick()

    // Speak name after text entrance animations have begun
    const voiceTimer = setTimeout(() => speakCompletion(name), 900)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(voiceTimer)
    }
  }, [name])

  return (
    <div className="comp-screen">
      <canvas ref={canvasRef} className="comp-canvas" />
      <div className="comp-glow" />
      <div className="comp-content">
        <h1 className="comp-name">{name}</h1>
        <p className="comp-subtitle">you have walked faithfully today</p>
        <div className="comp-divider" />
        <p className="comp-verse">"{verse}"</p>
        <p className="comp-verse-ref">— {verseRef}</p>
        <button className="comp-btn" onClick={onComplete}>
          CONTINUE YOUR JOURNEY
        </button>
      </div>
    </div>
  )
}
