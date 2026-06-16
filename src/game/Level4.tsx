import { useEffect, useRef, useState } from 'react'
import './level4.css'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { getCoins, addCoins } from './coins'

const HINT = 'Find two animals of the SAME type and click them both to pair them — send all 14 pairs to the ark!'

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'matching' | 'cinematic' | 'glory'

interface Animal { id: string; type: string; emoji: string; x: number; y: number }

// ─── Data ────────────────────────────────────────────────────────────────────

const TYPES = [
  { type: 'lion',      emoji: '🦁' },
  { type: 'elephant',  emoji: '🐘' },
  { type: 'dove',      emoji: '🕊️' },
  { type: 'snake',     emoji: '🐍' },
  { type: 'giraffe',   emoji: '🦒' },
  { type: 'bear',      emoji: '🐻' },
  { type: 'tiger',     emoji: '🐅' },
  { type: 'zebra',     emoji: '🦓' },
  { type: 'crocodile', emoji: '🐊' },
  { type: 'rhino',     emoji: '🦏' },
  { type: 'leopard',   emoji: '🐆' },
  { type: 'kangaroo',  emoji: '🦘' },
  { type: 'gorilla',   emoji: '🦍' },
  { type: 'goat',      emoji: '🐐' },
]

function generateAnimals(): Animal[] {
  // 4-col × 7-row grid = 28 positions — left 62% of screen, top 13%-76% vertically
  // Ark occupies right ~32%; header top ~12%; animals never go too low
  const grid: Array<{x:number;y:number}> = []
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 4; c++) {
      const x =  6 + (c / 3) * 52 + (Math.random()-0.5)*5   // 6% → 58%
      const y = 13 + (r / 6) * 60 + (Math.random()-0.5)*4   // 13% → 73%
      grid.push({ x: Math.max(4,Math.min(60,x)), y: Math.max(11,Math.min(75,y)) })
    }
  }
  for (let i=grid.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[grid[i],grid[j]]=[grid[j],grid[i]]}

  const pairs = [...TYPES,...TYPES]
  for (let i=pairs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]]}

  return pairs.map((t,i) => ({ id:`${t.type}-${i}`, type:t.type, emoji:t.emoji, x:grid[i].x, y:grid[i].y }))
}

// ─── Audio ───────────────────────────────────────────────────────────────────

function playMatchSound() {
  try {
    const ctx = new AudioContext()
    ;[523.25,659.25,783.99,1046.50].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain()
      o.type='sine';o.frequency.value=f
      const t=ctx.currentTime+i*0.08
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.18,t+0.06)
      g.gain.exponentialRampToValueAtTime(0.001,t+1.4)
      o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+1.5)
    })
  } catch(_){}
}

function playWrongSound() {
  try {
    const ctx=new AudioContext(),o=ctx.createOscillator(),g=ctx.createGain()
    o.type='sawtooth';o.frequency.setValueAtTime(200,ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(80,ctx.currentTime+0.5)
    g.gain.setValueAtTime(0.09,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.55)
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.55)
  } catch(_){}
}

function playRainbowSound() {
  try {
    const ctx=new AudioContext()
    ;[261.63,329.63,392,523.25,659.25,783.99,1046.50,1318.51].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain()
      o.type='sine';o.frequency.value=f
      const t=ctx.currentTime+i*0.06
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.16,t+0.12)
      g.gain.exponentialRampToValueAtTime(0.001,t+4)
      o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+4.5)
    })
  } catch(_){}
}


function speakVoice(text:string, rate=0.88, pitch=1.08) {
  try {
    const utt=new SpeechSynthesisUtterance(text)
    utt.rate=rate;utt.pitch=pitch;utt.volume=1
    const warm=speechSynthesis.getVoices().find(v=>/female|woman|zira|samantha|karen|victoria|moira/i.test(v.name))
    if(warm) utt.voice=warm
    speechSynthesis.cancel();speechSynthesis.speak(utt)
  } catch(_){}
}

// ─── Canvas helpers ──────────────────────────────────────────────────────────

const lerp = (a:number,b:number,t:number) => a+(b-a)*Math.min(1,Math.max(0,t))

function drawRainbow(ctx:CanvasRenderingContext2D, W:number, pivotY:number, alpha:number) {
  const cx=W/2
  const bands:[number,number,number][] = [
    [212,160,23],[220,40,40],[255,140,0],[240,220,0],
    [50,200,80],[30,150,255],[150,0,220],[212,160,23],
  ]
  const maxR = Math.min(W*0.47, pivotY*0.88)
  const band = maxR / (bands.length * 1.35)
  bands.forEach(([r,g,b],i) => {
    const radius = maxR - i*band*1.18
    if (radius<=0) return
    ctx.beginPath(); ctx.arc(cx, pivotY, radius, Math.PI, 0, false)
    ctx.strokeStyle=`rgba(${r},${g},${b},${alpha*0.78})`
    ctx.lineWidth=band*1.08; ctx.stroke()
  })
}

function drawArk(ctx:CanvasRenderingContext2D, W:number, H:number, rise:number, rockT:number) {
  const aw = Math.min(W*0.32, 220)
  const ah = aw*0.28
  const cx = W/2
  // Rock: gentle side-to-side
  const rock = Math.sin(rockT*0.0012)*0.03
  const waterY = H*0.64
  const aky = waterY - ah*0.55 - rise*H*0.16

  ctx.save()
  ctx.translate(cx, aky+ah/2)
  ctx.rotate(rock)
  ctx.translate(-cx, -(aky+ah/2))

  // Hull
  ctx.fillStyle='#3d1f0a'
  ctx.beginPath()
  ctx.moveTo(cx-aw*0.5,aky+ah*0.25); ctx.lineTo(cx+aw*0.5,aky+ah*0.25)
  ctx.lineTo(cx+aw*0.44,aky+ah); ctx.lineTo(cx-aw*0.44,aky+ah)
  ctx.closePath(); ctx.fill()

  // Deck
  ctx.fillStyle='#5c2e0f'
  ctx.fillRect(cx-aw*0.46, aky, aw*0.92, ah*0.28)

  // Cabin
  ctx.fillStyle='#7a3e14'
  ctx.fillRect(cx-aw*0.26, aky-ah*0.48, aw*0.52, ah*0.50)

  // Gold trim
  ctx.strokeStyle='rgba(212,160,23,0.50)'; ctx.lineWidth=1.5
  ctx.strokeRect(cx-aw*0.46,aky,aw*0.92,ah*0.28)
  ctx.strokeRect(cx-aw*0.26,aky-ah*0.48,aw*0.52,ah*0.50)

  // Window — golden porthole
  ctx.fillStyle='rgba(255,200,80,0.55)'
  ctx.beginPath(); ctx.arc(cx, aky-ah*0.22, ah*0.12, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle='rgba(212,160,23,0.75)'; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.arc(cx, aky-ah*0.22, ah*0.12, 0, Math.PI*2); ctx.stroke()

  ctx.restore()
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Level4({ onComplete }:{ onComplete?: () => void }) {
  const [phase,        setPhase]       = useState<Phase>('matching')
  const [timeLeft,     setTimeLeft]    = useState(45)
  const [animals]                      = useState<Animal[]>(generateAnimals)
  const [selected,     setSelected]    = useState<string|null>(null)
  const [pairsFound,   setPairsFound]  = useState(0)
  const [animOut,      setAnimOut]     = useState<Set<string>>(new Set())
  const [removed,      setRemoved]     = useState<Set<string>>(new Set())
  const [wrongIds,     setWrongIds]    = useState<string[]>([])
  const [coins,        setCoins]       = useState(() => getCoins())

  const bgRef          = useRef<HTMLCanvasElement>(null)
  const cinRef         = useRef<HTMLCanvasElement>(null)
  const cinRafRef      = useRef<number>(0)
  const timerRef       = useRef<ReturnType<typeof setInterval>|null>(null)
  // Refs prevent stale-closure bugs on pair counting and glory gating
  const pairsFoundRef  = useRef(0)
  const glorySentRef   = useRef(false)

  // Derived: water height 0→100%
  const waterPct = ((45 - timeLeft) / 45) * 100

  // ── Static background ────────────────────────────────────────────────────

  useEffect(() => {
    const cv=bgRef.current; if(!cv) return
    const ctx=cv.getContext('2d'); if(!ctx) return
    cv.width=window.innerWidth; cv.height=window.innerHeight
    const W=cv.width, H=cv.height

    // Ominous storm sky
    const sky=ctx.createLinearGradient(0,0,0,H*0.65)
    sky.addColorStop(0,'#020208'); sky.addColorStop(0.6,'#08050f'); sky.addColorStop(1,'#0f060a')
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H)

    // Stars barely visible
    for(let i=0;i<180;i++){
      const x=Math.random()*W, y=Math.random()*H*0.58
      const op=Math.random()*0.22+0.04
      ctx.beginPath(); ctx.arc(x,y,Math.random()*0.8+0.1,0,Math.PI*2)
      ctx.fillStyle=`rgba(200,210,240,${op})`; ctx.fill()
    }

    // Dark storm clouds
    const cloudData=[[W*0.15,H*0.08,W*0.38],[W*0.60,H*0.05,W*0.32],[W*0.35,H*0.18,W*0.25],[W*0.80,H*0.14,W*0.28]]
    for(const [cx,cy,cr] of cloudData){
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,cr)
      g.addColorStop(0,'rgba(18,12,28,0.92)'); g.addColorStop(0.55,'rgba(12,8,20,0.65)'); g.addColorStop(1,'transparent')
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
    }

    // Dark ground
    const ground=ctx.createLinearGradient(0,H*0.63,0,H)
    ground.addColorStop(0,'#0c0502'); ground.addColorStop(1,'#020100')
    ctx.fillStyle=ground; ctx.fillRect(0,H*0.63,W,H)

    // Horizon storm glow (deep red-orange)
    const hg=ctx.createLinearGradient(0,H*0.56,0,H*0.68)
    hg.addColorStop(0,'transparent'); hg.addColorStop(0.5,'rgba(120,30,5,0.09)'); hg.addColorStop(1,'transparent')
    ctx.fillStyle=hg; ctx.fillRect(0,H*0.56,W,H*0.12)
  }, [])

  // ── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'matching') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          speakVoice('Hurry! Get the animals onto the ark!', 1.05, 1.2)
          return 45
        }
        return t - 1
      })
    }, 1000)
    return () => { if(timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // ── Cinematic canvas ─────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'cinematic') return
    const cv=cinRef.current; if(!cv) return
    const ctx=cv.getContext('2d'); if(!ctx) return
    cv.width=window.innerWidth; cv.height=window.innerHeight
    const W=cv.width, H=cv.height
    // Reset start on the ACTUAL first frame — prevents instant glory if tab was
    // backgrounded between performance.now() and the first RAF callback
    let start = -1
    const DUR=9500
    let lastLightning=0, lightningOn=false, voicePlayed=false

    playRainbowSound()

    const draw = (now:number) => {
      if (start < 0) { start = now; lastLightning = now }
      const elapsed=now-start
      const p=Math.min(1,elapsed/DUR)
      ctx.clearRect(0,0,W,H)

      // ── Sky colour lerps storm → dusk → dawn ──
      const clearPhase   = Math.min(1,Math.max(0,(p-0.35)/0.35)) // 0→1 p 35%-70%
      const goldenPhase  = Math.min(1,Math.max(0,(p-0.65)/0.25)) // 0→1 p 65%-90%

      const skyR = Math.round(lerp(lerp(3,12,clearPhase),30,goldenPhase))
      const skyG = Math.round(lerp(lerp(2,6,clearPhase),15,goldenPhase))
      const skyB = Math.round(lerp(lerp(18,22,clearPhase),8,goldenPhase))
      const skyR2= Math.round(lerp(lerp(8,20,clearPhase),45,goldenPhase))
      const skyG2= Math.round(lerp(lerp(4,10,clearPhase),22,goldenPhase))
      const skyB2= Math.round(lerp(lerp(25,15,clearPhase),5,goldenPhase))

      const skyGrad=ctx.createLinearGradient(0,0,0,H*0.65)
      skyGrad.addColorStop(0,`rgb(${skyR},${skyG},${skyB})`)
      skyGrad.addColorStop(1,`rgb(${skyR2},${skyG2},${skyB2})`)
      ctx.fillStyle=skyGrad; ctx.fillRect(0,0,W,H*0.65)

      // ── Storm clouds (fade out by p=0.50) ──
      const cloudAlpha = Math.max(0, p < 0.25 ? 0.88 : (0.50-p)/0.25*0.88)
      if (cloudAlpha>0) {
        const drift = elapsed*0.012
        ;[[W*0.12,H*0.06,W*0.38],[W*0.62,H*0.04,W*0.33],[W*0.38,H*0.16,W*0.26]].forEach(([cx,cy,cr])=>{
          const g=ctx.createRadialGradient(cx+drift%W,cy,0,cx+drift%W,cy,cr)
          g.addColorStop(0,`rgba(15,10,28,${cloudAlpha})`); g.addColorStop(0.6,`rgba(10,6,20,${cloudAlpha*0.55})`); g.addColorStop(1,'transparent')
          ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
        })

        // Lightning (first 28%)
        if (p < 0.28) {
          if (now-lastLightning > 450+Math.random()*1200) {
            lightningOn=!lightningOn; lastLightning=now
          }
          if (lightningOn) {
            ctx.fillStyle='rgba(180,210,255,0.13)'; ctx.fillRect(0,0,W,H)
            // Bolt
            let bx=W*(0.25+Math.random()*0.5), by=H*0.02
            ctx.strokeStyle='rgba(210,230,255,0.85)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(bx,by)
            for(let s=0;s<7;s++){bx+=(Math.random()-0.5)*35;by+=H*0.07;ctx.lineTo(bx,by)}
            ctx.stroke()
          }
        }

        // Rain streaks on canvas
        if (p < 0.38) {
          const rainAlpha = p < 0.25 ? 0.06 : (0.38-p)/0.13*0.06
          ctx.strokeStyle=`rgba(150,180,220,${rainAlpha})`; ctx.lineWidth=0.8
          for(let i=0;i<60;i++){
            const rx=(Math.random()*W + elapsed*0.15)%W
            const ry=(Math.random()*H*0.6 + elapsed*0.4)%(H*0.6)
            ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx+8,ry+22); ctx.stroke()
          }
        }
      }

      // ── Animated water surface ──
      const waterTopY = H*0.64
      const waveAmp = lerp(18, 6, clearPhase)
      const waterGrad=ctx.createLinearGradient(0,waterTopY,0,H)
      waterGrad.addColorStop(0,`rgba(${Math.round(lerp(8,20,clearPhase))},${Math.round(lerp(38,65,clearPhase))},${Math.round(lerp(105,140,clearPhase))},0.92)`)
      waterGrad.addColorStop(1,'rgba(4,18,55,0.98)')
      ctx.fillStyle=waterGrad
      ctx.beginPath(); ctx.moveTo(0,waterTopY)
      for(let x=0;x<=W;x+=W/28){
        ctx.lineTo(x, waterTopY + Math.sin(x*0.022+elapsed*0.0025)*waveAmp + Math.sin(x*0.011+elapsed*0.0018)*waveAmp*0.5)
      }
      ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill()

      // ── Ark (p > 0.30) ──
      if (p > 0.30) {
        const arkRise = Math.min(1,(p-0.30)/0.40)
        const arkAlpha = Math.min(1,(p-0.30)/0.15)
        ctx.globalAlpha = arkAlpha
        drawArk(ctx, W, H, arkRise, elapsed)
        ctx.globalAlpha = 1
      }

      // ── Rainbow (p > 0.55) ──
      if (p > 0.55) {
        const rbAlpha = Math.min(1,(p-0.55)/0.22)
        drawRainbow(ctx, W, H*0.88, rbAlpha)
      }

      // ── Golden sun glow above horizon (p > 0.68) ──
      if (p > 0.68) {
        const sg=p < 0.85 ? (p-0.68)/0.17 : 1
        const sunG=ctx.createRadialGradient(W/2,H*0.38,0,W/2,H*0.38,W*0.38)
        sunG.addColorStop(0,`rgba(255,210,80,${sg*0.18})`); sunG.addColorStop(1,'transparent')
        ctx.fillStyle=sunG; ctx.fillRect(0,0,W,H)
      }

      // ── Bright glory fade-out (p > 0.88) ──
      if (p > 0.88) {
        const fa=(p-0.88)/0.12
        ctx.fillStyle=`rgba(255,225,120,${fa*0.88})`; ctx.fillRect(0,0,W,H)
      }

      // Voice at 6.8s
      if (elapsed > 6800 && !voicePlayed) {
        voicePlayed=true
        speakVoice('God always makes a way for those He loves — you just obey.')
      }

      if (p < 1) {
        cinRafRef.current=requestAnimationFrame(draw)
      } else if (!glorySentRef.current) {
        glorySentRef.current=true
        setPhase('glory')
      }
    }

    cinRafRef.current=requestAnimationFrame(draw)
    return ()=>cancelAnimationFrame(cinRafRef.current)
  }, [phase])


  // ── Click handler ────────────────────────────────────────────────────────

  const handleClick = (id: string) => {
    if (animOut.has(id) || removed.has(id)) return

    if (!selected) {
      setSelected(id); return
    }
    if (selected === id) {
      setSelected(null); return
    }

    const a1 = animals.find(a=>a.id===selected)!
    const a2 = animals.find(a=>a.id===id)!

    if (a1.type === a2.type) {
      // ✅ Match — use ref so count is always fresh (avoids stale closure)
      pairsFoundRef.current += 1
      const newCount = pairsFoundRef.current
      setPairsFound(newCount)
      const sid = selected
      setAnimOut(s=>{const n=new Set(s);n.add(sid);n.add(id);return n})
      setSelected(null)
      setCoins(addCoins(10))
      playMatchSound()
      speakVoice('Two by two, as God commanded!')

      setTimeout(()=>{
        setRemoved(s=>{const n=new Set(s);n.add(sid);n.add(id);return n})
        setAnimOut(s=>{const n=new Set(s);n.delete(sid);n.delete(id);return n})
      }, 950)

      if (newCount === 14 && !glorySentRef.current) {
        if(timerRef.current) clearInterval(timerRef.current)
        setTimeout(()=>setPhase('cinematic'), 1500)
      }
    } else {
      // ❌ Wrong pair
      const sid = selected
      setWrongIds([sid, id])
      setSelected(null)
      playWrongSound()
      speakVoice('We have to be fearfully and wonderfully made alike!')
      setTimeout(()=>setWrongIds([]), 1600)
    }
  }

  // Render
  return (
    <div className="level4">
      <canvas ref={bgRef} className="level4-bg" />
      <CoinHUD
        coins={coins}
        hint={HINT}
        onCoinsChange={setCoins}
        disabled={phase !== 'matching'}
      />

      {/* Rain overlay */}
      {phase==='matching' && <div className="rain-layer" />}

      <header className="level4-header">
        <p className="level4-label">LEVEL 1-4</p>
        <h1 className="level4-title">The Great Flood — Noah's Ark</h1>
      </header>

      {/* ── MATCHING PHASE ─────────────────────────────────────────────── */}
      {phase === 'matching' && (
        <>
          {/* Ark — right side, massive */}
          <div className="ark-container">
            <div className="ark-roof" />
            <div className="ark-super">
              <div className="ark-window ark-window--a" />
              <div className="ark-window ark-window--b" />
            </div>
            <div className="ark-deck" />
            <div className="ark-hull">
              <div className="ark-plank-1" />
              <div className="ark-plank-2" />
              <div className="ark-plank-3" />
            </div>
            <div className="ark-badge">{pairsFound} / 14 pairs aboard 🐾</div>
          </div>

          {/* Instruction — top of play area */}
          <p className="match-hint">Click two matching animals to pair them!</p>

          {/* Rising water */}
          <div
            className="water"
            style={{ height: `${waterPct}%` }}
          >
            <div className="water-surface" />
          </div>

          {/* Animals */}
          {animals.filter(a=>!removed.has(a.id)).map(a => {
            // Card bottom edge ≈ a.y + 8%. Submerged when water top (100-waterPct) < bottom edge.
            const isUnderwater = waterPct > (100 - (a.y + 8))
            return (
              <div
                key={a.id}
                className={[
                  'animal-card',
                  selected===a.id              ? 'animal-card--selected' : '',
                  wrongIds.includes(a.id)       ? 'animal-card--wrong'    : '',
                  animOut.has(a.id)             ? 'animal-card--paired'   : '',
                  isUnderwater                  ? 'animal-card--under'    : '',
                ].filter(Boolean).join(' ')}
                style={{ left:`${a.x}%`, top:`${a.y}%` }}
                onClick={() => handleClick(a.id)}
              >
                <span className="animal-emoji">{a.emoji}</span>
              </div>
            )
          })}
        </>
      )}

      {/* ── CINEMATIC CANVAS ───────────────────────────────────────────── */}
      {phase === 'cinematic' && (
        <canvas ref={cinRef} className="cinematic-canvas" />
      )}

      {/* ── COMPLETION ─────────────────────────────────────────────────── */}
      {phase === 'glory' && (
        <CompletionScreen
          verse="By faith Noah became heir of the righteousness that comes by faith."
          verseRef="Hebrews 11:7"
          onComplete={onComplete}
        />
      )}
    </div>
  )
}
