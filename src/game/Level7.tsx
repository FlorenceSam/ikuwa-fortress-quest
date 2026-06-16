import { useEffect, useRef, useState } from 'react'
import './level7.css'
import './FailScreen.css'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { getCoins, addCoins } from './coins'

const HINT = 'Click the glowing branch to meet the next ancestor — answer correctly to light up the Living Family Tree!'

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'intro' | 'journey' | 'quiz' | 'enoch' | 'methuselah' | 'finale' | 'outro' | 'completion'

interface WP {
  color: string; glow: string
  question: string; options: string[]; correct: number
  hint: string; correctVO: string
}

// ─── Tree constants ───────────────────────────────────────────────────────────
// All values are fractions of canvas width/height
const TX = 0.37          // trunk center x
const TY_BOT = 0.87      // trunk bottom y
const TY_TOP = 0.13      // trunk top y
const BRH_L  = 0.19      // left-branch end x
const BRH_R  = 0.55      // right-branch end x
const Y_STEP = (TY_BOT - TY_TOP) / 9  // spacing between 10 branches

// 10 branches: index 0 = Adam (bottom), index 9 = Noah (top)
const BRANCH_DEFS = [
  { side: 'L', trunkY: TY_BOT,              color: '#FF4444', name: 'Adam' },
  { side: 'R', trunkY: TY_BOT - Y_STEP,     color: '#FF8C00', name: 'Seth' },
  { side: 'L', trunkY: TY_BOT - Y_STEP * 2, color: '#FFD700', name: 'Enosh' },
  { side: 'R', trunkY: TY_BOT - Y_STEP * 3, color: '#22CC44', name: 'Kenan' },
  { side: 'L', trunkY: TY_BOT - Y_STEP * 4, color: '#00AA66', name: 'Mahalalel' },
  { side: 'R', trunkY: TY_BOT - Y_STEP * 5, color: '#00CCBB', name: 'Jared' },
  { side: 'L', trunkY: TY_BOT - Y_STEP * 6, color: '#FFFFFF', name: 'Enoch' },
  { side: 'R', trunkY: TY_BOT - Y_STEP * 7, color: '#9944FF', name: 'Methuselah' },
  { side: 'L', trunkY: TY_BOT - Y_STEP * 8, color: '#FF44AA', name: 'Lamech' },
  { side: 'R', trunkY: TY_BOT - Y_STEP * 9, color: '#FF22BB', name: 'Noah' },
] as const

// Ancestor HTML positions (% of screen)
const ANC_POS = BRANCH_DEFS.map(bd => ({
  x: (bd.side === 'L' ? BRH_L : BRH_R) * 100,
  y: (bd.trunkY - 0.04) * 100,
}))

// Maps wpDone → how many branches are lit
//   wpDone: 0  1  2  3  4  5  6  7  8  9 10 11 12
const BRANCH_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 7, 8, 9, 10, 10]

// "Next clickable node" positions per wpDone
const NEXT_POS = [
  { x: 19, y: 83 }, // WP0 → Adam spot
  { x: 55, y: 75 }, // WP1 → Seth
  { x: 19, y: 67 }, // WP2 → Enosh
  { x: 55, y: 59 }, // WP3 → Kenan
  { x: 19, y: 51 }, // WP4 → Mahalalel
  { x: 55, y: 43 }, // WP5 → Jared
  { x: 19, y: 35 }, // WP6 → Enoch
  { x: 37, y: 24 }, // WP7 → Enoch follow-up (center, above Enoch)
  { x: 55, y: 27 }, // WP8 → Methuselah
  { x: 19, y: 19 }, // WP9 → Lamech
  { x: 55, y: 11 }, // WP10 → Noah
  { x: 37, y: 6  }, // WP11 → Final (above tree)
]

// ─── Waypoints (12) ───────────────────────────────────────────────────────────
const WPS: WP[] = [
  { color:'#FF4444', glow:'rgba(255,68,68,0.72)',
    question:'Who is the first human created in the image of God?',
    options:['Cain','Abel','Adam','Seth'], correct:2,
    hint:'God created Adam first — the very first human formed in His own image.',
    correctVO:'Yes! Adam was the father of humanity, formed by God\'s own hand.' },

  { color:'#FF8C00', glow:'rgba(255,140,0,0.72)',
    question:'Which son was born to replace Abel and carry the righteous line?',
    options:['Seth','Enosh','Kenan','Jared'], correct:0,
    hint:'God appointed SETH to replace Abel who was killed by Cain. Genesis 4:25.',
    correctVO:'Exactly! Seth\'s name means appointed — God established his line.' },

  { color:'#FFD700', glow:'rgba(255,215,0,0.78)',
    question:'During Seth\'s son Enosh\'s time, what did people begin to do?',
    options:['Build a tower','Call on the name of the Lord','Invent money','Write books'], correct:1,
    hint:'Genesis 4:26 — "At that time people began to call on the name of the LORD."',
    correctVO:'Amen! Worship began to flourish as people called upon the Lord.' },

  { color:'#22CC44', glow:'rgba(34,204,68,0.72)',
    question:'What phrase is repeated for almost every ancestor in Genesis 5?',
    options:['And he ruled well','And he died','And he fought battles','And he built a city'], correct:1,
    hint:'Genesis 5 repeats "and then he DIED" for nearly every patriarch.',
    correctVO:'Spot on. "And he died" reminds us of sin\'s consequence, yet the line endured.' },

  { color:'#00AA66', glow:'rgba(0,170,102,0.72)',
    question:'How long did most early patriarchs live?',
    options:['Around 100 years','Around 400 years','Over 900 years','Exactly 1000 years'], correct:2,
    hint:'Most early patriarchs in Genesis 5 lived over 900 years!',
    correctVO:'Correct! God blessed the early generations with incredible lifespans.' },

  { color:'#00CCBB', glow:'rgba(0,204,187,0.72)',
    question:'Whose name means descent and was the father of Enoch?',
    options:['Kenan','Mahalalel','Jared','Lamech'], correct:2,
    hint:'Jared\'s name means "descent" — he was the father of Enoch. Genesis 5:18.',
    correctVO:'Beautifully answered! Jared faithfully passed the torch of the family line.' },

  { color:'#AAEEFF', glow:'rgba(170,238,255,0.85)',
    question:'Which ancestor is famous for walking faithfully with God?',
    options:['Enoch','Methuselah','Lamech','Cainan'], correct:0,
    hint:'Genesis 5:24 — "Enoch walked faithfully with God; then he was no more."',
    correctVO:'Enoch walked with God and then he was NO MORE — because GOD TOOK HIM!' },

  { color:'#4488FF', glow:'rgba(68,136,255,0.72)',
    question:'What unique event happened to Enoch?',
    options:['He became a king','God took him without dying','He sailed away','He fell into deep sleep'], correct:1,
    hint:'Genesis 5:24 — Enoch walked with God and was TAKEN by God without dying.',
    correctVO:'You know your scripture! Enoch did not experience death because God took him.' },

  { color:'#9944FF', glow:'rgba(153,68,255,0.78)',
    question:'Who was the longest-living person in the Bible?',
    options:['Lamech','Noah','Methuselah','Mahalalel'], correct:2,
    hint:'Methuselah lived 969 years — the longest of any person in the Bible!',
    correctVO:'969 YEARS! The oldest man who EVER lived! Methuselah holds the record!' },

  { color:'#FF44AA', glow:'rgba(255,68,170,0.72)',
    question:'Who prophesied his son would bring comfort from painful toil?',
    options:['Lamech','Jared','Enosh','Adam'], correct:0,
    hint:'Lamech named his son Noah saying "He will comfort us." Genesis 5:29.',
    correctVO:'Correct! Lamech named his son looking forward to God\'s comfort.' },

  { color:'#FF22BB', glow:'rgba(255,34,187,0.72)',
    question:'What does the name Noah mean?',
    options:['Warrior','Rest or Comfort','Builder','Bright Star'], correct:1,
    hint:'Noah\'s name means REST or COMFORT — exactly what he brought to the world.',
    correctVO:'Indeed! Noah would bring rest and a fresh start to a weary world.' },

  { color:'#FFFFFF', glow:'rgba(255,255,255,0.90)',
    question:'How many generations from Adam to Noah?',
    options:['5','7','10','12'], correct:2,
    hint:'Genesis 5 lists exactly 10 generations from Adam to Noah.',
    correctVO:'Hallelujah! Ten generations of God\'s perfect timing and preservation!' },
]

// 15 rotating movement VOs
const MOVE_VOS = [
  'On the move, {name}!','Path of Purpose!','Enjoy Divine Direction!',
  'Stepping Forward!',"You're on God's Roadmap!",'Love your Forward Momentum!',
  "You're on the Right Path!","Pursuing God's Plan!",'Moving Forward!',
  'Steadfast Progress!',"God's Guidance!",'Pathway to Victory!',
  'Advancing Kingdom!','On Track!','I have arrived!',
]

const FW_COLORS = ['#FF4444','#FF8C00','#FFD700','#22CC44','#00CCBB','#AAEEFF','#9944FF','#FF44AA','#FF22BB','#FFFFFF']

interface FWParticle { x:number;y:number;vx:number;vy:number;r:number;alpha:number;color:string }

// ─── Audio ────────────────────────────────────────────────────────────────────
function playThunder() {
  try {
    const ctx = new AudioContext()
    const len = Math.floor(ctx.sampleRate * 3)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 0.5)
    const src = ctx.createBufferSource(); src.buffer = buf
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3)
    src.connect(lp); lp.connect(g); g.connect(ctx.destination)
    src.start(); src.stop(ctx.currentTime + 3)
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

function playWrong() {
  try {
    const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(200, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5)
    g.gain.setValueAtTime(0.09, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.55)
  } catch (_) {}
}

function playChoir() {
  try {
    const ctx = new AudioContext(), now = ctx.currentTime
    const freqs = [261.63, 329.63, 392.0, 493.88, 523.25, 659.25, 783.99]
    freqs.forEach((f, i) => {
      ;[0, 14, -14].forEach(det => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.type = 'sine'; o.frequency.value = f; o.detune.value = det
        o.frequency.linearRampToValueAtTime(f * 1.35, now + i * 0.14 + 2.5)
        g.gain.setValueAtTime(0, now + i * 0.14)
        g.gain.linearRampToValueAtTime((0.14 - i*0.012) * (det === 0 ? 1 : 0.4), now + i*0.14 + 0.35)
        g.gain.linearRampToValueAtTime(0.001, now + i * 0.14 + 3.5)
        o.connect(g); g.connect(ctx.destination); o.start(now + i*0.14); o.stop(now + i*0.14 + 4)
      })
    })
  } catch (_) {}
}

function playOrchestra() {
  try {
    const ctx = new AudioContext(), now = ctx.currentTime
    const chord = [
      {f:130.81,v:0.28,s:0},{f:164.81,v:0.24,s:0.18},{f:196.00,v:0.22,s:0.35},
      {f:261.63,v:0.20,s:0.55},{f:329.63,v:0.16,s:0.75},{f:392.00,v:0.13,s:0.95},
      {f:523.25,v:0.10,s:1.15},{f:659.25,v:0.07,s:1.35},{f:783.99,v:0.05,s:1.55},
    ]
    chord.forEach(({f,v,s}) => {
      ;[0, 14, -14].forEach(det => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.type = 'sine'; o.frequency.value = f; o.detune.value = det
        g.gain.setValueAtTime(0, now+s); g.gain.linearRampToValueAtTime(v*(det===0?1:0.4), now+s+0.5)
        g.gain.setValueAtTime(v*(det===0?1:0.4), now+s+3.5)
        g.gain.exponentialRampToValueAtTime(0.001, now+s+6)
        o.connect(g); g.connect(ctx.destination); o.start(now+s); o.stop(now+s+7)
      })
    })
    ;[0,0.45,0.9].forEach(t => {
      const n=ctx.createOscillator(), ng=ctx.createGain()
      n.type='sine'; n.frequency.setValueAtTime(180,now+t); n.frequency.exponentialRampToValueAtTime(35,now+t+0.35)
      ng.gain.setValueAtTime(0.55,now+t); ng.gain.exponentialRampToValueAtTime(0.001,now+t+0.45)
      n.connect(ng); ng.connect(ctx.destination); n.start(now+t); n.stop(now+t+0.5)
    })
  } catch (_) {}
}

function speakGod(text: string) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.55; utt.pitch = 0.28; utt.volume = 1
    speechSynthesis.cancel(); speechSynthesis.speak(utt)
  } catch (_) {}
}

function speakVO(text: string, rate = 0.76) {
  try {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = rate; utt.pitch = 1.08; utt.volume = 1
    const warm = speechSynthesis.getVoices()
      .find(v => /female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
    if (warm) utt.voice = warm
    speechSynthesis.cancel(); speechSynthesis.speak(utt)
  } catch (_) {}
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Level7({ onComplete, onFail, showHint }: {
  onComplete?: () => void
  onFail?: (hint: string) => void
  showHint?: boolean
}) {
  const [phase,       setPhase]       = useState<Phase>('intro')
  const [wpDone,      setWpDone]      = useState(0)
  const [curWP,       setCurWP]       = useState(0)
  const [sel,         setSel]         = useState<number | null>(null)
  const [locked,      setLocked]      = useState(false)
  const [wrongFlash,  setWrongFlash]  = useState(false)
  const [wrongPerWP,  setWrongPerWP]  = useState(0)
  const [coins,       setCoins]       = useState(() => getCoins())
  const [godVisible,  setGodVisible]  = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)
  const [slotNum,     setSlotNum]     = useState(0)
  const [enochRising, setEnochRising] = useState(false)

  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const rafRef         = useRef<number>(0)
  const fwRef          = useRef<FWParticle[]>([])
  const wpDoneRef      = useRef(0)
  const phaseRef       = useRef<Phase>('intro')
  const rainbowAlpha   = useRef(0)
  const enochBeamAlpha = useRef(0)
  const moveVoIdx      = useRef(0)

  // Keep refs in sync with state for the canvas RAF
  useEffect(() => { wpDoneRef.current = wpDone }, [wpDone])
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── Canvas ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    cv.width = window.innerWidth; cv.height = window.innerHeight
    const W = cv.width, H = cv.height

    // Star field
    const SCOLS = ['#FFE066','#FFFFFF','#DDDDFF','#FFCCAA','#AADDFF','#FFD700','#CCFFEE']
    interface Star { x:number;y:number;r:number;color:string;base:number;amp:number;spd:number;ph:number }
    const stars: Star[] = Array.from({length:340}, () => ({
      x: Math.random()*W, y: Math.random()*H*0.82,
      r: Math.random()*1.9+0.3,
      color: SCOLS[Math.floor(Math.random()*SCOLS.length)],
      base: Math.random()*0.40+0.25, amp: Math.random()*0.30+0.08,
      spd:  Math.random()*0.020+0.004, ph: Math.random()*Math.PI*2,
    }))

    let frame = 0

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // ── Twilight sky: warm amber at horizon → deep royal purple at top ──
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0,    '#16043a')   // deep purple top
      sky.addColorStop(0.30, '#28064a')
      sky.addColorStop(0.55, '#3d0a3a')   // mid purple
      sky.addColorStop(0.72, '#8a2c08')   // rich amber-rust
      sky.addColorStop(0.85, '#c24010')   // deep amber
      sky.addColorStop(0.94, '#e86420')   // bright amber at horizon
      sky.addColorStop(1,    '#1a1008')   // ground shadow
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)

      // Horizon warm glow
      const hglow = ctx.createLinearGradient(0, H*0.70, 0, H*0.90)
      hglow.addColorStop(0, 'transparent')
      hglow.addColorStop(0.4, 'rgba(240,120,30,0.22)')
      hglow.addColorStop(1, 'transparent')
      ctx.fillStyle = hglow; ctx.fillRect(0, H*0.70, W, H*0.20)

      // Ground / earth base (dark silhouette)
      const earth = ctx.createLinearGradient(0, H*0.88, 0, H)
      earth.addColorStop(0, '#2a1406'); earth.addColorStop(1, '#0a0602')
      ctx.fillStyle = earth; ctx.fillRect(0, H*0.88, W, H*0.12)

      // ── Stars ──
      frame++
      for (const s of stars) {
        const op = Math.max(0.06, Math.min(1, s.base + Math.sin(frame*s.spd+s.ph)*s.amp))
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r*4.0, 0, Math.PI*2)
        ctx.fillStyle = `${s.color}${Math.floor(op*40).toString(16).padStart(2,'0')}`; ctx.fill()
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2)
        ctx.fillStyle = s.color; ctx.globalAlpha = op; ctx.fill(); ctx.globalAlpha = 1
      }

      // ── Tree ──
      const bl = BRANCH_MAP[Math.min(wpDoneRef.current, BRANCH_MAP.length-1)]
      const cx = TX * W
      const tyBot = TY_BOT * H
      const tyTop = TY_TOP * H

      // Dark base trunk (full height)
      ctx.strokeStyle = '#200d04'
      ctx.lineWidth = 14; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(cx, tyBot); ctx.lineTo(cx, tyTop); ctx.stroke()

      // Lit trunk portion (bottom up to highest lit branch)
      if (bl > 0) {
        const highestY = BRANCH_DEFS[bl-1].trunkY * H
        const litGrad = ctx.createLinearGradient(0, tyBot, 0, highestY)
        litGrad.addColorStop(0, 'rgba(140,60,8,0.95)')
        litGrad.addColorStop(0.4, 'rgba(210,130,15,0.90)')
        litGrad.addColorStop(0.8, 'rgba(255,210,40,0.80)')
        litGrad.addColorStop(1, 'rgba(255,240,100,0.70)')
        ctx.shadowBlur = 28; ctx.shadowColor = '#FFD700'
        ctx.strokeStyle = litGrad
        ctx.lineWidth = 7
        ctx.beginPath(); ctx.moveTo(cx, tyBot); ctx.lineTo(cx, highestY); ctx.stroke()
        ctx.shadowBlur = 0
      }

      // ── Branches ──
      for (let i = 0; i < bl && i < BRANCH_DEFS.length; i++) {
        const bd = BRANCH_DEFS[i]
        const ty = bd.trunkY * H
        const ex = (bd.side === 'L' ? BRH_L : BRH_R) * W
        const ey = (bd.trunkY - 0.04) * H

        // Dark base branch
        ctx.strokeStyle = '#180a02'; ctx.lineWidth = 5; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(ex, ey); ctx.stroke()

        // Glowing colored branch
        ctx.shadowBlur = 18; ctx.shadowColor = bd.color
        ctx.strokeStyle = bd.color; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(ex, ey); ctx.stroke()
        ctx.shadowBlur = 0

        // Node glow circle
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.06 + i)
        ctx.beginPath(); ctx.arc(ex, ey, 18 + pulse * 6, 0, Math.PI*2)
        ctx.fillStyle = bd.color; ctx.globalAlpha = 0.20 + pulse * 0.08; ctx.fill(); ctx.globalAlpha = 1
        ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI*2)
        ctx.fillStyle = bd.color; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1
      }

      // ── Next-branch preview (pulsing dark branch at next position) ──
      const ph = phaseRef.current
      if ((ph === 'journey') && wpDoneRef.current < WPS.length) {
        const nextBranchIdx = BRANCH_MAP[wpDoneRef.current]
        if (nextBranchIdx < BRANCH_DEFS.length) {
          const bd = BRANCH_DEFS[nextBranchIdx]
          const ty = bd.trunkY * H
          const ex = (bd.side === 'L' ? BRH_L : BRH_R) * W
          const ey = (bd.trunkY - 0.04) * H
          const p2 = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.05))
          ctx.strokeStyle = `rgba(255,215,0,${p2 * 0.45})`
          ctx.lineWidth = 2; ctx.setLineDash([4, 4])
          ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(ex, ey); ctx.stroke()
          ctx.setLineDash([])
          ctx.beginPath(); ctx.arc(ex, ey, 14 + p2*8, 0, Math.PI*2)
          ctx.fillStyle = `rgba(255,215,0,${p2*0.20})`; ctx.fill()
        }
      }

      // ── Enoch ascending beam ──
      if (enochBeamAlpha.current > 0) {
        const eAnc = BRANCH_DEFS[6]
        const ex = BRH_L * W
        const ey = (eAnc.trunkY - 0.04) * H
        const beamGrad = ctx.createLinearGradient(ex, ey, ex, 0)
        beamGrad.addColorStop(0, `rgba(255,255,255,${enochBeamAlpha.current})`)
        beamGrad.addColorStop(0.5, `rgba(220,240,255,${enochBeamAlpha.current * 0.55})`)
        beamGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = beamGrad
        ctx.fillRect(ex - 20, 0, 40, ey)
        enochBeamAlpha.current = Math.max(0, enochBeamAlpha.current - 0.008)
      }

      // ── Rainbow (finale / outro) ──
      if (rainbowAlpha.current > 0) {
        const alpha = rainbowAlpha.current
        const rcx = W*0.5, rcy = H*1.15
        const rColors = ['#FF4444','#FF8800','#FFEE00','#44DD44','#44AAFF','#9944FF','#FF44CC']
        rColors.forEach((col, i) => {
          const radius = W * (0.86 - i * 0.05)
          ctx.beginPath()
          ctx.arc(rcx, rcy, radius, Math.PI, 0, true)
          ctx.strokeStyle = col
          ctx.lineWidth = W * 0.020
          ctx.globalAlpha = alpha * (0.72 - i * 0.04)
          ctx.stroke(); ctx.globalAlpha = 1
        })
      }

      // ── Fireworks ──
      for (let i = fwRef.current.length-1; i >= 0; i--) {
        const p = fwRef.current[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.alpha -= 0.015
        if (p.alpha <= 0) { fwRef.current.splice(i,1); continue }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*3.0, 0, Math.PI*2)
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha*0.24; ctx.fill(); ctx.globalAlpha = 1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill(); ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // ── Fireworks ─────────────────────────────────────────────────────────────

  const launchFireworks = (intensity = 1, colorSet?: string[]) => {
    const W = window.innerWidth, H = window.innerHeight
    const cols = colorSet || FW_COLORS
    const bursts: FWParticle[] = []
    for (let b = 0; b < Math.round(6 * intensity); b++) {
      const bx = W*(0.05 + Math.random()*0.90), by = H*(0.04 + Math.random()*0.65)
      const col = cols[Math.floor(Math.random()*cols.length)]
      for (let j = 0; j < Math.round(28 * intensity); j++) {
        const angle = Math.random()*Math.PI*2, spd = Math.random()*10+2
        bursts.push({ x:bx, y:by, vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
          r:Math.random()*3.8+0.8, alpha:0.85+Math.random()*0.15, color:col })
      }
    }
    fwRef.current.push(...bursts)
  }

  // ── Intro ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'intro') return
    const t1 = setTimeout(() => {
      playThunder()
      setGodVisible(true)
      speakGod('This is the written account of Adam\'s family line. When God created mankind, He made them in the likeness of God.')
    }, 1200)
    const t2 = setTimeout(() => {
      setGodVisible(false)
      setPhase('journey')
    }, 9000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase])

  // ── Enoch ascent sequence ─────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'enoch') return
    setEnochRising(true)
    playChoir()
    enochBeamAlpha.current = 1
    speakVO('Enoch walked with God and then he was NO MORE — because GOD TOOK HIM!', 0.68)
    const t = setTimeout(() => {
      setEnochRising(false)
      setPhase('journey')
    }, 5500)
    return () => clearTimeout(t)
  }, [phase])

  // ── Methuselah slot machine ───────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'methuselah') return
    let count = 0
    const timer = setInterval(() => {
      count = Math.min(969, count + Math.ceil(18 + Math.random()*22))
      setSlotNum(count)
      if (count >= 969) {
        clearInterval(timer)
        setSlotNum(969)
        launchFireworks(2.5)
        playOrchestra()
        setTimeout(() => speakVO('969 YEARS! The oldest man who EVER lived! Methuselah holds the record!', 0.72), 400)
        setTimeout(() => { setPhase('journey') }, 5000)
      }
    }, 48)
    return () => clearInterval(timer)
  }, [phase])

  // ── Finale sequence ───────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'finale') return
    playOrchestra()
    launchFireworks(3)
    let fw = 0
    const fwTimer = setInterval(() => {
      launchFireworks(2, FW_COLORS)
      if (++fw >= 16) clearInterval(fwTimer)
    }, 350)
    // Animate rainbow alpha
    const rbTimer = setInterval(() => {
      rainbowAlpha.current = Math.min(1, rainbowAlpha.current + 0.04)
    }, 40)
    setTimeout(() => {
      clearInterval(fwTimer); clearInterval(rbTimer)
      rainbowAlpha.current = 1
      setPhase('outro')
    }, 5500)
    return () => { clearInterval(fwTimer); clearInterval(rbTimer) }
  }, [phase])

  // ── Outro ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'outro') return
    launchFireworks(2)
    setTimeout(() => setPhase('completion'), 5000)
  }, [phase])

  // ── Node click (opens quiz for current waypoint) ──────────────────────────

  const handleNodeClick = () => {
    if (phase !== 'journey') return
    setCurWP(wpDone)
    setSel(null); setLocked(false); setWrongFlash(false); setWrongPerWP(0)
    setPhase('quiz')
  }

  // ── Answer ────────────────────────────────────────────────────────────────

  const handleAnswer = (idx: number) => {
    if (locked) return
    setSel(idx)
    const wp = WPS[curWP]
    const name = localStorage.getItem('iq_character') || 'Warrior'

    if (idx === wp.correct) {
      setLocked(true)
      setCoins(addCoins(10))
      playCorrect()
      launchFireworks(1, [wp.color, '#FFD700', '#FFFFFF'])
      speakVO(wp.correctVO)

      // Movement VO toast
      const raw = MOVE_VOS[moveVoIdx.current % MOVE_VOS.length].replace('{name}', name)
      moveVoIdx.current++
      setToast(raw)
      setTimeout(() => setToast(null), 2900)

      setTimeout(() => {
        const next = curWP + 1
        setWpDone(next)
        setSel(null); setLocked(false)

        if (curWP === 6) {
          // WP7: Enoch — trigger ascent
          setPhase('enoch')
        } else if (curWP === 8) {
          // WP9: Methuselah — trigger slot machine
          setPhase('methuselah')
        } else if (next >= WPS.length) {
          // WP12: Finale
          setPhase('finale')
        } else {
          setPhase('journey')
        }
      }, 2300)
    } else {
      setWrongFlash(true)
      playWrong()
      const nw = wrongPerWP + 1; setWrongPerWP(nw)
      if (nw >= 3) {
        setTimeout(() => onFail?.(wp.hint), 900)
      } else {
        setTimeout(() => { setWrongFlash(false); setSel(null) }, 1800)
      }
    }
  }

  // ── Completion ────────────────────────────────────────────────────────────

  if (phase === 'completion') {
    const name = localStorage.getItem('iq_character') || 'Warrior'
    return (
      <CompletionScreen
        verse="Enoch walked faithfully with God; then he was no more, because God took him away."
        verseRef="Genesis 5:24"
        subtitle="your legacy is built one faithful choice at a time"
        voiceLine={`Like this holy line, your legacy is built one faithful choice at a time, ${name}. See, you are smarter than you imagine.`}
        onComplete={onComplete}
      />
    )
  }

  const branchLit = BRANCH_MAP[Math.min(wpDone, BRANCH_MAP.length-1)]
  const nextPos   = wpDone < NEXT_POS.length ? NEXT_POS[wpDone] : null

  return (
    <div className="level7">
      <canvas ref={canvasRef} className="l7-canvas" />

      <CoinHUD coins={coins} hint={HINT} onCoinsChange={setCoins} disabled={phase !== 'journey'} />

      {showHint && phase === 'journey' && (
        <div className="level-hint-banner">💡 {HINT}</div>
      )}

      {/* Header */}
      {phase !== 'outro' && phase !== 'finale' && (
        <header className="l7-header">
          <p className="l7-label">LEVEL 1-7</p>
          <h1 className="l7-title">The Living Family Tree</h1>
        </header>
      )}

      {/* Movement VO toast */}
      {toast && <div className="l7-toast">{toast}</div>}

      {/* ── INTRO ─────────────────────────────────────────────────────── */}
      {phase === 'intro' && (
        <>
          {godVisible && (
            <div className="l7-god-words">
              <p className="l7-god-quote">
                "This is the written account of Adam's family line.<br/>
                When God created mankind, He made them in the likeness of God."
              </p>
              <p className="l7-god-ref">— Genesis 5:1</p>
            </div>
          )}
          <div className="l7-intro-subtitle">
            <p>The Living Family Tree: Adam to Noah</p>
          </div>
        </>
      )}

      {/* ── ANCESTOR NODES (shown in journey, quiz, enoch, methuselah, finale, outro) ── */}
      {phase !== 'intro' && (
        <>
          {BRANCH_DEFS.map((bd, i) => {
            const isLit     = branchLit > i
            const isEnoch   = i === 6
            const isNextPrev = phase === 'journey' && branchLit === i && wpDone < WPS.length
            if (!isLit && !isNextPrev) return null
            return (
              <div
                key={bd.name}
                className={[
                  'l7-ancestor',
                  isLit ? 'l7-ancestor--lit' : 'l7-ancestor--preview',
                  isEnoch && enochRising ? 'l7-ancestor--rising' : '',
                  phase === 'finale' ? 'l7-ancestor--wave' : '',
                ].filter(Boolean).join(' ')}
                style={{ left:`${ANC_POS[i].x}%`, top:`${ANC_POS[i].y}%`, '--ac':bd.color } as React.CSSProperties}
              >
                <div className="l7-ancestor-glow" />
                <span className="l7-ancestor-emoji">
                  {isEnoch && (enochRising || (wpDone >= 8 && phase !== 'enoch')) ? '✨' :
                   bd.name === 'Adam' ? '👴' : bd.name === 'Seth' ? '🧓' :
                   bd.name === 'Enosh' ? '🧔' : bd.name === 'Kenan' ? '👨' :
                   bd.name === 'Mahalalel' ? '🧓' : bd.name === 'Jared' ? '👴' :
                   bd.name === 'Enoch' ? '🕊️' : bd.name === 'Methuselah' ? '🧙' :
                   bd.name === 'Lamech' ? '👨' : '⛵'}
                </span>
                {isLit && !isNextPrev && <span className="l7-ancestor-name">{bd.name}</span>}
              </div>
            )
          })}

          {/* Noah watching on right (always visible during gameplay) */}
          <div className="l7-noah-watcher">
            <span className="l7-noah-emoji">👦</span>
            <p className="l7-noah-label">Noah</p>
          </div>
        </>
      )}

      {/* ── JOURNEY: Next-branch click node ─────────────────────────── */}
      {phase === 'journey' && nextPos && wpDone < WPS.length && (
        <button
          className="l7-next-node"
          style={{ left:`${nextPos.x}%`, top:`${nextPos.y}%` }}
          onClick={handleNodeClick}
          aria-label="Answer next question"
        >
          <span className="l7-next-star">✦</span>
          <span className="l7-next-label">
            {wpDone === 11 ? 'Final Question' :
             wpDone === 7  ? 'Enoch\'s Fate?' :
             `Ancestor ${wpDone + 1}`}
          </span>
        </button>
      )}

      {/* Journey progress */}
      {phase === 'journey' && (
        <p className="l7-progress">{wpDone} / {WPS.length} questions answered</p>
      )}

      {/* ── QUIZ ──────────────────────────────────────────────────────── */}
      {phase === 'quiz' && (
        <div className="l7-quiz-overlay">
          <div
            className="l7-quiz-card"
            style={{ '--wpc':WPS[curWP].color, '--wpg':WPS[curWP].glow } as React.CSSProperties}
          >
            <p className="l7-quiz-wpnum" style={{ color: WPS[curWP].color }}>
              ⬤ QUESTION {curWP + 1} OF {WPS.length}
            </p>
            <h2 className="l7-quiz-q">{WPS[curWP].question}</h2>
            <div className="l7-quiz-grid">
              {WPS[curWP].options.map((opt, i) => (
                <button
                  key={i}
                  className={[
                    'l7-quiz-btn',
                    sel === i && locked    ? 'l7-qb--correct' : '',
                    sel === i && wrongFlash ? 'l7-qb--wrong'   : '',
                  ].filter(Boolean).join(' ')}
                  style={{ '--wpc': WPS[curWP].color } as React.CSSProperties}
                  onClick={() => handleAnswer(i)}
                  disabled={locked}
                >{opt}</button>
              ))}
            </div>
            {wrongFlash && (
              <p className="l7-quiz-feedback">
                Search the scriptures — try again! 📖
                {wrongPerWP >= 2 && <span className="l7-last-chance"> (last chance)</span>}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── ENOCH ASCENT ─────────────────────────────────────────────── */}
      {phase === 'enoch' && (
        <div className="l7-enoch-overlay">
          <div className="l7-enoch-beam" />
          <div className="l7-enoch-text">
            <p className="l7-enoch-line1">✦ GOD TOOK HIM ✦</p>
            <p className="l7-enoch-line2">Enoch walked with God<br/>and was no more.</p>
            <p className="l7-enoch-ref">Genesis 5:24</p>
          </div>
        </div>
      )}

      {/* ── METHUSELAH SLOT MACHINE ──────────────────────────────────── */}
      {phase === 'methuselah' && (
        <div className="l7-slot-overlay">
          <div className="l7-slot-card">
            <p className="l7-slot-title">🧙 METHUSELAH 🧙</p>
            <p className="l7-slot-sub">Years Lived:</p>
            <div className="l7-slot-counter">
              <span className="l7-slot-num">{slotNum.toString().padStart(3, '0')}</span>
            </div>
            {slotNum >= 969 && (
              <p className="l7-slot-record">🏆 THE OLDEST PERSON WHO EVER LIVED! 🏆</p>
            )}
          </div>
        </div>
      )}

      {/* ── FINALE / OUTRO ───────────────────────────────────────────── */}
      {(phase === 'finale' || phase === 'outro') && (
        <div className="l7-finale-overlay">
          <p className="l7-finale-line1">✦ THE LIVING FAMILY TREE ✦</p>
          <p className="l7-finale-line2">From Adam to Noah</p>
          <p className="l7-finale-line3">
            Ten generations of God's perfect<br/>timing and preservation!
          </p>
        </div>
      )}
    </div>
  )
}
