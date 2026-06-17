import { useCallback, useEffect, useRef, useState } from 'react'
import './level10.css'
import CompletionScreen from './CompletionScreen'
import { addCoins, getCoins, penalizeCoins } from './coins'

// ── Audio ─────────────────────────────────────────────────────────────────────
let _ac: AudioContext | null = null
function getAC(): AudioContext {
  if (!_ac || _ac.state === 'closed') _ac = new AudioContext()
  return _ac
}

function mkNote(
  ctx: AudioContext, freq: number, vol: number,
  start: number, end: number, type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator()
  const g   = ctx.createGain()
  osc.type  = type
  osc.frequency.value = freq
  const now = ctx.currentTime
  g.gain.setValueAtTime(0, now + start)
  g.gain.linearRampToValueAtTime(vol, now + start + Math.max(0.01, (end - start) * 0.15))
  g.gain.linearRampToValueAtTime(0, now + end)
  osc.connect(g); g.connect(ctx.destination)
  osc.start(now + start); osc.stop(now + end + 0.05)
}

function playFeed(ctx: AudioContext) {
  mkNote(ctx, 440, 0.25, 0, 0.18)
  mkNote(ctx, 550, 0.20, 0.1, 0.30)
  mkNote(ctx, 660, 0.15, 0.2, 0.42)
}
function playSeal(ctx: AudioContext) {
  mkNote(ctx, 240, 0.35, 0, 0.20, 'square')
  mkNote(ctx, 140, 0.28, 0.08, 0.40, 'sine')
}
function playPray(ctx: AudioContext) {
  mkNote(ctx, 528, 0.30, 0, 0.55)
  mkNote(ctx, 792, 0.20, 0.15, 0.70)
  mkNote(ctx, 1056, 0.12, 0.30, 0.85)
}
function playMiss(ctx: AudioContext) {
  mkNote(ctx, 220, 0.40, 0, 0.45, 'sawtooth')
}
function playCorrect(ctx: AudioContext) {
  mkNote(ctx, 523, 0.25, 0, 0.20)
  mkNote(ctx, 659, 0.20, 0.15, 0.36)
  mkNote(ctx, 784, 0.18, 0.30, 0.56)
}
function playWrong(ctx: AudioContext) {
  mkNote(ctx, 300, 0.35, 0, 0.42, 'sawtooth')
}
function playGodBass(ctx: AudioContext) {
  mkNote(ctx, 80, 0.50, 0, 2.8, 'sine')
  mkNote(ctx, 60, 0.35, 0.3, 3.0, 'sine')
}
function playRainbow(ctx: AudioContext) {
  const freqs = [261, 330, 392, 523, 659, 784, 1046]
  freqs.forEach((f, i) => mkNote(ctx, f, 0.28 - i * 0.018, i * 0.14, i * 0.14 + 0.95))
}

function speakVO(text: string, rate = 0.75) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utt    = new SpeechSynthesisUtterance(text)
  utt.rate     = rate
  utt.pitch    = 0.88
  utt.volume   = 1
  window.speechSynthesis.speak(utt)
}

// ── Constants ─────────────────────────────────────────────────────────────────
type Phase    = 'intro' | 'survival' | 'milestone' | 'climax' | 'completion'
type TaskType = 'animal' | 'leak' | 'prayer'

interface ActiveTask {
  id:      number
  type:    TaskType
  x:       number   // % left
  y:       number   // % top
  elapsed: number   // ms since spawn
  maxTime: number   // ms before miss
}

interface Meters { animal: number; water: number; faith: number }

const MILESTONE_DAYS = [10, 20, 30, 40]

const MILESTONE_QS = [
  {
    q:    'How many days and nights did it rain on the earth?',
    opts: ['20 days and nights', '30 days and nights', '40 days and nights', '50 days and nights'],
    c:    2, coins: 15,
    vo:   'Forty days and forty nights — just as God said it would be.',
  },
  {
    q:    'By how many cubits did the floodwaters cover the mountains?',
    opts: ['5 cubits', '10 cubits', '15 cubits', '20 cubits'],
    c:    2, coins: 15,
    vo:   'Fifteen cubits above the mountains — God\'s power is beyond measure.',
  },
  {
    q:    'Who survived the great flood on the ark?',
    opts: [
      'Just Noah alone',
      'Noah and his wife only',
      'Noah, his family, and all the animals',
      'Noah and seven animals',
    ],
    c: 2, coins: 20,
    vo: 'Noah, his family, and every kind of creature — God preserved them all.',
  },
  {
    q:    'Which bird did Noah send out of the ark first?',
    opts: ['A dove', 'A sparrow', 'A raven', 'An eagle'],
    c:    2, coins: 20,
    vo:   'A raven first, then a dove — searching the waters for dry land.',
  },
]

function stormLevel(day: number): number {
  if (day <= 10) return 0
  if (day <= 20) return 1
  if (day <= 30) return 2
  return 3
}

interface TaskTimes { animalInt: number; leakInt: number; prayInt: number; maxTime: number }
function taskTimes(day: number): TaskTimes {
  if (day <= 10) return { animalInt: 8000, leakInt: 10000, prayInt: 15000, maxTime: 5000 }
  if (day <= 20) return { animalInt: 6000, leakInt:  8000, prayInt: 12000, maxTime: 4200 }
  if (day <= 30) return { animalInt: 4500, leakInt:  6000, prayInt: 10000, maxTime: 3500 }
  return             { animalInt: 3000, leakInt:  4500, prayInt:  8000, maxTime: 3000 }
}

function meterDrain(day: number): number {
  if (day <= 10) return 22
  if (day <= 20) return 26
  if (day <= 30) return 30
  return 35
}

// ── Raindrop ─────────────────────────────────────────────────────────────────
interface Drop { x: number; y: number; spd: number; len: number; op: number }
function makeDrops(W: number, H: number, n: number): Drop[] {
  return Array.from({ length: n }, () => ({
    x:   Math.random() * W,
    y:   Math.random() * H,
    spd: Math.random() * 5 + 3,
    len: Math.random() * 18 + 10,
    op:  Math.random() * 0.45 + 0.18,
  }))
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { onComplete: () => void; onFail: (hint: string) => void; showHint?: boolean }

export default function Level10({ onComplete, onFail }: Props) {
  const [phase,    setPhase]   = useState<Phase>('intro')
  const [day,      setDay]     = useState(1)
  const [meters,   setMeters]  = useState<Meters>({ animal: 100, water: 100, faith: 100 })
  const [tasks,    setTasks]   = useState<ActiveTask[]>([])
  const [coins,    setCoins]   = useState(getCoins())
  const [selected, setSelected] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [flash,    setFlash]   = useState(false)
  const [doveOut,  setDoveOut]  = useState(false)
  const [doveBranch, setDoveBranch] = useState(false)
  const [rainbow,  setRainbow]  = useState(false)
  const [completed, setCompleted] = useState(false)
  const [dayKey,   setDayKey]   = useState(0)

  const phaseRef   = useRef<Phase>('intro')
  const dayRef     = useRef(1)
  const metersRef  = useRef<Meters>({ animal: 100, water: 100, faith: 100 })
  const tasksRef   = useRef<ActiveTask[]>([])
  const onFailRef  = useRef(onFail)
  const failedRef  = useRef(false)
  const nextId     = useRef(0)
  const animalCD   = useRef(3500)
  const leakCD     = useRef(5500)
  const prayCD     = useRef(9000)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>(0)
  const dropsRef   = useRef<Drop[]>([])

  // Sync refs
  useEffect(() => { phaseRef.current  = phase  }, [phase])
  useEffect(() => { dayRef.current    = day; setDayKey(k => k + 1) }, [day])
  useEffect(() => { metersRef.current = meters }, [meters])
  useEffect(() => { tasksRef.current  = tasks  }, [tasks])
  useEffect(() => { onFailRef.current = onFail }, [onFail])

  const earnCoins = useCallback((n: number) => setCoins(addCoins(n)), [])

  // ── Climax ──────────────────────────────────────────────────────────────────
  const triggerClimax = useCallback(() => {
    setPhase('climax')
    setTasks([])
    window.speechSynthesis.cancel()
    playGodBass(getAC())
    setTimeout(() => speakVO('But God remembered Noah.', 0.68), 400)
    setTimeout(() => { setDoveOut(true) }, 2200)
    setTimeout(() => { setDoveBranch(true) }, 5200)
    setTimeout(() => {
      playRainbow(getAC())
      setRainbow(true)
      speakVO('Never again will I destroy all living creatures as I have done.', 0.72)
    }, 7800)
    setTimeout(() => setCompleted(true), 12500)
  }, [])

  // ── Intro ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    speakVO(
      'For forty days the flood kept coming on the earth, ' +
      'and as the waters increased they lifted the ark high above the earth. ' +
      'Every living thing that moved on land perished. But God remembered Noah.',
      0.76,
    )
    const t = setTimeout(() => setPhase('survival'), 8000)
    return () => clearTimeout(t)
  }, [])

  // ── Rain canvas ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const resize = () => {
      cv.width  = window.innerWidth
      cv.height = window.innerHeight
      dropsRef.current = makeDrops(cv.width, cv.height, 160)
    }
    resize()
    window.addEventListener('resize', resize)
    const tick = () => {
      const W = cv.width; const H = cv.height
      ctx.clearRect(0, 0, W, H)
      const sl  = phaseRef.current === 'climax' || completed ? 0 : stormLevel(dayRef.current)
      const int = [0.22, 0.52, 0.82, 1.0][sl]
      for (const d of dropsRef.current) {
        d.y += d.spd * (0.4 + int * 0.6)
        d.x += 1.8
        if (d.y > H + d.len) { d.y = -d.len; d.x = Math.random() * W }
        if (d.x > W)         { d.x = 0 }
        ctx.strokeStyle = `rgba(130,185,255,${d.op * int})`
        ctx.lineWidth   = 1.2
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - 2.5, d.y - d.len)
        ctx.stroke()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [completed])

  // ── Lightning (storm level 1+) ───────────────────────────────────────────────
  useEffect(() => {
    const sl = stormLevel(day)
    if (sl < 1) return
    const base  = sl === 1 ? 6000 : sl === 2 ? 3500 : 2000
    const timer = setInterval(() => {
      if (phaseRef.current !== 'survival') return
      setFlash(true)
      setTimeout(() => setFlash(false), 110)
    }, base + Math.random() * 2500)
    return () => clearInterval(timer)
  }, [day])

  // ── Day counter (runs once, gated by phaseRef) ───────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (phaseRef.current !== 'survival') return
      const next = dayRef.current + 1
      if (next > 40) return
      setDay(next)
      if (MILESTONE_DAYS.includes(next)) {
        setTimeout(() => setPhase('milestone'), 300)
      }
    }, 2000)
    return () => clearInterval(t)
  }, [])

  // ── Task loop (runs once, gated by phaseRef) ─────────────────────────────────
  useEffect(() => {
    const TICK = 200
    const t = setInterval(() => {
      if (phaseRef.current !== 'survival') return
      const d  = dayRef.current
      const tt = taskTimes(d)
      const maxSim = d > 20 ? 2 : 1

      animalCD.current -= TICK
      leakCD.current   -= TICK
      prayCD.current   -= TICK

      const spawned: ActiveTask[] = []

      if (animalCD.current <= 0) {
        if (tasksRef.current.filter(x => x.type === 'animal').length < maxSim) {
          spawned.push({
            id: nextId.current++, type: 'animal',
            x: 8  + Math.random() * 32,
            y: 35 + Math.random() * 32,
            elapsed: 0, maxTime: tt.maxTime,
          })
        }
        animalCD.current = tt.animalInt + (Math.random() - 0.5) * 1200
      }
      if (leakCD.current <= 0) {
        if (tasksRef.current.filter(x => x.type === 'leak').length < maxSim) {
          spawned.push({
            id: nextId.current++, type: 'leak',
            x: 55 + Math.random() * 28,
            y: 38 + Math.random() * 35,
            elapsed: 0, maxTime: tt.maxTime + 1200,
          })
        }
        leakCD.current = tt.leakInt + (Math.random() - 0.5) * 1500
      }
      if (prayCD.current <= 0) {
        if (tasksRef.current.filter(x => x.type === 'prayer').length === 0) {
          spawned.push({
            id: nextId.current++, type: 'prayer',
            x: 38 + Math.random() * 18,
            y: 22 + Math.random() * 18,
            elapsed: 0, maxTime: tt.maxTime + 3000,
          })
        }
        prayCD.current = tt.prayInt + (Math.random() - 0.5) * 2000
      }

      setTasks(prev => {
        const next:    ActiveTask[] = []
        const missed:  TaskType[]   = []
        for (const tk of prev) {
          if (tk.elapsed + TICK >= tk.maxTime) missed.push(tk.type)
          else next.push({ ...tk, elapsed: tk.elapsed + TICK })
        }
        if (missed.length > 0 && !failedRef.current) {
          playMiss(getAC())
          const drain = meterDrain(dayRef.current)
          setMeters(m => {
            const nm = { ...m }
            for (const type of missed) {
              if (type === 'animal') nm.animal = Math.max(0, nm.animal - drain)
              if (type === 'leak')   nm.water  = Math.max(0, nm.water  - drain)
              if (type === 'prayer') nm.faith  = Math.max(0, nm.faith  - drain)
            }
            if (nm.animal <= 0 || nm.water <= 0 || nm.faith <= 0) {
              failedRef.current = true
              const why = nm.animal <= 0 ? 'The animals starved. Noah could not keep them all fed.'
                        : nm.water  <= 0 ? 'The ark flooded. A crack burst open the hull.'
                        :                  'Faith ran out. Noah lost hope in the storm.'
              setTimeout(() => onFailRef.current(why), 600)
            }
            return nm
          })
        }
        return [...next, ...spawned]
      })
    }, TICK)
    return () => clearInterval(t)
  }, [])

  // ── Tap task ─────────────────────────────────────────────────────────────────
  const tapTask = (id: number, type: TaskType) => {
    if (phaseRef.current !== 'survival') return
    const ac = getAC()
    if (type === 'animal') { playFeed(ac); earnCoins(5)  }
    if (type === 'leak')   { playSeal(ac); earnCoins(5)  }
    if (type === 'prayer') { playPray(ac); earnCoins(10) }
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // ── Milestone answer ──────────────────────────────────────────────────────────
  const handleAnswer = (optIdx: number) => {
    if (selected !== null) return
    const idx = MILESTONE_DAYS.indexOf(dayRef.current)
    if (idx < 0) return
    const q       = MILESTONE_QS[idx]
    const correct = optIdx === q.c
    setSelected(optIdx)
    setIsCorrect(correct)
    const ac = getAC()
    if (correct) { playCorrect(ac); earnCoins(q.coins); setTimeout(() => speakVO(q.vo), 200) }
    else {
      playWrong(ac)
      setCoins(penalizeCoins(50))
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
    }
    setTimeout(() => {
      setSelected(null); setIsCorrect(null)
      if (dayRef.current >= 40) triggerClimax()
      else {
        setPhase('survival')
        animalCD.current = 2000
        leakCD.current   = 3000
        prayCD.current   = 6000
      }
    }, 2500)
  }

  // ── Completion ───────────────────────────────────────────────────────────────
  if (completed) {
    const name = localStorage.getItem('iq_character') || 'Warrior'
    return (
      <CompletionScreen
        verse="But God remembered Noah and all the wild animals and the livestock that were with him in the ark, and he sent a wind over the earth, and the waters receded."
        verseRef="Genesis 8:1"
        subtitle="God never forgets those inside His protection"
        voiceLine={`${name}. God never forgets those inside His protection. You are stronger than you think.`}
        onComplete={onComplete}
      />
    )
  }

  const sl = stormLevel(day)
  const stormCls = ['l10-storm-0', 'l10-storm-1', 'l10-storm-2', 'l10-storm-3'][sl]
  const milestoneIdx = MILESTONE_DAYS.indexOf(day)
  const mq = milestoneIdx >= 0 ? MILESTONE_QS[milestoneIdx] : null

  return (
    <div className={`l10-root ${stormCls}`}>
      <div className="l10-bg" />
      <div className="l10-overlay" />
      <canvas ref={canvasRef} className="l10-rain" />
      {flash && <div className="l10-flash" />}
      {rainbow && <div className="l10-rainbow" />}

      {/* Dove + olive branch */}
      {doveOut && (
        <div className={`l10-dove ${doveBranch ? 'l10-dove--return' : 'l10-dove--out'}`}>
          🕊️{doveBranch ? <span className="l10-branch"> 🌿</span> : null}
        </div>
      )}

      {/* HUD */}
      <div className="l10-hud">
        <div className="l10-day-block">
          <span className="l10-day-label">DAY</span>
          <span className="l10-day-num" key={dayKey}>{day}</span>
          <span className="l10-day-of">of 40</span>
        </div>

        <div className="l10-meters">
          {([
            { key: 'animal', icon: '🐾', label: 'ANIMALS FED', val: meters.animal, cls: 'l10-fill--green'  },
            { key: 'water',  icon: '🚰', label: 'ARK SEALED',  val: meters.water,  cls: 'l10-fill--blue'   },
            { key: 'faith',  icon: '🙏', label: 'FAITH STRONG',val: meters.faith,  cls: 'l10-fill--gold'   },
          ] as const).map(m => (
            <div key={m.key} className="l10-meter">
              <span className="l10-meter-icon">{m.icon}</span>
              <div className="l10-meter-track">
                <div
                  className={`l10-meter-fill ${m.cls}${m.val < 30 ? ' l10-fill--danger' : ''}`}
                  style={{ width: `${m.val}%` }}
                />
              </div>
              <span className="l10-meter-lbl">{m.label}</span>
            </div>
          ))}
        </div>

        <div className="l10-coins">🪙 {coins}</div>
      </div>

      {/* Intro overlay */}
      {phase === 'intro' && (
        <div className="l10-intro">
          <div className="l10-intro-card">
            <p className="l10-intro-eyebrow">LEVEL 1-10</p>
            <h2 className="l10-intro-title">THE GREAT FLOOD</h2>
            <p className="l10-intro-sub">40 Days of Survival</p>
            <p className="l10-intro-verse">
              "For forty days the flood kept coming on the earth..."
            </p>
          </div>
        </div>
      )}

      {/* Survival tasks */}
      {phase === 'survival' && tasks.map(tk => {
        const progress = tk.elapsed / tk.maxTime
        const urgent   = progress > 0.65
        const icons:  Record<TaskType, string> = { animal: '🐾', leak: '💧', prayer: '✨' }
        const labels: Record<TaskType, string> = { animal: 'FEED!', leak: 'SEAL!', prayer: 'PRAY!' }
        return (
          <button
            key={tk.id}
            className={`l10-task l10-task--${tk.type}${urgent ? ' l10-task--urgent' : ''}`}
            style={{ left: `${tk.x}%`, top: `${tk.y}%`, '--p': progress } as React.CSSProperties}
            onClick={() => tapTask(tk.id, tk.type)}
          >
            <svg className="l10-ring-svg" viewBox="0 0 44 44">
              <circle className="l10-ring-bg" cx="22" cy="22" r="19" />
              <circle
                className="l10-ring-arc"
                cx="22" cy="22" r="19"
                strokeDasharray={`${(1 - progress) * 119.4} 119.4`}
              />
            </svg>
            <span className="l10-task-icon">{icons[tk.type]}</span>
            <span className="l10-task-lbl">{labels[tk.type]}</span>
          </button>
        )
      })}

      {/* Milestone quiz */}
      {phase === 'milestone' && mq && (
        <div className="l10-milestone-overlay">
          <div className="l10-milestone-card">
            <p className="l10-ms-day">⚓ DAY {day} CHECKPOINT</p>
            <p className="l10-ms-grace">✨ Grace — no penalty for wrong answers</p>
            <h3 className="l10-ms-q">{mq.q}</h3>
            <div className="l10-ms-opts">
              {mq.opts.map((opt, i) => {
                let cls = 'l10-mopt'
                if (selected !== null) {
                  if (i === mq.c)             cls += ' l10-mopt--correct'
                  else if (i === selected && !isCorrect) cls += ' l10-mopt--wrong'
                }
                return (
                  <button key={i} className={cls} onClick={() => handleAnswer(i)} disabled={selected !== null}>
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Climax overlay */}
      {phase === 'climax' && (
        <div className="l10-climax">
          <p className="l10-climax-text">But God remembered Noah...</p>
          {doveBranch && <p className="l10-climax-sub">The dove returned with an olive branch.</p>}
        </div>
      )}
    </div>
  )
}
