import { useEffect, useRef } from 'react'
import { getCoins, getStreak } from '../game/coins'
import './CoinShopModal.css'

interface Props { onClose: () => void }

const PACKAGES = [
  { id: 'seed',      label: 'SEED FAITH',         coins: 500,  price: 'CA$1', emoji: '🌱' },
  { id: 'kingdom',   label: 'KINGDOM BLESSING',    coins: 1200, price: 'CA$2', emoji: '👑' },
  { id: 'divine',    label: 'DIVINE FAVOUR',       coins: 3000, price: 'CA$4', emoji: '✨' },
  { id: 'apostolic', label: 'APOSTOLIC ABUNDANCE', coins: 7000, price: 'CA$8', emoji: '⚡' },
]

export default function CoinShopModal({ onClose }: Props) {
  const coins  = getCoins()
  const streak = getStreak()
  const name   = localStorage.getItem('iq_character') || 'Warrior'

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const parent = cv.parentElement
    cv.width  = parent ? parent.clientWidth  : 480
    cv.height = parent ? parent.clientHeight : 600
    const W = cv.width, H = cv.height

    interface C { x: number; y: number; vy: number; r: number; alpha: number; hue: number; angle: number; spin: number }
    const coins_arr: C[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H - H,
      vy: Math.random() * 2 + 1.2,
      r: Math.random() * 8 + 4,
      alpha: Math.random() * 0.6 + 0.25,
      hue: Math.random() * 25 + 38,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.08,
    }))

    const tick = () => {
      ctx.clearRect(0, 0, W, H)
      for (const c of coins_arr) {
        c.y += c.vy; c.angle += c.spin
        if (c.y > H + 20) { c.y = -20; c.x = Math.random() * W }
        ctx.save()
        ctx.translate(c.x, c.y); ctx.rotate(c.angle)
        ctx.beginPath()
        ctx.ellipse(0, 0, c.r, c.r * 0.42, 0, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${c.hue},88%,58%,${c.alpha * 0.3})`; ctx.fill()
        ctx.beginPath()
        ctx.ellipse(0, 0, c.r * 0.82, c.r * 0.36, 0, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${c.hue},95%,72%,${c.alpha * 0.65})`; ctx.fill()
        ctx.restore()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const handlePurchase = () => {
    alert('Payment coming soon! Check back for our full launch. 🙏')
  }

  return (
    <div className="shop-backdrop" onClick={onClose}>
      <div className="shop-modal" onClick={e => e.stopPropagation()}>
        <canvas ref={canvasRef} className="shop-coin-shower" />

        <div className="shop-header">
          <h2 className="shop-title">THE TREASURY</h2>
          <p className="shop-sub">Invest in your Kingdom journey</p>
          <div className="shop-balance">
            <span className="shop-bal-coins">🪙 {coins.toLocaleString()}</span>
            {streak > 0 && <span className="shop-bal-streak">🔥 {streak} day streak</span>}
          </div>
          <button className="shop-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="shop-packages">
          {PACKAGES.map(pkg => (
            <button key={pkg.id} className="shop-pkg" onClick={handlePurchase}>
              <span className="shop-pkg-emoji">{pkg.emoji}</span>
              <span className="shop-pkg-label">{pkg.label}</span>
              <span className="shop-pkg-coins">{pkg.coins.toLocaleString()} 🪙</span>
              <span className="shop-pkg-price">{pkg.price}</span>
            </button>
          ))}
        </div>

        <div className="shop-free-section">
          <p className="shop-free-title">— FREE COINS —</p>
          <div className="shop-free-items">
            <div className="shop-free-item">
              <span>📺 WATCH &amp; EARN</span>
              <span className="shop-free-coins">+50 🪙 <span className="shop-coming-soon">coming soon</span></span>
            </div>
            <div className="shop-free-item">
              <span>👥 INVITE A FRIEND</span>
              <span className="shop-free-coins">+200 🪙 <span className="shop-coming-soon">coming soon</span></span>
            </div>
          </div>
        </div>

        <p className="shop-manna-note">
          ✦ FREE DAILY MANNA: Log in every day to collect your streak bonus — up to 500 🪙!
        </p>

        <p className="shop-player-note">Playing as: <strong>{name}</strong></p>
      </div>
    </div>
  )
}
