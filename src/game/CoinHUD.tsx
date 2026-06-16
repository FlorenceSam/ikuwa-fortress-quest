import { useState } from 'react'
import './CoinHUD.css'
import { spendCoins } from './coins'

interface Props {
  coins: number
  hint: string
  onCoinsChange: (n: number) => void
  disabled?: boolean
}

export default function CoinHUD({ coins, hint, onCoinsChange, disabled }: Props) {
  const [showHint, setShowHint] = useState(false)

  const handleHint = () => {
    if (disabled || coins < 5) return
    if (spendCoins(5)) {
      onCoinsChange(coins - 5)
      setShowHint(true)
    }
  }

  return (
    <>
      <div className="coin-hud">
        <span className="coin-count">🪙 {coins}</span>
        <button
          className="hint-btn"
          onClick={handleHint}
          disabled={disabled || coins < 5}
          title={coins < 5 ? 'Need 5 coins for a hint' : 'Spend 5 coins for a hint'}
        >
          Hint 💡
        </button>
      </div>

      {showHint && (
        <div className="hint-overlay" onClick={() => setShowHint(false)}>
          <div className="hint-box" onClick={e => e.stopPropagation()}>
            <p className="hint-text">{hint}</p>
            <p className="hint-close">Tap anywhere to close</p>
          </div>
        </div>
      )}
    </>
  )
}
