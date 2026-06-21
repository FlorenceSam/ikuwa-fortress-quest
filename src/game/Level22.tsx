import { useCallback, useEffect, useRef, useState } from 'react'
import CompletionScreen from './CompletionScreen'
import CoinHUD from './CoinHUD'
import { addCoins, getCoins } from './coins'
import './level22.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'cinematic'|'phase1'|'phase2'|'phase3'|'phase4'|'ending'|'complete'
type P1Sub = 'declaration'|'questions'
type P2Sub = 'abram'|'abraham'|'sarai'|'sarah'|'tf'
type P3Sub = 'scroll'|'seal'|'questions'
type P4Sub = 'promise'|'calculator'|'questions'
type RoundT = 'yn'|'tf'|'mc'
interface Round { type:RoundT; q:string; opts:string[]; ans:number }

// ── Data ──────────────────────────────────────────────────────────────────────
const P1_ROUNDS: Round[] = [
  { type:'yn', q:'Was Abram 99 years old when God appeared to him?',                          opts:['YES','NO'], ans:0 },
  { type:'tf', q:'God said He would make Abram the father of ONE nation.',                    opts:['TRUE','FALSE'], ans:1 },
  { type:'mc', q:"What was Abram's reaction when God spoke to him?",                          opts:['He fell facedown before God','He ran away in fear','He argued with God','He called his servants'], ans:0 },
  { type:'yn', q:'Did God promise to make Abraham extremely fruitful with kings coming from him?', opts:['YES','NO'], ans:0 },
]
const P1_COINS = [15, 20, 20, 20]

const ABRAM   = ['A','B','R','A','M']
const ABRAHAM = ['A','B','R','A','H','A','M']
const SARAI   = ['S','A','R','A','I']
const SARAH   = ['S','A','R','A','H']

const P3_ROUNDS: Round[] = [
  { type:'mc', q:"What was the sign of God's covenant with Abraham?",    opts:['Circumcision','A rainbow','An altar of fire','A golden ring'], ans:0 },
  { type:'yn', q:'Did God say the covenant would last forever?',         opts:['YES','NO'], ans:0 },
]

const P4_ROUNDS: Round[] = [
  { type:'yn', q:'Did Abraham laugh when God said Sarah would have a baby?', opts:['YES','NO'], ans:0 },
  { type:'mc', q:"What would the son's name be?",                            opts:['Isaac','Ishmael','Jacob','Joseph'], ans:0 },
  { type:'tf', q:'Nothing is too hard for God — even a 90 year old woman having a baby.', opts:['TRUE','FALSE'], ans:0 },
]
const P4_COINS = [20, 20, 60]

const AFFIRMATIONS = [
  'OUT OF THE PARK!',
  "AND THAT'S THE TRUTH!",
  'BOOM! SHALOM!',
  'HALLELUJAH... AND WOW!',
  'THE HOLY SPIRIT WAS COOKING!',
  'GAME CHANGER!',
  'VICTORY IS YOURS!',
  'POWER MOVE!',
  'SHOUT GLORY!',
  'HEAVEN IS CELEBRATING YOU!',
]

const SCROLL_LINES = [
  '"This is my covenant with you."',
  '"Every male shall be circumcised."',
  '"It will be the sign of the covenant."',
  '"Between me and you."',
]

const PROMISE_LINES = [
  'Your wife Sarah...',
  'Will bear you a son.',
  'You will call him ISAAC.',
  'I will establish my covenant with him.',
  'This time NEXT YEAR.',
]

// ── Audio ─────────────────────────────────────────────────────────────────────
function playDeepHorn() {
  try {
    const c = new AudioContext()
    ;[55,110,165].forEach((f,i) => {
      const o=c.createOscillator(); const g=c.createGain()
      o.type='sine'; o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.08)
      g.gain.linearRampToValueAtTime(0.30,c.currentTime+i*0.08+0.6)
      g.gain.linearRampToValueAtTime(0.22,c.currentTime+i*0.08+2.0)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.08+3.5)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime+i*0.08); o.stop(c.currentTime+i*0.08+4)
    })
  } catch(_){}
}
function playSoftWind() {
  try {
    const c=new AudioContext()
    const buf=c.createBuffer(1,Math.floor(c.sampleRate*2.5),c.sampleRate)
    const d=buf.getChannelData(0)
    for(let i=0;i<d.length;i++){const t=i/d.length;d[i]=(Math.random()*2-1)*0.18*t*(1-t)*4}
    const src=c.createBufferSource();src.buffer=buf
    const filt=c.createBiquadFilter();filt.type='lowpass';filt.frequency.value=600
    const g=c.createGain();g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(0.4,c.currentTime+1);g.gain.linearRampToValueAtTime(0,c.currentTime+2.5)
    src.connect(filt);filt.connect(g);g.connect(c.destination);src.start()
  } catch(_){}
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
  } catch(_){}
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
  } catch(_){}
}
function playBoomSlam() {
  try {
    const c=new AudioContext()
    const o=c.createOscillator();const g=c.createGain()
    o.type='sine';o.frequency.setValueAtTime(160,c.currentTime);o.frequency.exponentialRampToValueAtTime(40,c.currentTime+0.18)
    g.gain.setValueAtTime(0.7,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.40)
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.5)
    const o2=c.createOscillator();const g2=c.createGain()
    o2.type='triangle';o2.frequency.value=440
    g2.gain.setValueAtTime(0.28,c.currentTime);g2.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.22)
    o2.connect(g2);g2.connect(c.destination);o2.start();o2.stop(c.currentTime+0.3)
  } catch(_){}
}
function playStoneShatter() {
  try {
    const c=new AudioContext()
    const buf=c.createBuffer(1,Math.floor(c.sampleRate*0.4),c.sampleRate)
    const d=buf.getChannelData(0)
    for(let i=0;i<d.length;i++){const t=i/d.length;d[i]=(Math.random()*2-1)*Math.pow(1-t,1.5)*0.8}
    const src=c.createBufferSource();src.buffer=buf
    const filt=c.createBiquadFilter();filt.type='bandpass';filt.frequency.value=800;filt.Q.value=0.5
    const g=c.createGain();g.gain.value=0.85
    src.connect(filt);filt.connect(g);g.connect(c.destination);src.start()
  } catch(_){}
}
function playSealChime() {
  try {
    const c=new AudioContext()
    const freqs=[523,659,784,1047]
    const f=freqs[Math.floor(Math.random()*freqs.length)]
    const o=c.createOscillator();const g=c.createGain()
    o.type='sine';o.frequency.value=f
    g.gain.setValueAtTime(0.20,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.7)
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.8)
  } catch(_){}
}
function playHolyChime() {
  try {
    const c=new AudioContext()
    ;[261.6,329.6,392.0,523.3,659.3,784.0].forEach((f,i)=>{
      const o=c.createOscillator();const g=c.createGain()
      o.type='sine';o.frequency.value=f
      g.gain.setValueAtTime(0,c.currentTime+i*0.22)
      g.gain.linearRampToValueAtTime(0.10,c.currentTime+i*0.22+0.5)
      g.gain.linearRampToValueAtTime(0.10,c.currentTime+4.5)
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+6.5)
      o.connect(g);g.connect(c.destination)
      o.start(c.currentTime+i*0.22);o.stop(c.currentTime+7)
    })
  } catch(_){}
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
  } catch(_){}
}
function playBuzzer() {
  try {
    const c=new AudioContext()
    const o=c.createOscillator();const g=c.createGain()
    o.type='sawtooth';o.frequency.setValueAtTime(180,c.currentTime);o.frequency.exponentialRampToValueAtTime(80,c.currentTime+0.35)
    g.gain.setValueAtTime(0.4,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.45)
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.5)
  } catch(_){}
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
  } catch(_){}
}
function playDing(pitch=1.0) {
  try {
    const c=new AudioContext()
    const o=c.createOscillator();const g=c.createGain()
    o.type='triangle';o.frequency.value=880*pitch
    g.gain.setValueAtTime(0.22,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.5)
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.55)
  } catch(_){}
}

// ── Particles ─────────────────────────────────────────────────────────────────
interface Pt{x:number;y:number;vx:number;vy:number;r:number;life:number;max:number;hue:number}
function mkBurst(cx:number,cy:number,cnt:number,hue=45):Pt[]{
  return Array.from({length:cnt},()=>{
    const a=Math.random()*Math.PI*2;const s=Math.random()*10+2
    return{x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,r:Math.random()*3+1,life:0,max:Math.random()*70+50,hue}
  })
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props{onComplete:()=>void;onFail?:(h:string)=>void;showHint?:boolean}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Level22({onComplete}:Props){
  const playerName=localStorage.getItem('iq_character')||'Scholar'

  // Core
  const [phase,setPhase]           = useState<Phase>('cinematic')
  const [coins,setCoins]           = useState(getCoins)
  const [shakeClass,setShakeClass] = useState('')
  const [affirm,setAffirm]         = useState<string|null>(null)
  const [affKey,setAffKey]         = useState(0)
  const [whiteBurst,setWhiteBurst] = useState(false)

  // Cinematic
  const [cinStep,setCinStep]       = useState(0)

  // Phase 1
  const [p1Sub,setP1Sub]           = useState<P1Sub>('declaration')
  const [declStep,setDeclStep]     = useState(0)
  const [p1Round,setP1Round]       = useState(0)
  const [p1Sel,setP1Sel]           = useState<number|null>(null)
  const [p1Grace,setP1Grace]       = useState(false)
  const [manyBanner,setManyBanner] = useState(false)
  const [crownRain,setCrownRain]   = useState(false)

  // Phase 2
  const [p2Sub,setP2Sub]               = useState<P2Sub>('abram')
  const [abramSh,setAbramSh]           = useState([false,false,false,false,false])
  const [abrahamStep,setAbrahamStep]   = useState(0)
  const [saraiSh,setSaraiSh]           = useState([false,false,false,false,false])
  const [sarahStep,setSarahStep]       = useState(0)
  const [p2TFSel,setP2TFSel]           = useState<number|null>(null)
  const [p2TFGrace,setP2TFGrace]       = useState(false)
  const [abrahamBanner,setAbrahamBanner] = useState(false)
  const [sarahBanner,setSarahBanner]   = useState(false)

  // Phase 3
  const [p3Sub,setP3Sub]       = useState<P3Sub>('scroll')
  const [scrollStep,setScrollStep] = useState(0)
  const [sealLit,setSealLit]   = useState(Array(7).fill(false) as boolean[])
  const [sealDone,setSealDone] = useState(false)
  const [eternBanner,setEternBanner] = useState(false)
  const [p3Round,setP3Round]   = useState(0)
  const [p3Sel,setP3Sel]       = useState<number|null>(null)
  const [p3Grace,setP3Grace]   = useState(false)

  // Phase 4
  const [p4Sub,setP4Sub]         = useState<P4Sub>('promise')
  const [promiseStep,setPromiseStep] = useState(0)
  const [wheel1,setWheel1]       = useState(47)
  const [wheel2,setWheel2]       = useState(32)
  const [w1Locked,setW1Locked]   = useState(false)
  const [w2Locked,setW2Locked]   = useState(false)
  const [p4Round,setP4Round]     = useState(0)
  const [p4Sel,setP4Sel]         = useState<number|null>(null)
  const [p4Grace,setP4Grace]     = useState(false)
  const [abrahamLaugh,setAbrahamLaugh] = useState(false)

  // Ending
  const [coinCount,setCoinCount]     = useState(0)
  const [starsShown,setStarsShown]   = useState(0)
  const [showScripture,setShowScripture] = useState(false)
  const [showAdvance,setShowAdvance] = useState(false)

  // Refs
  const earnedRef    = useRef(0)
  const affIdxRef    = useRef(0)
  const phaseRef     = useRef<Phase>('cinematic')
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef(0)
  const particlesRef = useRef<Pt[]>([])
  const sealDoneRef  = useRef(false)
  const calcRef      = useRef<number|null>(null)

  // Canvas resize
  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return
    const r=()=>{cv.width=window.innerWidth;cv.height=window.innerHeight}
    r();window.addEventListener('resize',r)
    return()=>{window.removeEventListener('resize',r);cancelAnimationFrame(rafRef.current)}
  },[])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const shake=useCallback(()=>{
    setShakeClass('l22-shake');setTimeout(()=>setShakeClass(''),700)
  },[])

  const showAffirm=useCallback((t:string)=>{
    setAffirm(t);setAffKey(k=>k+1);setTimeout(()=>setAffirm(null),2400)
  },[])

  const nextAffirm=useCallback(()=>{
    const t=AFFIRMATIONS[affIdxRef.current%AFFIRMATIONS.length]
    affIdxRef.current++;return t
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
      setTimeout(()=>{setCinStep(1);playDeepHorn()},600),
      setTimeout(()=>setCinStep(2),2200),
      setTimeout(()=>setCinStep(3),3600),
      setTimeout(()=>setCinStep(4),4800),
      setTimeout(()=>{
        setCinStep(5);playGoldExplosion();shake()
        for(let i=0;i<22;i++)
          setTimeout(()=>burst(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.9,60,45+i*2),i*100)
      },5800),
      setTimeout(()=>setCinStep(6),6800),
      setTimeout(()=>setCinStep(7),7800),
      setTimeout(()=>{
        phaseRef.current='phase1';setPhase('phase1')
        speak('Abram was 99 years old. Twenty-four years had passed. Then God appeared — and everything changed.',0.74,0.88)
      },10000),
    ]
    return()=>ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase])

  // ── PHASE 1: Declaration ──────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='phase1')return
    setP1Sub('declaration');setDeclStep(0);setP1Round(0);setP1Sel(null);setP1Grace(false)
    playSoftWind()
  },[phase])

  useEffect(()=>{
    if(phase!=='phase1'||p1Sub!=='declaration')return
    const ts=[
      setTimeout(()=>{setDeclStep(1);speak('I am God Almighty.',0.60,0.80)},1000),
      setTimeout(()=>{setDeclStep(2);speak('Walk before me.',0.60,0.80)},3200),
      setTimeout(()=>{setDeclStep(3);speak('And be blameless.',0.60,0.80)},5200),
      setTimeout(()=>setP1Sub('questions'),8000),
    ]
    return()=>ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,p1Sub])

  const handleP1=useCallback((idx:number)=>{
    if(p1Sel!==null||p1Grace)return
    setP1Sel(idx)
    const round=P1_ROUNDS[p1Round]
    if(idx===round.ans){
      addEarned(P1_COINS[p1Round]);playGoldPop();shake()
      const af=nextAffirm();speakAffirm(af);showAffirm(af)
      if(p1Round===1){
        setManyBanner(true)
        speak('MANY nations! Father of MANY nations — not just one!',0.80,1.0)
        setTimeout(()=>setManyBanner(false),2500)
      } else if(p1Round===3){
        setCrownRain(true)
        speak('Yes! Kings would come from Abraham. A royal destiny!',0.80,1.0)
        setTimeout(()=>setCrownRain(false),2800)
      }
      setTimeout(()=>{
        setP1Sel(null)
        if(p1Round<P1_ROUNDS.length-1){
          setP1Round(r=>r+1)
        } else {
          speak('Now watch — God is about to do something DRAMATIC. He changes Abram\'s very name.',0.76,0.90)
          setTimeout(()=>{phaseRef.current='phase2';setPhase('phase2')},4000)
        }
      },2000)
    } else {
      setP1Grace(true);setP1Sel(null);playBuzzer()
      setTimeout(()=>setP1Grace(false),2800)
    }
  },[p1Sel,p1Grace,p1Round,addEarned,shake,nextAffirm,speakAffirm,showAffirm,speak])

  // ── PHASE 2: Name Change ──────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='phase2')return
    setP2Sub('abram');setAbramSh([false,false,false,false,false]);setAbrahamStep(0)
    setSaraiSh([false,false,false,false,false]);setSarahStep(0)
    setP2TFSel(null);setP2TFGrace(false)
    setAbrahamBanner(false);setSarahBanner(false)
    speak('No longer will you be called Abram. TAP each grey letter to SHATTER the old name!',0.76,0.92)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase])

  // All ABRAM letters shattered → trigger ABRAHAM reveal
  useEffect(()=>{
    if(p2Sub!=='abram')return
    if(!abramSh.some(Boolean)||!abramSh.every(Boolean))return
    const t=setTimeout(()=>setP2Sub('abraham'),700)
    return()=>clearTimeout(t)
  },[abramSh,p2Sub])

  useEffect(()=>{
    if(phase!=='phase2'||p2Sub!=='abraham')return
    setAbrahamStep(0)
    playGoldExplosion();shake();addEarned(50)
    const af=nextAffirm();speakAffirm(af);showAffirm(af)
    setAbrahamBanner(true);setTimeout(()=>setAbrahamBanner(false),3500)
    speak('YOUR NAME IS NOW ABRAHAM! Father of MANY nations!',0.72,1.0)
    const ts:ReturnType<typeof setTimeout>[]=[]
    for(let i=0;i<ABRAHAM.length;i++){
      ts.push(setTimeout(()=>{
        setAbrahamStep(i+1);playBoomSlam()
        burst(window.innerWidth*0.65,window.innerHeight*0.45,28,45)
      },600+i*340))
    }
    ts.push(setTimeout(()=>{
      setSaraiSh([false,false,false,false,false]);setSarahStep(0)
      setP2Sub('sarai')
      speak('And now — Sarai. TAP each letter to shatter her old name!',0.80)
    },600+ABRAHAM.length*340+2800))
    return()=>ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,p2Sub])

  // All SARAI letters shattered → trigger SARAH reveal
  useEffect(()=>{
    if(p2Sub!=='sarai')return
    if(!saraiSh.some(Boolean)||!saraiSh.every(Boolean))return
    const t=setTimeout(()=>setP2Sub('sarah'),700)
    return()=>clearTimeout(t)
  },[saraiSh,p2Sub])

  useEffect(()=>{
    if(phase!=='phase2'||p2Sub!=='sarah')return
    setSarahStep(0)
    playGoldExplosion();shake();addEarned(30)
    const af=nextAffirm();speakAffirm(af);showAffirm(af)
    setSarahBanner(true);setTimeout(()=>setSarahBanner(false),3000)
    speak('AND HER NAME IS SARAH! A princess — mother of nations!',0.72,1.0)
    const ts:ReturnType<typeof setTimeout>[]=[]
    for(let i=0;i<SARAH.length;i++){
      ts.push(setTimeout(()=>{
        setSarahStep(i+1);playBoomSlam()
        burst(window.innerWidth*0.65,window.innerHeight*0.55,22,45)
      },600+i*320))
    }
    ts.push(setTimeout(()=>{
      setP2TFSel(null);setP2TFGrace(false)
      setP2Sub('tf')
      speak('True or false — the name Abraham means father of many nations?',0.80)
    },600+SARAH.length*320+2800))
    return()=>ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,p2Sub])

  const tapAbramLetter=useCallback((i:number)=>{
    if(abramSh[i])return
    playStoneShatter()
    burst(window.innerWidth*0.35,window.innerHeight*0.45,20,30)
    setAbramSh(prev=>{const n=[...prev];n[i]=true;return n})
  },[abramSh,burst])

  const tapSaraiLetter=useCallback((i:number)=>{
    if(saraiSh[i])return
    playStoneShatter()
    burst(window.innerWidth*0.35,window.innerHeight*0.55,20,30)
    setSaraiSh(prev=>{const n=[...prev];n[i]=true;return n})
  },[saraiSh,burst])

  const handleP2TF=useCallback((idx:number)=>{
    if(p2TFSel!==null||p2TFGrace)return
    setP2TFSel(idx)
    if(idx===0){// TRUE is correct
      addEarned(20);playGoldPop();shake()
      const af=nextAffirm();speakAffirm(af);showAffirm(af)
      speak('TRUE! Abraham — father of a multitude of nations. His very name was a prophecy!',0.78)
      setTimeout(()=>{phaseRef.current='phase3';setPhase('phase3')},3500)
    } else {
      setP2TFGrace(true);setP2TFSel(null);playBuzzer()
      setTimeout(()=>setP2TFGrace(false),2800)
    }
  },[p2TFSel,p2TFGrace,addEarned,shake,nextAffirm,speakAffirm,showAffirm,speak])

  // ── PHASE 3: Covenant Sign ────────────────────────────────────────────────
  useEffect(()=>{
    if(phase!=='phase3')return
    setP3Sub('scroll');setScrollStep(0);setSealLit(Array(7).fill(false))
    setSealDone(false);sealDoneRef.current=false
    setP3Round(0);setP3Sel(null);setP3Grace(false);setEternBanner(false)
    playHolyChime()
    speak('God then established the covenant sign. Watch as His words burn onto the scroll.',0.70,0.88)
  },[phase,speak])

  useEffect(()=>{
    if(phase!=='phase3'||p3Sub!=='scroll')return
    const ts=[
      setTimeout(()=>setScrollStep(1),1800),
      setTimeout(()=>setScrollStep(2),3400),
      setTimeout(()=>setScrollStep(3),5200),
      setTimeout(()=>setScrollStep(4),7000),
      setTimeout(()=>{
        setP3Sub('seal')
        speak('Now seal the covenant! Tap each segment of the covenant seal to light it up.',0.78)
      },9500),
    ]
    return()=>ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,p3Sub])

  const tapSeal=useCallback((i:number)=>{
    if(sealLit[i]||sealDoneRef.current)return
    playSealChime()
    addEarned(10)
    burst(window.innerWidth*0.5,window.innerHeight*0.48,22,45)
    setSealLit(prev=>{const n=[...prev];n[i]=true;return n})
  },[sealLit,addEarned,burst])

  // All 7 segments lit → seal complete
  useEffect(()=>{
    if(p3Sub!=='seal'||sealDoneRef.current)return
    if(!sealLit.every(Boolean))return
    sealDoneRef.current=true;setSealDone(true)
    playGoldExplosion();shake();addEarned(30)
    for(let i=0;i<10;i++)
      setTimeout(()=>burst(Math.random()*window.innerWidth,Math.random()*window.innerHeight*0.9,40,45),i*120)
    speak('The covenant seal is COMPLETE! God\'s promise — sealed forever!',0.76,1.0)
    setTimeout(()=>{
      setP3Round(0);setP3Sel(null);setP3Grace(false);setP3Sub('questions')
    },3500)
  },[sealLit,p3Sub,addEarned,shake,burst,speak])

  const handleP3=useCallback((idx:number)=>{
    if(p3Sel!==null||p3Grace)return
    setP3Sel(idx)
    const round=P3_ROUNDS[p3Round]
    if(idx===round.ans){
      addEarned(20);playGoldPop();shake()
      const af=nextAffirm();speakAffirm(af);showAffirm(af)
      if(p3Round===1){
        setEternBanner(true)
        speak('An EVERLASTING covenant! It lasts forever and ever!',0.80,1.0)
        setTimeout(()=>setEternBanner(false),2500)
      }
      setTimeout(()=>{
        setP3Sel(null)
        if(p3Round<P3_ROUNDS.length-1){
          setP3Round(r=>r+1)
        } else {
          speak('Now — God saves the most IMPOSSIBLE promise for last. Come and see.',0.74,0.88)
          setTimeout(()=>{phaseRef.current='phase4';setPhase('phase4')},4000)
        }
      },2200)
    } else {
      setP3Grace(true);setP3Sel(null);playBuzzer()
      setTimeout(()=>setP3Grace(false),2800)
    }
  },[p3Sel,p3Grace,p3Round,addEarned,shake,nextAffirm,speakAffirm,showAffirm,speak])

  // ── PHASE 4: The Impossible Promise ──────────────────────────────────────
  useEffect(()=>{
    if(phase!=='phase4')return
    setP4Sub('promise');setPromiseStep(0);setWheel1(47);setWheel2(32)
    setW1Locked(false);setW2Locked(false)
    setP4Round(0);setP4Sel(null);setP4Grace(false);setAbrahamLaugh(false)
    speak('And then God said something that made Abraham fall facedown laughing.',0.70,0.86)
  },[phase,speak])

  useEffect(()=>{
    if(phase!=='phase4'||p4Sub!=='promise')return
    const ts=[
      setTimeout(()=>setPromiseStep(1),1800),
      setTimeout(()=>setPromiseStep(2),3600),
      setTimeout(()=>{setPromiseStep(3);speak('You will call him Isaac.',0.64,0.84)},5200),
      setTimeout(()=>setPromiseStep(4),6800),
      setTimeout(()=>{setPromiseStep(5);speak('This time NEXT YEAR.',0.60,0.90)},8000),
      setTimeout(()=>setP4Sub('calculator'),10500),
    ]
    return()=>ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,p4Sub])

  // Faith Calculator — spinning wheels
  useEffect(()=>{
    if(phase!=='phase4'||p4Sub!=='calculator')return
    speak('Abraham — 99 years old! Sarah — 90 years old! And God says: this time NEXT YEAR!',0.78,0.92)
    setW1Locked(false);setW2Locked(false)
    calcRef.current=window.setInterval(()=>{
      setWheel1(Math.floor(Math.random()*100))
      setWheel2(Math.floor(Math.random()*100))
    },80)
    const t1=setTimeout(()=>{setWheel1(99);setW1Locked(true);playBoomSlam()},2600)
    const t2=setTimeout(()=>{
      setWheel2(90);setW2Locked(true);playBoomSlam()
      if(calcRef.current)clearInterval(calcRef.current)
    },4000)
    const t3=setTimeout(()=>{
      setP4Round(0);setP4Sel(null);setP4Grace(false);setP4Sub('questions')
    },6000)
    return()=>{
      if(calcRef.current)clearInterval(calcRef.current)
      clearTimeout(t1);clearTimeout(t2);clearTimeout(t3)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase,p4Sub])

  const handleP4=useCallback((idx:number)=>{
    if(p4Sel!==null||p4Grace)return
    setP4Sel(idx)
    const round=P4_ROUNDS[p4Round]
    if(idx===round.ans){
      const isLast=p4Round===P4_ROUNDS.length-1
      if(isLast){
        addEarned(P4_COINS[p4Round]);playWhiteBurstSound();fireBurstWhite();shake()
        const af=nextAffirm();speakAffirm(af);showAffirm(af)
        speak(`${playerName} — HEAVEN IS CELEBRATING YOU! Nothing is too hard for GOD!`,0.74,1.0)
        setTimeout(()=>{phaseRef.current='ending';setPhase('ending')},5500)
      } else {
        addEarned(P4_COINS[p4Round]);playGoldPop();shake()
        const af=nextAffirm();speakAffirm(af);showAffirm(af)
        if(p4Round===0){
          setAbrahamLaugh(true)
          speak('YES! Abraham laughed — tears of shock and joy! Even HE couldn\'t believe it!',0.78,1.0)
          setTimeout(()=>setAbrahamLaugh(false),2800)
        }
        setTimeout(()=>{setP4Sel(null);setP4Round(r=>r+1)},2200)
      }
    } else {
      setP4Grace(true);setP4Sel(null);playBuzzer()
      setTimeout(()=>setP4Grace(false),2800)
    }
  },[p4Sel,p4Grace,p4Round,addEarned,shake,fireBurstWhite,nextAffirm,speakAffirm,showAffirm,speak,playerName])

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
        speak('"No longer will you be called Abram — your name will be Abraham." — Genesis 17 verse 5',0.74,0.88)
      },3600),
      setTimeout(()=>setShowAdvance(true),6500),
    ]
    return()=>{clearInterval(id);ts.forEach(clearTimeout)}
  },[phase,speak])

  // Cleanup
  useEffect(()=>()=>{
    cancelAnimationFrame(rafRef.current)
    window.speechSynthesis?.cancel()
    if(calcRef.current)clearInterval(calcRef.current)
  },[])

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if(phase==='complete'){
    return(
      <CompletionScreen
        verse='No longer will you be called Abram; your name will be Abraham.'
        verseRef='Genesis 17:5'
        subtitle={`${playerName} — God knows your new name too`}
        voiceLine={`${playerName}. God changes your name before He changes your situation. Your identity shift comes before your miracle. Abraham believed it — and so can you.`}
        onComplete={onComplete}
      />
    )
  }

  // Seal segment positions (7 around a circle)
  const SEAL_R=82
  const sealPos=Array.from({length:7},(_,i)=>{
    const a=i*(360/7)*Math.PI/180
    return{x:Math.round(Math.sin(a)*SEAL_R),y:Math.round(-Math.cos(a)*SEAL_R)}
  })

  return(
    <div className={`l22-wrap ${shakeClass}`}>

      {/* Background */}
      <div className={`l22-bg${cinStep>=5?' visible':''}`}/>
      {cinStep<5&&<div className="l22-black"/>}
      {cinStep>=5&&<div className="l22-bg-overlay"/>}
      <canvas ref={canvasRef} className="l22-canvas"/>
      {whiteBurst&&<div className="l22-white-burst"/>}

      {/* HUD */}
      {phase!=='cinematic'&&phase!=='complete'&&(
        <div className="l22-coin-hud"><CoinHUD coins={coins}/></div>
      )}
      {phase!=='cinematic'&&phase!=='complete'&&(
        <div className="l22-level-label">1-22 THE NAME CHANGE</div>
      )}

      {/* Affirm toast */}
      {affirm&&<div key={affKey} className="l22-affirm">{affirm}</div>}

      {/* Crown rain */}
      {crownRain&&(
        <div className="l22-crown-rain" aria-hidden>
          {Array.from({length:9},(_,i)=>(
            <div key={i} className="l22-crown-drop"
              style={{left:`${5+i*11}%`,animationDelay:`${i*0.11}s`}}>👑</div>
          ))}
        </div>
      )}

      {/* ── CINEMATIC ── */}
      {phase==='cinematic'&&(
        <div className="l22-cin">
          {cinStep>=1&&<div className="l22-cin-99">99...</div>}
          {cinStep>=2&&<div className="l22-cin-line l22-cin-l1">Abram had been waiting.</div>}
          {cinStep>=3&&<div className="l22-cin-line l22-cin-l2">24 years.</div>}
          {cinStep>=4&&<div className="l22-cin-line l22-cin-l3">Then God showed up.</div>}
          {cinStep>=5&&<div className="l22-cross-burst"/>}
          {cinStep>=5&&<div className="l22-abram-silhouette">🧎🏾</div>}
          {cinStep>=6&&(
            <div className="l22-title-card">
              <span className="l22-title-crown">👑</span>
              <span className="l22-title-word">THE NAME CHANGE</span>
              <span className="l22-title-crown">👑</span>
            </div>
          )}
          {cinStep>=7&&<div className="l22-title-sub">Your new name. Your new destiny.</div>}
        </div>
      )}

      {/* ── PHASE 1: Walk Before Me ── */}
      {phase==='phase1'&&(
        <div className="l22-phase-wrap">
          <div className="l22-phase-header">
            <div className="l22-phase-badge">PHASE 1</div>
            <div className="l22-phase-title">WALK BEFORE ME</div>
          </div>

          {p1Sub==='declaration'&&(
            <div className="l22-decl-wrap">
              <div className="l22-god-icon">✨</div>
              {declStep>=1&&<div className="l22-decl-line l22-dl1">"I AM GOD ALMIGHTY."</div>}
              {declStep>=2&&<div className="l22-decl-line l22-dl2">"WALK BEFORE ME."</div>}
              {declStep>=3&&<div className="l22-decl-line l22-dl3">"AND BE BLAMELESS."</div>}
              {declStep>=1&&<div className="l22-decl-pulse"/>}
            </div>
          )}

          {p1Sub==='questions'&&(
            <>
              {manyBanner&&(
                <div className="l22-many-banner">🌍 MANY NATIONS!! 🌍</div>
              )}
              <div className="l22-q-card">
                <div className="l22-round-label">
                  {P1_ROUNDS[p1Round].type==='yn'?'YES OR NO?':P1_ROUNDS[p1Round].type==='tf'?'TRUE OR FALSE?':'WHICH ONE?'}
                </div>
                <p className="l22-q-text">{P1_ROUNDS[p1Round].q}</p>

                {P1_ROUNDS[p1Round].type==='yn'&&(
                  <div className="l22-yn-row">
                    {P1_ROUNDS[p1Round].opts.map((o,i)=>(
                      <button key={i} disabled={p1Sel!==null||p1Grace}
                        className={`l22-yn-btn${p1Sel===i?(i===P1_ROUNDS[p1Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP1(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P1_ROUNDS[p1Round].type==='tf'&&(
                  <div className="l22-tf-row">
                    {P1_ROUNDS[p1Round].opts.map((o,i)=>(
                      <button key={i} disabled={p1Sel!==null||p1Grace}
                        className={`l22-tf-tablet${p1Sel===i?(i===P1_ROUNDS[p1Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP1(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P1_ROUNDS[p1Round].type==='mc'&&(
                  <div className="l22-mc-opts">
                    {P1_ROUNDS[p1Round].opts.map((o,i)=>(
                      <button key={i} disabled={p1Sel!==null||p1Grace}
                        className={`l22-mc-opt${p1Sel===i?(i===P1_ROUNDS[p1Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP1(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {p1Grace&&<div className="l22-grace">✨ Read the text carefully — try again!</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PHASE 2: Name Change ── */}
      {phase==='phase2'&&(
        <div className="l22-phase-wrap l22-name-scene">
          <div className="l22-phase-header">
            <div className="l22-phase-badge">PHASE 2</div>
            <div className="l22-phase-title">THE NAME CHANGE EXPLOSION</div>
          </div>

          {/* ABRAM shatter */}
          {(p2Sub==='abram'||p2Sub==='abraham')&&(
            <div className="l22-name-row">
              <div className="l22-name-label">OLD NAME</div>
              <div className="l22-letters-old">
                {ABRAM.map((letter,i)=>(
                  <button key={i}
                    className={`l22-stone-letter${abramSh[i]?' shattered':''}`}
                    onClick={()=>tapAbramLetter(i)}
                    disabled={abramSh[i]||p2Sub!=='abram'}>
                    {letter}
                  </button>
                ))}
              </div>

              {p2Sub==='abraham'&&abrahamStep>0&&(
                <>
                  <div className="l22-name-label l22-nl-gold">NEW NAME</div>
                  <div className="l22-letters-new">
                    {ABRAHAM.slice(0,abrahamStep).map((letter,i)=>(
                      <div key={i} className="l22-gold-letter l22-gl-in">{letter}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {abrahamBanner&&(
            <div className="l22-name-banner l22-nb-gold">
              ✨ YOUR NAME IS NOW ABRAHAM! ✨
            </div>
          )}

          {/* SARAI shatter */}
          {(p2Sub==='sarai'||p2Sub==='sarah')&&(
            <div className="l22-name-row l22-name-row2">
              <div className="l22-name-label">OLD NAME</div>
              <div className="l22-letters-old">
                {SARAI.map((letter,i)=>(
                  <button key={i}
                    className={`l22-stone-letter${saraiSh[i]?' shattered':''}`}
                    onClick={()=>tapSaraiLetter(i)}
                    disabled={saraiSh[i]||p2Sub!=='sarai'}>
                    {letter}
                  </button>
                ))}
              </div>

              {p2Sub==='sarah'&&sarahStep>0&&(
                <>
                  <div className="l22-name-label l22-nl-gold">NEW NAME</div>
                  <div className="l22-letters-new">
                    {SARAH.slice(0,sarahStep).map((letter,i)=>(
                      <div key={i} className="l22-gold-letter l22-gl-in">{letter}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {sarahBanner&&(
            <div className="l22-name-banner l22-nb-sarah">
              ✨ AND HER NAME IS SARAH! ✨
            </div>
          )}

          {/* TRUE/FALSE question */}
          {p2Sub==='tf'&&(
            <div className="l22-q-card">
              <div className="l22-round-label">TRUE OR FALSE?</div>
              <p className="l22-q-text">The name Abraham means father of many nations.</p>
              <div className="l22-tf-row">
                {['TRUE','FALSE'].map((o,i)=>(
                  <button key={i} disabled={p2TFSel!==null||p2TFGrace}
                    className={`l22-tf-tablet${p2TFSel===i?(i===0?' correct':' wrong'):''}`}
                    onClick={()=>handleP2TF(i)}>{o}</button>
                ))}
              </div>
              {p2TFGrace&&<div className="l22-grace">✨ Think about what Abraham's name MEANS — try again!</div>}
            </div>
          )}

          {(p2Sub==='abram')&&(
            <div className="l22-shatter-hint">TAP each grey letter to SHATTER it! 👇</div>
          )}
          {(p2Sub==='sarai')&&(
            <div className="l22-shatter-hint">TAP each grey letter to SHATTER it! 👇</div>
          )}
        </div>
      )}

      {/* ── PHASE 3: Covenant Sign ── */}
      {phase==='phase3'&&(
        <div className="l22-phase-wrap l22-covenant-scene">
          <div className="l22-phase-header">
            <div className="l22-phase-badge">PHASE 3</div>
            <div className="l22-phase-title">THE COVENANT SIGN</div>
          </div>

          {p3Sub==='scroll'&&(
            <div className="l22-scroll-wrap">
              <div className="l22-scroll-top"/>
              <div className="l22-scroll-body">
                {SCROLL_LINES.slice(0,scrollStep).map((line,i)=>(
                  <div key={i} className="l22-scroll-line">{line}</div>
                ))}
              </div>
              <div className="l22-scroll-bottom"/>
            </div>
          )}

          {p3Sub==='seal'&&(
            <div className="l22-seal-wrap">
              <div className="l22-seal-label">TAP EACH SEGMENT TO SEAL THE COVENANT</div>
              <div className="l22-seal-circle">
                <div className="l22-seal-center">✝</div>
                {sealPos.map((pos,i)=>(
                  <button key={i}
                    className={`l22-seal-seg${sealLit[i]?' lit':''}`}
                    style={{transform:`translate(calc(${pos.x}px - 50%), calc(${pos.y}px - 50%))`}}
                    onClick={()=>tapSeal(i)}
                    disabled={sealLit[i]}>
                    {sealLit[i]?'✦':'◇'}
                  </button>
                ))}
                {sealDone&&<div className="l22-seal-complete-ring"/>}
              </div>
              <div className="l22-seal-progress">
                {sealLit.filter(Boolean).length} / 7 segments sealed
              </div>
            </div>
          )}

          {p3Sub==='questions'&&(
            <>
              {eternBanner&&(
                <div className="l22-etern-banner">⚡ AN EVERLASTING COVENANT! ⚡</div>
              )}
              <div className="l22-q-card">
                <div className="l22-round-label">
                  {P3_ROUNDS[p3Round].type==='mc'?'WHICH ONE?':'YES OR NO?'}
                </div>
                <p className="l22-q-text">{P3_ROUNDS[p3Round].q}</p>
                {P3_ROUNDS[p3Round].type==='mc'&&(
                  <div className="l22-mc-opts">
                    {P3_ROUNDS[p3Round].opts.map((o,i)=>(
                      <button key={i} disabled={p3Sel!==null||p3Grace}
                        className={`l22-mc-opt${p3Sel===i?(i===P3_ROUNDS[p3Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP3(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P3_ROUNDS[p3Round].type==='yn'&&(
                  <div className="l22-yn-row">
                    {P3_ROUNDS[p3Round].opts.map((o,i)=>(
                      <button key={i} disabled={p3Sel!==null||p3Grace}
                        className={`l22-yn-btn${p3Sel===i?(i===P3_ROUNDS[p3Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP3(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {p3Grace&&<div className="l22-grace">✨ Think about what God established — try again!</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PHASE 4: The Impossible Promise ── */}
      {phase==='phase4'&&(
        <div className="l22-phase-wrap l22-promise-scene">
          <div className="l22-phase-header">
            <div className="l22-phase-badge">PHASE 4</div>
            <div className="l22-phase-title">THE IMPOSSIBLE PROMISE</div>
          </div>

          {p4Sub==='promise'&&(
            <div className="l22-promise-wrap">
              <div className="l22-abram-kneel">🧎🏾</div>
              {PROMISE_LINES.slice(0,promiseStep).map((line,i)=>(
                <div key={i} className="l22-promise-line">{line}</div>
              ))}
            </div>
          )}

          {p4Sub==='calculator'&&(
            <div className="l22-calc-wrap">
              <div className="l22-calc-label">THE FAITH CALCULATOR 🎰</div>
              <div className="l22-calc-wheels">
                <div className="l22-wheel-group">
                  <div className={`l22-wheel${w1Locked?' locked':''}`}>
                    <div className="l22-wheel-val">{String(wheel1).padStart(2,'0')}</div>
                  </div>
                  <div className="l22-wheel-lbl">ABRAHAM'S AGE</div>
                </div>
                <div className="l22-wheel-sep">+</div>
                <div className="l22-wheel-group">
                  <div className={`l22-wheel${w2Locked?' locked':''}`}>
                    <div className="l22-wheel-val">{String(wheel2).padStart(2,'0')}</div>
                  </div>
                  <div className="l22-wheel-lbl">SARAH'S AGE</div>
                </div>
              </div>
              {w1Locked&&w2Locked&&(
                <div className="l22-calc-result">= ONE MIRACLE BABY 👶</div>
              )}
            </div>
          )}

          {p4Sub==='questions'&&(
            <>
              {abrahamLaugh&&(
                <div className="l22-laugh-banner">😂 EVEN ABRAHAM COULDN'T BELIEVE IT! 😂</div>
              )}
              <div className={`l22-q-card${p4Round===P4_ROUNDS.length-1?' l22-final-boss':''}`}>
                <div className="l22-round-label">
                  {p4Round===P4_ROUNDS.length-1?'⚡ LEGENDARY QUESTION — TRUE OR FALSE? ⚡':
                   P4_ROUNDS[p4Round].type==='yn'?'YES OR NO?':P4_ROUNDS[p4Round].type==='tf'?'TRUE OR FALSE?':'WHICH ONE?'}
                </div>
                <p className="l22-q-text">{P4_ROUNDS[p4Round].q}</p>

                {P4_ROUNDS[p4Round].type==='yn'&&(
                  <div className="l22-yn-row">
                    {P4_ROUNDS[p4Round].opts.map((o,i)=>(
                      <button key={i} disabled={p4Sel!==null||p4Grace}
                        className={`l22-yn-btn${p4Sel===i?(i===P4_ROUNDS[p4Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP4(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P4_ROUNDS[p4Round].type==='mc'&&(
                  <div className="l22-mc-opts">
                    {P4_ROUNDS[p4Round].opts.map((o,i)=>(
                      <button key={i} disabled={p4Sel!==null||p4Grace}
                        className={`l22-mc-opt${p4Sel===i?(i===P4_ROUNDS[p4Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP4(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {P4_ROUNDS[p4Round].type==='tf'&&(
                  <div className="l22-tf-row">
                    {P4_ROUNDS[p4Round].opts.map((o,i)=>(
                      <button key={i} disabled={p4Sel!==null||p4Grace}
                        className={`l22-tf-tablet l22-tf-stone${p4Sel===i?(i===P4_ROUNDS[p4Round].ans?' correct':' wrong'):''}`}
                        onClick={()=>handleP4(i)}>{o}</button>
                    ))}
                  </div>
                )}
                {p4Grace&&<div className="l22-grace">✨ With God, nothing is impossible — try again!</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ENDING ── */}
      {phase==='ending'&&(
        <div className="l22-ending-wrap">
          <div className="l22-ending-crowns">👑👑👑</div>
          <div className="l22-ending-name">{playerName}</div>
          <div className="l22-ending-sub">GOD KNOWS YOUR NEW NAME TOO!</div>
          <div className="l22-stars-row">
            {starsShown>=1&&<div className="l22-end-star l22-st1">⭐</div>}
            {starsShown>=2&&<div className="l22-end-star l22-st2">⭐</div>}
            {starsShown>=3&&<div className="l22-end-star l22-st3">⭐</div>}
          </div>
          <div className="l22-coin-tally">
            <span className="l22-coin-icon">🪙</span>
            <span className="l22-coin-num">{coinCount}</span>
            <span className="l22-coin-label">COINS EARNED</span>
          </div>
          {showScripture&&(
            <div className="l22-scripture-card">
              <div className="l22-scripture-crown">👑</div>
              <div className="l22-scripture-quote">
                "No longer will you be called Abram; your name will be Abraham."
              </div>
              <div className="l22-scripture-ref">— Genesis 17:5</div>
            </div>
          )}
          {showAdvance&&(
            <button className="l22-advance-btn" onClick={()=>{
              phaseRef.current='complete';setPhase('complete')
            }}>
              ADVANCE TO LEVEL 1-23 ➡️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
