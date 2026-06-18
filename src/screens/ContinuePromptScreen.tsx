import './ContinuePromptScreen.css'
import { getCoins } from '../game/coins'
import { getCurrentPlayer, loadPlayerSave, levelDisplayName } from '../game/save'

export default function ContinuePromptScreen({
  onContinue, onRestart,
}: { onContinue: () => void; onRestart: () => void }) {
  const charName = localStorage.getItem('iq_character') || 'Warrior'
  const player   = getCurrentPlayer() || charName
  const save     = loadPlayerSave(player)
  const level    = save?.level ?? 1
  const coins    = save?.coins ?? getCoins()
  const lvlName  = levelDisplayName(level)

  return (
    <div className="cp-screen">
      <div className="cp-stars" aria-hidden />

      <div className="cp-card">
        <p className="cp-eyebrow">⚔ IKUWA FORTRESS ⚔</p>
        <h1 className="cp-name">Welcome back,<br />{charName}!</h1>
        <p className="cp-tagline">Continue your journey through God's Word</p>

        <div className="cp-stats-row">
          <div className="cp-stat">
            <span className="cp-stat-icon">🪙</span>
            <span className="cp-stat-val">{coins}</span>
            <span className="cp-stat-lbl">Coins</span>
          </div>
          <div className="cp-stat-sep" />
          <div className="cp-stat">
            <span className="cp-stat-icon">📖</span>
            <span className="cp-stat-val">Level {lvlName}</span>
            <span className="cp-stat-lbl">Saved Progress</span>
          </div>
        </div>

        <div className="cp-btns">
          <button className="cp-btn cp-btn--primary" onClick={onContinue}>
            ▶ CONTINUE FROM<br />
            <span className="cp-btn-lvl">LEVEL {lvlName}</span>
          </button>
          <button className="cp-btn cp-btn--secondary" onClick={onRestart}>
            ↩ START FROM BEGINNING
          </button>
        </div>

        <p className="cp-verse">
          "Your word is a lamp for my feet, a light on my path."
          <span className="cp-verse-ref">— Psalm 119:105</span>
        </p>

        {/* Debug line — confirms save data is reading correctly */}
        <p style={{
          margin: '0.6rem 0 0',
          fontSize: '0.72rem',
          color: 'rgba(255,215,0,0.45)',
          fontFamily: 'monospace',
          textAlign: 'center',
        }}>
          Saved data: Level {level} | Coins {coins} | Player: {player}
        </p>
      </div>
    </div>
  )
}
