import './ContinuePromptScreen.css'
import { getCoins } from '../game/coins'

const LEVEL_NAMES: Record<string, string> = {
  game:    '1-1: In The Beginning',
  level2:  '1-2: The Garden of Eden',
  level3:  '1-3: Cain & Abel',
  level4:  '1-4: The Great Flood',
  level5:  '1-5: The Tower of Babel',
  level6:  '1-6: The Call of Abram',
  level7:  '1-7: The Living Family Tree',
  level8:  '1-8: The Nephilim',
  level9:  '1-9: Noah\'s Ark Construction',
  level10: '1-10: The Great Flood',
}

function getLevelLabel(screen: string): string {
  if (LEVEL_NAMES[screen]) return LEVEL_NAMES[screen]
  const m = screen.match(/^level(\d+)$/)
  return m ? `1-${m[1]}` : screen
}

export default function ContinuePromptScreen({
  onContinue, onRestart,
}: { onContinue: () => void; onRestart: () => void }) {
  const name     = localStorage.getItem('iq_character') || 'Warrior'
  const progress = localStorage.getItem('iq_progress')  || 'game'
  const coins    = getCoins()

  return (
    <div className="cp-screen">
      <div className="cp-stars" aria-hidden />

      <div className="cp-card">
        <p className="cp-eyebrow">⚔ IKUWA FORTRESS ⚔</p>
        <h1 className="cp-name">Welcome back,<br />{name}!</h1>
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
            <span className="cp-stat-val">Level {getLevelLabel(progress)}</span>
            <span className="cp-stat-lbl">Saved Progress</span>
          </div>
        </div>

        <div className="cp-btns">
          <button className="cp-btn cp-btn--primary" onClick={onContinue}>
            ▶ CONTINUE FROM<br />
            <span className="cp-btn-lvl">LEVEL {getLevelLabel(progress)}</span>
          </button>
          <button className="cp-btn cp-btn--secondary" onClick={onRestart}>
            ↩ START FROM BEGINNING
          </button>
        </div>

        <p className="cp-verse">
          "Your word is a lamp for my feet, a light on my path."
          <span className="cp-verse-ref">— Psalm 119:105</span>
        </p>
      </div>
    </div>
  )
}
