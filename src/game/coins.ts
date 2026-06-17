function player(): string {
  return (localStorage.getItem('iq_character') || 'guest').replace(/\s+/g, '_')
}

const coinKey   = () => `iq_coins_${player()}`
const streakKey = () => `iq_streak_${player()}`
const loginKey  = () => `iq_login_${player()}`

export const getCoins = (): number =>
  parseInt(localStorage.getItem(coinKey()) || '0', 10)

export const addCoins = (n: number): number => {
  const v = getCoins() + n
  localStorage.setItem(coinKey(), String(v))
  return v
}

export const spendCoins = (n: number): boolean => {
  const c = getCoins()
  if (c < n) return false
  localStorage.setItem(coinKey(), String(c - n))
  return true
}

export const penalizeCoins = (n = 50): number => {
  const v = Math.max(0, getCoins() - n)
  localStorage.setItem(coinKey(), String(v))
  return v
}

export const getStreak = (): number =>
  parseInt(localStorage.getItem(streakKey()) || '0', 10)

const MANNA = [0, 100, 150, 200, 250, 300, 400, 500]

function todayStr()     { return new Date().toDateString() }
function yesterdayStr() { return new Date(Date.now() - 86_400_000).toDateString() }

export interface MannaInfo {
  shouldShow:  boolean
  streak:      number
  coins:       number
  dayInCycle:  number
}

export const checkDailyManna = (): MannaInfo => {
  const today     = todayStr()
  const lastLogin = localStorage.getItem(loginKey())
  if (lastLogin === today) return { shouldShow: false, streak: getStreak(), coins: 0, dayInCycle: 0 }
  const current    = getStreak()
  const newStreak  = lastLogin === yesterdayStr() ? current + 1 : 1
  const dayInCycle = ((newStreak - 1) % 7) + 1
  return { shouldShow: true, streak: newStreak, coins: MANNA[dayInCycle], dayInCycle }
}

export const claimDailyManna = (): MannaInfo => {
  const info = checkDailyManna()
  if (!info.shouldShow) return info
  localStorage.setItem(streakKey(), String(info.streak))
  localStorage.setItem(loginKey(), todayStr())
  if (info.coins > 0) addCoins(info.coins)
  return info
}
