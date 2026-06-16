import { useEffect, useRef, useState } from 'react'
import { getCoins, spendCoins } from './coins'
import './FailScreen.css'

interface Props {
  onRetry: () => void
  onHintRetry: () => void
  onRestart: () => void
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  r: number; alpha: number; hue: number
}

export default function FailScreen({ onRetry, onHintRetry, onRestart }: Props) {
  const name = localStorage.getItem('iq_character') || 'Warrior'
  const [coins, setCoins] = useState(() => getCoins())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  const handleHintRetry = () => {
    if (spendCoins(10)) {
      setCoins(getCoins())
      onHintRetry()
    }
  }

  // Upward gold particle canvas
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    cv.width  = window.innerWidth
    cv.height = window.innerHeight
    const W = cv.width, H = cv.height

    const particles: Particle[] = Array.from({ length: 70 }, () => ({
      x:     Math.random() * W,
      y:     H + Math.random() * 120,
      vx:    (Math.random() - 0.5) * 0.7,
      vy:    -(Math.random() * 1.4 + 0.5),
      r:     Math.random() * 2.8 + 0.8,
      alpha: Math.random() * 0.5 + 0.2,
      hue:   Math.random() * 22 + 36,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.y     += p.vy
        p.x     += p.vx
        p.alpha -= 0.0018
        if (p.y < -12 || p.alpha <= 0) {
          p.x     = Math.random() * W
          p.y     = H + 12
          p.vy    = -(Math.random() * 1.4 + 0.5)
          p.vx    = (Math.random() - 0.5) * 0.7
          p.alpha = Math.random() * 0.5 + 0.3
          p.hue   = Math.random() * 22 + 36
          p.r     = Math.random() * 2.8 + 0.8
        }
        // Soft glow halo + bright core
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},88%,62%,${p.alpha * 0.18})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},85%,72%,${p.alpha})`
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const canAfford = coins >= 10

  return (
    <div className="fail-screen">
      <canvas ref={canvasRef} className="fail-canvas" />

      <div className="fail-content">
        <p className="fail-coins">🪙 {coins} coins</p>

        <h1 className="fail-name">{name}</h1>

        <p className="fail-message">
          Every warrior stumbles, {name}. Rise again.
        </p>

        <p className="fail-verse">
          "For though the righteous fall seven times, they rise again"
        </p>
        <p className="fail-verse-ref">— Proverbs 24:16</p>

        <div className="fail-actions">
          <button className="fail-btn fail-btn--primary" onClick={onRetry}>
            TRY THIS LEVEL AGAIN
          </button>

          <button
            className={`fail-btn fail-btn--hint${canAfford ? '' : ' fail-btn--locked'}`}
            onClick={canAfford ? handleHintRetry : undefined}
            disabled={!canAfford}
            title={canAfford ? '' : 'Not enough coins'}
          >
            USE 10 COINS FOR A HINT 🪙
            {!canAfford && <span className="fail-hint-sub"> (need {10 - coins} more coins)</span>}
          </button>

          <button className="fail-btn fail-btn--restart" onClick={onRestart}>
            START FROM LEVEL 1-1
          </button>
        </div>
      </div>
    </div>
  )
}
