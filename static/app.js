(()=>{
"use strict";

// Step 1.41: explicitly install/update the current service worker.
// Older NanaChat builds sometimes left a previously-registered worker in control.
async function ensureCurrentServiceWorker(){
  if(!("serviceWorker" in navigator))return;
  try{
    const reg=await navigator.serviceWorker.register("./sw.js?v=11.5.8",{scope:"./",updateViaCache:"none"});
    await reg.update();
  }catch(err){console.warn("NanaChat SW update failed",err);}
}
ensureCurrentServiceWorker();

// NanaChat Step 1.58: scared eyes-only emotional state + fear/threat routing + 1s end hold.
// The entire app canvas follows the actual visual viewport while the keyboard
// is open. This prevents iOS from creating a tall scrollable page or pushing
// controls beyond the visible app boundary.
function isStandalone(){return window.matchMedia?.("(display-mode: standalone)")?.matches||window.navigator.standalone===true;}
let fullAppViewportH=0;
function inputHasFocus(){
  const a=document.activeElement;
  return !!a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.isContentEditable);
}
function syncInstalledViewport(){
  try{
    const vv=window.visualViewport;
    const visibleH=Math.max(320,Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||0));
    const visibleTop=Math.max(0,Math.round(vv?.offsetTop||0));
    const layoutH=Math.max(320,Math.round(window.innerHeight||0),Math.round(document.documentElement.clientHeight||0));
    const focused=inputHasFocus();
    const keyboardLikely=focused&&fullAppViewportH>0&&visibleH<fullAppViewportH-90;
    if(!keyboardLikely)fullAppViewportH=Math.max(fullAppViewportH,visibleH,layoutH);
    const appH=keyboardLikely?visibleH:Math.max(320,fullAppViewportH||layoutH||visibleH);
    const appTop=keyboardLikely?visibleTop:0;
    document.documentElement.style.setProperty("--app-h",`${appH}px`);
    document.documentElement.style.setProperty("--viewport-top",`${appTop}px`);
    document.documentElement.classList.toggle("keyboard-open",keyboardLikely);
    document.documentElement.classList.toggle("screen-short",appH<780);
    if(keyboardLikely){
      window.scrollTo(0,0);
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
    }
  }catch{}
}
function syncConversationStackHeight(){
  try{
    const stack=document.querySelector(".conversation-stack");
    if(!stack)return;
    const h=Math.ceil(stack.getBoundingClientRect().height);
    if(h>0)document.documentElement.style.setProperty("--stack-measured",`${h}px`);
  }catch{}
}
try{
  if(isStandalone()||Math.min(window.innerWidth||9999,document.documentElement.clientWidth||9999)<=600)document.documentElement.classList.add("app-layout");
  syncInstalledViewport();
  window.addEventListener("resize",()=>{syncInstalledViewport();syncConversationStackHeight();},{passive:true});
  window.visualViewport?.addEventListener("resize",()=>requestAnimationFrame(()=>{syncInstalledViewport();syncConversationStackHeight();}),{passive:true});
  window.visualViewport?.addEventListener("scroll",()=>requestAnimationFrame(syncInstalledViewport),{passive:true});
  document.addEventListener("focusin",()=>requestAnimationFrame(()=>{syncInstalledViewport();syncConversationStackHeight();}));
  document.addEventListener("focusout",()=>setTimeout(()=>{syncInstalledViewport();syncConversationStackHeight();},120));
}catch{}

try{
  const __measureStack=()=>{syncInstalledViewport();syncConversationStackHeight();};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{__measureStack();requestAnimationFrame(__measureStack);setTimeout(__measureStack,250);},{once:true});
  else{__measureStack();requestAnimationFrame(__measureStack);setTimeout(__measureStack,250);}
  if("ResizeObserver" in window){
    const ro=new ResizeObserver(syncConversationStackHeight);
    const attach=()=>{const st=document.querySelector(".conversation-stack");if(st)ro.observe(st);};
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",attach,{once:true});else attach();
  }
}catch{}
// ============================================================
// NANAKO v11 STEP 1.4 — AUDIO-CLOCK-SYNCED THIN RENDERER
//
// IMPORTANT:
// Python on Alibaba decides blink timing, mouth timing, emotion,
// idle/talking state and breathing values.
// This browser code ONLY displays the animation protocol it receives.
// STEP 1.7 ALIGNMENT RULE: no JS per-emotion/per-layer x/y/scale/rotate controls.
// Eye/mouth placement must come entirely from the prepared PNG artwork/CSS authored by Leo.
// Character-art URLs are versioned only to defeat stale phone/browser image cache.
// ============================================================
const ANIMATION_ASSETS = {
  neutral: {
    base: "./static/characters/nanako/states/neutral/base.png?v=step1_7_manual_alignment_lock",
    eyes: {
      open: "./static/characters/nanako/states/neutral/eyes/open.png?v=step1_7_manual_alignment_lock",
      half: "./static/characters/nanako/states/neutral/eyes/half.png?v=step1_7_manual_alignment_lock",
      closed: "./static/characters/nanako/states/neutral/eyes/closed.png?v=step1_7_manual_alignment_lock"
    },
    mouth: {
      closed: "./static/characters/nanako/states/neutral/mouth/closed.png?v=step1_7_manual_alignment_lock",
      small: "./static/characters/nanako/states/neutral/mouth/small.png?v=step1_7_manual_alignment_lock",
      medium: "./static/characters/nanako/states/neutral/mouth/medium.png?v=step1_7_manual_alignment_lock",
      wide: "./static/characters/nanako/states/neutral/mouth/wide.png?v=step1_7_manual_alignment_lock",
      round: "./static/characters/nanako/states/neutral/mouth/round.png?v=step1_7_manual_alignment_lock"
    }
  },
  disgust: {
    base: "./static/characters/nanako/states/disgust/base.png?v=step1_57_disgust_round",
    eyes: {
      open: "./static/characters/nanako/states/disgust/eyes/open.png?v=step1_57_disgust_round",
      half: "./static/characters/nanako/states/disgust/eyes/half.png?v=step1_57_disgust_round",
      closed: "./static/characters/nanako/states/disgust/eyes/closed.png?v=step1_57_disgust_round"
    },
    mouth: {
      closed: "./static/characters/nanako/states/disgust/mouth/closed.png?v=step1_57_disgust_round",
      small: "./static/characters/nanako/states/disgust/mouth/half.png?v=step1_57_disgust_round",
      medium: "./static/characters/nanako/states/disgust/mouth/half.png?v=step1_57_disgust_round",
      half: "./static/characters/nanako/states/disgust/mouth/half.png?v=step1_57_disgust_round",
      wide: "./static/characters/nanako/states/disgust/mouth/full.png?v=step1_57_disgust_round",
      round: "./static/characters/nanako/states/disgust/mouth/round.png?v=step1_57_disgust_round",
      full: "./static/characters/nanako/states/disgust/mouth/full.png?v=step1_57_disgust_round"
    }
  },
  sad: {
    base: "./static/characters/nanako/states/sad/base.png?v=step1_57_sad",
    eyes: {
      open: "./static/characters/nanako/states/sad/eyes/open.png?v=step1_57_sad",
      half: "./static/characters/nanako/states/sad/eyes/half.png?v=step1_57_sad",
      closed: "./static/characters/nanako/states/sad/eyes/closed.png?v=step1_57_sad"
    },
    mouth: {
      closed: "./static/characters/nanako/states/sad/mouth/close.png?v=step1_57_sad",
      close: "./static/characters/nanako/states/sad/mouth/close.png?v=step1_57_sad",
      small: "./static/characters/nanako/states/sad/mouth/half.png?v=step1_57_sad",
      half: "./static/characters/nanako/states/sad/mouth/half.png?v=step1_57_sad",
      medium: "./static/characters/nanako/states/sad/mouth/half.png?v=step1_57_sad",
      wide: "./static/characters/nanako/states/sad/mouth/open.png?v=step1_57_sad",
      open: "./static/characters/nanako/states/sad/mouth/open.png?v=step1_57_sad",
      round: "./static/characters/nanako/states/sad/mouth/round.png?v=step1_57_sad"
    }
  },
  scared: {
    base: "./static/characters/nanako/states/scared/base.png?v=step1_58_scared",
    eyes: {
      open: "./static/characters/nanako/states/scared/eyes/open.png?v=step1_58_scared",
      half: "./static/characters/nanako/states/scared/eyes/half.png?v=step1_58_scared",
      closed: "./static/characters/nanako/states/scared/eyes/close.png?v=step1_58_scared"
    },
    mouth: {
      closed: "./static/characters/nanako/states/scared/mouth/none.png?v=step1_58_scared",
      none: "./static/characters/nanako/states/scared/mouth/none.png?v=step1_58_scared",
      small: "./static/characters/nanako/states/scared/mouth/none.png?v=step1_58_scared",
      medium: "./static/characters/nanako/states/scared/mouth/none.png?v=step1_58_scared",
      wide: "./static/characters/nanako/states/scared/mouth/none.png?v=step1_58_scared",
      round: "./static/characters/nanako/states/scared/mouth/none.png?v=step1_58_scared"
    }
  },
  angry: {
    base: "./static/characters/nanako/states/angry/base.png?v=step1_48_angry",
    eyes: {
      open: "./static/characters/nanako/states/angry/eyes/open.png?v=step1_48_angry",
      half: "./static/characters/nanako/states/angry/eyes/half.png?v=step1_48_angry",
      closed: "./static/characters/nanako/states/angry/eyes/closed.png?v=step1_48_angry"
    },
    mouth: {
      closed: "./static/characters/nanako/states/angry/mouth/closed.png?v=step1_48_angry",
      small: "./static/characters/nanako/states/angry/mouth/medium.png?v=step1_51_angry_no_teeth_during_speech",
      medium: "./static/characters/nanako/states/angry/mouth/medium.png?v=step1_51_angry_no_teeth_during_speech",
      wide: "./static/characters/nanako/states/angry/mouth/wide.png?v=step1_51_angry_no_teeth_during_speech",
      round: "./static/characters/nanako/states/angry/mouth/wide.png?v=step1_51_angry_no_teeth_during_speech",
      teeth: "./static/characters/nanako/states/angry/mouth/teeth.png?v=step1_51_angry_end_only"
    }
  },
  cheeky: {
    base: "./static/characters/nanako/states/cheeky/base.png?v=step1_47_cheeky",
    eyes: {
      open: "./static/characters/nanako/states/cheeky/eyes/full.png?v=step1_47_cheeky",
      half: "./static/characters/nanako/states/cheeky/eyes/half.png?v=step1_47_cheeky",
      closed: "./static/characters/nanako/states/cheeky/eyes/closed.png?v=step1_47_cheeky",
      wink: "./static/characters/nanako/states/cheeky/eyes/half_closed.png?v=step1_47_cheeky"
    },
    mouth: {
      closed: "./static/characters/nanako/states/cheeky/mouth/closed.png?v=step1_47_cheeky",
      small: "./static/characters/nanako/states/cheeky/mouth/small.png?v=step1_47_cheeky",
      medium: "./static/characters/nanako/states/cheeky/mouth/medium.png?v=step1_47_cheeky",
      wide: "./static/characters/nanako/states/cheeky/mouth/wide.png?v=step1_47_cheeky",
      round: "./static/characters/nanako/states/cheeky/mouth/round.png?v=step1_47_cheeky"
    }
  },
  confused: {
    base: "./static/characters/nanako/states/confused/base.png?v=step1_7_manual_alignment_lock",
    eyes: {
      open: "./static/characters/nanako/states/confused/eyes/open.png?v=step1_7_manual_alignment_lock",
      half: "./static/characters/nanako/states/confused/eyes/half.png?v=step1_7_manual_alignment_lock",
      closed: "./static/characters/nanako/states/confused/eyes/closed.png?v=step1_7_manual_alignment_lock"
    },
    mouth: {
      closed: "./static/characters/nanako/states/confused/mouth/closed.png?v=step1_7_manual_alignment_lock",
      small: "./static/characters/nanako/states/confused/mouth/small.png?v=step1_7_manual_alignment_lock",
      medium: "./static/characters/nanako/states/confused/mouth/medium.png?v=step1_7_manual_alignment_lock",
      wide: "./static/characters/nanako/states/confused/mouth/wide.png?v=step1_7_manual_alignment_lock",
      round: "./static/characters/nanako/states/confused/mouth/round.png?v=step1_7_manual_alignment_lock"
    }
  },
  laughing: {
    base: "./static/characters/nanako/states/laughing/base.png?v=step1_44_laugh5mouth",
    eyes: {
      open: "./static/characters/nanako/states/laughing/base_head.png?v=step1_44_laugh5mouth",
      half: "./static/characters/nanako/states/laughing/base_head.png?v=step1_44_laugh5mouth",
      closed: "./static/characters/nanako/states/laughing/base_head.png?v=step1_44_laugh5mouth"
    },
    mouth: {
      closed: "./static/characters/nanako/states/laughing/mouth/closed.png?v=step1_44_laugh5mouth",
      small: "./static/characters/nanako/states/laughing/mouth/small.png?v=step1_44_laugh5mouth",
      medium: "./static/characters/nanako/states/laughing/mouth/medium.png?v=step1_44_laugh5mouth",
      wide: "./static/characters/nanako/states/laughing/mouth/wide.png?v=step1_44_laugh5mouth",
      round: "./static/characters/nanako/states/laughing/mouth/round.png?v=step1_44_laugh5mouth"
    }
  }
};



// Renderer-only asset warmup. Python still decides WHICH frame is used and WHEN.
// Preloading prevents first-use PNG fetches from making the lips appear late on phones.
const animationPreloadImages=[];
async function preloadAnimationAssets(){
  const urls=new Set();
  for(const state of Object.values(ANIMATION_ASSETS)){
    if(state?.base)urls.add(state.base);
    for(const groupName of ["eyes","mouth"]){
      const group=state?.[groupName]||{};
      for(const url of Object.values(group))if(url)urls.add(url);
    }
  }
  const jobs=[];
  for(const url of urls){
    const img=new Image();
    img.decoding="async";
    img.src=url;
    animationPreloadImages.push(img);
    jobs.push((async()=>{
      try{
        if(img.decode) await img.decode();
        else if(!img.complete) await new Promise(resolve=>{
          img.onload=resolve; img.onerror=resolve;
        });
      }catch{}
    })());
  }
  await Promise.allSettled(jobs);
}
const animationAssetsReady=preloadAnimationAssets();

let nanakoBase=null,nanakoEyes=null,nanakoMouth=null,nanakoMotion=null,nanakoAvatar=null;
let animationRaf=0;
let animationToken=0;
let idlePlanTimer=0;
let currentAnimationPlan=null;
let cachedPythonIdlePlan=null;

// Renderer cache: eye/base assets are written only when the semantic frame
// actually changes. Mouth swaps must never cause Safari to reassign/repaint the
// confused eye layer.
let renderedBaseAsset="";
let renderedEyeAsset="";
let renderedMouthAsset="";

function animationAsset(state, part, frame){
  const emotion=ANIMATION_ASSETS[state]?state:"neutral";
  if(part==="base")return ANIMATION_ASSETS[emotion].base;
  const table=ANIMATION_ASSETS[emotion][part]||ANIMATION_ASSETS.neutral[part];
  return table[frame]||table.open||table.closed;
}

function renderAnimationFrame(frame){
  if(!frame)return;
  const emotion=ANIMATION_ASSETS[frame.emotion]?frame.emotion:"neutral";
  const base=animationAsset(emotion,"base");
  const eyes=animationAsset(emotion,"eyes",frame.eyes||"open");
  const mouth=animationAsset(emotion,"mouth",frame.mouth||"closed");
  if(nanakoBase&&renderedBaseAsset!==base){
    nanakoBase.src=base;
    renderedBaseAsset=base;
  }
  if(nanakoEyes&&renderedEyeAsset!==eyes){
    nanakoEyes.src=eyes;
    renderedEyeAsset=eyes;
  }
  if(nanakoMouth&&renderedMouthAsset!==mouth){
    nanakoMouth.src=mouth;
    renderedMouthAsset=mouth;
  }

  // These transform NUMBERS are generated by Python.
  // JS only applies them to the display surface.
  const scale=Number.isFinite(Number(frame.scale))?Number(frame.scale):1;
  const y=Number.isFinite(Number(frame.translate_y))?Number(frame.translate_y):0;
  if(nanakoMotion)nanakoMotion.style.transform=`translateY(${y}px) scale(${scale})`;

  // Step 1.38: Python alone chooses the laugh head bob. The full-canvas
  // head and mouth PNGs share the same transform so lip alignment stays locked.
  const headY=(emotion==="laughing"&&Number.isFinite(Number(frame.head_translate_y)))?Number(frame.head_translate_y):0;
  const headTransform=headY?`translateY(${headY}px)`:"";
  if(nanakoEyes)nanakoEyes.style.transform=headTransform;
  if(nanakoMouth)nanakoMouth.style.transform=headTransform;

  if(nanakoAvatar){
    nanakoAvatar.dataset.emotion=emotion;
    nanakoAvatar.dataset.action=frame.action||"idle";
  }
}

function stopAnimationPlan(){
  animationToken+=1;
  if(animationRaf)cancelAnimationFrame(animationRaf);
  animationRaf=0;
  currentAnimationPlan=null;
}

function playAnimationPlan(plan,{loop=false,onComplete=null,mediaClock=null}={}){
  stopAnimationPlan();
  if(!plan||!Array.isArray(plan.frames)||!plan.frames.length)return;
  const token=animationToken;
  currentAnimationPlan=plan;
  const started=performance.now();
  const duration=Math.max(1,Number(plan.duration_ms)||1);

  const tick=now=>{
    if(token!==animationToken)return;

    // Talking animation follows the HTMLAudio media timeline, NOT wall-clock time.
    // This keeps Python's waveform-derived mouth frames synchronized even when
    // Nanako is intentionally played at 0.86x speed or the phone briefly stalls.
    let elapsed=mediaClock
      ? Math.max(0,Number(mediaClock.currentTime||0)*1000)
      : now-started;

    // Step 1.52: laughter is waveform-synced just like every other speaking
    // state. Never modulo-loop it: real pauses must close the mouth, and if the
    // browser runs a few milliseconds beyond the plan it should hold the final
    // closed frame rather than resume artificial mouth cycling.
    if(loop&&!mediaClock)elapsed=elapsed%duration;
    const frames=plan.frames;
    let lo=0,hi=frames.length-1;
    while(lo<hi){
      const mid=Math.ceil((lo+hi)/2);
      if((Number(frames[mid].t)||0)<=elapsed)lo=mid;
      else hi=mid-1;
    }
    renderAnimationFrame(frames[lo]);

    const mediaStillPlaying=mediaClock&&!mediaClock.ended&&currentAudio===mediaClock;
    if(mediaClock?mediaStillPlaying:(loop||elapsed<duration)){
      animationRaf=requestAnimationFrame(tick);
    }else{
      animationRaf=0;
      if(typeof onComplete==="function")onComplete();
    }
  };
  animationRaf=requestAnimationFrame(tick);
}

function playPythonIdlePlan(plan){
  if(currentAudio||!plan?.frames?.length)return false;
  cachedPythonIdlePlan=plan;
  // Paint Python's first idle snapshot immediately. requestAnimationFrame then
  // continues the Python timeline. This guarantees a talking mouth cannot remain
  // visible for even one extra network/render cycle after speech cleanup.
  renderAnimationFrame(plan.frames[0]);
  playAnimationPlan(plan,{loop:false,onComplete:()=>requestIdleAnimation({preferCache:false})});
  return true;
}

async function requestIdleAnimation({preferCache=true,emotion=null}={}){
  clearTimeout(idlePlanTimer);
  if(currentAudio)return;

  // Returning from speech must not leave the last talking PNG visible while a
  // network round-trip fetches a new idle plan. Re-use the last plan that came
  // from Python immediately, then refresh it only when that plan expires.
  if(preferCache&&cachedPythonIdlePlan&&playPythonIdlePlan(cachedPythonIdlePlan))return;

  try{
    const requestedEmotion=String(emotion||"").trim().toLowerCase();
    const emotionQuery=requestedEmotion?`&emotion=${encodeURIComponent(requestedEmotion)}`:"";
    const r=await fetch(`${API}/api/animation/idle-plan?duration_ms=60000&sample_ms=100${emotionQuery}`,{cache:"no-store"});
    const d=await r.json();
    if(!r.ok||!d?.ok||!d?.animation_plan)throw new Error(d?.error||`Animation request failed (${r.status})`);
    cachedPythonIdlePlan=d.animation_plan;
    if(!currentAudio)playPythonIdlePlan(cachedPythonIdlePlan);
  }catch(err){
    console.warn("[Nanako Animation] Python idle plan unavailable:",err);
    // Only a fail-safe visual reset. This is not a browser animation system.
    // It prevents a stale talking mouth from remaining frozen if the idle API
    // is temporarily unreachable; the browser retries Python immediately.
    renderAnimationFrame({emotion:"neutral",action:"idle",eyes:"open",mouth:"closed",scale:1,translate_y:0});
    idlePlanTimer=setTimeout(()=>requestIdleAnimation({preferCache:false,emotion:requestedEmotion||null}),1500);
  }
}

function useTalkingAnimation(plan,mediaClock=null){
  clearTimeout(idlePlanTimer);
  if(plan?.frames?.length)playAnimationPlan(plan,{mediaClock});
  else renderAnimationFrame({emotion:"neutral",action:"talking",eyes:"open",mouth:"small",scale:1,translate_y:0});
}

function returnToPythonIdle({emotion=null}={}){
  stopAnimationPlan();
  if(emotion==="neutral"){
    cachedPythonIdlePlan=null;
    renderAnimationFrame({emotion:"neutral",action:"idle",eyes:"open",mouth:"closed",scale:1,translate_y:0});
    requestIdleAnimation({preferCache:false,emotion:"neutral"});
    return;
  }
  if(!playPythonIdlePlan(cachedPythonIdlePlan))requestIdleAnimation({preferCache:false});
}

function finishPlanWithPostHold(plan,{idleEmotion=null,onDone=null}={}){
  const hold=Math.max(0,Math.min(2500,Number(plan?.post_speech_hold_ms)||0));
  const post=plan?.post_speech_frame;
  if(hold>0&&post){
    stopAnimationPlan();
    renderAnimationFrame(post);
    setTimeout(()=>{
      returnToPythonIdle({emotion:idleEmotion||"neutral"});
      if(typeof onDone==="function")onDone();
    },hold);
    return;
  }
  returnToPythonIdle({emotion:idleEmotion});
  if(typeof onDone==="function")onDone();
}




const API="https://nanako-web-pokbkohedy.ap-southeast-1.fcapp.run",CHAT=`${API}/api/chat`,RESET=`${API}/api/reset`,STARTUP_GREETING=`${API}/api/startup-greeting`;
const MIC_START=`${API}/api/mic/session/start`,MIC_FRAME=`${API}/api/mic/session/frame`,MIC_RESPOND=`${API}/api/mic/session/respond`,MIC_STOP=`${API}/api/mic/session/stop`,MIC_SPEAKING=`${API}/api/mic/session/speaking`;
const RUNTIME_CHECK=`${API}/runtime-check`;
const LAST_GREETING_KEY="nanako_last_startup_greeting_v1";
const MEMORY_KEY="nanakoPersistentMemoryV1";
const MEMORY_HISTORY_MAX=40,MEMORY_SEND_MAX=16,MEMORY_FACT_MAX=30;
let persistentFacts=[],persistentUserName="",startupGreetingData=null,startupGreetingPlayed=false,startupGreetingLoading=null,startupGreetingPlayPromise=null;
function loadPersistentMemory(){
  try{
    const raw=JSON.parse(localStorage.getItem(MEMORY_KEY)||"{}");
    const h=Array.isArray(raw.history)?raw.history:[];
    const f=Array.isArray(raw.facts)?raw.facts:[];
    persistentUserName=String(raw?.profile?.user_name||"").trim();
    history.length=0;
    h.slice(-MEMORY_HISTORY_MAX).forEach(item=>{
      if(!item||!(item.role==="user"||item.role==="assistant"))return;
      const txt=String(item.text||item.content||"").trim();if(!txt)return;
      history.push({role:item.role,text:txt,wrong:String(item.wrong||""),corrected:String(item.corrected||"")});
    });
    persistentFacts=f.map(x=>String(x||"").trim()).filter(Boolean).slice(-MEMORY_FACT_MAX);
  }catch(err){console.warn("[Nanako Memory] restore failed",err);history.length=0;persistentFacts=[];persistentUserName="";}
}
function savePersistentMemory(){
  try{
    const persistedHistory=history.filter(h=>!h.ephemeral).slice(-MEMORY_HISTORY_MAX);
    const payload={version:2,updated_at:Date.now(),history:persistedHistory,facts:persistentFacts.slice(-MEMORY_FACT_MAX),profile:{user_name:persistentUserName||""}};
    localStorage.setItem(MEMORY_KEY,JSON.stringify(payload));
  }catch(err){console.warn("[Nanako Memory] save failed",err);}
}
function cleanNameCandidate(value){
  let s=String(value||"").trim().replace(/[。！？!?、,:;]+$/g,"");
  if(!s||s.length>24||/\s{2,}/.test(s))return"";
  if(/^(fine|good|okay|ok|happy|tired|busy|here|back)$/i.test(s))return"";
  return s;
}
function detectUserNameFromText(value){
  const msg=String(value||"").trim();if(!msg)return"";
  const roman="[A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’\\-]+";
  const patterns=[
    new RegExp(`(?:my name is|call me|i am|i'm)\\s+(${roman}(?:\\s+${roman}){0,2})(?:[.!?]|$)`,`i`),
    /(?:私の名前は|僕の名前は|俺の名前は|名前は)\s*([ぁ-んァ-ヶー一-龯A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’\-]{1,24})(?:です|だよ|といいます|っていいます|[。！!]?\s*$)/,
    /(?:私は|僕は|俺は)\s*([ァ-ヶー一-龯A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’\-]{1,24})\s*(?:です|だよ|といいます|っていいます)[。！!]?\s*$/,
    /^\s*([ァ-ヶー一-龯A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’\-]{1,24})\s*(?:です|だよ|といいます|っていいます)[。！!]?\s*$/
  ];
  for(const re of patterns){const m=msg.match(re);if(m){const n=cleanNameCandidate(m[1]);if(n)return n;}}
  return"";
}
function rememberUserNameFromText(value){
  const n=detectUserNameFromText(value);
  if(n&&n!==persistentUserName){persistentUserName=n;savePersistentMemory();}
  return persistentUserName;
}
function detectUserNameFromMemory(){
  if(persistentUserName)return persistentUserName;
  const factPatterns=[
    /(?:the )?(?:user|learner)(?:'s)? name is\s+([A-Za-z][A-Za-z'\-]{1,23})/i,
    /(?:名前|氏名)は[「『\s]*([^」』。！？,]{1,24})/,
    /(?:ユーザー|学習者)の名前は[「『\s]*([^」』。！？,]{1,24})/
  ];
  for(const fact of persistentFacts){
    for(const re of factPatterns){const m=String(fact).match(re);if(m){const n=cleanNameCandidate(m[1]);if(n)return n;}}
  }
  const userMessages=history.filter(h=>h.role==="user"&&!h.ephemeral).map(h=>String(h.text||""));
  for(const msg of userMessages){const n=detectUserNameFromText(msg);if(n)return n;}
  return"";
}
function rememberDetectedUserName(){
  const n=detectUserNameFromMemory();
  if(n&&n!==persistentUserName){persistentUserName=n;savePersistentMemory();}
  return persistentUserName;
}
function mergeMemoryFacts(items){
  if(!Array.isArray(items))return;
  const seen=new Set(persistentFacts.map(x=>x.toLowerCase()));
  for(const item of items){const fact=String(item||"").trim();if(!fact)continue;const key=fact.toLowerCase();if(seen.has(key))continue;seen.add(key);persistentFacts.push(fact);}
  if(persistentFacts.length>MEMORY_FACT_MAX)persistentFacts=persistentFacts.slice(-MEMORY_FACT_MAX);
  if(!persistentUserName)rememberDetectedUserName();
  savePersistentMemory();
}
function memoryPayload(){
  const facts=persistentFacts.slice(-MEMORY_FACT_MAX);
  if(persistentUserName){
    const nameFact=`The learner's name is ${persistentUserName}.`;
    if(!facts.some(f=>String(f).toLowerCase()===nameFact.toLowerCase()))facts.push(nameFact);
  }
  return {
    memory_history:history.slice(-MEMORY_SEND_MAX).map(h=>({role:h.role,content:h.text})),
    memory_facts:facts.slice(-MEMORY_FACT_MAX),
    user_name:persistentUserName||""
  };
}
async function checkPythonRuntime(){const el=document.getElementById("runtimeStatus");try{const r=await fetch(RUNTIME_CHECK,{cache:"no-store"});const d=await r.json();const ok=!!(d.python_running&&d.mic_engine_loaded&&d.animation_engine_loaded&&d.qwen_backend_configured);if(el)el.textContent=ok?"Python runtime: ONLINE • mic + animation loaded":"Python runtime: incomplete — check Alibaba deployment";console.log("[Nanako v11 runtime-check]",d);}catch(err){if(el)el.textContent="Python runtime: OFFLINE / unreachable";console.warn("[Nanako v11 runtime-check failed]",err);}}
setTimeout(checkPythonRuntime,150);
const MIC_TARGET_RATE=16000,MIC_BATCH_SAMPLES=3200; // 200 ms transport batches only. Python decides VAD/turn boundaries.
const $=id=>document.getElementById(id),e={levelBadge:$("levelBadge"),scoreFill:$("scoreFill"),scoreText:$("scoreText"),settingsScore:$("settingsScore"),settingsScoreFill:$("settingsScoreFill"),userTranscript:$("userTranscript"),userTranscriptText:$("userTranscriptText"),status:$("statusText"),ro:$("romajiButton"),en:$("englishButton"),mute:$("muteButton"),jp:$("japaneseReply"),roSec:$("romajiSection"),enSec:$("englishSection"),roText:$("romajiReply"),enText:$("englishReply"),input:$("messageInput"),send:$("sendButton"),conv:$("conversationButton"),corr:$("correctionToast"),wrong:$("wrongText"),correct:$("correctText"),err:$("errorToast"),settings:$("settingsModal"),menu:$("menuButton"),closeSettings:$("closeSettingsButton"),historyBtn:$("historyButton"),historyModal:$("historyModal"),closeHistory:$("closeHistoryButton"),historyEmpty:$("historyEmpty"),historyList:$("historyList"),levelValue:$("levelValue"),levelGrid:$("levelGrid"),reset:$("resetButton"),debugMic:$("debugMic"),debugRoom:$("debugRoom"),debugSpeech:$("debugSpeech"),debugTurn:$("debugTurn")};
let level="auto",score=0,showRO=false,showEN=false,muted=false,active=false,busy=false,currentAudio=null,currentAudioObjectUrl="",stream=null,ctx=null,micSource=null,micProcessor=null,micSessionId="",micBatch=[],micQueue=[],micPumpBusy=false,micCapturePaused=true,transcriptTimer=0,correctionTimer=0,audioUnlocked=false,bargeCaptureTimer=0,startupGestureArmed=false,startupEnterDone=false;const history=[];const ttsAudio=new Audio();ttsAudio.preload="auto";ttsAudio.playsInline=true;
const SILENT_WAV="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const status=t=>e.status.textContent=t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),label=l=>l==="auto"?"Auto":l.toUpperCase();
function setScore(v){score=clamp(Math.round(Number(v)||0),0,100);let w=`${score}%`;e.scoreText.textContent=score;e.scoreFill.style.width=w;e.settingsScore.textContent=`${score} / 100`;e.settingsScoreFill.style.width=w}
function error(m){e.err.textContent=String(m||"Something went wrong.");e.err.hidden=false;clearTimeout(error.t);error.t=setTimeout(()=>e.err.hidden=true,6000)}
function transcript(t){clearTimeout(transcriptTimer);if(!t){e.userTranscript.hidden=true;return}e.userTranscriptText.textContent=t;e.userTranscript.style.opacity="1";e.userTranscript.hidden=false;transcriptTimer=setTimeout(()=>{e.userTranscript.style.opacity="0";setTimeout(()=>e.userTranscript.hidden=true,420)},2200)}
function correction(d){let a=d?.analysis&&typeof d.analysis==="object"?d.analysis:{},o=String(a.wrong_text??a.original??a.original_text??a.user_text??"").trim(),c=String(a.correct_text??a.corrected??a.corrected_text??a.correction??"").trim(),n=a.needs_correction===true||a.correct===false||a.is_correct===false||!!(o&&c&&o!==c);return{n,o,c}}
function showCorrection(x){clearTimeout(correctionTimer);if(!x.n||!x.o||!x.c){e.corr.hidden=true;return}e.wrong.textContent=x.o;e.correct.textContent=`→ ${x.c}`;e.corr.hidden=false;correctionTimer=setTimeout(()=>e.corr.hidden=true,7000)}
function addHistory(role,text,x=null){history.push({role,text:String(text||""),wrong:x?.n?x.o:"",corrected:x?.n?x.c:""});if(history.length>MEMORY_HISTORY_MAX)history.splice(0,history.length-MEMORY_HISTORY_MAX);if(role==="user")rememberUserNameFromText(text);renderHistory();savePersistentMemory()}
function addEphemeralStartupHistory(text){
  const t=String(text||"").trim();if(!t)return;
  // Keep only the current boot greeting as transient context. It is sent to Python
  // on the next turn but is deliberately not saved across restarts.
  for(let i=history.length-1;i>=0;i--){if(history[i]?.ephemeral)history.splice(i,1);}
  history.push({role:"assistant",text:t,wrong:"",corrected:"",ephemeral:true});
  renderHistory();
}
function renderHistory(){e.historyList.innerHTML="";e.historyEmpty.hidden=history.length>0;history.forEach(h=>{let b=document.createElement("div");b.className=`history-bubble ${h.role==="user"?"user":""}`;let r=document.createElement("div");r.className="history-role";r.textContent=h.role==="user"?"YOU":"NANAKO";let t=document.createElement("div");t.className="history-text";t.textContent=h.text;b.append(r,t);if(h.wrong&&h.corrected){let c=document.createElement("div");c.className="history-correction";c.innerHTML=`<div class="history-wrong"></div><div class="history-correct"></div>`;c.children[0].textContent=h.wrong;c.children[1].textContent=h.corrected;b.append(c)}e.historyList.append(b)})}
function quick(){e.ro.classList.toggle("active",showRO);e.roSec.hidden=!showRO;e.en.classList.toggle("active",showEN);e.enSec.hidden=!showEN;e.mute.classList.toggle("active",muted);e.mute.textContent=muted?"🔇":"🔊"}
function convButton(){e.conv.classList.toggle("active",active);e.conv.classList.remove("interrupt");e.conv.textContent=active?"⏹ End Conversation":"🎤 Start Conversation"}
async function jsonResp(r){let d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.error||d?.message||`Request failed (${r.status})`);return d}
async function apply(d,user){mergeMemoryFacts(d?.memory_facts);e.jp.textContent=String(d?.reply||"");e.roText.textContent=String(d?.romaji||"");e.enText.textContent=String(d?.english||"");let s=Number(d?.conversation_score??d?.score??d?.analysis?.conversation_score);if(Number.isFinite(s))setScore(s);let x=correction(d);showCorrection(x);addHistory("user",user,x);addHistory("assistant",d?.reply||"");let b=d?.audio_base64||d?.tts_audio_base64||d?.audio||"",m=d?.audio_mime||d?.mime_type||"audio/wav";const idleEmotion=(d?.laughing||["cheeky","angry","confused","disgust","sad","scared"].includes(d?.animation_plan?.emotion))?"neutral":null;if(b&&!muted)await play(b,m,d?.animation_plan,{idleEmotion,voiceMode:String(d?.response_mode||"talking")});else{if(d?.animation_plan)playAnimationPlan(d.animation_plan,{onComplete:()=>finishPlanWithPostHold(d.animation_plan,{idleEmotion,onDone:()=>{if(active)setTimeout(begin,20)}})});else{finishPlanWithPostHold(null,{idleEmotion,onDone:()=>{if(active)setTimeout(begin,20)}})}}}
async function fetchStartupGreeting(){
  if(startupGreetingLoading)return startupGreetingLoading;
  startupGreetingLoading=(async()=>{
    try{
      const userName=rememberDetectedUserName();
      let avoidGreetingId="";
      try{avoidGreetingId=localStorage.getItem(LAST_GREETING_KEY)||"";}catch{}
      const r=await fetch(STARTUP_GREETING,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_name:userName||"",avoid_greeting_id:avoidGreetingId})});
      const d=await jsonResp(r);
      startupGreetingData=d;
      if(d?.greeting_id){try{localStorage.setItem(LAST_GREETING_KEY,String(d.greeting_id));}catch{}}
      e.jp.textContent=String(d.reply||"");
      e.roText.textContent=String(d.romaji||"");
      e.enText.textContent=String(d.english||"");
      addEphemeralStartupHistory(d.reply||"");
      status(userName?`Welcome back${userName?`, ${userName}`:""}`:"Nice to meet you");
      return d;
    }catch(err){
      console.warn("[Nanako Startup] greeting failed",err);
      const fallback=rememberDetectedUserName()?`おかえり、${rememberDetectedUserName()}！また話そうね。`:"はじめまして！ななこです。今日は元気？";
      e.jp.textContent=fallback;e.roText.textContent="";e.enText.textContent="";addEphemeralStartupHistory(fallback);
      return null;
    }
  })();
  return startupGreetingLoading;
}
async function playStartupGreetingIfReady(fromGesture=false){
  if(startupGreetingPlayed||muted)return false;
  if(startupGreetingPlayPromise)return startupGreetingPlayPromise;
  startupGreetingPlayPromise=(async()=>{
    const d=startupGreetingData||await fetchStartupGreeting();
    if(!d?.audio_base64)return false;
    const ok=await play(d.audio_base64,d.audio_mime||"audio/wav",d.animation_plan,{gestureImmediate:!!fromGesture,silentFailure:true,idleEmotion:"neutral"});
    if(ok)startupGreetingPlayed=true;
    return ok;
  })();
  try{return await startupGreetingPlayPromise;}finally{startupGreetingPlayPromise=null;}
}
async function send(){let t=e.input.value.trim();if(!t||busy)return;rememberUserNameFromText(t);busy=true;status("Nanako is thinking...");try{let r=await fetch(CHAT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t,level,voice_output:true,...memoryPayload()})}),d=await jsonResp(r);e.input.value="";transcript(t);await apply(d,t)}catch(x){console.error(x);error(x.message);status("Chat failed.")}finally{busy=false;if(!currentAudio&&!active)status("Ready to chat")}}
function normalizeAudioSource(b,m){let v=String(b||"");if(!v)return"";if(v.startsWith("data:"))return v;return`data:${m||"audio/wav"};base64,${v}`}
function audioBlobUrlFromBase64(b,m){let v=String(b||"").trim();if(!v)return"";if(v.startsWith("data:"))v=v.slice(v.indexOf(",")+1);const bin=atob(v);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return URL.createObjectURL(new Blob([bytes],{type:m||"audio/wav"}))}
function revokeCurrentAudioObjectUrl(){if(currentAudioObjectUrl){try{URL.revokeObjectURL(currentAudioObjectUrl)}catch{}currentAudioObjectUrl=""}}
function unlockAudio(){
  if(audioUnlocked) return;
  try{
    // iOS Safari cold-start unlock. IMPORTANT: do not await, pause, or reset
    // this element. Starting playback inside the user's tap is enough to
    // grant media playback permission; the tiny silent WAV then ends by itself.
    // The same ttsAudio element is later reused for Nanako's real voice.
    ttsAudio.src=SILENT_WAV;
    ttsAudio.volume=.01;
    ttsAudio.preload="auto";
    const p=ttsAudio.play();
    if(p&&typeof p.then==="function")p.then(()=>{
      audioUnlocked=true;
      console.log("[Nanako Audio] iOS playback primed on first tap.");
    }).catch(x=>console.warn("[Nanako Audio] unlock attempt failed:",x));
    // Restore normal volume after the silent clip has had time to finish.
    setTimeout(()=>{if(!currentAudio)ttsAudio.volume=1;},180);
  }catch(x){
    console.warn("[Nanako Audio] unlock attempt failed:",x);
  }
}

async function stopAudio(resume=false){
  if(bargeCaptureTimer){clearTimeout(bargeCaptureTimer);bargeCaptureTimer=0;}
  if(currentAudio){
    try{
      currentAudio.onplaying=null;
      currentAudio.onended=null;
      currentAudio.onpause=null;
      currentAudio.onerror=null;
      if(currentAudio._nanakoPlaybackWatchdog){clearInterval(currentAudio._nanakoPlaybackWatchdog);currentAudio._nanakoPlaybackWatchdog=0;}
      currentAudio.pause();
      currentAudio.src="";
      currentAudio.load();
      revokeCurrentAudioObjectUrl();
    }catch{}
    currentAudio=null;
  }
  await setServerNanakoSpeaking(false);
  micCapturePaused=false;
  stopAnimationPlan();
  convButton();
  if(resume&&active){
    status("Listening...");
    setTimeout(begin,40);
  }
}

async function play(b,m,animationPlan=null,options={}){
  if(!b||muted){
    if(active)setTimeout(begin,40);
    return false;
  }

  const gestureImmediate=!!options?.gestureImmediate&&!currentAudio;
  const silentFailure=!!options?.silentFailure;
  const idleEmotion=String(options?.idleEmotion||"").trim().toLowerCase()||null;
  const voiceMode=String(options?.voiceMode||"talking").trim().toLowerCase();
  if(!gestureImmediate){
    await stopAudio(false);
  }else{
    if(bargeCaptureTimer){clearTimeout(bargeCaptureTimer);bargeCaptureTimer=0;}
    stopAnimationPlan();
  }

  // Keep mic PCM out of the opening echo window. For startup greeting playback
  // triggered by a real user gesture, do not await a network call before
  // HTMLAudio.play(); Safari would otherwise consume the user activation.
  micQueue=[];
  micBatch=[];
  if(gestureImmediate){Promise.resolve(setServerNanakoSpeaking(true)).catch(()=>{});}
  else{await setServerNanakoSpeaking(true);}
  micCapturePaused=true;


  const a=ttsAudio;
  revokeCurrentAudioObjectUrl();
  try{currentAudioObjectUrl=audioBlobUrlFromBase64(b,m);a.src=currentAudioObjectUrl;}catch(blobErr){console.warn("[Nanako Audio] Blob conversion failed; using data URL.",blobErr);a.src=normalizeAudioSource(b,m);}
  a.preload="auto";
  a.volume=1;
  const speechRate=voiceMode==="angry"?.95:.86;
  a.playbackRate=speechRate;
  a.defaultPlaybackRate=speechRate;
  try{a.preservesPitch=true;a.webkitPreservesPitch=true;}catch{}
  currentAudio=a;


  convButton();

  let finished=false;
  let playbackWatchdog=0;
  let playbackStartedAt=0;
  let lastProgressAt=0;
  let lastObservedMediaTime=0;

  const finish=()=>{
    if(finished)return;
    finished=true;
    if(playbackWatchdog)clearInterval(playbackWatchdog);
    if(bargeCaptureTimer){clearTimeout(bargeCaptureTimer);bargeCaptureTimer=0;}
    playbackWatchdog=0;
    a._nanakoPlaybackWatchdog=0;

    // Freeze raw user-turn processing until Python has been told that Nanako
    // stopped speaking. This avoids the first user syllables being discarded by
    // the server-side barge-in gate during the speaking->idle transition.
    micCapturePaused=true;

    // Clear the audio identity first, then immediately start the cached Python
    // idle plan. This removes both causes of the stuck final talking frame:
    // 1) requestIdleAnimation refusing to run while currentAudio was non-null;
    // 2) waiting on a network request before replacing the final mouth PNG.
    if(currentAudio===a)currentAudio=null;
    convButton();

    try{
      a.onplaying=null;a.onended=null;a.onpause=null;a.onerror=null;
      a.pause();
      a.removeAttribute("src");
      a.load();
      revokeCurrentAudioObjectUrl();
    }catch{}

    // Close Python's speaking gate immediately after audio, but keep the mic
    // paused through an optional cheeky wink hold. This guarantees the wink is
    // visible for the full backend-requested second before neutral idle resumes.
    Promise.resolve(setServerNanakoSpeaking(false)).finally(()=>{
      finishPlanWithPostHold(animationPlan,{idleEmotion,onDone:()=>{
        if(active){
          micCapturePaused=false;
          status("Listening...");
          setTimeout(begin,20);
        }else{
          status("Ready to chat");
        }
      }});
    });
  };

  a.onplaying=()=>{
    if(currentAudio!==a)return;
    useTalkingAnimation(animationPlan,a);
    status("Nanako is speaking...");
    convButton();
    console.log("[Nanako Audio] Playback started. Opening echo-protection active.");

    if(bargeCaptureTimer)clearTimeout(bargeCaptureTimer);
    // 2.2 s better protects against occasional self-echo first-word cutoffs on
    // allowing natural interruption through the remainder of ordinary replies.
    bargeCaptureTimer=setTimeout(()=>{
      bargeCaptureTimer=0;
      if(active&&currentAudio===a&&!finished){
        micQueue=[];micBatch=[];micCapturePaused=false;
        console.log("[Nanako Mic] Barge-in capture armed after startup echo guard.");
      }
    },2200);

    // iPhone Safari can audibly drain the audio output yet leave `ended=false`
    // and even `paused=false`. The old watchdog therefore never fired and the
    // renderer kept Python's final talking frame on screen indefinitely.
    playbackStartedAt=performance.now();
    lastProgressAt=playbackStartedAt;
    lastObservedMediaTime=Number(a.currentTime||0);

    if(playbackWatchdog)clearInterval(playbackWatchdog);
    playbackWatchdog=setInterval(()=>{
      if(finished||currentAudio!==a)return;
      const now=performance.now();
      const duration=Number(a.duration);
      const current=Number(a.currentTime||0);
      const rate=Math.max(0.1,Number(a.playbackRate)||1);
      const planDurationSec=Math.max(0,Number(animationPlan?.duration_ms||0)/1000);
      const knownDuration=Number.isFinite(duration)&&duration>0?duration:planDurationSec;

      if(current>lastObservedMediaTime+0.008){
        lastObservedMediaTime=current;
        lastProgressAt=now;
      }

      if(a.ended){
        console.log("[Nanako Audio] Native ended state observed.");
        finish();
        return;
      }


      if(knownDuration>0){
        // If the media clock is essentially at the end and has stopped moving,
        // the phone has finished output even when Safari forgot to flip ended.
        const nearEnd=current>=Math.max(0,knownDuration-0.22);
        const stalledNearEnd=nearEnd&&(now-lastProgressAt)>=650;

        // Blob audio is fully local, so this is a second safe guard against the
        // Safari state where currentTime/ended both fail to finalize cleanly.
        const expectedWallMs=(knownDuration/rate)*1000;
        const exceededExpected=(now-playbackStartedAt)>expectedWallMs+1400&&current>=Math.max(0,knownDuration-0.55);

        if(stalledNearEnd||exceededExpected){
          console.log("[Nanako Audio] Safari drain watchdog restored Python idle.",{
            current,duration:knownDuration,paused:a.paused,ended:a.ended
          });
          finish();
        }
      }
    },100);
    a._nanakoPlaybackWatchdog=playbackWatchdog;
  };
  a.onended=()=>{
    console.log("[Nanako Audio] Finished speaking.");
    finish();
  };
  a.onpause=()=>{
    if(finished||currentAudio!==a)return;
    const duration=Number(a.duration);
    if(Number.isFinite(duration)&&duration>0&&Number(a.currentTime||0)>=duration-0.22){
      setTimeout(()=>{if(!finished)finish();},220);
    }
  };
  a.onerror=()=>{
    console.error("[Nanako Audio] Playback error.");
    finish();
  };

  try{
    await a.play();
    // onplaying is the single authoritative start for the talking renderer.
    // Do not restart the plan here; that caused a small timing reset on mobile.
    return true;
  }catch(x){
    console.warn("[Nanako TTS] Playback failed:",x);
    if(!silentFailure)error("Nanako's voice could not play. Tap once and try again.");
    finish();
    return false;
  }
}

// ============================================================
// v11 STEP 1.3 — ESSENTIAL BROWSER MIC BRIDGE ONLY
//
// Browser responsibilities:
//   1) ask for microphone permission
//   2) capture mono PCM
//   3) resample to the server's 16 kHz transport format
//   4) send PCM batches and obey Python decisions
//
// Python responsibilities:
//   noise floor, VAD, speech start/end, pause cutoff, max turn,
//   barge-in, completed-turn buffering and conversation processing.
// ============================================================
async function ensureMicHardware(){
  if(stream&&stream.getTracks().some(t=>t.readyState==="live")&&ctx&&micProcessor)return;
  if(!navigator.mediaDevices?.getUserMedia)throw new Error("Microphone access requires HTTPS.");
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)throw new Error("Web Audio is not supported by this browser.");
  ctx=new AC();
  if(ctx.state==="suspended")await ctx.resume();
  micSource=ctx.createMediaStreamSource(stream);
  micProcessor=ctx.createScriptProcessor(2048,1,1);
  micProcessor.onaudioprocess=ev=>{
    try{ev.outputBuffer.getChannelData(0).fill(0)}catch{}
    if(!active||micCapturePaused||!micSessionId)return;
    const input=ev.inputBuffer.getChannelData(0);
    const samples=resampleMono(input,ctx.sampleRate,MIC_TARGET_RATE);
    for(let i=0;i<samples.length;i++)micBatch.push(samples[i]);
    while(micBatch.length>=MIC_BATCH_SAMPLES){
      const batch=micBatch.splice(0,MIC_BATCH_SAMPLES);
      micQueue.push(floatToPcm16(batch));
    }
    if(micQueue.length>8)micQueue.splice(0,micQueue.length-8);
    pumpMicQueue();
  };
  micSource.connect(micProcessor);
  micProcessor.connect(ctx.destination);
}

function resampleMono(input,inputRate,targetRate){
  if(inputRate===targetRate)return Float32Array.from(input);
  const ratio=inputRate/targetRate;
  const length=Math.max(1,Math.floor(input.length/ratio));
  const out=new Float32Array(length);
  if(ratio>=1){
    for(let i=0;i<length;i++){
      const a=Math.floor(i*ratio),b=Math.min(input.length,Math.max(a+1,Math.floor((i+1)*ratio)));
      let sum=0;for(let j=a;j<b;j++)sum+=input[j];out[i]=sum/Math.max(1,b-a);
    }
  }else{
    for(let i=0;i<length;i++){
      const pos=i*ratio,a=Math.floor(pos),b=Math.min(input.length-1,a+1),mix=pos-a;
      out[i]=(input[a]||0)*(1-mix)+(input[b]||0)*mix;
    }
  }
  return out;
}

function floatToPcm16(samples){
  const out=new Int16Array(samples.length);
  for(let i=0;i<samples.length;i++){
    const v=Math.max(-1,Math.min(1,Number(samples[i])||0));
    out[i]=v<0?Math.round(v*32768):Math.round(v*32767);
  }
  return out;
}

async function startPythonMicSession(){
  if(micSessionId)return micSessionId;
  const r=await fetch(MIC_START,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  const d=await jsonResp(r);
  micSessionId=String(d.session_id||"");
  if(!micSessionId)throw new Error("Python microphone session did not start.");
  console.log("[Nanako Mic] Python session started",micSessionId);
  return micSessionId;
}

async function setServerNanakoSpeaking(speaking){
  if(!micSessionId)return;
  try{
    await fetch(MIC_SPEAKING,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:micSessionId,speaking:!!speaking})});
  }catch(x){console.warn("[Nanako Mic] speaking-state sync failed",x)}
}

function updateServerMicDebug(m){
  if(!m)return;
  e.debugMic.textContent=`Mic: ${Number(m.rms_db??-120).toFixed(1)} dB`;
  e.debugRoom.textContent=`Room: ${Number(m.noise_floor_db??-120).toFixed(1)} dB`;
  e.debugSpeech.textContent=`Speech: ${m.state==="speech"||m.speech_started?"Detected":m.state==="nanako_speaking"?"Python barge-in gate":"Waiting"}`;
  e.debugTurn.textContent=`Turn: ${(Number(m.turn_ms||0)/1000).toFixed(1)} sec • Python VAD`;
}

async function restartPythonMicSession(){
  const old=micSessionId;micSessionId="";micQueue=[];micBatch=[];
  if(old){try{await fetch(MIC_STOP,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:old})})}catch{}}
  await startPythonMicSession();
}

async function pumpMicQueue(){
  if(micPumpBusy||!active||!micSessionId)return;
  micPumpBusy=true;
  try{
    while(active&&micSessionId&&micQueue.length){
      const pcm=micQueue.shift();
      const r=await fetch(`${MIC_FRAME}?session_id=${encodeURIComponent(micSessionId)}`,{method:"POST",headers:{"Content-Type":"application/octet-stream"},body:pcm.buffer});
      const d=await r.json();
      if(!r.ok||d?.ok===false){
        if(d?.restart_session){await restartPythonMicSession();continue}
        throw new Error(d?.error||`Microphone frame failed (${r.status})`);
      }
      const m=d.mic||{};updateServerMicDebug(m);
      if(m.barge_in&&currentAudio){
        console.log("[Nanako Mic] Python confirmed barge-in.");
        await stopAudio(true);
        // Step 1.18: an interrupted talking plan has no natural `ended` event.
        // Explicitly paint the cached Python idle plan so the last open-mouth
        // frame cannot remain frozen after barge-in.
        returnToPythonIdle();
      }
      if(m.speech_started)status("I'm listening...");
      if(m.turn_id){
        micCapturePaused=true;micQueue=[];micBatch=[];
        await processPythonMicTurn(m.turn_id);
        break;
      }
    }
  }catch(x){
    console.error("[Nanako Mic bridge]",x);error(x.message);status("Microphone connection problem");
  }finally{micPumpBusy=false;if(active&&!micCapturePaused&&micQueue.length)setTimeout(pumpMicQueue,0)}
}

async function processPythonMicTurn(turnId){
  if(!active||!micSessionId)return;
  busy=true;status("Nanako is thinking...");
  try{
    const r=await fetch(MIC_RESPOND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:micSessionId,turn_id:turnId,level,...memoryPayload()})});
    const d=await jsonResp(r);
    const t=String(d?.transcript||"");
    console.log("[Nanako Python Mic] Transcript:",t);
    transcript(t);
    // Keep raw capture paused through Nanako playback. play()/finish() owns the
    // speaking gate and re-enables capture only after the audio has ended.
    micCapturePaused=true;
    await apply(d,t);
  }catch(x){
    console.error(x);error(x.message);status("Voice turn failed");micCapturePaused=false;
  }finally{busy=false;if(active&&!currentAudio){status("Listening...");setTimeout(begin,40)}}
}

async function begin(){
  if(!active)return;
  await startPythonMicSession();
  await ensureMicHardware();
  micCapturePaused=false;
  status("Listening...");
}

async function stopMicBridge(){
  micCapturePaused=true;micQueue=[];micBatch=[];
  const sid=micSessionId;micSessionId="";
  try{micProcessor?.disconnect()}catch{}
  try{micSource?.disconnect()}catch{}
  micProcessor=null;micSource=null;
  try{await ctx?.close()}catch{}ctx=null;
  try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null;
  if(sid){try{await fetch(MIC_STOP,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sid})})}catch{}}
}

function armStartupGreetingOnFirstGesture(){/* Step 1.23: replaced by explicit splash-screen Enter flow. */}

async function enterStartupSplash(){
  if(startupEnterDone)return;
  startupEnterDone=true;
  const splash=document.getElementById("startupSplash");
  const enterBtn=document.getElementById("startupEnterButton");
  // This MUST run synchronously inside the first tap for iOS audio permission.
  unlockAudio();
  if(enterBtn){enterBtn.disabled=true;enterBtn.textContent="Entering…";}
  if(splash)splash.hidden=true;
  status("Nanako is greeting you...");
  cachedPythonIdlePlan=null;
  try{
    await animationAssetsReady;
    nanakoAvatar=nanakoAvatar||document.getElementById("nanakoAvatar");
    nanakoBase=nanakoBase||document.getElementById("nanakoBase");
    nanakoEyes=nanakoEyes||document.getElementById("nanakoEyes");
    nanakoMouth=nanakoMouth||document.getElementById("nanakoMouth");
    nanakoMotion=nanakoMotion||document.querySelector(".nanako-motion");
    renderAnimationFrame({emotion:"neutral",action:"idle",eyes:"open",mouth:"closed",scale:1,translate_y:0});
    if(!startupGreetingData)await fetchStartupGreeting();
    if(startupGreetingData?.audio_base64&&!muted){
      await play(startupGreetingData.audio_base64,startupGreetingData.audio_mime||"audio/wav",startupGreetingData.animation_plan,{gestureImmediate:false,silentFailure:false,idleEmotion:"neutral"});
      startupGreetingPlayed=true;
    }
  }catch(err){
    console.error("[NanaChat Startup Enter]",err);
    error("Nanako's welcome voice could not play.");
  }finally{
    if(enterBtn){enterBtn.disabled=false;enterBtn.textContent="Enter";}
  }
}

async function startMode(){
  if(active)return;
  try{
    active=true;convButton();
    status("Starting microphone...");
    await begin();
  }catch(x){
    console.error(x);error("Please allow microphone access and check the Python runtime.");await stopMode();
  }
}

async function stopMode(){
  active=false;await setServerNanakoSpeaking(false);await stopMicBridge();await stopAudio(false);convButton();status("Ready to chat");
}
async function reset(){if(!window.confirm("Forget Nanako’s saved conversation, your name, and all remembered facts? This cannot be undone."))return;await stopMode();try{await fetch(RESET,{method:"POST"})}catch{}history.length=0;persistentFacts=[];persistentUserName="";startupGreetingData=null;startupGreetingPlayed=false;startupGreetingLoading=null;startupGreetingPlayPromise=null;startupGestureArmed=false;startupEnterDone=false;try{localStorage.removeItem(MEMORY_KEY)}catch{}renderHistory();setScore(0);e.jp.textContent="はじめまして！ななこです。今日は元気？";e.roText.textContent=e.enText.textContent="";e.corr.hidden=e.settings.hidden=e.historyModal.hidden=true;const splash=document.getElementById("startupSplash");if(splash)splash.hidden=false;status("Ready for a fresh start");void fetchStartupGreeting()}

e.send.onclick=send;e.input.onkeydown=x=>{if(x.key==="Enter"){x.preventDefault();send()}};e.ro.onclick=()=>{showRO=!showRO;quick()};e.en.onclick=()=>{showEN=!showEN;quick()};e.mute.onclick=async()=>{muted=!muted;quick();if(muted&&currentAudio)await stopAudio(active)};e.conv.onclick=async()=>{active?await stopMode():await startMode()};e.menu.onclick=()=>e.settings.hidden=false;e.closeSettings.onclick=()=>e.settings.hidden=true;e.historyBtn.onclick=()=>{e.settings.hidden=true;e.historyModal.hidden=false};e.closeHistory.onclick=()=>e.historyModal.hidden=true;e.settings.onclick=x=>{if(x.target===e.settings)e.settings.hidden=true};e.historyModal.onclick=x=>{if(x.target===e.historyModal)e.historyModal.hidden=true};e.levelGrid.onclick=x=>{let b=x.target.closest("[data-level]");if(!b)return;level=b.dataset.level;e.levelGrid.querySelectorAll("[data-level]").forEach(c=>c.classList.toggle("active",c.dataset.level===level));e.levelBadge.textContent=e.levelValue.textContent=label(level)};e.reset.onclick=reset;
window.addEventListener("beforeunload",()=>{
  stopAnimationPlan();
  active=false;micCapturePaused=true;
  try{micProcessor?.disconnect()}catch{}
  try{micSource?.disconnect()}catch{}
  try{stream?.getTracks().forEach(t=>t.stop())}catch{}
  currentAudio?.pause();
});

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&!currentAudio)requestIdleAnimation();
});


function bindStartupEnterImmediately(){
  const btn=document.getElementById("startupEnterButton");
  if(!btn||btn.dataset.bound==="1")return;
  btn.dataset.bound="1";
  btn.addEventListener("click",event=>{
    event.preventDefault();
    void enterStartupSplash();
  },{passive:false});
}

async function boot(){
  bindStartupEnterImmediately();
  loadPersistentMemory();
  setScore(0);quick();convButton();renderHistory();
  syncInstalledViewport();
  nanakoAvatar=document.getElementById("nanakoAvatar");
  nanakoBase=document.getElementById("nanakoBase");
  nanakoEyes=document.getElementById("nanakoEyes");
  nanakoMouth=document.getElementById("nanakoMouth");
  nanakoMotion=document.querySelector(".nanako-motion");
  await animationAssetsReady;
  if(e.jp)e.jp.textContent=rememberDetectedUserName()?`おかえり、${rememberDetectedUserName()}！`:`はじめまして！ななこです。`;
  renderAnimationFrame({emotion:"neutral",action:"idle",eyes:"open",mouth:"closed",scale:1,translate_y:0});
  if(nanakoAvatar)nanakoAvatar.classList.add("face-ready");
  await requestIdleAnimation({preferCache:false});
  // Prepare and display the randomized greeting immediately, but the explicit
  // splash-screen Enter button provides the Safari-safe user gesture that lets
  // Nanako actually speak the welcome line before the chat interaction begins.
  await fetchStartupGreeting();
  console.log(`[NanaChat] v11 Step 1.58 startup ready • memory: ${history.length} messages, ${persistentFacts.length} facts • user=${persistentUserName||"unknown"}`);
}

boot();
})();
