import { useEffect, useRef, useState } from 'react'
import './level6.css'
import './FailScreen.css'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { getCoins, addCoins, penalizeCoins } from './coins'

const HINT = 'Click the next glowing waypoint on the map — answer each question to guide Abram on his Journey of Faith!'

type Phase = 'intro' | 'journey' | 'quiz' | 'outro' | 'completion'

interface WP {
  x: number; y: number
  color: string; glow: string
  question: string; options: string[]; correct: number
  hint: string; correctVO: string
}

// ─── 12 Waypoints ────────────────────────────────────────────────────────────
const WPS: WP[] = [
  // 1 Red — Ur
  {
    x: 83, y: 73, color: '#FF4444', glow: 'rgba(255,68,68,0.72)',
    question: 'Where was Abram born?',
    options: ['Ur', 'Canaan', 'Egypt', 'Babel'],
    correct: 0,
    hint: 'Abram was born in Ur of the Chaldeans — the city on the bottom-right of the map.',
    correctVO: 'Yes! Ur of the Chaldeans was where it all began.',
  },
  // 2 Orange — Leave behind
  {
    x: 73, y: 64, color: '#FF8C00', glow: 'rgba(255,140,0,0.72)',
    question: 'Who did God tell Abram to leave behind?',
    options: ['His enemies', 'His country and people', 'His animals', 'His servants'],
    correct: 1,
    hint: '"Leave your COUNTRY, your PEOPLE and your father\'s household." — Genesis 12:1',
    correctVO: 'Exactly. Faith requires leaving familiar comfort behind.',
  },
  // 3 Yellow — Age 75 / Haran
  {
    x: 63, y: 55, color: '#FFD700', glow: 'rgba(255,215,0,0.78)',
    question: 'How old was Abram when he left Haran?',
    options: ['55', '65', '75', '85'],
    correct: 2,
    hint: 'Genesis 12:4 — Abram was 75 years old when he departed from Haran.',
    correctVO: 'Correct! You are never too old to be used by God.',
  },
  // 4 Green — Sarai and Lot
  {
    x: 52, y: 47, color: '#22CC55', glow: 'rgba(34,204,85,0.72)',
    question: 'Who went with Abram on the journey?',
    options: ['Nobody', 'Just Sarai', 'Sarai and Lot', 'Only servants'],
    correct: 2,
    hint: 'His wife Sarai AND his nephew Lot both journeyed with Abram. Genesis 12:5.',
    correctVO: 'Spot on. His wife Sarai and nephew Lot stepped out with him.',
  },
  // 5 Blue — Great nation
  {
    x: 42, y: 38, color: '#4488FF', glow: 'rgba(68,136,255,0.72)',
    question: 'What did God promise to make Abram?',
    options: ['A king', 'A great nation', 'A prophet', 'A priest'],
    correct: 1,
    hint: '"I will make you into a GREAT NATION and I will bless you." — Genesis 12:2',
    correctVO: 'Amen! From one man, a mighty nation would rise.',
  },
  // 6 Purple — Shechem altar
  {
    x: 32, y: 30, color: '#9944FF', glow: 'rgba(153,68,255,0.72)',
    question: 'Where did Abram build his first altar in Canaan?',
    options: ['Jerusalem', 'Shechem', 'Jericho', 'Bethlehem'],
    correct: 1,
    hint: 'At the great tree of Moreh in Shechem, Abram built an altar to God.',
    correctVO: 'Beautifully answered! At the oak of Moreh in Shechem, he worshipped.',
  },
  // 7 Pink — Famine to Egypt
  {
    x: 26, y: 40, color: '#FF44AA', glow: 'rgba(255,68,170,0.72)',
    question: 'Why did Abram temporarily leave Canaan for Egypt?',
    options: ['To buy land', 'A severe famine', 'To escape war', 'To visit royalty'],
    correct: 1,
    hint: 'A severe famine struck the land, driving Abram south into Egypt.',
    correctVO: "That's right. A famine tested his resolve, leading him south.",
  },
  // 8 Cyan — Sarai as sister
  {
    x: 20, y: 56, color: '#00CCFF', glow: 'rgba(0,204,255,0.72)',
    question: 'What did Abram ask Sarai to tell the Egyptians?',
    options: ['That she was his sister', 'That she was a queen', 'That they were lost', 'That she was a prophetess'],
    correct: 0,
    hint: 'Out of fear, Abram asked Sarai to say she was his sister, not his wife.',
    correctVO: 'You know your scripture! Fear made him say she was his sister.',
  },
  // 9 Silver — Plagues on Pharaoh
  {
    x: 15, y: 68, color: '#B0C8D8', glow: 'rgba(176,200,216,0.72)',
    question: "How did God protect Sarai in Pharaoh's palace?",
    options: ['Sending an army', 'A vision in a dream', "Inflicting Pharaoh's house with plagues", 'An earthquake'],
    correct: 2,
    hint: "God inflicted serious diseases on Pharaoh's household to protect Sarai.",
    correctVO: 'Yes! God is faithful even when we stumble. He protected her with plagues.',
  },
  // 10 Gold — Lot parts ways
  {
    x: 26, y: 58, color: '#FFB800', glow: 'rgba(255,184,0,0.78)',
    question: 'Why did Abram and Lot part ways?',
    options: ['They had a fight', 'Their possessions were too great for the land', 'Lot wanted Babylon', 'God commanded it'],
    correct: 1,
    hint: 'Their herds were so vast the land could not support both of them together.',
    correctVO: 'Correct! The land could not support both their massive herds.',
  },
  // 11 Teal — Jordan plain
  {
    x: 38, y: 48, color: '#00CCAA', glow: 'rgba(0,204,170,0.72)',
    question: 'Which fertile land did Lot choose?',
    options: ['Mountains of Hebron', 'Desert of Shur', 'Plain of Jordan near Sodom', 'Coast of Philistia'],
    correct: 2,
    hint: 'Lot looked up and saw the well-watered plain of the Jordan near Sodom.',
    correctVO: 'Indeed. Lot chose by sight, but Abram walked by faith.',
  },
  // 12 Magenta — Count the stars
  {
    x: 48, y: 30, color: '#FF22BB', glow: 'rgba(255,34,187,0.72)',
    question: 'What did God tell Abram to count to show how numerous his offspring would be?',
    options: ['Grains of sand', 'Stars in the sky', 'Leaves on trees', 'Stones on ground'],
    correct: 1,
    hint: 'God said: "Look up at the sky and COUNT THE STARS — so shall your offspring be."',
    correctVO: 'Hallelujah! Just like those stars, his descendants would be countless.',
  },
]

// 15 rotating movement voice lines
const MOVE_VOS = [
  'On the move, {name}!',
  'Path of Purpose!',
  'Enjoy Divine Direction!',
  'Stepping Forward!',
  "You're on God's Roadmap!",
  'Love your Forward Momentum!',
  "You're on the Right Path!",
  "Pursuing God's Plan!",
  'Moving Forward!',
  'Steadfast Progress!',
  "God's Guidance!",
  'Pathway to Victory!',
  'Advancing Kingdom!',
  'On Track!',
  'I have arrived!',
]

// Abram position: index 0 = Ur start, index 1–12 = after clearing each WP
const ABRAM_POS = [
  { x: 91, y: 80 },  // Ur
  { x: 83, y: 73 },  // after WP1
  { x: 73, y: 64 },  // after WP2
  { x: 63, y: 55 },  // after WP3 (Haran)
  { x: 52, y: 47 },  // after WP4
  { x: 42, y: 38 },  // after WP5
  { x: 32, y: 30 },  // after WP6 (Shechem)
  { x: 26, y: 40 },  // after WP7 (turning south)
  { x: 20, y: 56 },  // after WP8
  { x: 15, y: 68 },  // after WP9 (Egypt)
  { x: 26, y: 58 },  // after WP10 (heading north)
  { x: 38, y: 48 },  // after WP11
  { x: 48, y: 30 },  // after WP12 (final Canaan)
]

const FW_COLORS = ['#FFD700', '#FF88CC', '#44FFFF', '#CC88FF', '#FF8C00', '#88FF88', '#FF4444', '#44CCFF', '#FFBB00', '#FF22BB']

interface FWParticle {
  x: number; y: number; vx: number; vy: number
  r: number; alpha: number; color: string
}

// ─── Audio ────────────────────────────────────────────────────────────────────

function playThunder() {
  try {
    const ctx = new AudioContext()
    const len = Math.floor(ctx.sampleRate * 2.8)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.52)
    const src = ctx.createBufferSource(); src.buffer = buf
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.88, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8)
    src.connect(lp); lp.connect(g); g.connect(ctx.destination)
    src.start(); src.stop(ctx.currentTime + 2.8)
  } catch (_) {}
}

function playCorrect() {
  try {
    const ctx = new AudioContext()
    ;[523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx.currentTime + i * 0.08
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.06)
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 1.5)
    })
  } catch (_) {}
}

function playFireworkSound() {
  try {
    const ctx = new AudioContext()
    ;[880, 1108, 1319, 1760, 2093].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx.currentTime + i * 0.045
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.9)
    })
  } catch (_) {}
}

function playWrong() {
  try {
    const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(200, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5)
    g.gain.setValueAtTime(0.09, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.55)
  } catch (_) {}
}

function playOrchestra() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    // Triumphant C major swell — brass + strings texture
    const notes = [
      { f: 130.81, v: 0.28, s: 0 },
      { f: 164.81, v: 0.24, s: 0.18 },
      { f: 196.00, v: 0.22, s: 0.35 },
      { f: 261.63, v: 0.20, s: 0.55 },
      { f: 329.63, v: 0.16, s: 0.75 },
      { f: 392.00, v: 0.13, s: 0.95 },
      { f: 523.25, v: 0.10, s: 1.15 },
      { f: 659.25, v: 0.07, s: 1.35 },
      { f: 783.99, v: 0.05, s: 1.55 },
    ]
    notes.forEach(({ f, v, s }) => {
      ;[0, 14, -14].forEach(detune => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.type = 'sine'; o.frequency.value = f; o.detune.value = detune
        g.gain.setValueAtTime(0, now + s)
        g.gain.linearRampToValueAtTime(v * (detune === 0 ? 1 : 0.45), now + s + 0.55)
        g.gain.setValueAtTime(v * (detune === 0 ? 1 : 0.45), now + s + 3.5)
        g.gain.exponentialRampToValueAtTime(0.001, now + s + 5.5)
        o.connect(g); g.connect(ctx.destination)
        o.start(now + s); o.stop(now + s + 6)
      })
    })
    // Percussion hits
    ;[0, 0.45, 0.9].forEach(t => {
      const n = ctx.createOscillator(), ng = ctx.createGain()
      n.type = 'sine'
      n.frequency.setValueAtTime(180, now + t)
      n.frequency.exponentialRampToValueAtTime(35, now + t + 0.35)
      ng.gain.setValueAtTime(0.55, now + t); ng.gain.exponentialRampToValueAtTime(0.001, now + t + 0.45)
      n.connect(ng); ng.connect(ctx.destination); n.start(now + t); n.stop(now + t + 0.5)
    })
  } catch (_) {}
}

function speakGod(text: string) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.58; utt.pitch = 0.32; utt.volume = 1
    speechSynthesis.cancel(); speechSynthesis.speak(utt)
  } catch (_) {}
}

function speakVO(text: string) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.75; utt.pitch = 1.08; utt.volume = 1
    const warm = speechSynthesis.getVoices()
      .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
    if (warm) utt.voice = warm
    speechSynthesis.cancel()
    speechSynthesis.speak(utt)
  } catch (_) {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Level6({ onComplete, onFail, showHint }: {
  onComplete?: () => void
  onFail?: (hint: string) => void
  showHint?: boolean
}) {
  const [phase,      setPhase]      = useState<Phase>('intro')
  const [wpDone,     setWpDone]     = useState(0)
  const [curWP,      setCurWP]      = useState(0)
  const [sel,        setSel]        = useState<number | null>(null)
  const [locked,     setLocked]     = useState(false)
  const [wrongFlash, setWrongFlash] = useState(false)
  const [wrongPerWP, setWrongPerWP] = useState(0)
  const [coins,      setCoins]      = useState(() => getCoins())
  const [godVisible, setGodVisible] = useState(false)
  const [toast,      setToast]      = useState<string | null>(null)

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rafRef      = useRef<number>(0)
  const fwRef       = useRef<FWParticle[]>([])
  const moveVoIdx   = useRef(0)

  // ── Canvas: starry sky + desert + fireworks ─────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    cv.width = window.innerWidth; cv.height = window.innerHeight
    const W = cv.width, H = cv.height

    const SCOLS = ['#FFD700', '#E8E0FF', '#CC88FF', '#44FFFF', '#FF88CC', '#FFBBAA', '#88FFEE', '#FFEE44']
    interface Star { x: number; y: number; r: number; color: string; base: number; amp: number; spd: number; ph: number }
    const stars: Star[] = Array.from({ length: 320 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.76,
      r: Math.random() * 2.2 + 0.3,
      color: SCOLS[Math.floor(Math.random() * SCOLS.length)],
      base: Math.random() * 0.45 + 0.28,
      amp:  Math.random() * 0.34 + 0.08,
      spd:  Math.random() * 0.022 + 0.004,
      ph:   Math.random() * Math.PI * 2,
    }))

    let frame = 0

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.76)
      sky.addColorStop(0,    '#03011c')
      sky.addColorStop(0.28, '#08032a')
      sky.addColorStop(0.58, '#0d0538')
      sky.addColorStop(1,    '#1a083c')
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.76)

      // Warm horizon glow
      const hg = ctx.createLinearGradient(0, H * 0.62, 0, H * 0.80)
      hg.addColorStop(0, 'transparent')
      hg.addColorStop(0.4, 'rgba(160,55,12,0.15)')
      hg.addColorStop(1, 'transparent')
      ctx.fillStyle = hg; ctx.fillRect(0, H * 0.62, W, H * 0.18)

      // Purple dusk strip
      const ph = ctx.createLinearGradient(0, H * 0.73, 0, H * 0.78)
      ph.addColorStop(0, 'transparent')
      ph.addColorStop(0.5, 'rgba(78,22,84,0.42)')
      ph.addColorStop(1, 'transparent')
      ctx.fillStyle = ph; ctx.fillRect(0, H * 0.73, W, H * 0.05)

      // Rich terracotta desert ground
      const gr = ctx.createLinearGradient(0, H * 0.74, 0, H)
      gr.addColorStop(0,    '#5c2210')
      gr.addColorStop(0.10, '#7a3318')
      gr.addColorStop(0.32, '#6b2d12')
      gr.addColorStop(0.62, '#4a1e0c')
      gr.addColorStop(1,    '#1e0803')
      ctx.fillStyle = gr; ctx.fillRect(0, H * 0.74, W, H * 0.26)

      // Sandy dunes
      const dunes: [number, number, number, number, string][] = [
        [0.10, 0.80, 0.28, 0.75, '#8a4518'],
        [0.35, 0.78, 0.22, 0.73, '#7a3d14'],
        [0.60, 0.81, 0.24, 0.76, '#8c4a1a'],
        [0.80, 0.79, 0.20, 0.74, '#7a3818'],
      ]
      for (const [cx, cy, rw, ry, col] of dunes) {
        ctx.fillStyle = col; ctx.beginPath()
        ctx.ellipse(cx * W, cy * H, rw * W * 0.5, (cy - ry) * H * 0.6, 0, Math.PI, 0, true)
        ctx.fill()
      }

      // Colorful twinkling stars
      frame++
      for (const s of stars) {
        const op = Math.max(0.06, Math.min(1, s.base + Math.sin(frame * s.spd + s.ph) * s.amp))
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4.0, 0, Math.PI * 2)
        ctx.fillStyle = `${s.color}${Math.floor(op * 42).toString(16).padStart(2, '0')}`; ctx.fill()
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = s.color; ctx.globalAlpha = op; ctx.fill(); ctx.globalAlpha = 1
      }

      // Firework particles
      for (let i = fwRef.current.length - 1; i >= 0; i--) {
        const p = fwRef.current[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.alpha -= 0.015
        if (p.alpha <= 0) { fwRef.current.splice(i, 1); continue }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.0, 0, Math.PI * 2)
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha * 0.24; ctx.fill(); ctx.globalAlpha = 1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill(); ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // ── Fireworks launcher ───────────────────────────────────────────────────

  const launchFireworks = (intensity = 1) => {
    const W = window.innerWidth, H = window.innerHeight
    const bursts: FWParticle[] = []
    const bCount = Math.round(7 * intensity)
    for (let b = 0; b < bCount; b++) {
      const bx = W * (0.06 + Math.random() * 0.88)
      const by = H * (0.04 + Math.random() * 0.62)
      const col = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)]
      const pCount = Math.round((28 + Math.random() * 12) * intensity)
      for (let j = 0; j < pCount; j++) {
        const angle = Math.random() * Math.PI * 2
        const spd = Math.random() * 10 + 2
        bursts.push({
          x: bx, y: by,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
          r: Math.random() * 4 + 1,
          alpha: 0.85 + Math.random() * 0.15,
          color: col,
        })
      }
    }
    fwRef.current.push(...bursts)
  }

  // ── Intro sequence ───────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'intro') return
    const t1 = setTimeout(() => {
      playThunder()
      setGodVisible(true)
      speakGod('Leave your country, your people and your father\'s household, and go to the land I will show you.')
    }, 1400)
    const t2 = setTimeout(() => {
      setGodVisible(false)
      setPhase('journey')
    }, 8500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase])

  // ── Waypoint click ───────────────────────────────────────────────────────

  const handleWaypoint = (i: number) => {
    if (i !== wpDone) return
    setCurWP(i)
    setSel(null)
    setLocked(false)
    setWrongFlash(false)
    setWrongPerWP(0)
    setPhase('quiz')
  }

  // ── Answer ───────────────────────────────────────────────────────────────

  const handleAnswer = (idx: number) => {
    if (locked) return
    setSel(idx)
    const wp = WPS[curWP]
    const name = localStorage.getItem('iq_character') || 'Warrior'

    if (idx === wp.correct) {
      setLocked(true)
      setCoins(addCoins(10))
      playCorrect()
      playFireworkSound()
      launchFireworks()

      // Speak waypoint-specific correct VO
      speakVO(wp.correctVO)

      // Show rotating movement VO as toast
      const raw = MOVE_VOS[moveVoIdx.current % MOVE_VOS.length]
      moveVoIdx.current++
      const toastText = raw.replace('{name}', name)
      setToast(toastText)
      setTimeout(() => setToast(null), 2800)

      setTimeout(() => {
        const next = curWP + 1
        setWpDone(next)
        setSel(null)
        setLocked(false)

        if (next >= WPS.length) {
          // Final waypoint done — launch cinematic outro
          setPhase('outro')
          playOrchestra()
          launchFireworks(2.5)
          let fw = 0
          const fwTimer = setInterval(() => {
            launchFireworks(2)
            if (++fw >= 14) clearInterval(fwTimer)
          }, 320)
          setTimeout(() => setPhase('completion'), 5200)
        } else {
          setPhase('journey')
        }
      }, 2400)
    } else {
      setWrongFlash(true)
      playWrong()
      setCoins(penalizeCoins(50))
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
      const newWrong = wrongPerWP + 1
      setWrongPerWP(newWrong)
      if (newWrong >= 3) {
        setTimeout(() => onFail?.(wp.hint), 900)
      } else {
        setTimeout(() => { setWrongFlash(false); setSel(null) }, 1800)
      }
    }
  }

  // ── Completion ───────────────────────────────────────────────────────────

  if (phase === 'completion') {
    const name = localStorage.getItem('iq_character') || 'Warrior'
    return (
      <CompletionScreen
        verse="By faith Abraham obeyed when he was called to go out to a place that he was to receive as an inheritance."
        verseRef="Hebrews 11:8"
        subtitle="your obedience opens doors nobody can shut"
        voiceLine={`Like Abram, your obedience opens doors nobody can shut, ${name}. See, you are smarter than you imagine.`}
        onComplete={onComplete}
      />
    )
  }

  const abramPos = ABRAM_POS[Math.min(wpDone, ABRAM_POS.length - 1)]

  return (
    <div className="level6">
      <canvas ref={canvasRef} className="l6-canvas" />

      <CoinHUD coins={coins} hint={HINT} onCoinsChange={setCoins} disabled={phase !== 'journey'} />

      {showHint && phase === 'journey' && (
        <div className="level-hint-banner">💡 {HINT}</div>
      )}

      {/* Header */}
      {phase !== 'outro' && (
        <header className="l6-header">
          <p className="l6-label">LEVEL 1-6</p>
          <h1 className="l6-title">The Call of Abram</h1>
        </header>
      )}

      {/* Movement VO toast */}
      {toast && <div className="l6-toast">{toast}</div>}

      {/* ── INTRO PHASE ────────────────────────────────────────────────── */}
      {phase === 'intro' && (
        <>
          <div className="l6-abram-intro">
            <div className="l6-abram-glow" />
            <span className="l6-abram-figure-lg">🧎</span>
            <span className="l6-abram-name-tag">ABRAM</span>
          </div>
          <div className="l6-god-beam" />
          {godVisible && (
            <div className="l6-god-words">
              <p className="l6-god-quote">
                "Leave your country, your people and your father's household
                and go to the land I will show you."
              </p>
              <p className="l6-god-ref">— God to Abram &nbsp;·&nbsp; Genesis 12:1</p>
            </div>
          )}
        </>
      )}

      {/* ── JOURNEY PHASE ──────────────────────────────────────────────── */}
      {phase === 'journey' && (
        <div className="l6-map-wrap">
          <div className="l6-map-corner l6-mc--tl">✦</div>
          <div className="l6-map-corner l6-mc--tr">✦</div>
          <div className="l6-map-corner l6-mc--bl">✦</div>
          <div className="l6-map-corner l6-mc--br">✦</div>

          <p className="l6-map-title">✦ THE JOURNEY OF ABRAM ✦</p>
          <p className="l6-map-instruction">Click the next glowing waypoint to continue Abram's journey!</p>

          {/* Illustrated SVG path */}
          <svg className="l6-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="l6PathGold" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%"   stopColor="#FFB000" />
                <stop offset="40%"  stopColor="#FFD700" />
                <stop offset="70%"  stopColor="#FFE84D" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>
              <filter id="l6PathGlow">
                <feGaussianBlur stdDeviation="0.9" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Shadow */}
            <path
              d="M 92,80 C 89,77 86,75 83,73 C 80,71 76,67 73,64 C 70,61 66,58 63,55 C 59,52 56,50 52,47 C 49,44 46,41 42,38 C 38,35 35,32 32,30 C 29,33 27,37 26,40 C 24,44 22,50 20,56 C 18,60 17,64 15,68 C 18,65 22,62 26,58 C 31,54 35,51 38,48 C 42,44 45,37 48,30 C 51,24 53,21 56,18"
              stroke="rgba(20,8,0,0.92)" strokeWidth="3.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            {/* Gold path */}
            <path
              d="M 92,80 C 89,77 86,75 83,73 C 80,71 76,67 73,64 C 70,61 66,58 63,55 C 59,52 56,50 52,47 C 49,44 46,41 42,38 C 38,35 35,32 32,30 C 29,33 27,37 26,40 C 24,44 22,50 20,56 C 18,60 17,64 15,68 C 18,65 22,62 26,58 C 31,54 35,51 38,48 C 42,44 45,37 48,30 C 51,24 53,21 56,18"
              stroke="url(#l6PathGold)" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="2.2,1.1" filter="url(#l6PathGlow)"
            />
            {/* Region labels */}
            <text x="84" y="88" textAnchor="middle" fill="rgba(255,200,80,0.55)" fontSize="3.2" fontStyle="italic">Mesopotamia</text>
            <text x="35" y="22" textAnchor="middle" fill="rgba(80,255,180,0.50)" fontSize="3.2" fontStyle="italic">Canaan</text>
            <text x="14" y="80" textAnchor="middle" fill="rgba(255,180,80,0.50)" fontSize="3.2" fontStyle="italic">Egypt</text>
          </svg>

          {/* City: Ur */}
          <div className="l6-city" style={{ left: '91%', top: '82%' }}>
            <div className="l6-city-dot" style={{ background: '#FFB84D', boxShadow: '0 0 14px 5px rgba(255,184,77,0.80)' }} />
            <span className="l6-city-label">UR</span>
          </div>
          {/* City: Haran */}
          <div className="l6-city" style={{ left: '63%', top: '53%' }}>
            <div className="l6-city-dot" style={{ background: '#CC88FF', boxShadow: '0 0 12px 4px rgba(204,136,255,0.75)' }} />
            <span className="l6-city-label">HARAN</span>
          </div>
          {/* City: Shechem / Canaan */}
          <div className="l6-city" style={{ left: '32%', top: '26%' }}>
            <div className="l6-city-dot" style={{ background: '#44FF88', boxShadow: '0 0 14px 5px rgba(68,255,136,0.80)' }} />
            <span className="l6-city-label">SHECHEM</span>
          </div>
          {/* City: Egypt */}
          <div className="l6-city" style={{ left: '13%', top: '72%' }}>
            <div className="l6-city-dot" style={{ background: '#FFAA44', boxShadow: '0 0 14px 5px rgba(255,170,68,0.80)' }} />
            <span className="l6-city-label">EGYPT</span>
          </div>
          {/* City: Canaan / Promised Land */}
          <div className="l6-city l6-city--promise" style={{ left: '56%', top: '14%' }}>
            <div className="l6-city-dot" style={{ background: '#44FFCC', boxShadow: '0 0 18px 7px rgba(68,255,204,0.90)' }} />
            <span className="l6-city-label l6-city-label--promise">CANAAN ✦</span>
          </div>

          {/* 12 Waypoints */}
          {WPS.map((wp, i) => (
            <button
              key={i}
              className={[
                'l6-waypoint',
                wpDone > i   ? 'l6-wp--done'   : '',
                wpDone === i ? 'l6-wp--active'  : '',
                wpDone < i   ? 'l6-wp--locked'  : '',
              ].filter(Boolean).join(' ')}
              style={{ left: `${wp.x}%`, top: `${wp.y}%`, '--wpc': wp.color, '--wpg': wp.glow } as React.CSSProperties}
              onClick={() => handleWaypoint(i)}
              disabled={wpDone !== i}
              aria-label={`Waypoint ${i + 1}`}
            >
              {wpDone > i ? '✓' : i + 1}
            </button>
          ))}

          {/* Abram on map */}
          <div className="l6-abram-map" style={{ left: `${abramPos.x}%`, top: `${abramPos.y}%` }}>
            🧎
          </div>

          {/* Progress */}
          <p className="l6-progress">{wpDone} / {WPS.length} waypoints reached</p>
        </div>
      )}

      {/* ── QUIZ PHASE ─────────────────────────────────────────────────── */}
      {phase === 'quiz' && (
        <div className="l6-quiz-overlay">
          <div
            className="l6-quiz-card"
            style={{ '--wpc': WPS[curWP].color, '--wpg': WPS[curWP].glow } as React.CSSProperties}
          >
            <p className="l6-quiz-wpnum" style={{ color: WPS[curWP].color }}>
              ⬤ WAYPOINT {curWP + 1} OF {WPS.length}
            </p>
            <h2 className="l6-quiz-q">{WPS[curWP].question}</h2>
            <div className="l6-quiz-grid">
              {WPS[curWP].options.map((opt, i) => (
                <button
                  key={i}
                  className={[
                    'l6-quiz-btn',
                    sel === i && locked    ? 'l6-qb--correct' : '',
                    sel === i && wrongFlash ? 'l6-qb--wrong'   : '',
                  ].filter(Boolean).join(' ')}
                  style={{ '--wpc': WPS[curWP].color } as React.CSSProperties}
                  onClick={() => handleAnswer(i)}
                  disabled={locked}
                >
                  {opt}
                </button>
              ))}
            </div>
            {wrongFlash && (
              <p className="l6-quiz-feedback">
                Search the scriptures — try again! 📖
                {wrongPerWP >= 2 && <span className="l6-quiz-last-chance"> (last chance)</span>}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── OUTRO PHASE ────────────────────────────────────────────────── */}
      {phase === 'outro' && (
        <div className="l6-outro">
          <p className="l6-outro-line1">✦ Abram walked by faith ✦</p>
          <p className="l6-outro-line2">Journey Complete!</p>
          <p className="l6-outro-line3">The stars of heaven cannot be counted —<br/>nor can God's faithfulness.</p>
        </div>
      )}
    </div>
  )
}
