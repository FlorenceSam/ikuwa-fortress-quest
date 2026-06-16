import { useEffect, useRef, useState } from 'react'
import './level5.css'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { getCoins, addCoins } from './coins'

const HINT = 'Tap when the brick is in the GOLD zone — wait for it to reach the center of the track!'

// ─── Types ─────────────────────────────────────────────────────────────────

type Phase =
  | 'building'
  | 'god1'
  | 'angel'
  | 'god2'
  | 'crumble'
  | 'scatter'
  | 'completion'

interface CrumblePiece {
  x: number; y: number
  vx: number; vy: number
  w: number;  h: number
  rot: number; rotV: number
  color: string; alpha: number
}

interface LangBubble {
  name: string
  bg: string
  textColor: string
  delay: number
  tx: string
  ty: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TARGET_BRICKS  = 18
const TIMER_SECONDS  = 60

const LANGUAGES = [
  { name: 'French',     bg: '#1565C0', textColor: '#fff' },
  { name: 'English',    bg: '#C62828', textColor: '#fff' },
  { name: 'Spanish',    bg: '#F9A825', textColor: '#111' },
  { name: 'Oko',        bg: '#1B5E20', textColor: '#fff' },
  { name: 'Yoruba',     bg: '#E65100', textColor: '#fff' },
  { name: 'Igbo',       bg: '#6A1B9A', textColor: '#fff' },
  { name: 'Hausa',      bg: '#4E342E', textColor: '#fff' },
  { name: 'Afrikaans',  bg: '#90A4AE', textColor: '#111' },
  { name: 'German',     bg: '#0D47A1', textColor: '#fff' },
  { name: 'Swahili',    bg: '#2E7D32', textColor: '#fff' },
  { name: 'Portuguese', bg: '#F57F17', textColor: '#111' },
]


// ─── Audio ──────────────────────────────────────────────────────────────────

function playBrickHit() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const osc1 = ctx.createOscillator(), g1 = ctx.createGain()
    osc1.type = 'triangle'; osc1.frequency.value = 420
    g1.gain.setValueAtTime(0.22, now)
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.38)
    osc1.connect(g1); g1.connect(ctx.destination)
    osc1.start(now); osc1.stop(now + 0.38)
    const osc2 = ctx.createOscillator(), g2 = ctx.createGain()
    osc2.type = 'sine'; osc2.frequency.value = 640
    g2.gain.setValueAtTime(0, now + 0.02)
    g2.gain.linearRampToValueAtTime(0.14, now + 0.07)
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
    osc2.connect(g2); g2.connect(ctx.destination)
    osc2.start(now + 0.02); osc2.stop(now + 0.55)
  } catch (_) {}
}

function playBrickMiss() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const osc = ctx.createOscillator(), g = ctx.createGain()
    osc.type = 'sine'; osc.frequency.value = 175
    g.gain.setValueAtTime(0.14, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(now); osc.stop(now + 0.42)
  } catch (_) {}
}

function playThunder() {
  try {
    const ctx = new AudioContext()
    const sr  = ctx.sampleRate
    const len = Math.floor(sr * 2.8)
    const buf = ctx.createBuffer(1, len, sr)
    const d   = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.55)
    }
    const src = ctx.createBufferSource(); src.buffer = buf
    const lp  = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200
    const g   = ctx.createGain()
    g.gain.setValueAtTime(0,    ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.88, ctx.currentTime + 0.04)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8)
    src.connect(lp); lp.connect(g); g.connect(ctx.destination)
    src.start(); src.stop(ctx.currentTime + 2.8)
  } catch (_) {}
}

function playCrumble() {
  try {
    const ctx = new AudioContext()
    const sr  = ctx.sampleRate
    const len = Math.floor(sr * 2.0)
    const buf = ctx.createBuffer(1, len, sr)
    const d   = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.42) * 0.95
    }
    const src = ctx.createBufferSource(); src.buffer = buf
    const bp  = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 0.7
    const g   = ctx.createGain()
    g.gain.setValueAtTime(0.92, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0)
    src.connect(bp); bp.connect(g); g.connect(ctx.destination)
    src.start(); src.stop(ctx.currentTime + 2.0)
  } catch (_) {}
}

// ─── Speech ─────────────────────────────────────────────────────────────────

function speakGod(text: string) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.58; utt.pitch = 0.40; utt.volume = 1
    speechSynthesis.cancel(); speechSynthesis.speak(utt)
  } catch (_) {}
}

function speakAngel(text: string) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.70; utt.pitch = 1.20; utt.volume = 0.9
    const warm = speechSynthesis.getVoices()
      .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
    if (warm) utt.voice = warm
    speechSynthesis.cancel(); speechSynthesis.speak(utt)
  } catch (_) {}
}

function speakNarrator(text: string) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.66; utt.pitch = 0.88; utt.volume = 1
    const warm = speechSynthesis.getVoices()
      .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
    if (warm) utt.voice = warm
    speechSynthesis.cancel(); speechSynthesis.speak(utt)
  } catch (_) {}
}

// ─── Canvas helpers ──────────────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  cloudOff: number,
  lightAlpha: number
) {
  // Stormy sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.78)
  sky.addColorStop(0,   '#07060e')
  sky.addColorStop(0.4, '#0f0d16')
  sky.addColorStop(0.8, '#17121c')
  sky.addColorStop(1,   '#1e1620')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H * 0.78)

  // Storm clouds
  const CLOUDS = [
    { bx: 0.10, by: 0.07, rw: 0.32, dk: 0.56 },
    { bx: 0.45, by: 0.03, rw: 0.36, dk: 0.52 },
    { bx: 0.78, by: 0.06, rw: 0.28, dk: 0.54 },
    { bx: 0.24, by: 0.15, rw: 0.24, dk: 0.47 },
    { bx: 0.63, by: 0.16, rw: 0.30, dk: 0.49 },
    { bx: 0.05, by: 0.22, rw: 0.20, dk: 0.43 },
    { bx: 0.84, by: 0.21, rw: 0.22, dk: 0.45 },
  ]
  for (const c of CLOUDS) {
    const cx = ((c.bx + cloudOff * 0.000048) % 1.18 - 0.06) * W
    const cy = c.by * H
    const r  = c.rw * W
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0,    `rgba(24,18,36,${c.dk})`)
    g.addColorStop(0.58, `rgba(16,12,26,${c.dk * 0.48})`)
    g.addColorStop(1,    'transparent')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H * 0.78)
  }

  // Lightning ambient glow
  if (lightAlpha > 0.01) {
    const lg = ctx.createRadialGradient(W * 0.50, H * 0.10, 0, W * 0.50, H * 0.10, W * 0.68)
    lg.addColorStop(0,   `rgba(185,200,255,${lightAlpha * 0.28})`)
    lg.addColorStop(0.4, `rgba(135,148,215,${lightAlpha * 0.11})`)
    lg.addColorStop(1,   'transparent')
    ctx.fillStyle = lg
    ctx.fillRect(0, 0, W, H * 0.78)
  }

  // Ground
  const grd = ctx.createLinearGradient(0, H * 0.78, 0, H)
  grd.addColorStop(0,   '#3c2a12')
  grd.addColorStop(0.3, '#2e1e0a')
  grd.addColorStop(1,   '#1a1005')
  ctx.fillStyle = grd
  ctx.fillRect(0, H * 0.78, W, H * 0.22)

  ctx.strokeStyle = 'rgba(85,58,22,0.38)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, H * 0.78); ctx.lineTo(W, H * 0.78); ctx.stroke()
}

function drawTower(ctx: CanvasRenderingContext2D, W: number, H: number, bricks: number) {
  if (bricks <= 0) return
  const groundY = H * 0.78
  const cx = W * 0.50
  const tW = Math.min(W * 0.20, 160)
  const bH = 13
  const tH = bricks * bH
  const D  = 20
  const ang = 0.40

  // Right (shadow) face
  ctx.fillStyle = '#260e04'
  ctx.beginPath()
  ctx.moveTo(cx + tW / 2,       groundY)
  ctx.lineTo(cx + tW / 2 + D,   groundY - D * ang)
  ctx.lineTo(cx + tW / 2 + D,   groundY - tH - D * ang)
  ctx.lineTo(cx + tW / 2,       groundY - tH)
  ctx.closePath(); ctx.fill()

  // Front face with subtle vertical gradient
  const ff = ctx.createLinearGradient(cx - tW / 2, 0, cx + tW / 2, 0)
  ff.addColorStop(0,   '#381608')
  ff.addColorStop(0.5, '#5a2c10')
  ff.addColorStop(1,   '#3c1a08')
  ctx.fillStyle = ff
  ctx.fillRect(cx - tW / 2, groundY - tH, tW, tH)

  // Horizontal mortar lines
  ctx.strokeStyle = 'rgba(0,0,0,0.30)'
  ctx.lineWidth   = 0.8
  for (let i = 1; i <= bricks; i++) {
    const y = groundY - i * bH
    ctx.beginPath(); ctx.moveTo(cx - tW / 2, y); ctx.lineTo(cx + tW / 2, y); ctx.stroke()
  }

  // Vertical brick joints (staggered per row)
  const vStep = tW / 4
  ctx.lineWidth = 0.7
  for (let i = 0; i < bricks; i++) {
    const y1     = groundY - i * bH
    const offset = (i % 2) * (vStep / 2)
    for (let vx = cx - tW / 2 + vStep / 2 + offset; vx < cx + tW / 2; vx += vStep) {
      ctx.beginPath(); ctx.moveTo(vx, y1); ctx.lineTo(vx, y1 - bH); ctx.stroke()
    }
  }

  // Top face
  ctx.fillStyle = '#6e3a16'
  ctx.beginPath()
  ctx.moveTo(cx - tW / 2,     groundY - tH)
  ctx.lineTo(cx + tW / 2,     groundY - tH)
  ctx.lineTo(cx + tW / 2 + D, groundY - tH - D * ang)
  ctx.lineTo(cx - tW / 2 + D, groundY - tH - D * ang)
  ctx.closePath(); ctx.fill()

  // Left-edge highlight
  ctx.strokeStyle = 'rgba(255,200,100,0.07)'
  ctx.lineWidth   = 1.5
  ctx.beginPath()
  ctx.moveTo(cx - tW / 2, groundY - tH)
  ctx.lineTo(cx - tW / 2, groundY)
  ctx.stroke()
}

function drawWorkerFig(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, carrying: boolean, bob: number
) {
  const by = y + Math.sin(bob) * 2.5
  ctx.save()
  ctx.fillStyle   = '#0c0600'
  ctx.strokeStyle = '#0c0600'
  ctx.lineWidth   = 1.7

  ctx.beginPath(); ctx.arc(x, by - 12, 4.5, 0, Math.PI * 2); ctx.fill()

  ctx.beginPath()
  ctx.moveTo(x,  by - 7.5); ctx.lineTo(x,  by + 4)
  ctx.moveTo(x - 6, by - 3); ctx.lineTo(x + 6, by - 3)
  ctx.moveTo(x,  by + 4);  ctx.lineTo(x - 4, by + 14)
  ctx.moveTo(x,  by + 4);  ctx.lineTo(x + 4, by + 14)
  ctx.stroke()

  if (carrying) {
    ctx.fillStyle = '#8b4513'
    ctx.fillRect(x - 8, by - 22, 16, 8)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 0.6
    ctx.strokeRect(x - 8, by - 22, 16, 8)
  }
  ctx.restore()
}

function drawWorkers(
  ctx: CanvasRenderingContext2D, W: number, H: number, bricks: number, now: number
) {
  if (bricks < 2) return
  const groundY = H * 0.78
  const cx = W * 0.50
  const tW = Math.min(W * 0.20, 160)
  const tH = bricks * 13
  const edge = tW / 2

  const fig = (x: number, y: number, c: boolean, bs: number, bp: number) =>
    drawWorkerFig(ctx, x, y, c, now * 0.001 * bs + bp)

  // Base workers
  fig(cx + edge + 17, groundY - 16, true,  0.80, 0.0)
  fig(cx - edge - 19, groundY - 16, false, 0.90, 2.1)

  // Mid workers (8+ bricks)
  if (bricks >= 8) {
    const midY = groundY - tH * 0.42 - 14
    fig(cx + edge + 12, midY, true,  0.65, 1.1)
    fig(cx - edge - 13, midY, false, 0.75, 3.5)
  }

  // Top workers (14+ bricks)
  if (bricks >= 14) {
    const topY = groundY - tH * 0.87 - 14
    fig(cx + edge - 6, topY, true,  1.00, 0.7)
    fig(cx - edge + 7, topY, false, 0.85, 4.2)
  }
}

function drawAngel(
  ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number
) {
  if (alpha < 0.01) return
  const cx = W * 0.50
  const ay = H * 0.26

  const g = ctx.createRadialGradient(cx, ay, 0, cx, ay, 105)
  g.addColorStop(0,   `rgba(255,240,175,${alpha * 0.32})`)
  g.addColorStop(0.5, `rgba(255,215,100,${alpha * 0.13})`)
  g.addColorStop(1,   'transparent')
  ctx.fillStyle = g; ctx.fillRect(cx - 115, ay - 115, 230, 230)

  ctx.save(); ctx.globalAlpha = alpha

  ctx.fillStyle = 'rgba(255,248,215,0.88)'
  ctx.save(); ctx.translate(cx - 20, ay - 4); ctx.rotate(-0.44)
  ctx.beginPath(); ctx.ellipse(0, 0, 40, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  ctx.save(); ctx.translate(cx + 20, ay - 4); ctx.rotate(0.44)
  ctx.beginPath(); ctx.ellipse(0, 0, 40, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()

  ctx.fillStyle = 'rgba(255,252,240,0.96)'
  ctx.beginPath(); ctx.ellipse(cx, ay + 10, 9, 23, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx, ay - 16, 11, 0, Math.PI * 2); ctx.fill()

  ctx.strokeStyle = 'rgba(212,160,23,0.92)'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.ellipse(cx, ay - 30, 14, 5, 0, 0, Math.PI * 2); ctx.stroke()

  ctx.restore()
}

// ─── Speed / sweet-spot helpers ──────────────────────────────────────────────

function getBrickSpeed(bricks: number): number {
  if (bricks < 6)  return 18
  if (bricks < 11) return 26
  if (bricks < 16) return 34
  return 44
}

function getSweetSpot(bricks: number): number {
  if (bricks < 6)  return 22
  if (bricks < 11) return 17
  if (bricks < 16) return 13
  return 10
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Level5({ onComplete }: { onComplete?: () => void }) {
  const [phase,         setPhase]         = useState<Phase>('building')
  const [bricksPlaced,  setBricksPlaced]  = useState(0)
  const [timeLeft,      setTimeLeft]      = useState(TIMER_SECONDS)
  const [hitFeedback,   setHitFeedback]   = useState<'hit' | 'miss' | null>(null)
  const [flash,         setFlash]         = useState(false)
  const [shaking,       setShaking]       = useState(false)
  const [bubbles,       setBubbles]       = useState<LangBubble[]>([])
  const [showPrideText, setShowPrideText] = useState(false)
  const [coins,         setCoins]         = useState(() => getCoins())

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef<number>(0)
  const phaseRef     = useRef<Phase>('building')
  const bricksRef    = useRef(0)
  const brickElemRef = useRef<HTMLDivElement>(null)
  const sweetElemRef = useRef<HTMLDivElement>(null)
  const brickXRef    = useRef(50)
  const brickDirRef  = useRef<1 | -1>(1)
  const brickRafRef  = useRef(0)
  const divineRef    = useRef(false)

  // ── Sync refs ────────────────────────────────────────────────────────────

  useEffect(() => { phaseRef.current = phase },    [phase])
  useEffect(() => { bricksRef.current = bricksPlaced }, [bricksPlaced])

  // ── Main canvas RAF ──────────────────────────────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    cv.width  = window.innerWidth
    cv.height = window.innerHeight
    const W = cv.width, H = cv.height

    let cloudOff   = 0
    let angelAlpha = 0
    let lightAlpha = 0
    let crumblePieces: CrumblePiece[] = []
    let crumbleReady = false
    let lastNow      = -1

    const draw = (now: number) => {
      if (lastNow < 0) lastNow = now
      const dt = now - lastNow; lastNow = now

      ctx.clearRect(0, 0, W, H)
      cloudOff += dt

      const p = phaseRef.current

      // Ambient lightning glow builds during divine phases
      if (p === 'god1' || p === 'god2') {
        lightAlpha = Math.min(lightAlpha + dt * 0.0009, 0.70)
      } else {
        lightAlpha = Math.max(0, lightAlpha - dt * 0.002)
      }

      drawBackground(ctx, W, H, cloudOff, lightAlpha)

      // Tower + workers (visible while building and during divine)
      if (p === 'building' || p === 'god1' || p === 'angel' || p === 'god2') {
        drawTower(ctx, W, H, bricksRef.current)
        drawWorkers(ctx, W, H, bricksRef.current, now)
      }

      // Angel fade in/out
      if (p === 'angel') {
        angelAlpha = Math.min(1, angelAlpha + dt * 0.0018)
      } else if (angelAlpha > 0) {
        angelAlpha = Math.max(0, angelAlpha - dt * 0.004)
      }
      if (angelAlpha > 0) drawAngel(ctx, W, H, angelAlpha)

      // Crumble
      if (p === 'crumble') {
        if (!crumbleReady) {
          const groundY = H * 0.78
          const cx = W * 0.50
          const tW = Math.min(W * 0.20, 160)
          const tH = bricksRef.current * 13
          crumblePieces = []
          for (let i = 0; i < 40; i++) {
            crumblePieces.push({
              x:     cx + (Math.random() - 0.5) * (tW + 35),
              y:     groundY - Math.random() * tH,
              vx:    (Math.random() - 0.5) * 10,
              vy:    -(Math.random() * 7.5 + 0.5),
              w:     Math.random() * 28 + 8,
              h:     Math.random() * 14 + 5,
              rot:   Math.random() * Math.PI * 2,
              rotV:  (Math.random() - 0.5) * 0.24,
              color: Math.random() > 0.5 ? '#5a2c10' : '#3a1808',
              alpha: 1,
            })
          }
          crumbleReady = true
        }

        // Dust cloud
        const dust = ctx.createRadialGradient(W * 0.5, H * 0.65, 0, W * 0.5, H * 0.65, W * 0.32)
        dust.addColorStop(0, 'rgba(75,52,28,0.24)')
        dust.addColorStop(1, 'transparent')
        ctx.fillStyle = dust; ctx.fillRect(0, 0, W, H)

        for (const pc of crumblePieces) {
          pc.vy += 0.32; pc.y += pc.vy; pc.x += pc.vx
          pc.vx *= 0.985; pc.rot += pc.rotV
          pc.alpha = Math.max(0, pc.alpha - 0.009)
          if (pc.alpha < 0.01) continue
          ctx.save(); ctx.globalAlpha = pc.alpha
          ctx.translate(pc.x, pc.y); ctx.rotate(pc.rot)
          ctx.fillStyle = pc.color
          ctx.fillRect(-pc.w / 2, -pc.h / 2, pc.w, pc.h)
          ctx.restore()
        }
      }


      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // ── Brick slider animation ────────────────────────────────────────────────

  useEffect(() => {
    let lastT = -1
    const animBrick = (now: number) => {
      if (lastT < 0) lastT = now
      const dt = now - lastT; lastT = now

      if (phaseRef.current === 'building') {
        const speed = getBrickSpeed(bricksRef.current)
        brickXRef.current += brickDirRef.current * speed * dt / 1000

        if (brickXRef.current >= 97) { brickXRef.current = 97; brickDirRef.current = -1 }
        if (brickXRef.current <= 3)  { brickXRef.current = 3;  brickDirRef.current =  1 }

        if (brickElemRef.current) {
          brickElemRef.current.style.left = `${brickXRef.current}%`
        }
        if (sweetElemRef.current) {
          const sp = getSweetSpot(bricksRef.current)
          sweetElemRef.current.style.left  = `${50 - sp}%`
          sweetElemRef.current.style.width = `${sp * 2}%`
        }
      }

      brickRafRef.current = requestAnimationFrame(animBrick)
    }
    brickRafRef.current = requestAnimationFrame(animBrick)
    return () => cancelAnimationFrame(brickRafRef.current)
  }, [])

  // ── Building timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'building') return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id)
          if (!divineRef.current) { divineRef.current = true; setPhase('god1') }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  // ── Divine / cinematic sequence ───────────────────────────────────────────

  useEffect(() => {
    if (phase === 'god1') {
      playThunder()
      setFlash(true); setTimeout(() => setFlash(false), 270)
      const t1 = setTimeout(() => speakGod('What is this they are doing?'), 650)
      const t2 = setTimeout(() => setPhase('angel'), 4600)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }

    if (phase === 'angel') {
      const t1 = setTimeout(() => speakAngel(
        'They want to get to us up here. ' +
        'Indeed there is nothing brethren in Unity cannot achieve.'
      ), 850)
      const t2 = setTimeout(() => setPhase('god2'), 8200)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }

    if (phase === 'god2') {
      playThunder()
      setFlash(true); setTimeout(() => setFlash(false), 270)
      const t1 = setTimeout(() => speakGod('Let them begin to speak different tongues.'), 750)
      const t2 = setTimeout(() => setPhase('crumble'), 4400)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }

    if (phase === 'crumble') {
      playCrumble()
      setShaking(true)
      const t1 = setTimeout(() => setShaking(false), 1500)
      const t2 = setTimeout(() => setPhase('scatter'), 3400)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }

    if (phase === 'scatter') {
      const count = LANGUAGES.length
      const bubblesData: LangBubble[] = LANGUAGES.map((l, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2
        return {
          ...l,
          delay: i * 190,
          tx: `${Math.round(Math.cos(angle) * 44)}vw`,
          ty: `${Math.round(Math.sin(angle) * 32)}vh`,
        }
      })
      const t1 = setTimeout(() => setBubbles(bubblesData), 350)
      const t2 = setTimeout(() => {
        setShowPrideText(true)
        speakNarrator('When pride builds the tower, God changes the story.')
      }, 2900)
      const t3 = setTimeout(() => setPhase('completion'), 8000)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
  }, [phase])

  // ── Speech cleanup on unmount ─────────────────────────────────────────────

  useEffect(() => {
    return () => {
      try { speechSynthesis.cancel() } catch (_) {}
    }
  }, [])

  // ── Tap handler ───────────────────────────────────────────────────────────

  const handleTap = () => {
    if (phaseRef.current !== 'building') return

    const x  = brickXRef.current
    const sp = getSweetSpot(bricksRef.current)

    if (Math.abs(x - 50) <= sp) {
      playBrickHit()
      const nb = bricksRef.current + 1
      bricksRef.current = nb
      setBricksPlaced(nb)
      setCoins(addCoins(10))
      setHitFeedback('hit')
      setTimeout(() => setHitFeedback(null), 480)

      if (nb >= TARGET_BRICKS && !divineRef.current) {
        divineRef.current = true
        setTimeout(() => setPhase('god1'), 550)
      }
    } else {
      playBrickMiss()
      setHitFeedback('miss')
      setTimeout(() => setHitFeedback(null), 360)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'completion') {
    const name = localStorage.getItem('iq_character') || 'Warrior'
    return (
      <CompletionScreen
        verse="So the LORD scattered them over all the earth, and they stopped building the city."
        verseRef="Genesis 11:8"
        subtitle="your creativity reflects the Creator — you are stronger than you think"
        voiceLine={`${name}. Your creativity reflects the Creator. You are stronger than you think.`}
        onComplete={onComplete}
      />
    )
  }

  const inBuilding = phase === 'building'

  return (
    <div className={`level5${shaking ? ' level5--shake' : ''}`}>
      <canvas ref={canvasRef} className="l5-canvas" />
      <CoinHUD
        coins={coins}
        hint={HINT}
        onCoinsChange={setCoins}
        disabled={phase !== 'building'}
      />

      {flash && <div className="l5-flash" />}

      <header className="l5-header">
        <p className="l5-label">LEVEL 1-5</p>
        <h1 className="l5-title">The Tower of Babel</h1>
      </header>

      {/* Timer bar */}
      {inBuilding && (
        <div className="l5-timer-track">
          <div
            className="l5-timer-fill"
            style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
          />
          <span className="l5-timer-num">{timeLeft}s</span>
        </div>
      )}

      {/* Brick counter — top-center to avoid CoinHUD overlap */}
      {inBuilding && (
        <div className="l5-brick-count">
          {bricksPlaced} / {TARGET_BRICKS} bricks
        </div>
      )}

      {/* Brick slider play zone */}
      {inBuilding && (
        <div className="l5-play-zone" onClick={handleTap}>
          <p className="l5-tap-hint">
            {hitFeedback === 'hit'
              ? '✓ Perfect!'
              : hitFeedback === 'miss'
              ? 'Missed — try again!'
              : 'TAP when the brick reaches the gold zone!'}
          </p>
          <div className="l5-track-wrap">
            <div ref={sweetElemRef} className="l5-sweet-spot" />
            <div
              ref={brickElemRef}
              className={[
                'l5-brick-mover',
                hitFeedback === 'hit'  ? 'l5-brick--hit'  : '',
                hitFeedback === 'miss' ? 'l5-brick--miss' : '',
              ].filter(Boolean).join(' ')}
            >
              🧱
            </div>
          </div>
        </div>
      )}

      {/* God speech overlays */}
      {(phase === 'god1' || phase === 'god2') && (
        <div className="l5-divine-overlay l5-divine--god">
          <p className="l5-divine-text">
            {phase === 'god1'
              ? '"What is this they are doing?"'
              : '"Let them begin to speak different tongues."'}
          </p>
        </div>
      )}

      {/* Angel speech overlay */}
      {phase === 'angel' && (
        <div className="l5-divine-overlay l5-divine--angel">
          <p className="l5-divine-text">
            "They want to get to us up here. Indeed there is nothing brethren in Unity cannot achieve."
          </p>
        </div>
      )}

      {/* Scatter people with language speech bubbles above their heads */}
      {bubbles.map(b => (
        <div
          key={b.name}
          className="scatter-person"
          style={{ '--tx': b.tx, '--ty': b.ty, animationDelay: `${b.delay}ms` } as React.CSSProperties}
        >
          <div className="scatter-speech" style={{ background: b.bg, color: b.textColor }}>
            {b.name}
          </div>
          <div className="scatter-tail" style={{ borderTopColor: b.bg }} />
          <span className="scatter-figure">🧍</span>
        </div>
      ))}

      {/* Pride quote */}
      {showPrideText && (
        <div className="l5-pride-quote">
          "When pride builds the tower, God changes the story"
        </div>
      )}
    </div>
  )
}
