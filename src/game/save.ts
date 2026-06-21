// ─── IKUWA Save System ───────────────────────────────────────────────────────
// Single source of truth for all player progress.
// ikuwa_player  = character name of whoever is currently playing
// ikuwa_save    = { "Florence": { level: 3, coins: 450 }, "Lemuel": { ... } }

const SAVE_KEY   = 'ikuwa_save'
const PLAYER_KEY = 'ikuwa_player'

export interface PlayerSave {
  level: number   // 1-based: 1 = Level 1-1, 2 = Level 1-2, etc.
  coins: number
}

type SaveData = Record<string, PlayerSave>

function readAll(): SaveData {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') as SaveData
  } catch (_) {
    return {}
  }
}

function writeAll(data: SaveData): void {
  const json = JSON.stringify(data)
  localStorage.setItem(SAVE_KEY, json)
  console.log('[IKUWA SAVE] ikuwa_save =', json)
}

// ── Public API ────────────────────────────────────────────────────────────────

export function setCurrentPlayer(name: string): void {
  localStorage.setItem(PLAYER_KEY, name)
  console.log('[IKUWA SAVE] ikuwa_player =', name)
}

export function getCurrentPlayer(): string {
  return localStorage.getItem(PLAYER_KEY) || ''
}

export function loadPlayerSave(name: string): PlayerSave | null {
  if (!name) return null
  const save = readAll()[name] ?? null
  console.log(`[IKUWA SAVE] loadPlayerSave("${name}") →`, save ?? 'NOT FOUND')
  return save
}

// Called every time a level starts OR completes.
export function saveProgress(name: string, level: number, coins: number): void {
  if (!name) {
    console.warn('[IKUWA SAVE] saveProgress: no player name — skipping')
    return
  }
  const all = readAll()
  all[name] = { level, coins }
  writeAll(all)
  console.log(`[IKUWA SAVE] ✓ "${name}" saved → Level ${level}, Coins ${coins}`)
}

// ── Level number ↔ AppScreen key ─────────────────────────────────────────────

export function screenToLevel(screen: string): number {
  if (screen === 'game') return 1
  const m = screen.match(/^level(\d+)$/)
  return m ? parseInt(m[1], 10) : 1
}

export function levelToScreen(level: number): string {
  if (level <= 1) return 'game'
  if (level > 22) return 'welcome'
  if (level === 16) return 'level17'   // no Level16 — map gap to Level17
  return `level${level}`
}

export function levelDisplayName(level: number): string {
  const NAMES: Record<number, string> = {
    1:  '1-1: In The Beginning',
    2:  '1-2: The Garden of Eden',
    3:  '1-3: Cain & Abel',
    4:  '1-4: The Great Flood',
    5:  '1-5: The Tower of Babel',
    6:  '1-6: The Call of Abram',
    7:  '1-7: The Living Family Tree',
    8:  '1-8: The Nephilim',
    9:  '1-9: Noah\'s Ark Construction',
    10: '1-10: The Great Flood 40 Days',
    11: '1-11: The Noahic Covenant',
    12: '1-12: The Mantle of Honour and Wisdom',
    13: '1-13: The Birth of Nations',
    14: '1-14: The Fall of Babel — Chaos Reigns',
    15: '1-15: The Golden Chain — From Shem to Abram',
    16: '1-16: Abram is Called',
    17: '1-17: Wife or Half-Sister? — Abram in Egypt',
    18: '1-18: The Great Divide — Abram vs Lot',
  }
  return NAMES[level] ?? `Level 1-${level}`
}
