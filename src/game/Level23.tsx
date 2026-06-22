import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level23.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase  = 'cinematic'|'phase1'|'phase2'|'phase3'|'phase4'|'ending'|'complete'
type P1Sub  = 'feast'|'questions'
type P2Sub  = 'laugh'|'questions'
type P3Sub  = 'reveal'|'questions'|'countdown'|'tf'
type P4Sub  = 'cards'|'final'
type RoundT = 'yn'|'tf'|'mc'
interface Round { type:RoundT; q:string; opts:string[]; ans:number }

// ── Data ──────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'YOU RECOGNIZED THE ANGELS!!',
  'ABRAHAM ENERGY!!',
  'HOSPITALITY CHAMPION!!',
  'NOTHING IS TOO HARD FOR GOD!!',
  'YOU SAW WHAT OTHERS MISSED!!',
  'DIVINE INSIGHT!!',
  'SUPERNATURAL WISDOM!!',
  'YOU PASSED THE TEST!!',
  "SARAH WHO?! YOU'RE THE SMART ONE!!",
  'EVEN THE ANGELS ARE IMPRESSED!!',
]

const FEAST_ICONS  = ['🫙','🫓','🧈','🥛','🥩','🌿']
const FEAST_LABELS = ['Water Bowl','Bread','Butter','Milk','Tender Calf','Herbs & Spices']
const FEAST_POS    = [{x:14,y:32},{x:68,y:22},{x:38,y:54},{x:8,y:62},{x:72,y:60},{x:48,y:28}]

const P1_ROUNDS: Round[] = [
  { type:'yn', q:'Did Abraham bow down to greet the three visitors?', opts:['YES','NO'], ans:0 },
  { type:'tf', q:'Abraham walked slowly to meet the visitors because he was old.', opts:['TRUE','FALSE'], ans:1 },
  { type:'mc', q:'Where was Sarah when the visitors arrived?',
    opts:['Inside the tent','At the market','Visiting Lot','Drawing water from the well'], ans:0 },
]
const P1_COINS = [15,20,20]

const P2_ROUNDS: Round[] = [
  { type:'yn', q:'Did Sarah admit that she laughed?', opts:['YES','NO'], ans:1 },
  { type:'tf', q:'The visitor said "Is anything too hard for the LORD?"', opts:['TRUE','FALSE'], ans:0 },
  { type:'mc', q:'Why did Sarah laugh to herself?',
    opts:['She and Abraham were too old to have children','She thought the visitors were lying','She was happy and excited',"She laughed at Abraham's cooking"], ans:0 },
]
const P2_COINS = [20,25,20]

const P3_ROUNDS: Round[] = [
  { type:'yn', q:'Did God agree to spare Sodom for 50 righteous people?', opts:['YES','NO'], ans:0 },
  { type:'yn', q:'Did God agree to spare Sodom for 45 righteous people?', opts:['YES','NO'], ans:0 },
  { type:'mc', q:'How low did Abraham negotiate God down to?',
    opts:['10 righteous people','5 righteous people','25 righteous people','1 righteous person'], ans:0 },
]
const P3_COINS = [15,15,30]

const COUNTDOWN_NUMS = [50,45,40,30,20,10]

const GOD_LINES = [
  '"The outcry against Sodom and Gomorrah is great."',
  '"Their sin is very grave."',
  '"I will go down and see."',
]

// ── Audio ─────────────────────────────────────────────────────────────────────
function playWhoosh() {
  try {
    const c=new AudioContext()
    const buf=c.createBuffer(1,Math.floor(c.sampleRate*0.22),c.sampleRate)
    const d=buf.getChannelData(0)
    for(let i=0;i<d.length;i++){const t=i/d.length;d[i]=(Math.random()*2-1)*0.45*(1-t)}
    const src=c.createBufferSource();src.buffer=buf
    const filt=c.createBiquadFilter();filt.type='bandpass';filt.frequency.value=1400;filt.Q.value=0.7
    const g=c.createGain();g.gain.setValueAtTime(0.55,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.22)
    src.connect(filt);filt.connect(g);g.connect(c.destination);src.start()
  }catch(_){}
}
function playGoldExplosion() {
  try {
    const c=new AudioContext()
    ;[110,220,330,440,550,880].forEach((f,i)=>{
      const o=c.createOscillator();const g=c.createGain()
      o.type='sine';o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.04)
      g.gain.linearRampToValueAtTime(0.20,c.currentTime+i*0.04+0.08)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.04+1.4)
      o.connect(g);g.connect(c.destination)
      o.start(c.currentTime+i*0.04);o.stop(c.currentTime+i*0.04+1.6)
    })
    const o2=c.createOscillator();const g2=c.createGain()
    o2.type='sine';o2.frequency.setValueAtTime(80,c.currentTime);o2.frequency.exponentialRampToValueAtTime(18,c.currentTime+1.2)
    g2.gain.setValueAtTime(0.6,c.currentTime);g2.gain.exponentialRampToValueAtTime(0.001,c.currentTime+1.8)
    o2.connect(g2);g2.connect(c.destination);o2.start();o2.stop(c.currentTime+2)
  }catch(_){}
}
function playWhiteBurstSound() {
  try {
    const c=new AudioContext()
    ;[110,165,220,330,440,660,880,1320].forEach((f,i)=>{
      const o=c.createOscillator();const g=c.createGain()
      o.type='sine';o.frequency.value=f
      g.gain.setValueAtTime(0.22,c.currentTime+i*0.06)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.06+1.8)
      o.connect(g);g.connect(c.destination)
      o.start(c.currentTime+i*0.06);o.stop(c.currentTime+i*0.06+2.0)
    })
    const o2=c.createOscillator();const g2=c.createGain()
    o2.type='sine';o2.frequency.setValueAtTime(80,c.currentTime);o2.frequency.exponentialRampToValueAtTime(14,c.currentTime+3)
    g2.gain.setValueAtTime(0.7,c.currentTime);g2.gain.exponentialRampToValueAtTime(0.001,c.currentTime+3.5)
    o2.connect(g2);g2.connect(c.destination);o2.start();o2.stop(c.currentTime+4)
  }catch(_){}
}
function playWahWah() {
  try {
    const c=new AudioContext()
    ;[220,196,175,165].forEach((f,i)=>{
      const o=c.createOscillator();const g=c.createGain()
      o.type='sawtooth';o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.18)
      g.gain.linearRampToValueAtTime(0.28,c.currentTime+i*0.18+0.05)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.18+0.16)
      o.connect(g);g.connect(c.destination)
      o.start(c.currentTime+i*0.18);o.stop(c.currentTime+i*0.18+0.22)
    })
  }catch(_){}
}
function playBoomShockwave() {
  try {
    const c=new AudioContext()
    const o=c.createOscillator();const g=c.createGain()
    o.type='sine';o.frequency.setValueAtTime(140,c.currentTime);o.frequency.exponentialRampToValueAtTime(22,c.currentTime+0.5)
    g.gain.setValueAtTime(0.8,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.7)
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.8)
  }catch(_){}
}
function playImpact() {
  try {
    const c=new AudioContext()
    const o=c.createOscillator();const g=c.createGain()
    o.type='sine';o.frequency.setValueAtTime(180,c.currentTime);o.frequency.exponentialRampToValueAtTime(40,c.currentTime+0.18)
    g.gain.setValueAtTime(0.6,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.35)
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.4)
    const o2=c.createOscillator();const g2=c.createGain()
    o2.type='triangle';o2.frequency.value=380
    g2.gain.setValueAtTime(0.25,c.currentTime);g2.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.20)
    o2.connect(g2);g2.connect(c.destination);o2.start();o2.stop(c.currentTime+0.25)
  }catch(_){}
}
function playChime() {
  try {
    const c=new AudioContext()
    ;[523,659,784,1047].forEach((f,i)=>{
      const o=c.createOscillator();const g=c.createGain()
      o.type='sine';o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.08)
      g.gain.linearRampToValueAtTime(0.20,c.currentTime+i*0.08+0.04)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.08+0.8)
      o.connect(g);g.connect(c.destination)
      o.start(c.currentTime+i*0.08);o.stop(c.currentTime+i*0.08+0.9)
    })
  }catch(_){}
}
function playOminousRumble() {
  try {
    const c=new AudioContext()
    ;[55,73,82].forEach((f,i)=>{
      const o=c.createOscillator();const g=c.createGain()
      o.type='sine';o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.06)
      g.gain.linearRampToValueAtTime(0.25,c.currentTime+i*0.06+0.3)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.06+1.8)
      o.connect(g);g.connect(c.destination)
      o.start(c.currentTime+i*0.06);o.stop(c.currentTime+i*0.06+2.0)
    })
  }catch(_){}
}
function playGoldPop() {
  try {
    const c=new AudioContext()
    ;[330,415,523,659].forEach((f,i)=>{
      const o=c.createOscillator();const g=c.createGain()
      o.type='sine';o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.06)
      g.gain.linearRampToValueAtTime(0.20,c.currentTime+i*0.06+0.02)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.06+0.55)
      o.connect(g);g.connect(c.destination)
      o.start(c.currentTime+i*0.06);o.stop(c.currentTime+i*0.06+0.7)
    })
  }catch(_){}
}
function playBuzzer() {
  try {
    const c=new AudioContext()
    const o=c.createOscillator();const g=c.createGain()
    o.type='sawtooth';o.frequency.setValueAtTime(180,c.currentTime);o.frequency.exponentialRampToValueAtTime(80,c.currentTime+0.35)
    g.gain.setValueAtTime(0.4,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.45)
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.5)
  }catch(_){}
}
function playFanfare() {
  try {
    const c=new AudioContext()
    ;[261,330,392,523,659,784,1047].forEach((f,i)=>{
      const o=c.createOscillator();const g=c.createGain()
      o.type='sine';o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.09)
      g.gain.linearRampToValueAtTime(0.18,c.currentTime+i*0.09+0.02)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.09+0.85)
      o.connect(g);g.connect(c.destination)
      o.start(c.currentTime+i*0.09);o.stop(c.currentTime+i*0.09+1.0)
    })
  }catch(_){}
}
function playDing(pitch=1.0) {
  try {
    const c=new AudioContext()
    const o=c.createOscillator();const g=c.createGain()
    o.type='triangle';o.frequency.value=880*pitch
    g.gain.setValueAtTime(0.22,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.5)
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.55)
  }catch(_){}
}
function playSuppressGiggle() {
  try {
    const c=new AudioContext()
    const buf=c.createBuffer(1,Math.floor(c.sampleRate*0.14),c.sampleRate)
    const d=buf.getChannelData(0)
    for(let i=0;i<d.length;i++){const t=i/d.length;d[i]=(Math.random()*2-1)*0.12*Math.sin(t*Math.PI)}
    const src=c.createBufferSource();src.buffer=buf
    const filt=c.createBiquadFilter();filt.type='bandpass';filt.frequency.value=700;filt.Q.value=1.5
    const g=c.createGain();g.gain.setValueAtTime(0.38,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.14)
    src.connect(filt);filt.connect(g);g.connect(c.destination);src.start()
  }catch(_){}
}

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt{x:number;y:number;vx:number;vy:number;r:number;life:number;max:number;hue:number}
function mkBurst(cx:number,cy:number,cnt:number,hue=45):Pt[]{
  return Array.from({length:cnt},()=>{
    const a=Math.random()*Math.PI*2;const s=Math.random()*10+2
    return{x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,r:Math.random()*3+1,life:0,max:Math.random()*70+50,hue}
  })
}

interface Props{onComplete:()=>void;onFail?:(h:string)=>void;showHint?:boolean}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level23({onComplete}:Props){
  const playerName=localStorage.getItem('iq_character')||'Champion'

  // Core
  const [phase,setPhase]           = useState<Phase>('cinematic')
  const [coins,setCoins]           = useState(getCoins)
  const [shakeClass,setShakeClass] = useState('')
  const [affirm,setAffirm]         = useState<string|null>(null)
  const [affKey,setAffKey]         = useState(0)
  const [whiteBurst,setWhiteBurst] = useState(false)

  // Cinematic
  const [cinStep,setCinStep]       = useState(0)

  // Phase 1 — Feast
  const [p1Sub,setP1Sub]           = useState<P1Sub>('feast')
  const [feastCollected,setFeastCollected] = useState(Array(6).fill(false) as boolean[])
  const [feastTimer,setFeastTimer] = useState(20)
  const [feastGraceMsg,setFeastGraceMsg] = useState(false)
  const [feastDone,setFeastDone]   = useState(false)
  const [runBanner,setRunBanner]   = useState(false)
  const [p1Round,setP1Round]       = useState(0)
  const [p1Sel,setP1Sel]           = useState<number|null>(null)
  const [p1Grace,setP1Grace]       = useState(false)

  // Phase 2 — Laugh
  const [p2Sub,setP2Sub]           = useState<P2Sub>('laugh')
  const [laughMeter,setLaughMeter] = useState(0)
  const [laughExploded,setLaughExploded] = useState(false)
  const [godBoomed,setGodBoomed]   = useState(false)
  const [sarahDenied,setSarahDenied] = useState(false)
  const [nothingBanner,setNothingBanner] = useState(false)
  const [p2Round,setP2Round]       = useState(0)
  const [p2Sel,setP2Sel]           = useState<number|null>(null)
  const [p2Grace,setP2Grace]       = useState(false)

  // Phase 3 — Negotiation
  const [p3Sub,setP3Sub]           = useState<P3Sub>('reveal')
  const [godLineStep,setGodLineStep] = useState(0)
  const [scaleTip,setScaleTip]     = useState(0)
  const [p3Round,setP3Round]       = useState(0)
  const [p3Sel,setP3Sel]           = useState<number|null>(null)
  const [p3Grace,setP3Grace]       = useState(false)
  const [cntIdx,setCntIdx]         = useState(0)
  const [boldBanner,setBoldBanner] = useState(false)
  const [p3TFSel,setP3TFSel]       = useState<number|null>(null)
  const [p3TFGrace,setP3TFGrace]   = useState(false)

  // Phase 4 — Dual Revelation
  const [p4Sub,setP4Sub]           = useState<P4Sub>('cards')
  const [goldTapped,setGoldTapped] = useState(false)
  const [redTapped,setRedTapped]   = useState(false)
  const [wrongOrder,setWrongOrder] = useState(false)
  const [bothTapped,setBothTapped] = useState(false)
  const [p4Sel,setP4Sel]           = useState<number|null>(null)
  const [p4Grace,setP4Grace]       = useState(false)

  // Ending
  const [coinCount,setCoinCount]   = useState(0)
  const [starsShown,setStarsShown] = useState(0)
  const [showScripture,setShowScripture] = useState(false)
  const [showAdvance,setShowAdvance]     = useState(false)

  // Refs
  const earnedRef       = useRef(0)
  const affIdxRef       = useRef(0)
  const comboRef        = useRef(0)
  const phaseRef        = useRef<Phase>('cinematic')
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const rafRef          = useRef(0)
  const particlesRef    = useRef<Pt[]>([])
  const feastCollRef    = useRef(Array(6).fill(false) as boolean[])
  const feastGraceRef   = useRef(false)
  const feastTimerRef   = useRef<number|null>(null)
  const laughMeterRef   = useRef(0)
  const laughExplRef    = useRef(false)
  const laughIntRef     = useRef<number|null>(null)
  const cntDoneRef      = useRef(false)

  // Canvas resize
  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return
    const r=()=>{cv.width=window.innerWidth;cv.height=window.innerHeight}
    r();window.addEventListener('resize',r)
    return()=>{window.removeEventListener('resize',r);cancelAnimationFrame(rafRef.current)}
  },[])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const shake=useCallback(()=>{
    setShakeClass('l23-shake');setTimeout(()=>setShakeClass(''),700)
  },[])

  const showAffirm=useCallback((t:string)=>{
    setAffirm(t);setAffKey(k=>k+1);setTimeout(()=>setAffirm(null),2400)
  },[])

  const getAffirm=useCallback(()=>{
    const combo=comboRef.current
    let pool:string[]
    if(combo>=10)     pool=[AFFIRMATIONS[9]]
    else if(combo>=6) pool=AFFIRMATIONS.slice(7,9)
    else if(combo>=3) pool=AFFIRMATIONS.slice(3,7)
    else              pool=AFFIRMATIONS.slice(0,3)
    const t=pool[affIdxRef.current%pool.length]
    affIdxRef.current++;comboRef.current++
    return t
  },[])

  const speak=useCallback((text:string,rate=0.80,pitch=1.0)=>{
    try{
      window.speechSynthesis?.cancel()
      const fixed=text.replace(/\b([A-Z]{2,})\b/g,m=>m.toLowerCase())
      const u=new SpeechSynthesisUtterance(fixed);u.rate=rate;u.pitch=pitch;u.volume=1
      window.speechSynthesis?.speak(u)
    }catch(_){}
  },[])

  const speakAffirm=useCallback((text:string)=>{
    try{
      window.speechSynthesis?.cancel()
      const fixed=text.replace(/\b([A-Z]{2,})\b/g,m=>m.toLowerCase())
      const u=new SpeechSynthesisUtterance(fixed);u.rate=0.90;u.pitch=1.42;u.volume=1
      window.speechSynthesis?.speak(u)
    }catch(_){}
  },[])

  const runParticles=useCallback(()=>{
    const cv=canvasRef.current;if(!cv||rafRef.current!==0)return
    const tick=()=>{
      const ctx=cv.getContext('2d');if(ctx){
        ctx.clearRect(0,0,cv.width,cv.height)
        particlesRef.current=particlesRef.current.filter(p=>p.life<p.max)
        for(const p of particlesRef.current){
          p.x+=p.vx;p.y+=p.vy;p.vx*=0.93;p.vy*=0.93;p.vy+=0.14;p.life++
          const op=Math.pow(1-p.life/p.max,0.55)*0.95
          ctx.beginPath();ctx.arc(p.x,p.y,p.r*4,0,Math.PI*2)
          ctx.fillStyle=`hsla(${p.hue},95%,60%,${op*0.18})`;ctx.fill()
          ctx.beginPath();ctx.arc(p.x,p.y,p.r*1.6,0,Math.PI*2)
          ctx.fillStyle=`hsla(${p.hue},90%,75%,${op*0.70})`;ctx.fill()
          ctx.beginPath();ctx.arc(p.x,p.y,p.r*0.6,0,Math.PI*2)
          ctx.fillStyle=`hsla(${p.hue},70%,97%,${op})`;ctx.fill()
        }
      }
      if(particlesRef.current.length>0)rafRef.current=requestAnimationFrame(tick)
      else rafRef.current=0
    }
    rafRef.current=requestAnimationFrame(tick)
  },[])

  const burst=useCallback((cx:number,cy:number,cnt=80,hue=45)=>{
    particlesRef.current.push(...mkBurst(cx,cy,cnt,hue));runParticles()
  },[runParticles])

  const fireBurstWhite=useCallback(()=>{
    setWhiteBurst(true);setTimeout(()=>setWhiteBurst(false),1400)
    for(let i=0;i<14;i++)
      setTimeout(()=>burst(Math.random()*window.innerWidth,Math.random()*window.innerHeight,80,48+Math.random()*14),i*110)
  },[burst])

  const addEarned=useCallback((n:number)=>{
    addCoins(n);setCoins(getCoins());earnedRef.current+=n
  },[])

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='cinematic')return
    const ts=[
      setTimeout(()=>setCinStep(1),700),
      setTimeout(()=>setCinStep(2),1600),
      setTimeout(()=>setCinStep(3),2700),
      setTimeout(()=>{
        setCinStep(4);playGoldExplosion();shake()
        for(let i=0;i<18;i++)
          setTimeout(()=>burst(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.9,55,45+i*2),i*120)
      },3700),
      setTimeout(()=>setCinStep(5),4500),
      setTimeout(()=>setCinStep(6),5400),
      setTimeout(()=>setCinStep(7),6100),
      setTimeout(()=>{
        phaseRef.current='phase1';setPhase('phase1')
        speak("Abraham didn't just invite them in — he ran! At 99 years old! Now help him prepare the feast before they leave!",0.78,0.94)
      },8200),
    ]
    return()=>ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase])

  // ── PHASE 1 INIT ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='phase1')return
    const empty=Array(6).fill(false) as boolean[]
    setP1Sub('feast');setFeastCollected(empty);feastCollRef.current=[...empty]
    setFeastTimer(20);setFeastGraceMsg(false);feastGraceRef.current=false
    setFeastDone(false);setRunBanner(false)
    setP1Round(0);setP1Sel(null);setP1Grace(false)
  },[phase])

  // Feast countdown timer
  useEffect(()=>{
    if(phase!=='phase1'||p1Sub!=='feast'||feastDone)return
    feastTimerRef.current=window.setInterval(()=>{
      setFeastTimer(t=>{
        if(t<=1){
          if(!feastGraceRef.current){
            feastGraceRef.current=true
            setFeastGraceMsg(true)
            speak("Abraham never gave up! Collect the remaining items!",0.82)
            setTimeout(()=>setFeastGraceMsg(false),3000)
            return 10
          }else{
            if(feastTimerRef.current)clearInterval(feastTimerRef.current)
            return 0
          }
        }
        return t-1
      })
    },1000)
    return()=>{if(feastTimerRef.current)clearInterval(feastTimerRef.current)}
  },[phase,p1Sub,feastDone,speak])

  const tapFeastItem=useCallback((i:number)=>{
    if(feastCollRef.current[i]||feastDone)return
    playWhoosh()
    const W=window.innerWidth;const H=window.innerHeight
    burst(W*FEAST_POS[i].x/100,H*FEAST_POS[i].y/100,26,48)
    addEarned(8)
    const next=[...feastCollRef.current];next[i]=true;feastCollRef.current=next
    setFeastCollected([...next])
    if(next.every(Boolean)){
      if(feastTimerRef.current)clearInterval(feastTimerRef.current)
      setFeastDone(true);addEarned(40);playGoldExplosion();shake()
      for(let j=0;j<12;j++)
        setTimeout(()=>burst(Math.random()*W,Math.random()*H*0.9,42,45),j*100)
      const af=getAffirm();speakAffirm(af);showAffirm(af)
      speak('Feast ready! Abraham set out bread, butter, milk and the tender calf — and served his guests.',0.78,0.92)
      setTimeout(()=>setP1Sub('questions'),4200)
    }
  },[feastDone,addEarned,burst,shake,getAffirm,speakAffirm,showAffirm,speak])

  const handleP1=useCallback((idx:number)=>{
    if(p1Sel!==null||p1Grace)return
    setP1Sel(idx)
    const round=P1_ROUNDS[p1Round]
    if(idx===round.ans){
      addEarned(P1_COINS[p1Round]);playGoldPop();shake()
      const af=getAffirm();speakAffirm(af);showAffirm(af)
      if(p1Round===1){
        setRunBanner(true)
        speak('HE RAN! At 99 years old! That is hospitality!',0.85,1.1)
        setTimeout(()=>setRunBanner(false),2800)
      }
      setTimeout(()=>{
        setP1Sel(null)
        if(p1Round<P1_ROUNDS.length-1){
          setP1Round(r=>r+1)
        }else{
          speak('The visitors asked one question that changed everything. Where is your wife Sarah?',0.74,0.88)
          setTimeout(()=>{phaseRef.current='phase2';setPhase('phase2')},4000)
        }
      },2000)
    }else{
      setP1Grace(true);setP1Sel(null);playBuzzer()
      setTimeout(()=>setP1Grace(false),2800)
    }
  },[p1Sel,p1Grace,p1Round,addEarned,shake,getAffirm,speakAffirm,showAffirm,speak])

  // ── PHASE 2 INIT ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='phase2')return
    setP2Sub('laugh');setLaughMeter(0);laughMeterRef.current=0
    laughExplRef.current=false;setLaughExploded(false)
    setGodBoomed(false);setSarahDenied(false);setNothingBanner(false)
    setP2Round(0);setP2Sel(null);setP2Grace(false)
    speak('The visitors ask about Sarah. They promise a son within one year. Sarah is listening behind the tent door — but she does not know God can see her.',0.72,0.86)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase])

  // Laugh meter — fills automatically, explodes at 8s or when full
  useEffect(()=>{
    if(phase!=='phase2'||p2Sub!=='laugh')return

    const triggerExplosion=()=>{
      if(laughExplRef.current)return
      laughExplRef.current=true
      if(laughIntRef.current)clearInterval(laughIntRef.current)
      setLaughExploded(true);setLaughMeter(100)
      playWahWah();shake()
      playBoomShockwave()
      setGodBoomed(true)
      speak('Why did Sarah laugh?!',0.65,0.78)
      setTimeout(()=>{setGodBoomed(false);setP2Sub('questions')},3600)
    }

    const forceTimer=setTimeout(triggerExplosion,8000)

    laughIntRef.current=window.setInterval(()=>{
      if(laughExplRef.current)return
      laughMeterRef.current=Math.min(laughMeterRef.current+20,100)
      setLaughMeter(laughMeterRef.current)
      if(laughMeterRef.current>=100)triggerExplosion()
    },1000)

    return()=>{
      clearTimeout(forceTimer)
      if(laughIntRef.current)clearInterval(laughIntRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,p2Sub])

  const tapLaughMeter=useCallback(()=>{
    if(laughExplRef.current)return
    playSuppressGiggle()
    laughMeterRef.current=Math.max(0,laughMeterRef.current-15)
    setLaughMeter(laughMeterRef.current)
  },[])

  const handleP2=useCallback((idx:number)=>{
    if(p2Sel!==null||p2Grace)return
    setP2Sel(idx)
    const round=P2_ROUNDS[p2Round]
    if(idx===round.ans){
      addEarned(P2_COINS[p2Round]);playGoldPop();shake()
      const af=getAffirm();speakAffirm(af);showAffirm(af)
      if(p2Round===0){
        setSarahDenied(true)
        speak('She said: I did not laugh! And God said: Yes you did.',0.80,1.0)
        setTimeout(()=>setSarahDenied(false),3200)
      }else if(p2Round===1){
        setNothingBanner(true);playGoldExplosion();shake()
        for(let i=0;i<14;i++)
          setTimeout(()=>burst(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.9,40,50),i*100)
        speak('NOTHING is too hard for GOD! The God of the impossible!',0.80,1.06)
        setTimeout(()=>setNothingBanner(false),3800)
      }
      setTimeout(()=>{
        setP2Sel(null)
        if(p2Round<P2_ROUNDS.length-1){
          setP2Round(r=>r+1)
        }else{
          speak('Two visitors left for Sodom. But God stayed. And Abraham drew near for the boldest conversation in the Bible.',0.72,0.88)
          setTimeout(()=>{phaseRef.current='phase3';setPhase('phase3')},5000)
        }
      },p2Round===1?4000:2200)
    }else{
      setP2Grace(true);setP2Sel(null);playBuzzer()
      setTimeout(()=>setP2Grace(false),2800)
    }
  },[p2Sel,p2Grace,p2Round,addEarned,shake,getAffirm,speakAffirm,showAffirm,speak,burst])

  // ── PHASE 3 INIT ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='phase3')return
    setP3Sub('reveal');setGodLineStep(0);setScaleTip(0)
    setP3Round(0);setP3Sel(null);setP3Grace(false)
    setCntIdx(0);cntDoneRef.current=false
    setBoldBanner(false);setP3TFSel(null);setP3TFGrace(false)
    speak('Two visitors leave toward Sodom. God stays with Abraham. The mood shifts. God reveals His plan — and Abraham steps closer.',0.70,0.84)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase])

  // God's reveal lines appear
  useEffect(()=>{
    if(phase!=='phase3'||p3Sub!=='reveal')return
    const ts=[
      setTimeout(()=>setGodLineStep(1),2200),
      setTimeout(()=>setGodLineStep(2),4400),
      setTimeout(()=>setGodLineStep(3),6600),
      setTimeout(()=>setP3Sub('questions'),9200),
    ]
    return()=>ts.forEach(clearTimeout)
  },[phase,p3Sub])

  const handleP3=useCallback((idx:number)=>{
    if(p3Sel!==null||p3Grace)return
    setP3Sel(idx)
    const round=P3_ROUNDS[p3Round]
    if(idx===round.ans){
      addEarned(P3_COINS[p3Round]);playGoldPop();shake()
      const af=getAffirm();speakAffirm(af);showAffirm(af)
      setScaleTip(s=>s+1)
      setTimeout(()=>{
        setP3Sel(null)
        if(p3Round<P3_ROUNDS.length-1){
          setP3Round(r=>r+1)
        }else{
          speak('Ten righteous people! Abraham negotiated all the way down to TEN! Watch the numbers fall!',0.78,0.96)
          setTimeout(()=>setP3Sub('countdown'),3000)
        }
      },2200)
    }else{
      setP3Grace(true);setP3Sel(null);playBuzzer()
      setTimeout(()=>setP3Grace(false),2800)
    }
  },[p3Sel,p3Grace,p3Round,addEarned,shake,getAffirm,speakAffirm,showAffirm,speak])

  // Countdown 50 → 45 → 40 → 30 → 20 → 10
  useEffect(()=>{
    if(phase!=='phase3'||p3Sub!=='countdown'||cntDoneRef.current)return
    let idx=0;let cancelled=false
    const timers:ReturnType<typeof setTimeout>[]=[]

    const runNext=()=>{
      if(cancelled)return
      if(idx>=COUNTDOWN_NUMS.length){
        cntDoneRef.current=true
        playGoldExplosion();shake()
        for(let i=0;i<12;i++)
          setTimeout(()=>burst(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.8,48,45),i*110)
        setBoldBanner(true)
        const af=getAffirm();speakAffirm(af);showAffirm(af)
        speak('ABRAHAM negotiated down to TEN! Bold faith moves GOD!',0.80,1.05)
        const t=setTimeout(()=>{setBoldBanner(false);setP3Sub('tf')},4600)
        timers.push(t)
        return
      }
      setCntIdx(idx);playImpact();addEarned(5)
      burst(window.innerWidth*0.5,window.innerHeight*0.44,20,45)
      idx++
      const t=setTimeout(runNext,700)
      timers.push(t)
    }
    const t=setTimeout(runNext,900)
    timers.push(t)
    return()=>{cancelled=true;timers.forEach(clearTimeout)}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,p3Sub])

  const handleP3TF=useCallback((idx:number)=>{
    if(p3TFSel!==null||p3TFGrace)return
    setP3TFSel(idx)
    if(idx===1){// FALSE is correct
      addEarned(25);playGoldPop();shake()
      const af=getAffirm();speakAffirm(af);showAffirm(af)
      speak('FALSE! Abraham kept going — all the way to ten! Bold faith moves GOD!',0.78,1.0)
      setTimeout(()=>{phaseRef.current='phase4';setPhase('phase4')},4500)
    }else{
      setP3TFGrace(true);setP3TFSel(null);playBuzzer()
      setTimeout(()=>setP3TFGrace(false),2800)
    }
  },[p3TFSel,p3TFGrace,addEarned,shake,getAffirm,speakAffirm,showAffirm,speak])

  // ── PHASE 4 INIT ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='phase4')return
    setP4Sub('cards');setGoldTapped(false);setRedTapped(false)
    setWrongOrder(false);setBothTapped(false);setP4Sel(null);setP4Grace(false)
    speak('God promises a son. God judges sin. Two revelations. One God. Abraham trusted BOTH. Now it is your turn to see clearly.',0.72,0.88)
  },[phase,speak])

  const tapGoldCard=useCallback(()=>{
    if(goldTapped)return
    setGoldTapped(true);setWrongOrder(false)
    playChime();burst(window.innerWidth*0.28,window.innerHeight*0.50,42,45);addEarned(20)
    if(redTapped){setBothTapped(true);setTimeout(()=>setP4Sub('final'),2000)}
  },[goldTapped,redTapped,addEarned,burst])

  const tapRedCard=useCallback(()=>{
    if(redTapped)return
    if(!goldTapped){
      setWrongOrder(true)
      speak('First, the promise of life!',0.84,1.0)
      setTimeout(()=>setWrongOrder(false),2600)
      return
    }
    setRedTapped(true)
    playOminousRumble();burst(window.innerWidth*0.72,window.innerHeight*0.50,36,0);addEarned(20)
    setBothTapped(true);setTimeout(()=>setP4Sub('final'),2000)
  },[redTapped,goldTapped,addEarned,burst,speak])

  const handleP4=useCallback((idx:number)=>{
    if(p4Sel!==null||p4Grace)return
    setP4Sel(idx)
    if(idx===0){// TRUE is correct
      addEarned(60);playWhiteBurstSound();fireBurstWhite();shake()
      const af=AFFIRMATIONS[9];speakAffirm(af);showAffirm(af)
      speak(`${playerName} — even the angels are impressed! Abraham trusted the God of life and the God of judgment. That is true faith!`,0.74,1.0)
      setTimeout(()=>{phaseRef.current='ending';setPhase('ending')},6000)
    }else{
      setP4Grace(true);setP4Sel(null);playBuzzer()
      setTimeout(()=>setP4Grace(false),2800)
    }
  },[p4Sel,p4Grace,addEarned,fireBurstWhite,shake,speakAffirm,showAffirm,speak,playerName])

  // ── ENDING ────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='ending')return
    playFanfare()
    const total=earnedRef.current;let cur=0
    const step=Math.max(1,Math.ceil(total/60))
    const id=setInterval(()=>{
      cur=Math.min(cur+step,total);setCoinCount(cur)
      if(cur%(Math.ceil(total/6))===0||cur===total)playDing(0.8+(cur/total)*0.5)
      if(cur>=total)clearInterval(id)
    },28)
    const ts=[
      setTimeout(()=>setStarsShown(1),1400),
      setTimeout(()=>setStarsShown(2),2100),
      setTimeout(()=>setStarsShown(3),2800),
      setTimeout(()=>{
        setShowScripture(true)
        speak('"Is anything too hard for the LORD? I will return to you at the appointed time next year, and Sarah will have a son." — Genesis 18 verse 14',0.74,0.88)
      },3600),
      setTimeout(()=>setShowAdvance(true),6500),
    ]
    return()=>{clearInterval(id);ts.forEach(clearTimeout)}
  },[phase,speak])

  // Cleanup
  useEffect(()=>()=>{
    cancelAnimationFrame(rafRef.current)
    window.speechSynthesis?.cancel()
    if(feastTimerRef.current)clearInterval(feastTimerRef.current)
    if(laughIntRef.current)clearInterval(laughIntRef.current)
  },[])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if(phase==='complete'){
    return(
      <CompletionScreen
        verse='Is anything too hard for the LORD? I will return to you at the appointed time next year, and Sarah will have a son.'
        verseRef='Genesis 18:14'
        subtitle={`${playerName} — your hospitality opened heaven's door`}
        voiceLine={`${playerName}. Abraham ran to meet God. He fed strangers. He bargained for a city. He trusted the God of life and judgment both. That is the kind of faith that moves heaven.`}
        onComplete={onComplete}
      />
    )
  }

  const laughPct=Math.min(laughMeter,100)
  const laughDanger=laughPct>65

  return(
    <div className={`l23-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l23-bg${cinStep>=4?' visible':''}`}/>
      {cinStep<4&&<div className="l23-black"/>}
      {cinStep>=4&&<div className="l23-bg-overlay"/>}
      <canvas ref={canvasRef} className="l23-canvas"/>
      {whiteBurst&&<div className="l23-white-burst"/>}

      {/* HUD */}
      {phase!=='cinematic'&&phase!=='complete'&&(
        <div className="l23-coin-hud"><CoinHUD coins={coins}/></div>
      )}
      {phase!=='cinematic'&&phase!=='complete'&&(
        <div className="l23-level-label">1-23 THE VISIT</div>
      )}

      {/* Affirm toast */}
      {affirm&&<div key={affKey} className="l23-affirm">{affirm}</div>}

      {/* Run banner — floats over everything */}
      {runBanner&&(
        <div className="l23-run-banner" aria-live="assertive">
          🏃🏾 HE RAN!! AT 99!! 🏃🏾
        </div>
      )}

      {/* Nothing too hard banner */}
      {nothingBanner&&(
        <div className="l23-nothing-banner">
          ✨ NOTHING IS TOO HARD FOR GOD!! ✨
        </div>
      )}

      {/* ── CINEMATIC ── */}
      {phase==='cinematic'&&(
        <div className="l23-cin">
          <div className="l23-heat-shimmer"/>
          {cinStep>=1&&<div className="l23-cin-line l23-cin-l1">The hottest part of the day.</div>}
          {cinStep>=2&&<div className="l23-cin-silhouette">🧎🏾</div>}
          {cinStep>=3&&<div className="l23-cin-line l23-cin-l2">Three figures on the horizon…</div>}
          {cinStep>=4&&<div className="l23-gold-horizon"/>}
          {cinStep>=4&&<div className="l23-cin-running">🏃🏾 <span className="l23-dust">💨</span></div>}
          {cinStep>=5&&(
            <div className="l23-title-card">
              <span className="l23-title-dove">🕊️</span>
              <span className="l23-title-word">THE VISIT</span>
              <span className="l23-title-dove">🕊️</span>
            </div>
          )}
          {cinStep>=6&&<div className="l23-title-sub">When angels come to dinner.</div>}
          {cinStep>=7&&<div className="l23-cin-line l23-cin-l3">Genesis 18</div>}
        </div>
      )}

      {/* ── PHASE 1: Hospitality Speed Round ── */}
      {phase==='phase1'&&(
        <div className="l23-phase-wrap l23-feast-scene">
          <div className="l23-phase-header">
            <div className="l23-phase-badge">PHASE 1</div>
            <div className="l23-phase-title">HOSPITALITY SPEED ROUND 🍽️</div>
          </div>

          {p1Sub==='feast'&&(
            <>
              <div className="l23-feast-hud">
                <div className={`l23-feast-timer${feastTimer<=5?' urgent':''}`}>⏱️ {feastTimer}s</div>
                <div className="l23-feast-count">
                  {feastCollected.filter(Boolean).length} / 6 items
                </div>
              </div>
              <div className="l23-feast-instruction">
                {feastGraceMsg
                  ? '✨ Abraham never gave up! Collect the remaining items!'
                  : 'HELP ABRAHAM PREPARE THE FEAST! Tap each item! 🍽️'}
              </div>
              <div className="l23-feast-board">
                {FEAST_ICONS.map((icon,i)=>
                  !feastCollected[i]?(
                    <button key={i} className="l23-feast-item"
                      style={{left:`${FEAST_POS[i].x}%`,top:`${FEAST_POS[i].y}%`}}
                      onClick={()=>tapFeastItem(i)}>
                      <span className="l23-fi-icon">{icon}</span>
                      <span className="l23-fi-label">{FEAST_LABELS[i]}</span>
                    </button>
                  ):null
                )}
                <div className="l23-feast-basket">
                  <span className="l23-basket-icon">🧺</span>
                  <span className="l23-basket-items">
                    {feastCollected.map((c,i)=>c?FEAST_ICONS[i]:'').join('')}
                  </span>
                </div>
                {feastDone&&(
                  <div className="l23-feast-complete">🍽️ FEAST READY!! +40 BONUS! 🍽️</div>
                )}
              </div>
            </>
          )}

          {p1Sub==='questions'&&(
            <>
              {runBanner===false&&p1Round===1&&(
                <div className="l23-inline-banner">
                  🏃🏾 HE RAN AT 99!! 🏃🏾
                </div>
              )}
              <div className="l23-q-card">
                <div className="l23-round-label">
                  {P1_ROUNDS[p1Round].type==='yn'?'YES OR NO?':
                   P1_ROUNDS[p1Round].type==='tf'?'TRUE OR FALSE?':'WHICH ONE?'}
                </div>
                <p className="l23-q-text">{P1_ROUNDS[p1Round].q}</p>
                {P1_ROUNDS[p1Round].type==='yn'&&(
                  <div className="l23-yn-row">
                    {P1_ROUNDS[p1Round].opts.map((o,i)=>(
                      <button key={i} disabled={p1Sel!==null||p1Grace}
                        className={`l23-yn-btn${p1Sel===i?(i===P1_ROUNDS[p1Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP1(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P1_ROUNDS[p1Round].type==='tf'&&(
                  <div className="l23-tf-row">
                    {P1_ROUNDS[p1Round].opts.map((o,i)=>(
                      <button key={i} disabled={p1Sel!==null||p1Grace}
                        className={`l23-tf-tablet${p1Sel===i?(i===P1_ROUNDS[p1Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP1(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P1_ROUNDS[p1Round].type==='mc'&&(
                  <div className="l23-mc-opts">
                    {P1_ROUNDS[p1Round].opts.map((o,i)=>(
                      <button key={i} disabled={p1Sel!==null||p1Grace}
                        className={`l23-mc-opt${p1Sel===i?(i===P1_ROUNDS[p1Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP1(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {p1Grace&&<div className="l23-grace">✨ Read the passage carefully — try again!</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PHASE 2: Sarah's Laugh ── */}
      {phase==='phase2'&&(
        <div className="l23-phase-wrap l23-laugh-scene">
          <div className="l23-phase-header">
            <div className="l23-phase-badge">PHASE 2</div>
            <div className="l23-phase-title">SARAH'S LAUGH 😂</div>
          </div>

          {p2Sub==='laugh'&&(
            <div className="l23-laugh-split">
              {/* Visitors side */}
              <div className="l23-laugh-left">
                <div className="l23-visitor-icons">👼 👼 👼</div>
                <div className="l23-visitor-speech">
                  <div className="l23-vs-line">"Where is Sarah?"</div>
                  <div className="l23-vs-line l23-vs2">"She will have a son."</div>
                  <div className="l23-vs-line l23-vs3">"This time next year."</div>
                </div>
                <div className="l23-abraham-stand">🧔🏾‍♂️</div>
              </div>
              {/* Sarah side */}
              <div className="l23-laugh-right">
                <div className="l23-tent-label">⛺ BEHIND THE TENT</div>
                <div className={`l23-sarah-sil${laughExploded?' exploded':''}`}>
                  {laughExploded?'😂':'🫢'}
                  {laughExploded&&<div className="l23-ha-burst">HA!</div>}
                </div>
                {!laughExploded&&(
                  <div className="l23-laugh-meter-wrap">
                    <div className="l23-lm-label">😂 SUPPRESS THE LAUGH!</div>
                    <div className="l23-lm-track">
                      <div className={`l23-lm-fill${laughDanger?' danger':''}`}
                        style={{width:`${laughPct}%`}}/>
                    </div>
                    <div className="l23-lm-pct">{Math.round(laughPct)}%</div>
                    <button className="l23-suppress-btn" onClick={tapLaughMeter}>
                      🤐 SUPPRESS!
                    </button>
                  </div>
                )}
                {godBoomed&&(
                  <div className="l23-god-boom">"WHY DID SARAH LAUGH?!"</div>
                )}
              </div>
            </div>
          )}

          {p2Sub==='questions'&&(
            <>
              {sarahDenied&&(
                <div className="l23-sarah-denied-wrap">
                  <div className="l23-sd-sarah">"I DID NOT LAUGH."</div>
                  <div className="l23-sd-god">"YES YOU DID." 😂</div>
                </div>
              )}
              <div className="l23-q-card">
                <div className="l23-round-label">
                  {P2_ROUNDS[p2Round].type==='yn'?'YES OR NO?':
                   P2_ROUNDS[p2Round].type==='tf'?'TRUE OR FALSE?':'WHICH ONE?'}
                </div>
                <p className="l23-q-text">{P2_ROUNDS[p2Round].q}</p>
                {P2_ROUNDS[p2Round].type==='yn'&&(
                  <div className="l23-yn-row">
                    {P2_ROUNDS[p2Round].opts.map((o,i)=>(
                      <button key={i} disabled={p2Sel!==null||p2Grace}
                        className={`l23-yn-btn${p2Sel===i?(i===P2_ROUNDS[p2Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP2(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P2_ROUNDS[p2Round].type==='tf'&&(
                  <div className="l23-tf-row">
                    {P2_ROUNDS[p2Round].opts.map((o,i)=>(
                      <button key={i} disabled={p2Sel!==null||p2Grace}
                        className={`l23-tf-tablet${p2Sel===i?(i===P2_ROUNDS[p2Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP2(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P2_ROUNDS[p2Round].type==='mc'&&(
                  <div className="l23-mc-opts">
                    {P2_ROUNDS[p2Round].opts.map((o,i)=>(
                      <button key={i} disabled={p2Sel!==null||p2Grace}
                        className={`l23-mc-opt${p2Sel===i?(i===P2_ROUNDS[p2Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP2(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {p2Grace&&<div className="l23-grace">✨ Think about what the Bible says — try again!</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PHASE 3: The Bold Negotiation ── */}
      {phase==='phase3'&&(
        <div className="l23-phase-wrap l23-nego-scene">
          <div className="l23-phase-header">
            <div className="l23-phase-badge">PHASE 3</div>
            <div className="l23-phase-title">THE BOLD NEGOTIATION ⚖️</div>
          </div>

          {p3Sub==='reveal'&&(
            <div className="l23-god-reveal">
              <div className="l23-sodom-icon">🌋</div>
              {GOD_LINES.slice(0,godLineStep).map((line,i)=>(
                <div key={i} className="l23-god-line">{line}</div>
              ))}
              {godLineStep>=2&&(
                <div className="l23-abr-approach">🧔🏾‍♂️ ➜ ☁️</div>
              )}
            </div>
          )}

          {p3Sub==='questions'&&(
            <>
              <div className="l23-scale-wrap">
                <div className={`l23-scale-arm${scaleTip>0?` tipped-${Math.min(scaleTip,3)}`:''}`}>
                  <div className="l23-scale-pan l23-pan-dark">🌋<br/>SODOM</div>
                  <div className="l23-scale-pivot">⚖️</div>
                  <div className={`l23-scale-pan l23-pan-gold${scaleTip>0?' lit':''}`}>✦<br/>RIGHTEOUS</div>
                </div>
                <div className="l23-nego-num">{COUNTDOWN_NUMS[Math.min(p3Round,2)]}…</div>
              </div>
              <div className="l23-q-card">
                <div className="l23-round-label">
                  {P3_ROUNDS[p3Round].type==='yn'?'YES OR NO?':'WHICH ONE?'}
                </div>
                <p className="l23-q-text">{P3_ROUNDS[p3Round].q}</p>
                {P3_ROUNDS[p3Round].type==='yn'&&(
                  <div className="l23-yn-row">
                    {P3_ROUNDS[p3Round].opts.map((o,i)=>(
                      <button key={i} disabled={p3Sel!==null||p3Grace}
                        className={`l23-yn-btn${p3Sel===i?(i===P3_ROUNDS[p3Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP3(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P3_ROUNDS[p3Round].type==='mc'&&(
                  <div className="l23-mc-opts">
                    {P3_ROUNDS[p3Round].opts.map((o,i)=>(
                      <button key={i} disabled={p3Sel!==null||p3Grace}
                        className={`l23-mc-opt${p3Sel===i?(i===P3_ROUNDS[p3Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP3(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {p3Grace&&<div className="l23-grace">✨ Think about Abraham's bold prayer — try again!</div>}
              </div>
            </>
          )}

          {p3Sub==='countdown'&&(
            <div className="l23-countdown-wrap">
              {boldBanner&&<div className="l23-bold-banner">⚡ ABRAHAM NEGOTIATED DOWN TO 10!! ⚡</div>}
              <div className="l23-cnt-display">
                <div key={cntIdx} className="l23-cnt-num">{COUNTDOWN_NUMS[cntIdx]}</div>
                <div className="l23-cnt-label">RIGHTEOUS PEOPLE</div>
              </div>
              <div className="l23-cnt-dots">
                {COUNTDOWN_NUMS.map((n,i)=>(
                  <div key={i} className={`l23-cnt-dot${i<=cntIdx?' done':''}`}>{n}</div>
                ))}
              </div>
            </div>
          )}

          {p3Sub==='tf'&&(
            <>
              {boldBanner&&<div className="l23-bold-banner">⚡ BOLD FAITH MOVES GOD!! ⚡</div>}
              <div className="l23-q-card l23-final-q">
                <div className="l23-round-label">⚡ BOLD QUESTION — TRUE OR FALSE? ⚡</div>
                <p className="l23-q-text">
                  Abraham was afraid to keep asking God so he stopped negotiating at 50.
                </p>
                <div className="l23-tf-row">
                  {['TRUE','FALSE'].map((o,i)=>(
                    <button key={i} disabled={p3TFSel!==null||p3TFGrace}
                      className={`l23-tf-tablet l23-tf-stone${p3TFSel===i?(i===1?' correct':' wrong'):''}`}
                      onClick={()=>handleP3TF(i)}>{o}</button>
                  ))}
                </div>
                {p3TFGrace&&<div className="l23-grace">✨ How many times did Abraham ask? — try again!</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PHASE 4: Nothing Is Too Hard ── */}
      {phase==='phase4'&&(
        <div className="l23-phase-wrap l23-reveal-scene">
          <div className="l23-phase-header">
            <div className="l23-phase-badge">PHASE 4</div>
            <div className="l23-phase-title">NOTHING IS TOO HARD 👶🔥</div>
          </div>

          {p4Sub==='cards'&&(
            <div className="l23-dual-wrap">
              <div className={`l23-card-instruction${wrongOrder?' warn':''}`}>
                {wrongOrder?'💛 FIRST, TAP THE PROMISE OF LIFE!':'TAP BOTH CARDS — GOLD CARD FIRST!'}
              </div>
              <div className="l23-dual-row">
                <button
                  className={`l23-rev-card l23-card-gold${goldTapped?' tapped':''}`}
                  onClick={tapGoldCard}
                  disabled={goldTapped}>
                  <div className="l23-rc-icon">👶</div>
                  <div className="l23-rc-title">THE PROMISE</div>
                  <div className="l23-rc-text">Sarah will have a son — next year.</div>
                  {goldTapped&&<div className="l23-rc-check">✦</div>}
                </button>
                <button
                  className={`l23-rev-card l23-card-red${redTapped?' tapped':''}`}
                  onClick={tapRedCard}
                  disabled={redTapped}>
                  <div className="l23-rc-icon">🔥</div>
                  <div className="l23-rc-title">THE JUDGMENT</div>
                  <div className="l23-rc-text">Sodom's judgment is coming.</div>
                  {redTapped&&<div className="l23-rc-check">✦</div>}
                </button>
              </div>
              {bothTapped&&(
                <div className="l23-both-banner">✦ ONE GOD — LIFE AND JUDGMENT BOTH ✦</div>
              )}
            </div>
          )}

          {p4Sub==='final'&&(
            <div className="l23-q-card l23-final-boss">
              <div className="l23-round-label">⚡ LEGENDARY — TRUE OR FALSE? ⚡</div>
              <p className="l23-q-text">
                The same God who promises LIFE also judges SIN — and Abraham trusted BOTH.
              </p>
              <div className="l23-tf-row">
                {['TRUE','FALSE'].map((o,i)=>(
                  <button key={i} disabled={p4Sel!==null||p4Grace}
                    className={`l23-tf-tablet l23-tf-stone${p4Sel===i?(i===0?' correct':' wrong'):''}`}
                    onClick={()=>handleP4(i)}>{o}</button>
                ))}
              </div>
              {p4Grace&&<div className="l23-grace">✨ Think about who God is — try again!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase==='ending'&&(
        <div className="l23-ending-wrap">
          <div className="l23-ending-wings">🕊️ 🕊️ 🕊️</div>
          <div className="l23-ending-name">{playerName}</div>
          <div className="l23-ending-sub">YOUR HOSPITALITY OPENED HEAVEN'S DOOR!</div>
          <div className="l23-stars-row">
            {starsShown>=1&&<div className="l23-end-star l23-st1">⭐</div>}
            {starsShown>=2&&<div className="l23-end-star l23-st2">⭐</div>}
            {starsShown>=3&&<div className="l23-end-star l23-st3">⭐</div>}
          </div>
          <div className="l23-coin-tally">
            <span className="l23-coin-icon">🪙</span>
            <span className="l23-coin-num">{coinCount}</span>
            <span className="l23-coin-label">COINS EARNED</span>
          </div>
          {showScripture&&(
            <div className="l23-scripture-card">
              <div className="l23-scripture-dove">🕊️</div>
              <div className="l23-scripture-quote">
                "Is anything too hard for the LORD? I will return to you at the appointed time next year, and Sarah will have a son."
              </div>
              <div className="l23-scripture-ref">— Genesis 18:14</div>
            </div>
          )}
          {showAdvance&&(
            <button className="l23-advance-btn" onClick={()=>{
              phaseRef.current='complete';setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-24 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
