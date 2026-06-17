import { useEffect, useRef, useState } from 'react'
import './DailyMannaScreen.css'
import { checkDailyManna, claimDailyManna } from '../game/coins'

interface Props { onCollect: () => void }

const MESSAGES: ((n: string) => string)[] = [
  n  => `Your daily bread has arrived, ${n}!`,
  () => `God's mercies are new every morning!`,
  () => `Faithful and present — just like God!`,
  () => `Four days strong — Heaven is watching!`,
  n  => `You are unstoppable, ${n}!`,
  () => `One more day until the great blessing!`,
  n  => `SEVEN DAYS FAITHFUL! You are a covenant keeper, ${n}!`,
]

export default function DailyMannaScreen({ onCollect }: Props) {
  const info        = checkDailyManna()
  const name        = localStorage.getItem('iq_character') || 'Warrior'
  const { streak, coins: mannaCoins, dayInCycle } = info
  const isDay7      = dayInCycle === 7

  const [opened,  setOpened]  = useState(false)
  const [showing, setShowing] = useState(false)
  const [claimed, setClaimed] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  const msg = MESSAGES[(dayInCycle - 1) % 7](name)

  useEffect(() => {
    const t1 = setTimeout(() => setOpened(true),  1200)
    const t2 = setTimeout(() => setShowing(true), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (!showing) return
    const t = setTimeout(() => {
      if (!('speechSynthesis' in window)) return
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(msg)
      u.rate = 0.78; u.pitch = isDay7 ? 1.15 : 1.0; u.volume = 1
      speechSynthesis.speak(u)
    }, 300)
    return () => clearTimeout(t)
  }, [showing, msg, isDay7])

  useEffect(() => {
    if (!showing) return
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    cv.width  = window.innerWidth
    cv.height = window.innerHeight
    const W = cv.width, H = cv.height

    interface P { x: number; y: number; vx: number; vy: number; r: number; alpha: number; hue: number }
    const count = isDay7 ? 220 : 90
    const ps: P[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 9 + 2
      return {
        x: W / 2, y: H * 0.36,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: Math.random() * 3.5 + 0.8,
        alpha: 1,
        hue: isDay7 ? Math.random() * 40 + 32 : Math.random() * 30 + 38,
      }
    })

    const tick = () => {
      ctx.clearRect(0, 0, W, H)
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.alpha -= 0.013
        if (p.alpha <= 0) { ps.splice(i, 1); continue }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},96%,65%,${p.alpha})`; ctx.fill()
      }
      if (ps.length > 0) rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(rafRef.current)
  }, [showing, isDay7])

  const handleCollect = () => {
    if (claimed) return
    setClaimed(true)
    claimDailyManna()
    if ('speechSynthesis' in window) speechSynthesis.cancel()
    setTimeout(onCollect, 400)
  }

  return (
    <div className={`manna-screen${isDay7 ? ' manna-screen--day7' : ''}`}>
      <canvas ref={canvasRef} className="manna-canvas" />
      <div className="manna-stars" aria-hidden />

      <div className="manna-body">
        <p className="manna-eyebrow">✦ DAILY MANNA DROP ✦</p>

        <div className={`manna-envelope${opened ? ' manna-envelope--open' : ''}`}>
          <span className="manna-env-icon">{opened ? '📬' : '📨'}</span>
          {isDay7 && opened && <span className="manna-env-glow" aria-hidden />}
        </div>

        {showing && (
          <div className="manna-reveal">
            <div className="manna-streak-badge">
              <span className="manna-fire">🔥</span>
              <span className="manna-streak-num">{streak}</span>
              <span className="manna-streak-lbl">Day Streak</span>
            </div>

            <div className={`manna-reward-block${isDay7 ? ' manna-reward-block--day7' : ''}`}>
              <span className="manna-reward-amount">+{mannaCoins}</span>
              <span className="manna-reward-coin">🪙</span>
              {isDay7 && <p className="manna-legendary">⚡ LEGENDARY REWARD ⚡</p>}
            </div>

            <p className="manna-message">{msg}</p>

            <button
              className={`manna-btn${isDay7 ? ' manna-btn--day7' : ''}`}
              onClick={handleCollect}
              disabled={claimed}
            >
              {claimed ? '✓ MANNA RECEIVED!' : '✦ RECEIVE YOUR MANNA ✦'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
