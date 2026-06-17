import { useEffect, useRef, useState } from 'react'
import './level8.css'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { getCoins, addCoins, penalizeCoins } from './coins'

const HINT = "Tap shadow creatures to destroy them! Answer correctly to protect God's heart!"

type Phase = 'intro' | 'fight' | 'quiz' | 'boss' | 'boss-quiz' | 'noah' | 'outro' | 'completion'

interface Shadow { id:number; x:number; y:number; vx:number; vy:number; size:number; dying:boolean }
interface Burst  { x:number; y:number; vx:number; vy:number; r:number; alpha:number; color:string }

const BURST_COLS = ['#FFD700','#FF8C00','#FF4444','#44DD66','#44AAFF','#CC44FF','#FF44BB','#FFFFFF','#AAFFCC']

// ─── 6 main questions — correct index MUST match spec ────────────────────────
const QS = [
  { q: 'What did God see that troubled His heart?',
    opts: ['Great wickedness of humanity', 'A great flood coming', 'Giants in the land', 'People not praying'],
    c: 0, hint: 'Genesis 6:5 — Every inclination of the human heart was only evil all the time.',
    vo: "Yes. God's heart broke seeing His creation choose evil." },

  { q: 'What were the Nephilim?',
    opts: ['Angels', 'Giants and mighty warriors on earth', 'Evil spirits', 'Fallen kings'],
    c: 1, hint: 'Genesis 6:4 — The Nephilim were mighty ones, giants who walked the corrupted earth.',
    vo: "Correct! The Nephilim were mighty ones — giants who walked the corrupted earth." },

  { q: 'How did God feel about the wickedness He saw?',
    opts: ['Happy', 'Confused', 'His heart was deeply troubled and grieved', 'Angry and silent'],
    c: 2, hint: "Genesis 6:6 — The LORD regretted making humans and His heart was deeply troubled.",
    vo: "Yes. God GRIEVED. His love for humanity made their rejection deeply painful." },

  { q: 'What did God decide to do about the corruption?',
    opts: ['Send angels', 'Blot out humanity and start again', 'Leave the earth', 'Create new animals'],
    c: 1, hint: 'Genesis 6:7 — "I will wipe from the face of the earth the human race I have created."',
    vo: "Correct. God decided to cleanse the earth — but His plan included salvation." },

  { q: "How long did God say His Spirit would contend with humans?",
    opts: ['Forever', '1000 years', '120 years', 'Until they repented'],
    c: 2, hint: "Genesis 6:3 — His days will be 120 years — God's final window of grace.",
    vo: "Yes! God set a limit of 120 years — a final window of grace." },

  { q: 'Who found favour in the eyes of the LORD in this dark time?',
    opts: ['Enoch', 'Methuselah', 'Noah', 'Lamech'],
    c: 2, hint: 'Genesis 6:8 — "But Noah found favour in the eyes of the LORD."',
    vo: "NOAH! One righteous man in a corrupt generation. God always finds His faithful one!" },
]

// ─── 3 boss questions ─────────────────────────────────────────────────────────
const BOSS_QS = [
  { q: 'What does "Nephilim" mean?',
    opts: ['Fallen ones or giants', 'Dark angels', 'Shadow warriors', 'Evil kings'],
    c: 0, vo: "Correct — the Nephilim were fallen ones, mighty giants of ancient times!" },

  { q: 'Who were the sons of God who saw the daughters of humans?',
    opts: ['Angels or divine beings', 'Kings', 'Prophets', 'Warriors'],
    c: 0, vo: "Yes! Angels or divine beings who crossed into the human realm." },

  { q: 'What came from the union of sons of God and daughters of humans?',
    opts: ['The Nephilim', 'The prophets', 'The priests', 'The kings'],
    c: 0, vo: "The NEPHILIM — mighty warriors born from that corrupted union!" },
]

// ─── Shadow factory ───────────────────────────────────────────────────────────
let _sid = 0
function mkShadow(): Shadow {
  const edge = Math.floor(Math.random() * 4)
  let x: number, y: number
  if      (edge === 0) { x = Math.random()*80+10; y = -8  }
  else if (edge === 1) { x = Math.random()*80+10; y = 108 }
  else if (edge === 2) { x = -8;  y = Math.random()*70+15 }
  else                 { x = 108; y = Math.random()*70+15 }
  const tx = 38 + Math.random()*24, ty = 38 + Math.random()*24
  const d  = Math.hypot(tx-x, ty-y), sp = 0.17 + Math.random()*0.17
  return { id:_sid++, x, y, vx:(tx-x)/d*sp, vy:(ty-y)/d*sp, size:50+Math.random()*30, dying:false }
}

// ─── Audio ────────────────────────────────────────────────────────────────────
function speakGod(t: string) {
  try { const u=new SpeechSynthesisUtterance(t); u.rate=0.46; u.pitch=0.24; u.volume=1; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch(_){}
}
function speakVO(t: string) {
  try {
    const u=new SpeechSynthesisUtterance(t); u.rate=0.76; u.pitch=1.06; u.volume=1
    const w=speechSynthesis.getVoices().find(v=>/female|zira|samantha|karen|victoria/i.test(v.name)); if(w) u.voice=w
    speechSynthesis.cancel(); speechSynthesis.speak(u)
  } catch(_){}
}
function playBurst() {
  try { const c=new AudioContext(); [880,1108,1320,1760].forEach((f,i)=>{ const o=c.createOscillator(),g=c.createGain(); o.type='sine'; o.frequency.value=f; const t=c.currentTime+i*0.055; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.12,t+0.04); g.gain.exponentialRampToValueAtTime(0.001,t+0.9); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+1) }) } catch(_){}
}
function playCrack() {
  try { const c=new AudioContext(),l=Math.floor(c.sampleRate*0.4),b=c.createBuffer(1,l,c.sampleRate),d=b.getChannelData(0); for(let i=0;i<l;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/l,1.2)*0.5; const s=c.createBufferSource(); s.buffer=b; const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=260; const g=c.createGain(); g.gain.value=0.48; s.connect(lp); lp.connect(g); g.connect(c.destination); s.start() } catch(_){}
}
function playWrong() {
  try { const c=new AudioContext(),o=c.createOscillator(),g=c.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(200,c.currentTime); o.frequency.exponentialRampToValueAtTime(75,c.currentTime+0.5); g.gain.setValueAtTime(0.07,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.6); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.6) } catch(_){}
}
function playBeam() {
  try { const c=new AudioContext(),now=c.currentTime; [261.63,329.63,392,523.25,659.25,784].forEach((f,i)=>{ const o=c.createOscillator(),g=c.createGain(); o.type='sine'; o.frequency.value=f; const t=now+i*0.07; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.15,t+0.1); g.gain.exponentialRampToValueAtTime(0.001,t+2); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+2.5) }) } catch(_){}
}
function playNoah() {
  try { const c=new AudioContext(),n=c.currentTime; [130.81,164.81,196,261.63,329.63,392,523.25,659.25].forEach((f,i)=>{ [0,12,-12].forEach(dt=>{ const o=c.createOscillator(),g=c.createGain(); o.type='sine'; o.frequency.value=f; o.detune.value=dt; const t=n+i*0.13; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.12*(dt===0?1:0.4),t+0.3); g.gain.exponentialRampToValueAtTime(0.001,t+5); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+6) }) }) } catch(_){}
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Level8({ onComplete, onFail, showHint }:{
  onComplete?:()=>void; onFail?:(h:string)=>void; showHint?:boolean
}) {
  const [phase,        setPhase]        = useState<Phase>('intro')
  const [shadows,      setShadows]      = useState<Shadow[]>([])
  const [killCount,    setKillCount]    = useState(0)
  const [heartCracks,  setHeartCracks]  = useState(0)
  const [quizIdx,      setQuizIdx]      = useState(0)
  const [bossHP,       setBossHP]       = useState(3)
  const [bossQuizIdx,  setBossQuizIdx]  = useState(0)
  const [bossDefeating,setBossDefeating]= useState(false)
  const [sel,          setSel]          = useState<number|null>(null)
  const [locked,       setLocked]       = useState(false)
  const [wrongFlash,   setWrongFlash]   = useState(false)
  const [coins,        setCoins]        = useState(()=>getCoins())
  const [holyFire,     setHolyFire]     = useState(false)
  const [bossBeam,     setBossBeam]     = useState(false)
  const [introText,    setIntroText]    = useState(false)
  const [noahVisible,  setNoahVisible]  = useState(false)
  const [rumble,       setRumble]       = useState(false)

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>(0)
  const burstsRef  = useRef<Burst[]>([])
  const phaseRef   = useRef<Phase>('intro')
  const killRef    = useRef(0)
  const quizRef    = useRef(0)
  const heartRef   = useRef(0)
  const ltFrames   = useRef(0)
  const ltX        = useRef(0)
  const comboRef   = useRef(0)
  const comboTmr   = useRef<ReturnType<typeof setTimeout>|null>(null)
  const bossHPRef  = useRef(3)
  const bossQRef   = useRef(0)
  const holyRef    = useRef(false)
  const noahDone   = useRef(false)
  const noahAlpha  = useRef(0)

  useEffect(()=>{ phaseRef.current=phase },[phase])
  useEffect(()=>{ quizRef.current=quizIdx },[quizIdx])
  useEffect(()=>{ killRef.current=killCount },[killCount])
  useEffect(()=>{ heartRef.current=heartCracks },[heartCracks])
  useEffect(()=>{ holyRef.current=holyFire },[holyFire])

  // ── Fail when heart broken ──────────────────────────────────────────────
  useEffect(()=>{
    if(heartCracks>=5 && phase!=='noah' && phase!=='outro' && phase!=='completion') onFail?.(HINT)
  },[heartCracks])

  // ── Heart cracks slowly over time ───────────────────────────────────────
  useEffect(()=>{
    if(phase==='intro'||phase==='noah'||phase==='outro'||phase==='completion') return
    const t=setInterval(()=>setHeartCracks(c=>Math.min(6,c+1)),28000)
    return ()=>clearInterval(t)
  },[phase])

  // ── Canvas: green lightning + burst particles + Noah glow ───────────────
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return
    const ctx=cv.getContext('2d'); if(!ctx) return
    const resize=()=>{ cv.width=window.innerWidth; cv.height=window.innerHeight }
    resize(); window.addEventListener('resize',resize)
    let frame=0

    const draw=()=>{
      frame++
      const W=cv.width,H=cv.height
      ctx.clearRect(0,0,W,H)

      // Noah golden glow (right side, animates in during noah/outro)
      if(phaseRef.current==='noah'||phaseRef.current==='outro'){
        noahAlpha.current=Math.min(1,noahAlpha.current+0.012)
        const gl=ctx.createRadialGradient(W*.74,H*.45,0,W*.74,H*.45,W*.42)
        gl.addColorStop(0,`rgba(255,215,60,${0.35*noahAlpha.current})`)
        gl.addColorStop(0.5,`rgba(255,180,30,${0.18*noahAlpha.current})`)
        gl.addColorStop(1,'transparent')
        ctx.fillStyle=gl; ctx.fillRect(0,0,W,H)
      } else { noahAlpha.current=0 }

      // Green lightning
      if(ltFrames.current>0){
        ctx.save()
        ctx.strokeStyle='rgba(80,255,120,0.80)'; ctx.lineWidth=2.2
        ctx.shadowBlur=22; ctx.shadowColor='#00FF66'
        ctx.beginPath(); ctx.moveTo(ltX.current,0)
        let cx2=ltX.current,cy=0
        while(cy<H*.78){ cx2+=(Math.random()-.5)*38; cy+=Math.random()*48+18; ctx.lineTo(Math.max(0,Math.min(W,cx2)),cy) }
        ctx.stroke(); ctx.restore()
        // Branch
        if(Math.random()<0.4){
          ctx.save(); ctx.strokeStyle='rgba(80,255,120,0.45)'; ctx.lineWidth=1.2; ctx.shadowBlur=14; ctx.shadowColor='#00FF88'
          ctx.beginPath(); ctx.moveTo(ltX.current,H*.3)
          let bx=ltX.current+50,by=H*.3
          while(by<H*.6){ bx+=(Math.random()-.5)*28; by+=Math.random()*28+10; ctx.lineTo(Math.max(0,Math.min(W,bx)),by) }
          ctx.stroke(); ctx.restore()
        }
        ltFrames.current--
      } else if(Math.random()<0.009){
        ltFrames.current=2+Math.floor(Math.random()*4); ltX.current=Math.random()*W
      }

      // Burst particles
      for(let i=burstsRef.current.length-1;i>=0;i--){
        const p=burstsRef.current[i]
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.07; p.alpha-=0.016
        if(p.alpha<=0){ burstsRef.current.splice(i,1); continue }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*2.8,0,Math.PI*2)
        ctx.fillStyle=p.color; ctx.globalAlpha=p.alpha*0.22; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle=p.color; ctx.globalAlpha=p.alpha; ctx.fill()
        ctx.globalAlpha=1
      }

      rafRef.current=requestAnimationFrame(draw)
    }
    rafRef.current=requestAnimationFrame(draw)
    return ()=>{ cancelAnimationFrame(rafRef.current); window.removeEventListener('resize',resize) }
  },[])

  // ── Intro ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='intro') return
    const t1=setTimeout(()=>{
      setIntroText(true)
      speakGod("The LORD saw how great the wickedness of the human race had become and that every inclination of the thoughts of the human heart was only evil all the time. And His heart was deeply troubled.")
    },1200)
    const t2=setTimeout(()=>{ setIntroText(false); setPhase('fight'); setShadows([mkShadow(),mkShadow(),mkShadow()]) },13000)
    return ()=>{ clearTimeout(t1); clearTimeout(t2) }
  },[phase])

  // ── Shadow spawner ──────────────────────────────────────────────────────
  useEffect(()=>{
    if(phase==='intro'||phase==='noah'||phase==='outro'||phase==='completion') return
    const t=setInterval(()=>{
      if(phaseRef.current==='noah'||phaseRef.current==='outro'||phaseRef.current==='completion') return
      setShadows(prev=>prev.length>=14 ? prev : [...prev,...Array.from({length:2+Math.floor(Math.random()*2)},mkShadow)])
    },8000)
    return ()=>clearInterval(t)
  },[phase])

  // ── Shadow mover ────────────────────────────────────────────────────────
  useEffect(()=>{
    const t=setInterval(()=>{
      const ph=phaseRef.current
      if(ph==='intro'||ph==='completion'||ph==='noah'||ph==='outro') return
      let cracks=0
      setShadows(prev=>{
        const next:Shadow[]=[]
        for(const s of prev){
          if(s.dying){ next.push(s); continue }
          const nx=s.x+s.vx+(Math.random()-.5)*0.08, ny=s.y+s.vy+(Math.random()-.5)*0.08
          if(Math.hypot(nx-50,ny-50)<8){ cracks++; continue }
          next.push({...s,x:nx,y:ny})
        }
        if(cracks>0) setTimeout(()=>{ setHeartCracks(c=>Math.min(6,c+cracks)); playCrack(); setRumble(true); setTimeout(()=>setRumble(false),700) },0)
        return next
      })
    },130)
    return ()=>clearInterval(t)
  },[])

  // ── Burst helper ─────────────────────────────────────────────────────────
  const addBurst=(xPct:number,yPct:number)=>{
    const W=window.innerWidth,H=window.innerHeight,px=(xPct/100)*W,py=(yPct/100)*H
    for(let i=0;i<32;i++){
      const a=Math.random()*Math.PI*2,sp=Math.random()*9+2
      burstsRef.current.push({x:px,y:py,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:Math.random()*3.5+0.8,alpha:1,color:BURST_COLS[Math.floor(Math.random()*BURST_COLS.length)]})
    }
  }

  // ── Kill shadow ──────────────────────────────────────────────────────────
  const killShadow=(id:number,x:number,y:number)=>{
    if(phaseRef.current==='noah'||phaseRef.current==='outro'||phaseRef.current==='completion') return
    addBurst(x,y); playBurst()
    setShadows(prev=>prev.map(s=>s.id===id?{...s,dying:true}:s))
    setTimeout(()=>setShadows(prev=>prev.filter(s=>s.id!==id)),600)

    comboRef.current++
    if(comboTmr.current) clearTimeout(comboTmr.current)
    comboTmr.current=setTimeout(()=>{ comboRef.current=0 },3000)
    const multi=holyRef.current?2:1
    setCoins(addCoins(5*multi))
    if(comboRef.current>=5){ comboRef.current=0; setHolyFire(true); setCoins(addCoins(10)); setTimeout(()=>setHolyFire(false),3000) }

    const kc=killRef.current+1; setKillCount(kc)
    const THRESH=[3,6,9,12,15,18]
    const qi=quizRef.current
    if(qi<THRESH.length && kc>=THRESH[qi] && phaseRef.current==='fight'){
      setTimeout(()=>{ if(phaseRef.current==='fight'){ setPhase('quiz'); setSel(null); setLocked(false); setWrongFlash(false) } },700)
    }
  }

  // ── Main quiz answer ─────────────────────────────────────────────────────
  const handleQuiz=(idx:number)=>{
    if(locked) return; setSel(idx)
    const q=QS[quizRef.current]
    if(idx===q.c){
      setLocked(true); playBurst(); speakVO(q.vo)
      setTimeout(()=>{
        const nq=quizRef.current+1; setQuizIdx(nq); setSel(null); setLocked(false); setWrongFlash(false)
        if(nq===3){
          setPhase('boss')
          setTimeout(()=>{ setPhase('boss-quiz'); setBossQuizIdx(0); bossQRef.current=0 },2800)
        } else if(nq>=6){ triggerNoah() }
        else { setPhase('fight') }
      },2200)
    } else {
      setWrongFlash(true); playWrong()
      setCoins(penalizeCoins(50))
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
      setShadows(prev=>[...prev,mkShadow(),mkShadow(),mkShadow()])
      setHeartCracks(c=>Math.min(6,c+1))
      setTimeout(()=>{ setWrongFlash(false); setSel(null) },1800)
    }
  }

  // ── Boss quiz answer ──────────────────────────────────────────────────────
  const handleBossQuiz=(idx:number)=>{
    if(locked) return; setSel(idx)
    const q=BOSS_QS[bossQRef.current]
    if(idx===q.c){
      setLocked(true); setBossBeam(true); playBeam(); speakVO(q.vo)
      setTimeout(()=>setBossBeam(false),1200)
      const hp=bossHPRef.current-1; bossHPRef.current=hp; setBossHP(hp)
      setTimeout(()=>{
        setSel(null); setLocked(false); setWrongFlash(false)
        if(hp<=0){
          setBossDefeating(true)
          for(let i=0;i<5;i++) setTimeout(()=>addBurst(15+Math.random()*20,30+Math.random()*40),i*200)
          setTimeout(()=>{ setBossDefeating(false); setBossHP(3); bossHPRef.current=3; setShadows([mkShadow(),mkShadow()]); setPhase('fight') },2400)
        } else { const nb=bossQRef.current+1; bossQRef.current=nb; setBossQuizIdx(nb) }
      },1700)
    } else {
      setWrongFlash(true); playWrong()
      setCoins(penalizeCoins(50))
      window.dispatchEvent(new CustomEvent('iq-coin-penalty'))
      setTimeout(()=>{ setWrongFlash(false); setSel(null) },1800)
    }
  }

  // ── Noah revelation ───────────────────────────────────────────────────────
  const triggerNoah=()=>{
    if(noahDone.current) return; noahDone.current=true
    setShadows([]); setPhase('noah'); setNoahVisible(true); playNoah()
    setTimeout(()=>speakGod("But Noah found favour in the eyes of the LORD."),1500)
    setTimeout(()=>setPhase('outro'),7500)
    setTimeout(()=>setPhase('completion'),13000)
  }

  // ── Completion ────────────────────────────────────────────────────────────
  if(phase==='completion'){
    const name=localStorage.getItem('iq_character')||'Warrior'
    return <CompletionScreen
      verse="Noah found favour in the eyes of the LORD."
      verseRef="Genesis 6:8"
      subtitle="God is still looking for His faithful one"
      voiceLine={`In a world full of darkness, God is still looking for His faithful one, ${name}. Today — that faithful one is YOU.`}
      onComplete={onComplete}
    />
  }

  const heartPct=Math.max(0,1-heartCracks/5)
  const crackClass=heartCracks>=4?'l8h--broken':heartCracks>=3?'l8h--danger':heartCracks>=1?'l8h--cracked':''
  const heartEmoji=heartCracks>=5?'💔':heartCracks>=3?'🫀':'💛'

  return (
    <div className={`level8${rumble?' l8--rumble':''}`}>
      {/* ── BG + overlay ───────────────────────────────────────────────── */}
      <div className="l8-bg" />
      <div className="l8-overlay" />
      <canvas ref={canvasRef} className="l8-canvas" />

      {/* ── HUD ────────────────────────────────────────────────────────── */}
      <CoinHUD coins={coins} hint={HINT} onCoinsChange={setCoins} disabled={phase==='quiz'||phase==='boss-quiz'} />
      {showHint&&phase==='fight'&&<div className="level-hint-banner">💡 {HINT}</div>}

      {/* Header */}
      {phase!=='noah'&&phase!=='outro'&&(
        <header className="l8-header">
          <p className="l8-level-tag">LEVEL 1-8</p>
          <h1 className="l8-title">The Nephilim &amp; The Corruption</h1>
        </header>
      )}

      {/* ── GOD'S HEART METER ──────────────────────────────────────────── */}
      {(phase==='fight'||phase==='quiz'||phase==='boss'||phase==='boss-quiz')&&(
        <div className={`l8-heart-wrap ${crackClass}`}>
          <p className="l8-heart-heading">GOD'S HEART</p>
          <span className="l8-heart-icon">{heartEmoji}</span>
          <div className="l8-heart-track">
            <div className="l8-heart-fill" style={{width:`${heartPct*100}%`}} />
          </div>
          {heartCracks>=3&&<p className="l8-heart-warn">⚠ PROTECT IT!</p>}
        </div>
      )}

      {/* Question progress tracker */}
      {(phase==='fight'||phase==='quiz')&&(
        <div className="l8-q-track">
          {QS.map((_,i)=>(
            <div key={i} className={`l8-qdot${quizIdx>i?' l8-qdot--done':quizIdx===i?' l8-qdot--now':''}`}>{quizIdx>i?'✓':i+1}</div>
          ))}
        </div>
      )}

      {/* Holy Fire */}
      {holyFire&&<div className="l8-holy-fire">🔥 HOLY FIRE x2! 🔥</div>}

      {/* ── SHADOWS ────────────────────────────────────────────────────── */}
      {shadows.map(s=>(
        <div key={s.id}
          className={`l8-shadow${s.dying?' l8-shadow--dying':''}`}
          style={{left:`${s.x}%`,top:`${s.y}%`,width:`${s.size}px`,height:`${s.size}px`}}
          onClick={()=>!s.dying&&killShadow(s.id,s.x,s.y)}
        >
          <div className="l8-eye" style={{left:'25%',top:'32%'}}/>
          <div className="l8-eye" style={{left:'57%',top:'32%'}}/>
        </div>
      ))}

      {/* Kill counter */}
      {(phase==='fight'||phase==='quiz')&&(
        <p className="l8-kills">⚔ {killCount} shadows defeated</p>
      )}

      {/* ── INTRO ──────────────────────────────────────────────────────── */}
      {phase==='intro'&&(
        <div className="l8-intro-veil">
          {introText?(
            <div className="l8-god-speech">
              <p className="l8-god-quote">
                "The LORD saw how great the wickedness of the human race had become
                and that every inclination of the thoughts of the human heart was only
                evil all the time. And His heart was deeply troubled."
              </p>
              <p className="l8-god-ref">— Genesis 6:5–6</p>
            </div>
          ):(
            <div className="l8-intro-wait">
              <h2 className="l8-intro-ttl">The Nephilim &amp; the<br/>Corruption of Humanity</h2>
              <p className="l8-intro-sub">Darkness is coming… prepare to fight</p>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN QUIZ CARD ─────────────────────────────────────────────── */}
      {phase==='quiz'&&(
        <div className="l8-quiz-veil">
          <div className="l8-quiz-card">
            <p className="l8-quiz-num">⚡ QUESTION {quizIdx+1} OF 6</p>
            {/* FULL QUESTION TEXT — always visible above answers */}
            <h2 className="l8-quiz-question">{QS[quizIdx].q}</h2>
            <div className="l8-quiz-grid">
              {QS[quizIdx].opts.map((opt,i)=>(
                <button key={i}
                  className={`l8-qbtn${sel===i&&locked?' l8-qb--ok':''}${sel===i&&wrongFlash?' l8-qb--bad':''}`}
                  onClick={()=>handleQuiz(i)} disabled={locked}
                >{opt}</button>
              ))}
            </div>
            {wrongFlash&&(
              <p className="l8-quiz-err">
                Wrong! 3 new shadows spawning… 😱
                {heartCracks>=4&&<strong> LAST CHANCE!</strong>}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── BOSS PHASE ─────────────────────────────────────────────────── */}
      {(phase==='boss'||phase==='boss-quiz')&&(
        <>
          {/* Giant boss shadow — left side, over Nephilim in image */}
          <div className={`l8-boss${bossDefeating?' l8-boss--dying':''}`}>
            <div className="l8-boss-hpbar">
              <p className="l8-boss-hplbl">⚡ ANCIENT GIANT — NEPHILIM WARRIOR ⚡</p>
              <div className="l8-boss-hptrack">
                <div className="l8-boss-hpfill" style={{width:`${(bossHP/3)*100}%`}}/>
              </div>
            </div>
            <div className="l8-eye l8-eye--boss" style={{left:'22%',top:'33%'}}/>
            <div className="l8-eye l8-eye--boss" style={{left:'54%',top:'33%'}}/>
            <div className="l8-eye l8-eye--third" style={{left:'38%',top:'55%'}}/>
          </div>

          {/* Golden beam hit effect */}
          {bossBeam&&<div className="l8-boss-beam"/>}

          {/* Boss battle banner */}
          {!bossDefeating&&phase==='boss'&&(
            <p className="l8-boss-banner">⚡ THE NEPHILIM WARRIOR RISES — PREPARE TO FIGHT! ⚡</p>
          )}
        </>
      )}

      {/* ── BOSS QUIZ CARD ─────────────────────────────────────────────── */}
      {phase==='boss-quiz'&&!bossDefeating&&(
        <div className="l8-bquiz-dock">
          <div className="l8-bquiz-card">
            <p className="l8-bquiz-num">💥 BOSS BATTLE — HIT {bossQuizIdx+1} OF 3</p>
            {/* FULL BOSS QUESTION TEXT — always visible above answers */}
            <h2 className="l8-quiz-question l8-quiz-question--boss">{BOSS_QS[bossQuizIdx].q}</h2>
            <div className="l8-quiz-grid">
              {BOSS_QS[bossQuizIdx].opts.map((opt,i)=>(
                <button key={i}
                  className={`l8-qbtn l8-qbtn--boss${sel===i&&locked?' l8-qb--ok':''}${sel===i&&wrongFlash?' l8-qb--bad':''}`}
                  onClick={()=>handleBossQuiz(i)} disabled={locked}
                >{opt}</button>
              ))}
            </div>
            {wrongFlash&&<p className="l8-quiz-err">Not quite — answer correctly to fire the golden beam!</p>}
          </div>
        </div>
      )}

      {/* ── NOAH REVEAL ────────────────────────────────────────────────── */}
      {(phase==='noah'||phase==='outro')&&(
        <div className="l8-noah-wrap">
          <div className="l8-noah-pillar"/>
          <div className={`l8-noah-fig${noahVisible?' l8-noah-fig--lit':''}`}>
            <span className="l8-noah-emoji">🧔</span>
            <p className="l8-noah-name">N O A H</p>
            <p className="l8-noah-verse">Found favour in the eyes of the LORD</p>
          </div>
          {phase==='outro'&&(
            <div className="l8-heart-restore">
              <span className="l8-restore-icon">💛</span>
              <p className="l8-restore-lbl">GOD'S HEART IS RESTORED</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
