const KEY = 'iq_coins'

export const getCoins = (): number =>
  parseInt(localStorage.getItem(KEY) || '0', 10)

export const addCoins = (n: number): number => {
  const v = getCoins() + n
  localStorage.setItem(KEY, String(v))
  return v
}

export const spendCoins = (n: number): boolean => {
  const c = getCoins()
  if (c < n) return false
  localStorage.setItem(KEY, String(c - n))
  return true
}
