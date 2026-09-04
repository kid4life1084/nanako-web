(async()=>{
"use strict";

// Step 2.19 release gate is created inline by index.html, before any external
// JavaScript is loaded. It removes an older cache-first worker exactly once.
if(window.__NANAKO_RELEASE_GATE__)await window.__NANAKO_RELEASE_GATE__;

// Step 1.41: explicitly install/update the current service worker.
// Older NanaChat builds sometimes left a previously-registered worker in control.
async function ensureCurrentServiceWorker(){
  if(!("serviceWorker" in navigator))return;
  try{
    const reg=await navigator.serviceWorker.register("./sw.js?v=12.0.22",{scope:"./",updateViaCache:"none"});
    await reg.update();
  }catch(err){console.warn("NanaChat SW update failed",err);}
}
ensureCurrentServiceWorker();

// NanaChat Step 1.68 STABLE: Step 1.67 robust joke routing preserved; laughing now settles closed-mouth.
// The entire app canvas follows the actual visual viewport while the keyboard
// is open. This prevents iOS from creating a tall scrollable page or pushing
// controls beyond the visible app boundary.
function isStandalone(){return window.matchMedia?.("(display-mode: standalone)")?.matches||window.navigator.standalone===true;}

// Step 1.66 portrait lock.
// Installed PWAs / supporting browsers get a real Screen Orientation API lock.
// iPhone Safari does not expose a reliable page-level orientation lock, so when
// iOS rotates the browser viewport we keep NanaChat on a portrait-sized canvas
// and rotate that canvas with the device instead of reflowing the app landscape.
function isPhoneLike(){
  try{
    return window.matchMedia?.("(pointer: coarse)")?.matches===true || /iPhone|iPod|Android.+Mobile/i.test(navigator.userAgent||"");
  }catch{return false;}
}
function currentDeviceOrientationAngle(){
  let a=Number(screen.orientation?.angle);
  if(!Number.isFinite(a))a=Number(window.orientation);
  if(!Number.isFinite(a))a=90;
  a=((a%360)+360)%360;
  if(a===270)return -90;
  if(a===90)return 90;
  return 90;
}
function syncPortraitPresentation(){
  try{
    const vv=window.visualViewport;
    const vw=Math.max(1,Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth||1));
    const vh=Math.max(1,Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||1));
    const landscape=isPhoneLike()&&vw>vh;
    document.documentElement.classList.toggle("portrait-lock-landscape",landscape);
    if(landscape){
      document.documentElement.style.setProperty("--portrait-lock-w",`${vh}px`);
      document.documentElement.style.setProperty("--portrait-lock-h",`${vw}px`);
      document.documentElement.style.setProperty("--portrait-lock-rotation",`${currentDeviceOrientationAngle()}deg`);
    }
    return landscape;
  }catch{return false;}
}
async function requestPortraitOrientationLock(){
  try{
    if(screen.orientation?.lock)await screen.orientation.lock("portrait");
  }catch{/* Browser may require installed/fullscreen mode. CSS fallback remains active. */}
  syncPortraitPresentation();
}

let fullAppViewportH=0;
function inputHasFocus(){
  const a=document.activeElement;
  return !!a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.isContentEditable);
}
function syncInstalledViewport(){
  try{
    const portraitFallback=syncPortraitPresentation();
    const vv=window.visualViewport;
    const rawW=Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth||0);
    const rawH=Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||0);
    const visibleH=Math.max(320,portraitFallback?Math.max(rawW,rawH):rawH);
    const visibleTop=portraitFallback?0:Math.max(0,Math.round(vv?.offsetTop||0));
    const layoutH=Math.max(320,portraitFallback?Math.max(Math.round(window.innerWidth||0),Math.round(window.innerHeight||0)):Math.round(window.innerHeight||0),portraitFallback?Math.max(Math.round(document.documentElement.clientWidth||0),Math.round(document.documentElement.clientHeight||0)):Math.round(document.documentElement.clientHeight||0));
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
  window.addEventListener("orientationchange",()=>setTimeout(()=>{syncPortraitPresentation();syncInstalledViewport();syncConversationStackHeight();},60),{passive:true});
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
// NANAKO v11 STEP 2.19 — FAST TURN CONTRACT + COMPLETE HISTORY TRANSLATIONS
// Python selects every semantic frame and its timing. JavaScript only applies
// that plan to the VRM canvas; there is no image renderer or fallback.
let nanakoMotion=null,nanakoAvatar=null;
let animationRaf=0;
let animationToken=0;
let idlePlanTimer=0;
let postSpeechHoldTimer=0;
let currentAnimationPlan=null;
let liveStreamMouthOverride="";
let cachedPythonIdlePlan=null;
let bodyAnimationsLoaded=false;
let bodyAnimationsLoading=null;
let currentBodyMotion="";
let pendingBodyMotion="neutral";

function requestedBodyMotion(frame){
  const explicit=String(frame?.body_motion||"").trim().toLowerCase();
  if(["neutral","angry","thinking","clapping"].includes(explicit))return explicit;
  return String(frame?.emotion||"").trim().toLowerCase()==="angry"?"angry":"neutral";
}

function syncBodyMotionForFrame(frame){
  const name=requestedBodyMotion(frame);
  pendingBodyMotion=name;
  if(!bodyAnimationsLoaded||currentBodyMotion===name)return;
  const loop=name==="neutral";
  const transitionSeconds=name==="thinking"?1.35:0.48;
  if(window.nanako3DRenderer?.playBodyAnimation?.(name,{loop,hold:true,transitionSeconds})){
    currentBodyMotion=name;
  }
}

async function loadProductionBodyAnimations(){
  if(bodyAnimationsLoaded)return true;
  if(bodyAnimationsLoading)return bodyAnimationsLoading;
  if(!window.nanako3DRenderer?.ready||!window.nanako3DRenderer?.loadBodyAnimations)return false;
  bodyAnimationsLoading=(async()=>{
    const result=await window.nanako3DRenderer.loadBodyAnimations({
      neutral:"./static/animations/nanako_idle.fbx?v=12.0.22",
      angry:"./static/animations/nanako_angry.fbx?v=12.0.22",
      thinking:"./static/animations/nanako_thinking.fbx?v=12.0.22",
      clapping:"./static/animations/nanako_clapping.fbx?v=12.0.22"
    });
    const loaded=new Set((result?.loaded||[]).map(item=>item.name));
    bodyAnimationsLoaded=["neutral","angry","thinking","clapping"].every(name=>loaded.has(name));
    if(!bodyAnimationsLoaded)throw new Error(`Only ${loaded.size}/4 Nanako body animations loaded.`);
    currentBodyMotion="";
    syncBodyMotionForFrame({body_motion:pendingBodyMotion,emotion:"neutral"});
    console.log("[Nanako 3D] Step 2.19 body animations ready: neutral, angry, thinking, clapping");
    return true;
  })().catch(err=>{bodyAnimationsLoading=null;console.error("[Nanako 3D body animation load]",err);return false});
  return bodyAnimationsLoading;
}

window.addEventListener("nanako3d-ready",async()=>{
  // Do not reveal the raw VRM bind pose. Load and start the neutral FBX first,
  // allow two rendered frames to settle, then reveal Nanako smoothly.
  const avatar=document.getElementById("nanakoAvatar");
  const enter=document.getElementById("startupEnterButton");
  avatar?.classList.remove("vrm-ready");avatar?.classList.add("vrm-loading");
  if(enter){enter.disabled=true;enter.textContent="Preparing Nanako…"}
  const ready=await loadProductionBodyAnimations();
  if(ready){
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    avatar?.classList.remove("vrm-loading");avatar?.classList.add("vrm-ready");
    if(enter){enter.disabled=false;enter.textContent="Enter"}
  }
});

function renderAnimationFrame(frame){
  if(!frame)return;
  window.__nanakoPending3DFrame=frame;
  if(window.nanako3DRenderer?.applyFrame)window.nanako3DRenderer.applyFrame(frame);
  syncBodyMotionForFrame(frame);
  const emotion=String(frame.emotion||"neutral").trim().toLowerCase()||"neutral";
  const scale=Number.isFinite(Number(frame.scale))?Number(frame.scale):1;
  const y=Number.isFinite(Number(frame.translate_y))?Number(frame.translate_y):0;
  if(nanakoMotion)nanakoMotion.style.transform=`translateY(${y}px) scale(${scale})`;
  if(nanakoAvatar){
    nanakoAvatar.dataset.emotion=emotion;
    nanakoAvatar.dataset.action=frame.action||"idle";
  }
}

function stopAnimationPlan(){
  animationToken+=1;
  if(animationRaf)cancelAnimationFrame(animationRaf);
  if(postSpeechHoldTimer)clearTimeout(postSpeechHoldTimer);
  postSpeechHoldTimer=0;
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
    // Stable audio-sync rule: every spoken plan follows the complete decoded media duration.
    // If mobile decoding reports a longer duration than Python's WAV timeline,
    // proportionally stretch the complete plan instead of freezing on its final
    // frame while Nanako is still audibly speaking.
    if(mediaClock&&["talking","laughing"].includes(String(plan?.kind||""))){
      const mediaDurationMs=Number(mediaClock.duration||0)*1000;
      if(Number.isFinite(mediaDurationMs)&&mediaDurationMs>duration+120&&mediaDurationMs>0){
        elapsed=Math.min(duration,elapsed*(duration/mediaDurationMs));
      }
    }

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
    const liveFrame=liveStreamMouthOverride&&mediaClock?{...frames[lo],mouth:liveStreamMouthOverride,action:"talking"}:frames[lo];
    renderAnimationFrame(liveFrame);

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

function idlePlanEmotion(plan){
  return String(plan?.emotion||plan?.frames?.[0]?.emotion||"neutral").trim().toLowerCase()||"neutral";
}

function idlePlanBodyMotion(plan){
  return String(plan?.body_motion||plan?.frames?.[0]?.body_motion||"neutral").trim().toLowerCase()||"neutral";
}

function playPythonIdlePlan(plan){
  if(currentAudio||!plan?.frames?.length)return false;
  cachedPythonIdlePlan=plan;
  const planEmotion=idlePlanEmotion(plan);
  const planBodyMotion=idlePlanBodyMotion(plan);
  // Paint Python's first idle snapshot immediately, then continue its breathing
  // and blink timeline. When it expires, refresh the SAME emotional idle.
  renderAnimationFrame(plan.frames[0]);
  playAnimationPlan(plan,{loop:false,onComplete:()=>requestIdleAnimation({preferCache:false,emotion:planEmotion,bodyMotion:planBodyMotion})});
  return true;
}

async function requestIdleAnimation({preferCache=true,emotion=null,bodyMotion=null}={}){
  clearTimeout(idlePlanTimer);
  if(currentAudio)return;

  const requestedEmotion=String(emotion||"").trim().toLowerCase();
  const requestedBodyMotion=String(bodyMotion||"").trim().toLowerCase();
  const cachedEmotion=idlePlanEmotion(cachedPythonIdlePlan);
  const cachedBodyMotion=idlePlanBodyMotion(cachedPythonIdlePlan);
  // Step 1.63: never reuse a neutral plan for an emotional idle (or vice versa).
  if(preferCache&&cachedPythonIdlePlan&&(!requestedEmotion||cachedEmotion===requestedEmotion)&&(!requestedBodyMotion||cachedBodyMotion===requestedBodyMotion)&&playPythonIdlePlan(cachedPythonIdlePlan))return;

  try{
    const emotionQuery=requestedEmotion?`&emotion=${encodeURIComponent(requestedEmotion)}`:"";
    const bodyMotionQuery=requestedBodyMotion?`&body_motion=${encodeURIComponent(requestedBodyMotion)}`:"";
    const r=await fetch(`${API}/api/animation/idle-plan?duration_ms=60000&sample_ms=100${emotionQuery}${bodyMotionQuery}`,{cache:"no-store"});
    const d=await r.json();
    if(!r.ok||!d?.ok||!d?.animation_plan)throw new Error(d?.error||`Animation request failed (${r.status})`);
    cachedPythonIdlePlan=d.animation_plan;
    if(!currentAudio)playPythonIdlePlan(cachedPythonIdlePlan);
  }catch(err){
    console.warn("[Nanako Animation] Python idle plan unavailable:",err);
    // Fail-safe keeps the requested emotion's current visual frame rather than
    // forcibly snapping an emotional pose to neutral during a temporary outage.
    if(!requestedEmotion||requestedEmotion==="neutral"){
      renderAnimationFrame({emotion:"neutral",action:"idle",eyes:"open",mouth:"closed",scale:1,translate_y:0});
    }
    idlePlanTimer=setTimeout(()=>requestIdleAnimation({preferCache:false,emotion:requestedEmotion||null,bodyMotion:requestedBodyMotion||null}),1500);
  }
}

function returnToPythonIdle({emotion=null,bodyMotion=null}={}){
  stopAnimationPlan();
  const target=String(emotion||"neutral").trim().toLowerCase()||"neutral";
  const targetBodyMotion=String(bodyMotion||"neutral").trim().toLowerCase()||"neutral";
  const cachedEmotion=idlePlanEmotion(cachedPythonIdlePlan);
  const cachedBodyMotion=idlePlanBodyMotion(cachedPythonIdlePlan);
  if(cachedPythonIdlePlan&&cachedEmotion===target&&cachedBodyMotion===targetBodyMotion&&playPythonIdlePlan(cachedPythonIdlePlan))return;
  cachedPythonIdlePlan=null;
  requestIdleAnimation({preferCache:false,emotion:target,bodyMotion:targetBodyMotion});
}

function finishPlanWithPostHold(plan,{idleEmotion=null,onDone=null}={}){
  const hold=Math.max(0,Math.min(2500,Number(plan?.post_speech_hold_ms)||0));
  const post=plan?.post_speech_frame;
  const postPlan=plan?.post_speech_plan;
  const planEmotion=String(plan?.emotion||"neutral").trim().toLowerCase()||"neutral";
  const target=String(idleEmotion||planEmotion||"neutral").trim().toLowerCase()||"neutral";
  const targetBodyMotion=idlePlanBodyMotion(plan);
  if(postPlan?.frames?.length){
    playAnimationPlan(postPlan,{onComplete:()=>{
      returnToPythonIdle({emotion:target,bodyMotion:idlePlanBodyMotion(postPlan)||targetBodyMotion});
      if(typeof onDone==="function")onDone();
    }});
    return;
  }
  if(hold>0&&post){
    stopAnimationPlan();
    renderAnimationFrame(post);
    postSpeechHoldTimer=setTimeout(()=>{
      postSpeechHoldTimer=0;
      returnToPythonIdle({emotion:target,bodyMotion:targetBodyMotion});
      if(typeof onDone==="function")onDone();
    },hold);
    return;
  }
  returnToPythonIdle({emotion:target,bodyMotion:targetBodyMotion});
  if(typeof onDone==="function")onDone();
}

function useTalkingAnimation(plan,mediaClock=null){
  clearTimeout(idlePlanTimer);
  if(plan?.frames?.length)playAnimationPlan(plan,{mediaClock});
  else renderAnimationFrame({emotion:"neutral",action:"talking",eyes:"open",mouth:"small",scale:1,translate_y:0});
}



const CLIENT_BUILD="12.0.22",RELEASE_VERSION="2.19.3",API="https://nanako-web-pokbkohedy.ap-southeast-1.fcapp.run",CHAT=`${API}/api/chat`,VISION_IDENTIFY=`${API}/api/vision/identify`,RESET=`${API}/api/reset`,STARTUP_GREETING=`${API}/api/startup-greeting`,REALTIME_ENRICH=`${API}/api/realtime/enrich`;
const startupVersionMarker=document.getElementById("startupVersion");if(startupVersionMarker)startupVersionMarker.textContent=`Version ${RELEASE_VERSION}`;
const verifiedBuildMarker=document.getElementById("buildMarker");if(verifiedBuildMarker)verifiedBuildMarker.textContent=`v11 Step ${RELEASE_VERSION} • Qwen3-ASR-Flash + Qwen3.5-Flash + Fish Audio Streaming • JavaScript ${CLIENT_BUILD} verified`;
const FISH_TTS_STREAM=`${API}/api/fish-tts-stream`;
const MIC_START=`${API}/api/mic/session/start`,MIC_FRAME=`${API}/api/mic/session/frame`,MIC_INSPECT=`${API}/api/mic/session/inspect`,MIC_RESPOND=`${API}/api/mic/session/respond`,MIC_STOP=`${API}/api/mic/session/stop`,MIC_SPEAKING=`${API}/api/mic/session/speaking`;
const RUNTIME_CHECK=`${API}/runtime-check`;
const LAST_GREETING_KEY="nanako_last_startup_greeting_v1";
const MEMORY_KEY="nanakoPersistentMemoryV1";
const USER_NAME_KEY="nanakoPersistentUserNameV1";
const SESSION_HISTORY_MAX=600,MEMORY_SEND_MAX=16,MEMORY_FACT_MAX=80,LEARNER_PREFERENCE_MAX=100,LEARNER_TOPIC_MAX=80,LEARNER_PROGRESS_MAX=100,LEARNER_INTERACTION_MAX=100;
let persistentFacts=[],learnerMemory={preferences:[],topic_affinities:[],language_progress:[],interaction_patterns:[]},persistentUserName="",startupGreetingData=null,startupGreetingPlayed=false,startupGreetingLoading=null,startupGreetingPlayPromise=null;
function loadPersistentMemory(){
  try{
    const stored=localStorage.getItem(MEMORY_KEY),raw=JSON.parse(stored||"{}");
    const f=Array.isArray(raw.facts)?raw.facts:[];
    const storedUserName=String(raw?.profile?.user_name||localStorage.getItem(USER_NAME_KEY)||"").trim();
    const lm=raw?.learner_memory&&typeof raw.learner_memory==="object"?raw.learner_memory:{};
    learnerMemory={
      preferences:Array.isArray(lm.preferences)?lm.preferences.slice(-LEARNER_PREFERENCE_MAX):[],
      topic_affinities:Array.isArray(lm.topic_affinities)?lm.topic_affinities.slice(-LEARNER_TOPIC_MAX):[],
      language_progress:Array.isArray(lm.language_progress)?lm.language_progress.slice(-LEARNER_PROGRESS_MAX):[],
      interaction_patterns:Array.isArray(lm.interaction_patterns)?lm.interaction_patterns.slice(-LEARNER_INTERACTION_MAX):[]
    };
    persistentUserName=cleanNameCandidate(storedUserName);
    // Conversation text is session-only. Legacy saved history from older
    // builds is deliberately ignored and removed on the next memory save.
    history.length=0;
    persistentFacts=f.map(x=>String(x||"").trim()).filter(x=>x&&!memoryFactHasInvalidName(x)).slice(-MEMORY_FACT_MAX);
    if(storedUserName!==persistentUserName||persistentFacts.length!==f.map(x=>String(x||"").trim()).filter(Boolean).slice(-MEMORY_FACT_MAX).length)savePersistentMemory();
  }catch(err){console.warn("[Nanako Memory] restore failed",err);history.length=0;persistentFacts=[];learnerMemory={preferences:[],topic_affinities:[],language_progress:[],interaction_patterns:[]};persistentUserName="";}
}
function savePersistentMemory(){
  try{
    const payload={version:5,updated_at:Date.now(),reset_complete:false,facts:persistentFacts.slice(-MEMORY_FACT_MAX),learner_memory:learnerMemory,profile:{user_name:persistentUserName||""}};
    localStorage.setItem(MEMORY_KEY,JSON.stringify(payload));
    if(persistentUserName)localStorage.setItem(USER_NAME_KEY,persistentUserName);else localStorage.removeItem(USER_NAME_KEY);
  }catch(err){console.warn("[Nanako Memory] save failed",err);}
}
function cleanNameCandidate(value){
  let s=String(value||"").trim().replace(/[。！？!?、,:;]+$/g,"");
  if(!s||s.length>24||/\s{2,}/.test(s))return"";
  if(/^(fine|good|okay|ok|happy|tired|busy|here|back|nanako|nani|what|this|kore)$/i.test(s))return"";
  if(/^(ななこ|ナナコ|なに|ナニ|何|なん|ナン|これは|これ|それ|あれ|だれ|誰|どれ|どこ|いつ|なぜ|どうして)$/.test(s))return"";
  return s;
}
function memoryFactHasInvalidName(value){
  const text=String(value||"");
  const m=text.match(/(?:the )?(?:user|learner)(?:'s|’s)? name is\s+([^.;,!！？，、]{1,32})/i)||text.match(/(?:the )?(?:user|learner) is\s+([^.;,!！？，、]{1,32})/i)||text.match(/(?:ユーザー|学習者)の名前は\s*([^。！？，、]{1,24})/);
  return !!(m&&!cleanNameCandidate(m[1]));
}
function detectUserNameFromText(value){
  const msg=String(value||"").trim();if(!msg)return"";
  const roman="[A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’\\-]+";
  const patterns=[
    new RegExp(`(?:my name is|call me|i am|i'm)\\s+(${roman}(?:\\s+${roman}){0,2})(?:[.!?]|$)`,`i`),
    /(?:私の名前は|僕の名前は|俺の名前は|名前は)\s*([ぁ-んァ-ヶー一-龯A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’\-]{1,24}?)(?:です|だよ|といいます|っていいます)[。！!]?\s*$/,
    /(?:私は|僕は|俺は)?\s*([ァ-ヶー一-龯A-Za-zÀ-ÖØ-öø-ÿĀ-ž'’\-]{1,24})\s*(?:といいます|っていいます)[。！!]?\s*$/
    ,/(?:私は|僕は|俺は)\s*([ぁ-んァ-ヶーA-Za-zÀ-ÖØ-öø-ÿĀ-ž'’\-]{1,24})\s*(?:です|だよ|っていう)[。！!]?\s*$/
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
  for(const item of items){const fact=String(item||"").trim();if(!fact||memoryFactHasInvalidName(fact))continue;const key=fact.toLowerCase();if(seen.has(key))continue;seen.add(key);persistentFacts.push(fact);}
  if(persistentFacts.length>MEMORY_FACT_MAX)persistentFacts=persistentFacts.slice(-MEMORY_FACT_MAX);
  if(!persistentUserName)rememberDetectedUserName();
  savePersistentMemory();
}
function cleanMemoryText(value,max=180){return String(value||"").replace(/\s+/g," ").trim().slice(0,max)}
function mergeLearnerMemory(updates){
  if(!updates||typeof updates!=="object")return;
  const prefs=Array.isArray(updates.preferences)?updates.preferences:[];
  for(const raw of prefs){const category=cleanMemoryText(raw?.category,40),item=cleanMemoryText(raw?.item,100),sentiment=cleanMemoryText(raw?.sentiment,16).toLowerCase(),evidence=cleanMemoryText(raw?.evidence);if(!item||!["like","dislike","favorite","avoid"].includes(sentiment))continue;const key=`${category}|${item}`.toLowerCase();const existing=learnerMemory.preferences.find(x=>`${x.category}|${x.item}`.toLowerCase()===key);const next={category,item,sentiment,evidence,observations:Math.min(99,(Number(existing?.observations)||0)+1),successes:0};if(existing)Object.assign(existing,next);else learnerMemory.preferences.push(next)}
  const topics=Array.isArray(updates.topic_affinities)?updates.topic_affinities:[];
  for(const raw of topics){const topic=cleanMemoryText(raw?.topic,100),affinity=cleanMemoryText(raw?.affinity,16).toLowerCase(),evidence=cleanMemoryText(raw?.evidence);if(!topic||!["likes","dislikes","avoid"].includes(affinity))continue;const existing=learnerMemory.topic_affinities.find(x=>String(x.topic).toLowerCase()===topic.toLowerCase());const next={topic,affinity,evidence,observations:Math.min(99,(Number(existing?.observations)||0)+1),successes:0};if(existing)Object.assign(existing,next);else learnerMemory.topic_affinities.push(next)}
  const progress=Array.isArray(updates.language_progress)?updates.language_progress:[];
  for(const raw of progress){const pattern=cleanMemoryText(raw?.pattern,100),original=cleanMemoryText(raw?.original),corrected=cleanMemoryText(raw?.corrected),category=cleanMemoryText(raw?.category,50),event=cleanMemoryText(raw?.event,16).toLowerCase(),last_evidence=cleanMemoryText(raw?.last_evidence);if(!pattern||!["mistake","improvement"].includes(event))continue;let existing=learnerMemory.language_progress.find(x=>String(x.pattern).toLowerCase()===pattern.toLowerCase()||(corrected&&String(x.corrected).toLowerCase()===corrected.toLowerCase()));if(!existing){existing={pattern,original,corrected,category,last_evidence,observations:0,successes:0};learnerMemory.language_progress.push(existing)}if(event==="mistake"){existing.observations=Math.min(99,(Number(existing.observations)||0)+1);if(original)existing.original=original;if(corrected)existing.corrected=corrected}else{existing.successes=Math.min(99,(Number(existing.successes)||0)+1)}existing.last_evidence=last_evidence||existing.last_evidence;existing.category=category||existing.category}
  const interactions=Array.isArray(updates.interaction_patterns)?updates.interaction_patterns:[];
  for(const raw of interactions){const kind=cleanMemoryText(raw?.kind,32).toLowerCase(),topic=cleanMemoryText(raw?.topic,100),tone=cleanMemoryText(raw?.tone,24).toLowerCase(),evidence=cleanMemoryText(raw?.evidence);if(!kind||!evidence)continue;const key=`${kind}|${topic||evidence}`.toLowerCase();const existing=learnerMemory.interaction_patterns.find(x=>`${x.kind}|${x.topic||x.evidence}`.toLowerCase()===key);const next={kind,topic,tone,evidence,observations:Math.min(99,(Number(existing?.observations)||0)+1),successes:0};if(existing)Object.assign(existing,next);else learnerMemory.interaction_patterns.push(next)}
  learnerMemory.preferences=learnerMemory.preferences.slice(-LEARNER_PREFERENCE_MAX);learnerMemory.topic_affinities=learnerMemory.topic_affinities.slice(-LEARNER_TOPIC_MAX);learnerMemory.language_progress=learnerMemory.language_progress.slice(-LEARNER_PROGRESS_MAX);learnerMemory.interaction_patterns=learnerMemory.interaction_patterns.slice(-LEARNER_INTERACTION_MAX);savePersistentMemory();
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
    learner_memory:learnerMemory,
    client_build:CLIENT_BUILD,
    user_name:persistentUserName||""
  };
}
async function checkPythonRuntime(){const el=document.getElementById("runtimeStatus");try{const r=await fetch(RUNTIME_CHECK,{cache:"no-store"});const d=await r.json();const matched=String(d.required_client_build||"")===CLIENT_BUILD,vrmMatched=String(d.avatar_renderer_contract||"")==="nanako-vrm-1.1-python-plan-fbx",ok=!!(matched&&vrmMatched&&d.python_running&&d.mic_engine_loaded&&d.animation_engine_loaded&&d.behavior_engine_loaded&&d.visual_awareness_engine_loaded&&d.split_pipeline_loaded&&d.qwen_backend_configured&&d.fish_audio_configured);if(el)el.textContent=ok?`Python runtime: ONLINE • build ${CLIENT_BUILD} matched • split ASR/LLM/TTS + 3D + mic + animation + vision loaded`:matched&&!vrmMatched?"3D CONTRACT MISMATCH • deploy the Step 2.19 Function Compute backend":matched?"Python runtime: incomplete — check Alibaba deployment":`VERSION MISMATCH • frontend ${CLIENT_BUILD} / backend ${d.required_client_build||"unknown"}`;console.log("[Nanako v11 runtime-check]",d);}catch(err){if(el)el.textContent="Python runtime: OFFLINE / unreachable";console.warn("[Nanako v11 runtime-check failed]",err);}}
setTimeout(checkPythonRuntime,150);
const MIC_TARGET_RATE=16000,MIC_BATCH_SAMPLES=3200; // 200 ms transport batches only. Python decides VAD/turn boundaries.
const $=id=>document.getElementById(id),e={levelBadge:$("levelBadge"),scoreFill:$("scoreFill"),scoreText:$("scoreText"),settingsScore:$("settingsScore"),settingsScoreFill:$("settingsScoreFill"),userTranscript:$("userTranscript"),userTranscriptText:$("userTranscriptText"),status:$("statusText"),awareness:$("videoAwarenessButton"),awarenessVideo:$("awarenessVideo"),visionDiagnostic:$("visionDiagnostic"),micDiagnostic:$("micDiagnostic"),ro:$("romajiButton"),en:$("englishButton"),historyRO:$("historyRomajiButton"),historyEN:$("historyEnglishButton"),mute:$("muteButton"),jp:$("japaneseReply"),roSec:$("romajiSection"),enSec:$("englishSection"),roText:$("romajiReply"),enText:$("englishReply"),input:$("messageInput"),send:$("sendButton"),camera:$("cameraButton"),cameraModal:$("cameraModal"),cameraVideo:$("cameraVideo"),cameraStatus:$("cameraStatus"),cameraQuestion:$("cameraQuestion"),askCamera:$("askCameraButton"),closeCamera:$("closeCameraButton"),conv:$("conversationButton"),corr:$("correctionToast"),wrong:$("wrongText"),correct:$("correctText"),err:$("errorToast"),settings:$("settingsModal"),menu:$("menuButton"),closeSettings:$("closeSettingsButton"),historyBtn:$("historyButton"),historyModal:$("historyModal"),closeHistory:$("closeHistoryButton"),historyEmpty:$("historyEmpty"),historyList:$("historyList"),levelValue:$("levelValue"),levelGrid:$("levelGrid"),styleValue:$("styleValue"),styleGrid:$("styleGrid"),reset:$("resetButton"),debugMic:$("debugMic"),debugRoom:$("debugRoom"),debugSpeech:$("debugSpeech"),debugTurn:$("debugTurn")};
let level="auto",autoEffectiveLevel="",speechStyle="auto",autoEffectiveStyle="",settingSwitchBusy=false,score=0,showRO=false,showEN=false,muted=false,active=false,busy=false,currentAudio=null,currentAudioObjectUrl="",stream=null,ctx=null,micSource=null,micProcessor=null,micWorkletNode=null,micWorkletUsing=false,micSessionId="",micSessionGeneration=0,activeMicTurnController=null,micBatch=[],micQueue=[],micPumpBusy=false,micCapturePaused=true,userSpeechActive=false,transcriptTimer=0,correctionTimer=0,audioUnlocked=false,bargeCaptureTimer=0,startupGestureArmed=false,startupEnterDone=false,micZeroChunkCount=0,micHardwareRecoveryBusy=false,micLastHardwareRecoveryAt=0,fishStreamAbort=null,fishAudioCtx=null,fishScheduledSources=[];const history=[];const ttsAudio=new Audio();ttsAudio.preload="auto";ttsAudio.playsInline=true;
let micUploadedBytes=0,visionAnalysisCount=0,visionImageTokens=0;
function updateResourceDiagnostics(){if(e.visionDiagnostic)e.visionDiagnostic.textContent=`Vision analyses: ${visionAnalysisCount} • image tokens: ${visionImageTokens}`;if(e.micDiagnostic)e.micDiagnostic.textContent=`Microphone uploaded: ${(micUploadedBytes/1024).toFixed(1)} KB • capture: ${micWorkletUsing?"continuous AudioWorklet":"continuous compatibility"} • VAD: Python`}
function imageTokensFromUsage(value){let total=0;if(!value||typeof value!=="object")return 0;for(const [key,item] of Object.entries(value)){if(/image.*token/i.test(key)&&Number.isFinite(Number(item)))total+=Number(item);else if(item&&typeof item==="object")total+=imageTokensFromUsage(item)}return total}
const SILENT_WAV="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const status=t=>e.status.textContent=t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),label=l=>l==="auto"?"Auto":l.toUpperCase();
function updateLevelDisplay(){const shown=level==="auto"&&autoEffectiveLevel?`Auto · ${autoEffectiveLevel.toUpperCase()}`:label(level);e.levelBadge.textContent=e.levelValue.textContent=shown}
function updateStyleDisplay(){e.styleValue.textContent=speechStyle==="auto"&&autoEffectiveStyle?`Auto · ${autoEffectiveStyle[0].toUpperCase()}${autoEffectiveStyle.slice(1)}`:`${speechStyle[0].toUpperCase()}${speechStyle.slice(1)}`}
function setScore(v){score=clamp(Math.round(Number(v)||0),0,100);let w=`${score}%`;e.scoreText.textContent=score;e.scoreFill.style.width=w;e.settingsScore.textContent=`${score} / 100`;e.settingsScoreFill.style.width=w}
function error(m){e.err.textContent=String(m||"Something went wrong.");e.err.hidden=false;clearTimeout(error.t);error.t=setTimeout(()=>e.err.hidden=true,6000)}
function transcript(){clearTimeout(transcriptTimer);e.userTranscript.hidden=true;e.userTranscript.style.opacity="0"}
function correction(d){let a=d?.analysis&&typeof d.analysis==="object"?d.analysis:{},o=String(a.wrong_text??a.original??a.original_text??a.user_text??"").trim(),c=String(a.correct_text??a.corrected??a.corrected_text??a.correction??"").trim(),n=a.needs_correction===true||a.correct===false||a.is_correct===false||!!(o&&c&&o!==c);return{n,o,c,romaji:String(a.corrected_romaji||"").trim(),english:String(a.corrected_english||"").trim()}}
function showCorrection(x){clearTimeout(correctionTimer);if(!x.n||!x.o||!x.c){e.corr.hidden=true;return}e.wrong.textContent=x.o;e.correct.textContent=`→ ${x.c}`;e.corr.hidden=false;correctionTimer=setTimeout(()=>e.corr.hidden=true,5000)}
function addHistory(role,text,x=null,details={}){const entry={role,text:String(text||""),wrong:x?.n?x.o:"",corrected:x?.n?x.c:"",correctionRomaji:x?.n?String(x.romaji||""):"",correctionEnglish:x?.n?String(x.english||""):"",romaji:String(details?.romaji||""),english:String(details?.english||"")};history.push(entry);if(history.length>SESSION_HISTORY_MAX)history.splice(0,history.length-SESSION_HISTORY_MAX);if(role==="user")rememberUserNameFromText(text);renderHistory();savePersistentMemory();return entry}
function addEphemeralStartupHistory(text,details={}){
  const t=String(text||"").trim();if(!t)return;
  // Keep only the current boot greeting as transient context. It is sent to Python
  // on the next turn but is deliberately not saved across restarts.
  for(let i=history.length-1;i>=0;i--){if(history[i]?.ephemeral)history.splice(i,1);}
  history.push({role:"assistant",text:t,wrong:"",corrected:"",romaji:String(details?.romaji||""),english:String(details?.english||""),ephemeral:true});
  renderHistory();
}
function renderHistory(){e.historyList.innerHTML="";e.historyEmpty.hidden=history.length>0;history.forEach(h=>{let b=document.createElement("div");b.className=`history-bubble ${h.role==="user"?"user":""}`;let r=document.createElement("div");r.className="history-role";r.textContent=h.role==="user"?"YOU":"NANAKO";let t=document.createElement("div");t.className="history-text";t.textContent=h.text;b.append(r,t);if(showRO&&h.romaji){let ro=document.createElement("div");ro.className="history-translation history-romaji";ro.textContent=h.romaji;b.append(ro)}if(showEN&&h.english){let en=document.createElement("div");en.className="history-translation history-english";en.textContent=h.english;b.append(en)}if(h.wrong&&h.corrected){let c=document.createElement("div");c.className="history-correction";c.innerHTML=`<div class="history-wrong"></div><div class="history-correct"></div>`;c.children[0].textContent=h.wrong;c.children[1].textContent=h.corrected;if(showRO&&h.correctionRomaji){let cr=document.createElement("div");cr.className="history-correction-translation";cr.textContent=h.correctionRomaji;c.append(cr)}if(showEN&&h.correctionEnglish){let ce=document.createElement("div");ce.className="history-correction-translation english";ce.textContent=h.correctionEnglish;c.append(ce)}b.append(c)}e.historyList.append(b)})}
function quick(){e.awareness.classList.toggle("active",awarenessActive);e.ro.classList.toggle("active",showRO);e.historyRO?.classList.toggle("active",showRO);e.roSec.hidden=!showRO;e.en.classList.toggle("active",showEN);e.historyEN?.classList.toggle("active",showEN);e.enSec.hidden=!showEN;e.mute.classList.toggle("active",muted);e.mute.textContent=muted?"🔇":"🔊";renderHistory()}
function convButton(){e.conv.classList.toggle("active",active);e.conv.classList.remove("interrupt");e.conv.textContent=active?"⏹ End Conversation":"🎤 Start Conversation"}
async function jsonResp(r){let d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.error||d?.message||`Request failed (${r.status})`);return d}
async function apply(d,user,options={}){mergeMemoryFacts(d?.memory_facts);mergeLearnerMemory(d?.memory_updates);if(level==="auto"){const inferred=String(d?.effective_response_level||d?.analysis?.estimated_jlpt_level||"").toLowerCase();autoEffectiveLevel=/^n[1-5]$/.test(inferred)?inferred:"";updateLevelDisplay()}if(speechStyle==="auto"){const inferredStyle=String(d?.effective_speech_style||d?.analysis?.estimated_speech_style||"").toLowerCase();autoEffectiveStyle=/^(?:casual|formal)$/.test(inferredStyle)?inferredStyle:"";updateStyleDisplay()}e.jp.textContent=String(d?.reply||"");e.roText.textContent=String(d?.romaji||"");e.enText.textContent=String(d?.english||"");let s=Number(d?.conversation_score??d?.score??d?.analysis?.conversation_score);if(Number.isFinite(s))setScore(s);let x=correction(d);showCorrection(x);if(!options.spontaneous)addHistory("user",user,x,{romaji:d?.user_romaji,english:d?.user_english});addHistory("assistant",d?.reply||"",null,{romaji:d?.romaji,english:d?.english});let b=d?.audio_base64||d?.tts_audio_base64||d?.audio||"",m=d?.audio_mime||d?.mime_type||"audio/wav";const idleEmotion=String(d?.animation_plan?.emotion||"neutral").trim().toLowerCase()||"neutral";if(d?.tts_stream&&!muted)await playFishStreaming(String(d?.reply||""),d?.animation_plan,{idleEmotion,voiceStyle:String(d?.tts_voice_style||"normal"),sampleRate:Number(d?.tts_sample_rate||24000)});else if(b&&!muted)await play(b,m,d?.animation_plan,{idleEmotion,voiceMode:String(d?.response_mode||"talking")});else if(d?.voice_unavailable){console.warn("[Nanako Audio] Voice renderer unavailable; preserving text and resuming microphone.");stopAnimationPlan();returnToPythonIdle({emotion:idleEmotion});micCapturePaused=false;if(active){status("Listening...");setTimeout(begin,20)}}else{if(d?.animation_plan)playAnimationPlan(d.animation_plan,{onComplete:()=>finishPlanWithPostHold(d.animation_plan,{idleEmotion,onDone:()=>{if(active)setTimeout(begin,20)}})});else{finishPlanWithPostHold(null,{idleEmotion,onDone:()=>{if(active)setTimeout(begin,20)}})}}}
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
      addEphemeralStartupHistory(d.reply||"",{romaji:d.romaji,english:d.english});
      status(userName?`Welcome back${userName?`, ${userName}`:""}`:"Nice to meet you");
      return d;
    }catch(err){
      console.warn("[Nanako Startup] greeting failed",err);
      const fallback=rememberDetectedUserName()?`おかえり、${rememberDetectedUserName()}！また話そうね。`:"はじめまして！ななこです。今日は元気？";
      e.jp.textContent=fallback;e.roText.textContent="";e.enText.textContent="";addEphemeralStartupHistory(fallback);
      return null;
    }finally{
      // Step 2.18 fix: previously this promise was cached forever, even on
      // failure or when no audio came back. That permanently froze the
      // splash-screen greeting/name state for the rest of the session and
      // could leave a stale "first meeting" line in place. Clearing it here
      // still de-dupes concurrent in-flight calls (the guard above) but lets
      // a later call legitimately re-fetch once this attempt has settled.
      startupGreetingLoading=null;
    }
  })();
  return startupGreetingLoading;
}
async function playStartupGreetingIfReady(fromGesture=false){
  if(startupGreetingPlayed||muted)return false;
  if(startupGreetingPlayPromise)return startupGreetingPlayPromise;
  startupGreetingPlayPromise=(async()=>{
    const d=startupGreetingData||await fetchStartupGreeting();
    if(!d)return false;
    let ok=false;
    if(d?.tts_stream&&!muted){
      ok=await playFishStreaming(String(d?.reply||""),d?.animation_plan,{idleEmotion:String(d?.animation_plan?.emotion||"neutral"),voiceStyle:String(d?.tts_voice_style||"normal"),sampleRate:Number(d?.tts_sample_rate||24000)});
    }else if(d?.audio_base64){
      ok=await play(d.audio_base64,d.audio_mime||"audio/wav",d.animation_plan,{gestureImmediate:!!fromGesture,silentFailure:true,idleEmotion:"neutral"});
    }
    if(ok)startupGreetingPlayed=true;
    return ok;
  })();
  try{return await startupGreetingPlayPromise;}finally{startupGreetingPlayPromise=null;}
}
async function send(){let t=e.input.value.trim();if(!t||busy)return;rememberUserNameFromText(t);busy=true;status("Nanako is thinking...");try{let r=await fetch(CHAT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t,level,speech_style:speechStyle,voice_output:true,...memoryPayload()})}),d=await jsonResp(r);e.input.value="";transcript(t);await apply(d,t)}catch(x){console.error(x);error(x.message);status("Chat failed.")}finally{busy=false;if(!currentAudio&&!active)status("Ready to chat")}}

let awarenessActive=false,awarenessStream=null,awarenessResumeAfterObject=false;
function captureAwarenessFrame(){const video=e.awarenessVideo;if(!video?.videoWidth||!video?.videoHeight)throw new Error("The visual-awareness camera is not ready.");const maxSide=480,scale=Math.min(1,maxSide/Math.max(video.videoWidth,video.videoHeight));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));canvas.getContext("2d",{alpha:false}).drawImage(video,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/jpeg",.68)}
async function startVisualAwareness(){if(awarenessActive||busy)return;if(!navigator.mediaDevices?.getUserMedia){error("Front-camera vision requires HTTPS.");return}status("Starting front-camera vision...");try{awarenessStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"user"},width:{ideal:320},height:{ideal:240},frameRate:{ideal:5,max:8}},audio:false});e.awarenessVideo.srcObject=awarenessStream;await e.awarenessVideo.play();awarenessActive=true;quick();status("Vision ready — say ナナコ、見て")}catch(x){console.error(x);try{awarenessStream?.getTracks().forEach(t=>t.stop())}catch{}awarenessStream=null;e.awarenessVideo.srcObject=null;awarenessActive=false;quick();error("Allow front-camera access, then tap the eye again.");status(active?"Listening...":"Ready to chat")}}
async function stopVisualAwareness(options={}){awarenessActive=false;try{awarenessStream?.getTracks().forEach(t=>t.stop())}catch{}awarenessStream=null;if(e.awarenessVideo)e.awarenessVideo.srcObject=null;quick();if(!options.silent)status(active?"Listening...":"Vision ready mode off")}
async function toggleVisualAwareness(){if(awarenessActive)await stopVisualAwareness();else await startVisualAwareness()}

let cameraStream=null,cameraVoiceMode=false,cameraStartedMic=false;
async function closeCamera(){cameraVoiceMode=false;if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null}if(e.cameraVideo)e.cameraVideo.srcObject=null;if(e.cameraModal)e.cameraModal.hidden=true;if(e.cameraStatus)e.cameraStatus.textContent="Camera is off";if(cameraStartedMic){cameraStartedMic=false;await stopMode()}if(awarenessResumeAfterObject){awarenessResumeAfterObject=false;await startVisualAwareness()}}
async function openCamera(){if(busy)return;if(!navigator.mediaDevices?.getUserMedia){error("Camera access is not supported in this browser.");return}if(awarenessActive){awarenessResumeAfterObject=true;await stopVisualAwareness({silent:true})}e.cameraModal.hidden=false;e.cameraStatus.textContent="Starting camera...";try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:960}},audio:false});e.cameraVideo.srcObject=cameraStream;await e.cameraVideo.play()}catch(x){console.error(x);e.cameraStatus.textContent="Camera permission was not granted";error("Allow camera access, then try again.");if(awarenessResumeAfterObject){awarenessResumeAfterObject=false;await startVisualAwareness()}return}cameraVoiceMode=true;cameraStartedMic=!active;if(!active){e.cameraStatus.textContent="Starting microphone...";await startMode()}if(active){e.cameraStatus.textContent="Listening — say これは何？ or tap Ask Nanako"}else{e.cameraStatus.textContent="Microphone unavailable — tap Ask Nanako"}}
function captureCameraFrame(){const video=e.cameraVideo;if(!video?.videoWidth||!video?.videoHeight)throw new Error("The camera is not ready yet.");const maxSide=960,scale=Math.min(1,maxSide/Math.max(video.videoWidth,video.videoHeight));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));canvas.getContext("2d",{alpha:false}).drawImage(video,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/jpeg",.82)}
async function askCamera(){if(busy)return;let question=String(e.cameraQuestion?.value||"").trim()||"これは何？";busy=true;micCapturePaused=true;micQueue=[];micBatch=[];e.askCamera.disabled=true;e.cameraStatus.textContent="Nanako is looking...";status("Nanako is looking...");try{if(active&&micSessionId)await restartPythonMicSession();const image_data_url=captureCameraFrame();const r=await fetch(VISION_IDENTIFY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_data_url,question,level,speech_style:speechStyle,client_build:CLIENT_BUILD})});const d=await jsonResp(r);transcript(question);e.cameraStatus.textContent="Nanako is answering...";await apply(d,question)}catch(x){console.error(x);error(x.message);e.cameraStatus.textContent="Could not identify the object. Try again.";status("Vision failed.");micCapturePaused=false}finally{busy=false;e.askCamera.disabled=false;if(!currentAudio&&active)setTimeout(begin,40);else if(!currentAudio&&!active)status("Ready to chat")}}
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

async function stopAudio(resume=false,restoreIdle=true){
  if(fishStreamAbort){try{fishStreamAbort.abort()}catch{} fishStreamAbort=null;}
  liveStreamMouthOverride="";
  for(const src of fishScheduledSources.splice(0)){try{src.stop()}catch{}}
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
  if(restoreIdle)returnToPythonIdle();
  convButton();
  if(resume&&active){
    status("Listening...");
    setTimeout(begin,40);
  }
}

async function playFishStreaming(text,animationPlan=null,options={}){
  if(!text||muted){if(active)setTimeout(begin,40);return false;}
  await stopAudio(false,false);
  if(fishStreamAbort){try{fishStreamAbort.abort()}catch{} fishStreamAbort=null;}
  for(const src of fishScheduledSources.splice(0)){try{src.stop()}catch{}}
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){console.warn("[Fish Stream] Web Audio unavailable");return false;}
  fishAudioCtx=fishAudioCtx||new AC();
  await fishAudioCtx.resume().catch(()=>{});
  const sampleRate=Math.max(8000,Math.min(48000,Number(options?.sampleRate)||24000));
  const voiceStyle=String(options?.voiceStyle||"normal");
  const idleEmotion=String(options?.idleEmotion||animationPlan?.emotion||"neutral").trim().toLowerCase()||"neutral";
  const ctrl=new AbortController();fishStreamAbort=ctrl;
  let streamClockStart=fishAudioCtx.currentTime+0.06;
  const mediaClock={duration:0,ended:false,get currentTime(){return Math.max(0,fishAudioCtx.currentTime-streamClockStart)},pause(){try{ctrl.abort()}catch{};for(const src of fishScheduledSources.splice(0)){try{src.stop()}catch{}};this.ended=true;},load(){},src:""};
  currentAudio=mediaClock;micQueue=[];micBatch=[];micCapturePaused=true;await setServerNanakoSpeaking(true);status("Nanako is speaking...");convButton();
  let nextStart=streamClockStart,playedStart=nextStart,totalSamples=0,pending=new Uint8Array(0),failed=false;
  liveStreamMouthOverride="closed";useTalkingAnimation(animationPlan,mediaClock);

  // Step 2.19.3: VRoid viseme lip-sync.  Fish still streams raw PCM, but mouth
  // motion is no longer a two-size amplitude toggle.  We keep a continuous
  // analysis buffer across network chunks, use real silence to close the mouth,
  // use a half-open transition on speech attacks, and use VRoid A/I/U/E/O
  // expressions for voiced syllables.  This preserves streaming latency while
  // restoring the richer cadence of the earlier non-streaming animation.
  const buildVisemeTrack=value=>{
    const out=[];
    const mapChar=ch=>{
      if("あかがさざただなはばぱまやらわぁゃアカガサザタダナハバパマヤラワァャ".includes(ch))return"aa";
      if("いきぎしじちぢにひびぴみりゐぃイキギシジチヂニヒビピミリヰィ".includes(ch))return"ih";
      if("うくぐすずつづぬふぶぷむゆるぅゅゔウクグスズツヅヌフブプムユルゥュヴ".includes(ch))return"ou";
      if("えけげせぜてでねへべぺめれゑぇエケゲセゼテデネヘベペメレヱェ".includes(ch))return"ee";
      if("おこごそぞとどのほぼぽもよろをぉょオコゴソゾトドノホボポモヨロヲォョ".includes(ch))return"oh";
      return"";
    };
    for(const ch of String(value||"")){const v=mapChar(ch);if(v)out.push(v);}
    // Japanese is normal, but keep a varied safe fallback for any loanword/Latin reply.
    return out.length?out:["aa","ih","ou","ee","oh","ih","aa","ou"];
  };
  const lipVisemes=buildVisemeTrack(text);
  let lipVisemeIndex=0,lipSmoothedRms=0,lipWasClosed=true,lipPendingSamples=new Float32Array(0),lipPendingWhen=0;
  const lipWindowSamples=Math.max(1,Math.round(sampleRate*0.105));
  const scheduleLipFrame=(mouth,when)=>setTimeout(()=>{
    if(currentAudio===mediaClock&&!mediaClock.ended)liveStreamMouthOverride=mouth;
  },Math.max(0,(when-fishAudioCtx.currentTime)*1000));
  // Explicitly begin from a closed mouth before the first audible syllable.
  scheduleLipFrame("closed",streamClockStart);
  const feedLipSamples=(floats,when)=>{
    if(!floats?.length)return;
    // If the browser/network created a real playback gap, do not let a partial
    // analysis window from before that gap create catch-up mouth frames later.
    if(lipPendingSamples.length){
      const expectedNext=lipPendingWhen+(lipPendingSamples.length/sampleRate);
      if(when>expectedNext+0.070){lipPendingSamples=new Float32Array(0);lipWasClosed=true;}
    }
    if(!lipPendingSamples.length)lipPendingWhen=when;
    const merged=new Float32Array(lipPendingSamples.length+floats.length);merged.set(lipPendingSamples);merged.set(floats,lipPendingSamples.length);lipPendingSamples=merged;
    while(lipPendingSamples.length>=lipWindowSamples){
      const window=lipPendingSamples.slice(0,lipWindowSamples);lipPendingSamples=lipPendingSamples.slice(lipWindowSamples);
      let sum=0,peak=0;for(const v of window){sum+=v*v;peak=Math.max(peak,Math.abs(v));}
      const raw=Math.sqrt(sum/Math.max(1,window.length));
      lipSmoothedRms=lipSmoothedRms?lipSmoothedRms*0.38+raw*0.62:raw;
      let mouth="closed";
      if(lipSmoothedRms<0.014||peak<0.035){
        mouth="closed";lipWasClosed=true;
      }else if(lipWasClosed||lipSmoothedRms<0.038){
        // Natural attack: closed -> half -> vowel, rather than snapping open.
        mouth="half";lipWasClosed=false;
      }else{
        const vowel=lipVisemes[lipVisemeIndex++%lipVisemes.length];
        // Strong A syllables use the fully-open frame; other vowels retain
        // their proper VRoid mouth shape rather than being flattened to A.
        mouth=(vowel==="aa"&&lipSmoothedRms>0.115)?"wide":vowel;
      }
      scheduleLipFrame(mouth,lipPendingWhen);
      lipPendingWhen+=lipWindowSamples/sampleRate;
    }
  };
  const schedulePcm=(bytes)=>{
    if(!bytes?.length)return;
    let merged=new Uint8Array(pending.length+bytes.length);merged.set(pending);merged.set(bytes,pending.length);if(merged.length%2){pending=merged.slice(-1);merged=merged.slice(0,-1)}else pending=new Uint8Array(0);
    if(!merged.length)return;
    const n=merged.length/2, floats=new Float32Array(n);let sum=0;
    const view=new DataView(merged.buffer,merged.byteOffset,merged.byteLength);
    for(let i=0;i<n;i++){const v=view.getInt16(i*2,true)/32768;floats[i]=v;sum+=v*v;}
    const rms=Math.sqrt(sum/Math.max(1,n));
    const buf=fishAudioCtx.createBuffer(1,n,sampleRate);buf.copyToChannel(floats,0);
    const src=fishAudioCtx.createBufferSource();src.buffer=buf;src.connect(fishAudioCtx.destination);fishScheduledSources.push(src);
    const when=Math.max(nextStart,fishAudioCtx.currentTime+0.015);src.start(when);nextStart=when+buf.duration;totalSamples+=n;mediaClock.duration=totalSamples/sampleRate;
    feedLipSamples(floats,when);
  };
  try{
    const r=await fetch(FISH_TTS_STREAM,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_build:CLIENT_BUILD,text,voice_style:voiceStyle}),signal:ctrl.signal});
    if(!r.ok)throw new Error((await r.text())||`Fish TTS failed (${r.status})`);
    if(!r.body)throw new Error("Streaming response body unavailable");
    const reader=r.body.getReader();
    while(true){const {done,value}=await reader.read();if(done)break;if(value?.length)schedulePcm(value);}
    const remainingMs=Math.max(0,(nextStart-fishAudioCtx.currentTime)*1000);
    await new Promise(resolve=>setTimeout(resolve,remainingMs+40));
  }catch(err){if(err?.name!=="AbortError"){failed=true;console.warn("[Fish Stream]",err);error("Nanako's Fish Audio stream failed. Check the Fish API key and voice ID.");}}
  finally{
    if(fishStreamAbort===ctrl)fishStreamAbort=null;
    mediaClock.ended=true;liveStreamMouthOverride="closed";
    if(currentAudio===mediaClock)currentAudio=null;
    await setServerNanakoSpeaking(false);micCapturePaused=false;stopAnimationPlan();
    finishPlanWithPostHold(animationPlan,{idleEmotion,onDone:()=>{if(active){status("Listening...");setTimeout(begin,20)}else status("Ready to chat")}});convButton();
  }
  return !failed;
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
    await stopAudio(false,false);
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
  let absolutePlaybackGuard=0;
  let playbackStartedAt=0;
  let lastProgressAt=0;
  let lastObservedMediaTime=0;

  const finish=()=>{
    if(finished)return;
    finished=true;
    if(playbackWatchdog)clearInterval(playbackWatchdog);
    if(absolutePlaybackGuard)clearTimeout(absolutePlaybackGuard);
    if(bargeCaptureTimer){clearTimeout(bargeCaptureTimer);bargeCaptureTimer=0;}
    playbackWatchdog=0;
    a._nanakoPlaybackWatchdog=0;

    // Freeze raw user-turn processing until Python has been told that Nanako
    // stopped speaking. This avoids the first user syllables being discarded by
    // the server-side barge-in gate during the speaking->idle transition.
    micCapturePaused=true;
    // Discard any loudspeaker return captured during the barge-in window. It
    // must never be submitted as a new silent user turn after playback ends.
    micQueue=[];
    micBatch=[];

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

    // Visual completion must never depend on a network request. Restore the
    // post-hold/idle state immediately; synchronize Python's speaking gate in
    // parallel so a slow or failed request cannot freeze the final mouth frame.
    void setServerNanakoSpeaking(false);
    finishPlanWithPostHold(animationPlan,{idleEmotion,onDone:()=>{
      if(active){micCapturePaused=false;status("Listening...");setTimeout(begin,20)}
      else status("Ready to chat");
    }});
  };

  a.onplaying=()=>{
    if(currentAudio!==a)return;
    // Reset Python's echo-protection clock from actual audible playback rather
    // than from the earlier media setup request. Deliberate barge-in remains
    // enabled after the guard; Nanako's own opening audio cannot stop itself.
    void setServerNanakoSpeaking(true);
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
    const plannedMs=Math.max(0,Number(animationPlan?.duration_ms)||0),rate=Math.max(.1,Number(a.playbackRate)||1);
    absolutePlaybackGuard=setTimeout(()=>{if(!finished){console.warn("[Nanako Audio] Absolute completion guard restored idle.");finish()}},Math.max(15000,Math.min(180000,plannedMs/rate+5000)));
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
  if(stream&&stream.getTracks().some(t=>t.readyState==="live")&&ctx&&(micProcessor||micWorkletNode))return;
  if(!navigator.mediaDevices?.getUserMedia)throw new Error("Microphone access requires HTTPS.");
  const audioConstraints={echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1};
  // Keep the request to standard WebRTC constraints. Chrome/iOS may advertise
  // voiceIsolation yet return a permanently zeroed channel after output routing.
  stream=await navigator.mediaDevices.getUserMedia({audio:audioConstraints});
  for(const track of stream.getAudioTracks())track.onmute=()=>{if(active&&!micCapturePaused)void recoverDigitallySilentMic()};
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)throw new Error("Web Audio is not supported by this browser.");
  ctx=new AC();
  if(ctx.state==="suspended")await ctx.resume();
  micSource=ctx.createMediaStreamSource(stream);
  const acceptAudioChunk=input=>{
    if(!active||micCapturePaused||!micSessionId)return;
    let peak=0;
    for(let i=0;i<input.length;i++)peak=Math.max(peak,Math.abs(Number(input[i])||0));
    if(peak<=1e-7){
      micZeroChunkCount++;
      // A real phone microphone always has a measurable analogue noise floor.
      // Repeated exact zeroes mean Chrome's capture graph is alive but detached
      // from the physical microphone. Do not upload fake silence to Python.
      if(micZeroChunkCount>=20)void recoverDigitallySilentMic();
      return;
    }
    micZeroChunkCount=0;
    const samples=resampleMono(input,ctx.sampleRate,MIC_TARGET_RATE);
    for(let i=0;i<samples.length;i++)micBatch.push(samples[i]);
    while(micBatch.length>=MIC_BATCH_SAMPLES){const batch=micBatch.splice(0,MIC_BATCH_SAMPLES);micQueue.push(floatToPcm16(batch));}
    if(micQueue.length>8)micQueue.splice(0,micQueue.length-8);pumpMicQueue();
  };
  // iPhone Chrome can keep an AudioWorklet running while supplying an all-zero
  // input channel after its playback route changes. Use the stable callback
  // capture path directly; Python still owns every VAD and turn decision.
  micWorkletNode=null;micWorkletUsing=false;
  micProcessor=ctx.createScriptProcessor(2048,1,1);
  micProcessor.onaudioprocess=ev=>{
    try{ev.outputBuffer.getChannelData(0).fill(0)}catch{}
    if(!active||micCapturePaused||!micSessionId)return;
    acceptAudioChunk(Float32Array.from(ev.inputBuffer.getChannelData(0)));
  };
  micSource.connect(micProcessor);
  micProcessor.connect(ctx.destination);
}

async function recoverDigitallySilentMic(){
  const now=Date.now();
  if(micHardwareRecoveryBusy||!active||micCapturePaused||now-micLastHardwareRecoveryAt<3000)return;
  micHardwareRecoveryBusy=true;micLastHardwareRecoveryAt=now;micZeroChunkCount=0;
  console.warn("[Nanako Mic] Digital-zero capture detected; rebuilding phone microphone input.");
  status("Reconnecting microphone...");
  try{
    try{micProcessor?.disconnect()}catch{}
    try{micSource?.disconnect()}catch{}
    micProcessor=null;micSource=null;
    try{await ctx?.close()}catch{}ctx=null;
    try{stream?.getTracks().forEach(track=>track.stop())}catch{}stream=null;
    micBatch=[];micQueue=[];
    await ensureMicHardware();
    if(active&&!micCapturePaused)status("Listening...");
  }catch(err){
    console.error("[Nanako Mic] input recovery failed",err);
    error("The phone microphone stopped supplying audio. Tap End Conversation, then Start Conversation.");
    status("Microphone restart needed");
  }finally{micHardwareRecoveryBusy=false;}
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
  let r;
  try{r=await fetch(MIC_START,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_build:CLIENT_BUILD})})}
  catch(err){throw new Error("Nanako's Python backend is offline or unreachable.",{cause:err})}
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
  e.debugSpeech.textContent=`Speech: ${m.state==="speech"||m.speech_started?"Detected":m.state==="nanako_speaking"?"Python barge-in gate":"Waiting"} • ${Math.round(Number(m.speech_probability||0)*100)}%`;
  e.debugTurn.textContent=`Turn: ${(Number(m.turn_ms||0)/1000).toFixed(1)} sec • Python VAD`;
}

async function restartPythonMicSession(){
  // Invalidate the whole inspect/respond chain, not only queued PCM. Otherwise
  // an old-level answer can arrive after a settings switch and overwrite/play
  // on top of the current conversation.
  try{activeMicTurnController?.abort()}catch{}
  activeMicTurnController=null;
  busy=false;
  const old=micSessionId;micSessionGeneration++;micSessionId="";micQueue=[];micBatch=[];
  if(old){try{await fetch(MIC_STOP,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:old})})}catch{}}
  await startPythonMicSession();
}

async function pumpMicQueue(){
  if(micPumpBusy||!active||!micSessionId)return;
  micPumpBusy=true;
  try{
    while(active&&micSessionId&&micQueue.length){
      const pcm=micQueue.shift();
      const sessionAtSend=micSessionId,generationAtSend=micSessionGeneration;
      const r=await fetch(`${MIC_FRAME}?session_id=${encodeURIComponent(sessionAtSend)}`,{method:"POST",headers:{"Content-Type":"application/octet-stream"},body:pcm.buffer});micUploadedBytes+=pcm.byteLength;updateResourceDiagnostics();
      const d=await r.json();
      if(generationAtSend!==micSessionGeneration||sessionAtSend!==micSessionId)continue;
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
      if(m.speech_started){userSpeechActive=true;status("I'm listening...");if(cameraVoiceMode)e.cameraStatus.textContent="I can hear you..."}
      if(m.turn_id){
        userSpeechActive=false;
        micCapturePaused=true;micQueue=[];micBatch=[];
        await processPythonMicTurn(m.turn_id);
        break;
      }
    }
  }catch(x){
    userSpeechActive=false;console.error("[Nanako Mic bridge]",x);error(x.message);status("Microphone connection problem");
  }finally{micPumpBusy=false;if(active&&!micCapturePaused&&micQueue.length)setTimeout(pumpMicQueue,0)}
}

async function processPythonMicTurn(turnId){
  if(!active||!micSessionId)return;
  const sessionAtTurn=micSessionId,generationAtTurn=micSessionGeneration;
  try{activeMicTurnController?.abort()}catch{}
  const turnController=new AbortController();activeMicTurnController=turnController;
  const turnIsCurrent=()=>active&&micSessionId===sessionAtTurn&&micSessionGeneration===generationAtTurn&&activeMicTurnController===turnController&&!turnController.signal.aborted;
  busy=true;status("Nanako is thinking...");
  try{
    const payload={session_id:sessionAtTurn,turn_id:turnId,level,speech_style:speechStyle,...memoryPayload()};let frontVisionAttached=false;
    let inspection=null;
    // Inspection exists only to detect the explicit front-camera look phrase.
    // With the eye off (including normal and rear-object-camera conversation),
    // send the original audio directly to Omni in one pass: lower latency,
    // lower cost, and no lossy intermediate transcript.
    if(awarenessActive&&!cameraVoiceMode){
      const inspectResponse=await fetch(MIC_INSPECT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sessionAtTurn,turn_id:turnId,client_build:CLIENT_BUILD,memory_history:memoryPayload().memory_history}),signal:turnController.signal});
      inspection=await jsonResp(inspectResponse);
      const inspectedTranscript=String(inspection?.transcript||"").trim();
      if(!turnIsCurrent())throw new DOMException("Stale microphone turn","AbortError");
      console.log(`[Nanako Mic inspect] provider=${inspection?.asr_provider||"unknown"} • visual=${!!inspection?.visual_request} • transcript=${JSON.stringify(inspectedTranscript)}`);
      if(inspectedTranscript)payload.transcript_override=inspectedTranscript;
    }else{
      console.log("[Nanako Mic] direct single-pass audio turn (vision inspection not required)");
    }
    if(cameraVoiceMode&&!e.cameraModal.hidden){payload.image_data_url=captureCameraFrame();payload.trigger="rear_object_camera";e.cameraStatus.textContent="Nanako is looking and listening..."}
    else if(inspection?.visual_request){
      if(awarenessActive){
        payload.image_data_url=captureAwarenessFrame();
        if(!payload.image_data_url||payload.image_data_url.length<128)throw new Error("Nanako heard ナナコ、見て, but the camera frame was not ready. Keep the eye on and try again.");
        payload.trigger="front_camera_request";payload.visual_target=String(inspection.visual_target||"face_or_scene");frontVisionAttached=true;console.log(`[Nanako Vision 12.0.22] one authorized front frame attached • target=${payload.visual_target} • chars=${payload.image_data_url.length}`);status("Nanako is looking...")
      }
      else{throw new Error("Nanako heard ナナコ、見て, but the eye camera is off. Turn on the eye and try again.")}
    }
    const r=await fetch(MIC_RESPOND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:turnController.signal});
    const d=await jsonResp(r);
    if(!turnIsCurrent())throw new DOMException("Stale microphone turn","AbortError");
    if(frontVisionAttached&&d?.mic?.camera_frame_attached!==true)throw new Error("Vision safety check failed: the backend did not confirm the captured frame.");
    if(frontVisionAttached){visionAnalysisCount++;visionImageTokens+=imageTokensFromUsage(d?.omni_usage||d?.model_usage);updateResourceDiagnostics()}
    const t=String(d?.transcript||"");
    console.log("[Nanako Python Mic] Transcript:",t);
    transcript(t);
    // Keep raw capture paused through Nanako playback. play()/finish() owns the
    // speaking gate and re-enables capture only after the audio has ended.
    micCapturePaused=true;
    if(cameraVoiceMode)e.cameraStatus.textContent="Nanako is answering...";
    await apply(d,t);
  }catch(x){
    if(x?.name==="AbortError"||!turnIsCurrent()){console.log("[Nanako Mic] discarded stale turn after session/setting change");return}
    console.error(x);error(x.message);status("Voice turn failed");if(cameraVoiceMode)e.cameraStatus.textContent="Please try saying これは何？ again";micCapturePaused=false;
  }finally{
    if(activeMicTurnController===turnController){activeMicTurnController=null;busy=false;if(active&&!currentAudio){status("Listening...");setTimeout(begin,40)}}
  }
}

// ============================================================
// STEP 2.19 — QWEN3.5 OMNI REALTIME WEBRTC
// The stable Python PCM bridge remains in this file as a rollback path.
// ============================================================
let realtimePc=null,realtimeEvents=null,realtimeRemoteAudio=null,realtimeInputStream=null;
let realtimeReplyText="",realtimeUserText="",realtimeMotionTimer=0,realtimeAudioContext=null,realtimeAnalyser=null,realtimeAnalyserSink=null,realtimeEmotion="neutral",realtimeBodyMotion="neutral",realtimeAudioDrainPending=false,realtimeSilentTicks=0,realtimeStreamLevel=0,realtimeSmoothedLevel=0,realtimeLastMouthAt=0,realtimeMouth="closed",realtimeAudioPacketCount=0,realtimeAnalyserLive=false,realtimeSawAudioSignal=false,realtimeGestureTimer=0,realtimePendingPostState=null,realtimeTurnSeq=0;
const realtimeCompletedResponses=new Set();
function realtimeEmotionFromText(text){
  const value=String(text||"");
  if(/(?:ごめん|悲し|寂し|残念|つら|大丈夫？)/.test(value))return"sad";
  if(/(?:やめて|失礼|怒|ひどい|嫌だ|だめ)/.test(value))return"angry";
  if(/(?:えっ|本当[？！]|びっくり|まさか)/.test(value))return"surprised";
  if(/(?:考え|そうだね|うーん|なるほど)/.test(value))return"relaxed";
  if(/(?:うれしい|楽しい|よかった|すごい|おめでとう|！)/.test(value))return"happy";
  return"neutral";
}
function realtimeDeltaLevel(delta){
  try{
    const raw=atob(String(delta||""));if(raw.length<2)return 0;
    let sum=0,count=0;const stride=Math.max(2,Math.floor(raw.length/800/2)*2);
    for(let i=0;i+1<raw.length;i+=stride){let value=raw.charCodeAt(i)|(raw.charCodeAt(i+1)<<8);if(value&32768)value-=65536;const sample=value/32768;sum+=sample*sample;count++}
    return count?Math.sqrt(sum/count):0;
  }catch{return 0}
}
function realtimeBodyForEmotion(emotion){return emotion==="angry"?"angry":emotion==="relaxed"?"thinking":"neutral"}
function clearRealtimeGesture(){if(realtimeGestureTimer)clearTimeout(realtimeGestureTimer);realtimeGestureTimer=0}
function applyRealtimePostState({emotion="neutral",bodyMotion="neutral",eyeGesture="none"}={}){
  clearRealtimeGesture();realtimeEmotion=String(emotion||"neutral");realtimeBodyMotion=["neutral","angry","thinking","clapping"].includes(bodyMotion)?bodyMotion:realtimeBodyForEmotion(realtimeEmotion);
  const wink=eyeGesture==="wink_left"?"winkleft":eyeGesture==="wink_right"?"winkright":"";
  if(wink){
    stopAnimationPlan();renderAnimationFrame({emotion:realtimeEmotion==="neutral"?"happy":realtimeEmotion,action:"wink",eyes:wink,mouth:"closed",body_motion:realtimeBodyMotion,scale:1,translate_y:0});
    realtimeGestureTimer=setTimeout(()=>{realtimeGestureTimer=0;returnToPythonIdle({emotion:realtimeEmotion,bodyMotion:realtimeBodyMotion})},1050);return;
  }
  if(realtimeBodyMotion==="clapping"){
    stopAnimationPlan();renderAnimationFrame({emotion:realtimeEmotion||"happy",action:"clapping",eyes:"open",mouth:"closed",body_motion:"clapping",scale:1,translate_y:0});
    realtimeGestureTimer=setTimeout(()=>{realtimeGestureTimer=0;realtimeBodyMotion="neutral";returnToPythonIdle({emotion:realtimeEmotion,bodyMotion:"neutral"})},2600);return;
  }
  returnToPythonIdle({emotion:realtimeEmotion,bodyMotion:realtimeBodyMotion});
}
function startRealtimeLipSync(){
  if(realtimeMotionTimer)return;
  realtimeAudioDrainPending=false;realtimeSilentTicks=0;realtimeSmoothedLevel=0;realtimeLastMouthAt=0;realtimeMouth="closed";clearTimeout(idlePlanTimer);stopAnimationPlan();
  const bins=realtimeAnalyser?new Uint8Array(realtimeAnalyser.fftSize):null;
  const tick=now=>{
    if(!realtimeMotionTimer)return;
    let analyserLevel=0;
    if(realtimeAnalyser&&bins){realtimeAnalyser.getByteTimeDomainData(bins);let sum=0;for(const sample of bins){const v=(sample-128)/128;sum+=v*v}analyserLevel=Math.sqrt(sum/bins.length)}
    if(analyserLevel>.004){realtimeAnalyserLive=true;realtimeSawAudioSignal=true}
    const level=realtimeAnalyserLive?analyserLevel:Math.max(analyserLevel,realtimeStreamLevel);realtimeStreamLevel*=.82;realtimeSmoothedLevel=realtimeSmoothedLevel*.72+level*.28;
    if(!realtimeLastMouthAt||now-realtimeLastMouthAt>=112){
      const next=realtimeSmoothedLevel>.105?"wide":realtimeSmoothedLevel>.052?"medium":realtimeSmoothedLevel>.016?"small":"closed";
      if(next!==realtimeMouth||now-realtimeLastMouthAt>=224){realtimeMouth=next;renderAnimationFrame({emotion:realtimeEmotion,action:"talking",eyes:"open",mouth:realtimeMouth,body_motion:realtimeBodyMotion,scale:1,translate_y:0})}
      realtimeLastMouthAt=now;
    }
    if(realtimeAudioDrainPending&&realtimeSawAudioSignal){realtimeSilentTicks=level<.018?realtimeSilentTicks+1:0;if(realtimeSilentTicks>=18){stopRealtimeLipSync();return}}
    realtimeMotionTimer=requestAnimationFrame(tick);
  };
  realtimeMotionTimer=requestAnimationFrame(tick);
}
function stopRealtimeLipSync(){
  if(realtimeMotionTimer)cancelAnimationFrame(realtimeMotionTimer);realtimeMotionTimer=0;
  realtimeAudioDrainPending=false;realtimeSilentTicks=0;realtimeStreamLevel=0;realtimeSmoothedLevel=0;realtimeAudioPacketCount=0;realtimeAnalyserLive=false;realtimeSawAudioSignal=false;realtimeMouth="closed";
  renderAnimationFrame({emotion:realtimeEmotion,action:"idle",eyes:"open",mouth:"closed",body_motion:realtimeBodyMotion,scale:1,translate_y:0});
  const pending=realtimePendingPostState;realtimePendingPostState=null;
  if(pending)applyRealtimePostState(pending);else returnToPythonIdle({emotion:realtimeEmotion,bodyMotion:realtimeBodyMotion});
}
async function enrichRealtimeTurn(userText,replyText,userEntry,assistantEntry,turnSeq){
  if(!userText&&!replyText)return;
  try{
    const response=await fetch(REALTIME_ENRICH,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_build:CLIENT_BUILD,user_text:userText,reply_text:replyText})});
    const data=await jsonResp(response);
    const learnedName=cleanNameCandidate(data.user_name||detectUserNameFromText(userText));if(learnedName)persistentUserName=learnedName;
    mergeMemoryFacts(data.memory_facts);rememberDetectedUserName();
    if(userEntry){userEntry.romaji=String(data.user_romaji||"");userEntry.english=String(data.user_english||"");const x=correction(data);if(x.n){userEntry.wrong=x.o;userEntry.corrected=x.c;userEntry.correctionRomaji=x.romaji;userEntry.correctionEnglish=x.english;showCorrection(x)}}
    if(assistantEntry){assistantEntry.romaji=String(data.romaji||"");assistantEntry.english=String(data.english||"");e.roText.textContent=assistantEntry.romaji;e.enText.textContent=assistantEntry.english}
    // Step 2.18 fix: a slower-arriving enrichment for an OLDER turn must never
    // overwrite or get silently swallowed by a NEWER turn's emotion/body_motion.
    // Only apply the animation portion of this result while it is still the
    // most recently completed turn (turnSeq === realtimeTurnSeq). This is what
    // previously caused an emotional pose (e.g. angry) to flash briefly and
    // then snap back to neutral, or a clapping/thinking cue to never appear.
    if(turnSeq===realtimeTurnSeq){
      realtimeEmotion=String(data.emotion||realtimeEmotion||"neutral");
      const bodyMotion=String(data.body_motion||realtimeBodyForEmotion(realtimeEmotion)).toLowerCase();
      const eyeGesture=String(data.eye_gesture||"none").toLowerCase();
      realtimePendingPostState={emotion:realtimeEmotion,bodyMotion,eyeGesture};
      if(!realtimeMotionTimer){const pending=realtimePendingPostState;realtimePendingPostState=null;applyRealtimePostState(pending)}
    }
    renderHistory();savePersistentMemory();realtimeSend({type:"session.update",session:{instructions:realtimeInstructions()}});
  }catch(err){console.warn("[Nanako realtime enrichment]",err)}
}
function realtimeEvent(event){
  const type=String(event?.type||"");
  if(type==="input_audio_buffer.speech_started"){realtimeUserText="";userSpeechActive=true;busy=false;status("I'm listening...");return}
  if(type==="input_audio_buffer.speech_stopped"){userSpeechActive=false;busy=true;status("Nanako is thinking...");return}
  if(type.includes("input_audio_transcription.delta")){realtimeUserText+=String(event.delta||event.text||event.stash||"");return}
  if(type==="conversation.item.input_audio_transcription.completed"){realtimeUserText=String(event.transcript||realtimeUserText||"");return}
  if(type==="response.created"){realtimeTurnSeq++;clearRealtimeGesture();realtimePendingPostState=null;realtimeReplyText="";realtimeEmotion="neutral";realtimeBodyMotion="neutral";realtimeAudioDrainPending=false;realtimeSilentTicks=0;realtimeStreamLevel=0;realtimeAudioPacketCount=0;realtimeAnalyserLive=false;realtimeSawAudioSignal=false;busy=true;status("Nanako is thinking...");return}
  if(type==="response.audio_transcript.delta"||type==="response.output_audio_transcript.delta"){realtimeReplyText+=String(event.delta||"");realtimeEmotion=realtimeEmotionFromText(realtimeReplyText);realtimeBodyMotion=realtimeBodyForEmotion(realtimeEmotion);e.jp.textContent=realtimeReplyText;startRealtimeLipSync();status("Nanako is speaking...");return}
  if(type==="response.audio_transcript.done"||type==="response.output_audio_transcript.done"){realtimeReplyText=String(event.transcript||realtimeReplyText);e.jp.textContent=realtimeReplyText;return}
  if(type==="response.audio.delta"||type==="response.output_audio.delta"){
    const measured=realtimeDeltaLevel(event.delta);realtimeAudioPacketCount++;
    // Prefer the remote Web Audio analyser. This restrained PCM pulse covers
    // iOS frames where that analyser is temporarily silent, preventing a
    // speaking avatar with a frozen mouth.
    const fallbackPulse=measured>0?Math.min(.09,Math.max(.018,measured)):(realtimeAudioPacketCount%4===0?.072:realtimeAudioPacketCount%2===0?.043:.024);
    if(!realtimeAnalyserLive)realtimeStreamLevel=Math.max(realtimeStreamLevel,fallbackPulse);
    realtimeSawAudioSignal=true;startRealtimeLipSync();status("Nanako is speaking...");return
  }
  if(type==="response.audio.done"||type==="response.output_audio.done"){realtimeAudioDrainPending=true;return}
  if(type==="response.done"){
    const responseId=String(event?.response?.id||event?.response_id||event?.event_id||"");
    if(responseId&&realtimeCompletedResponses.has(responseId))return;
    if(responseId){realtimeCompletedResponses.add(responseId);if(realtimeCompletedResponses.size>50)realtimeCompletedResponses.delete(realtimeCompletedResponses.values().next().value)}
    realtimeAudioDrainPending=true;
    const userText=String(realtimeUserText||"").trim(),replyText=String(realtimeReplyText||"").trim();
    const userEntry=userText?addHistory("user",userText):null;
    const assistantEntry=replyText?addHistory("assistant",replyText):null;
    void enrichRealtimeTurn(userText,replyText,userEntry,assistantEntry,realtimeTurnSeq);
    realtimeUserText="";realtimeReplyText="";
    busy=false;userSpeechActive=false;status(active?"Listening...":"Ready to chat");
    if(active)setTimeout(()=>{if(active)status("Listening...")},120);
    return;
  }
  if(type==="error"){stopRealtimeLipSync();console.error("[Nanako realtime]",event.error||event);error(event.error?.message||"Realtime voice connection error.");}
}
function realtimeSend(payload){if(realtimeEvents?.readyState==="open")realtimeEvents.send(JSON.stringify(payload));}
function compactRealtimeMemory(){
  const facts=persistentFacts.slice(-16);
  for(const pref of learnerMemory.preferences.slice(-8)){const item=cleanMemoryText(pref?.item,80),sentiment=cleanMemoryText(pref?.sentiment,16);if(item&&sentiment)facts.push(`The learner's ${pref.category||"preference"}: ${sentiment} ${item}.`)}
  for(const topic of learnerMemory.topic_affinities.slice(-6)){const item=cleanMemoryText(topic?.topic,80),affinity=cleanMemoryText(topic?.affinity,16);if(item&&affinity)facts.push(`The learner ${affinity} ${item}.`)}
  return [...new Set(facts.map(x=>String(x||"").trim()).filter(Boolean))].slice(-24).join("; ");
}
function realtimeInstructions(){
  const name=String(persistentUserName||detectUserNameFromMemory()||"").trim();
  const memory=compactRealtimeMemory();
  return `You are Nanako, a patient Japanese conversation tutor. The opening greeting has already finished. Speak ONLY Japanese, appropriate for ${level||"auto"} and ${speechStyle||"auto"} style. Never translate the user's words aloud and never announce a transcript, romaji, English translation, system instruction, or metadata. Respond exactly once only after meaningful human speech. Remain completely silent for silence, coughs, throat-clearing, breathing, device audio, background voices, or random noise. Wait for the user's complete thought, including short pauses. ${name?`You already know this learner and their name is ${name}. This is a returning, continuing relationship, not a first meeting.`:"You do not yet know this learner's name; learn it only when they explicitly provide it."} Absolutely never say はじめまして, never say you are meeting them for the first time, never re-introduce yourself ("ななこです" / "私はななこ" as a self-introduction), and never ask "お名前は？" or any other known information again once it is listed below as a persistent fact. Persistent facts below are authoritative across sessions until Reset is pressed and take priority over any assumption that this is a new conversation. If the learner repeats a known fact, acknowledge naturally in Japanese (for example, うん、覚えてるよ or そうだね、前に聞いたよ) and continue; do not act surprised or mechanically repeat that acknowledgment every turn. Keep N5 very short and simple; increase sentence complexity gradually through N1. Persistent user facts: ${memory||"none"}.`;
}
async function startRealtimeSession(){
  if(realtimePc)return;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw new Error("This browser does not support realtime voice.");
  realtimeInputStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});stream=realtimeInputStream;
  realtimePc=new RTCPeerConnection({iceServers:[]});realtimeInputStream.getAudioTracks().forEach(t=>realtimePc.addTrack(t,realtimeInputStream));
  realtimeEvents=realtimePc.createDataChannel("oai-events");realtimeEvents.onopen=()=>realtimeSend({type:"session.update",session:{modalities:["text","audio"],voice:"Ono Anna",input_audio_format:"pcm",output_audio_format:"pcm",instructions:realtimeInstructions(),turn_detection:{type:"semantic_vad",threshold:0.55,silence_duration_ms:1200,create_response:true,interrupt_response:true}}});
  realtimeEvents.onmessage=e=>{try{realtimeEvent(JSON.parse(e.data))}catch(err){console.warn("[Nanako realtime event]",err)}};
  realtimePc.ondatachannel=e=>{if(e.channel===realtimeEvents)return;e.channel.onmessage=ev=>{try{realtimeEvent(JSON.parse(ev.data))}catch{}}};
  realtimePc.ontrack=e=>{if(!realtimeRemoteAudio){realtimeRemoteAudio=new Audio();realtimeRemoteAudio.autoplay=true;realtimeRemoteAudio.playsInline=true;realtimeRemoteAudio.volume=1}const remoteStream=e.streams[0];realtimeRemoteAudio.srcObject=remoteStream;try{const AC=window.AudioContext||window.webkitAudioContext;realtimeAudioContext=realtimeAudioContext||new AC();void realtimeAudioContext.resume().catch(()=>{});const source=realtimeAudioContext.createMediaStreamSource(remoteStream);realtimeAnalyser=realtimeAudioContext.createAnalyser();realtimeAnalyser.fftSize=256;realtimeAnalyser.smoothingTimeConstant=.45;realtimeAnalyserSink=realtimeAudioContext.createGain();realtimeAnalyserSink.gain.value=0;source.connect(realtimeAnalyser);realtimeAnalyser.connect(realtimeAnalyserSink);realtimeAnalyserSink.connect(realtimeAudioContext.destination)}catch(err){console.warn("[Nanako realtime lip analyser]",err)}void realtimeRemoteAudio.play().catch(()=>{});};
  const offer=await realtimePc.createOffer();await realtimePc.setLocalDescription(offer);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Realtime ICE negotiation timed out.")),10000);if(realtimePc.iceGatheringState==="complete"){clearTimeout(timer);resolve()}else realtimePc.onicegatheringstatechange=()=>{if(realtimePc.iceGatheringState==="complete"){clearTimeout(timer);resolve()}}});
  // text/plain is intentionally a CORS-simple request. Some Function Compute
  // custom-domain configurations reject an application/sdp preflight before
  // Flask receives it, which previously made Start Conversation fail.
  const response=await fetch(`${API}/api/realtime/webrtc?client_build=${encodeURIComponent(CLIENT_BUILD)}`,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:realtimePc.localDescription.sdp});
  const answerText=await response.text();
  if(!response.ok){let detail="";try{detail=String(JSON.parse(answerText)?.error||"")}catch{}throw new Error(detail||`Realtime connection failed (${response.status}).`)}
  if(!/^v=0\r?$/m.test(answerText))throw new Error("Realtime service returned an invalid connection answer.");
  await realtimePc.setRemoteDescription({type:"answer",sdp:answerText.trim()+"\r\n"});
  status("Listening...");
}
async function stopRealtimeSession(){
  stopRealtimeLipSync();
  try{realtimeInputStream?.getTracks().forEach(t=>t.stop())}catch{}
  try{realtimePc?.close()}catch{}
  realtimePc=null;realtimeEvents=null;realtimeInputStream=null;stream=null;
  try{await realtimeAudioContext?.close()}catch{}realtimeAudioContext=null;realtimeAnalyser=null;realtimeAnalyserSink=null;
  try{if(realtimeRemoteAudio){realtimeRemoteAudio.pause();realtimeRemoteAudio.srcObject=null}}catch{}
}

async function begin(){
  if(!active)return;
  /* Step 2.19 split pipeline: use the proven Python VAD/PCM bridge. */
  await startPythonMicSession();
  await ensureMicHardware();
  try{micWorkletNode?.port.postMessage({type:"reset"})}catch{}
  micCapturePaused=false;
  userSpeechActive=false;
  status("Listening...");
  if(cameraVoiceMode&&!e.cameraModal.hidden)e.cameraStatus.textContent="Listening — say これは何？ or tap Ask Nanako";
}

async function stopMicBridge(){
  try{activeMicTurnController?.abort()}catch{}activeMicTurnController=null;micSessionGeneration++;busy=false;
  micCapturePaused=true;userSpeechActive=false;micQueue=[];micBatch=[];
  const sid=micSessionId;micSessionId="";
  try{micProcessor?.disconnect()}catch{}
  try{micWorkletNode?.disconnect()}catch{}
  try{micSource?.disconnect()}catch{}
  micProcessor=null;micWorkletNode=null;micWorkletUsing=false;micSource=null;
  try{await ctx?.close()}catch{}ctx=null;
  try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null;
  if(sid){try{await fetch(MIC_STOP,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sid})})}catch{}}
}

function armStartupGreetingOnFirstGesture(){/* Step 1.23: replaced by explicit splash-screen Enter flow. */}

async function enterStartupSplash(){
  if(startupEnterDone)return;
  if(!window.nanako3DRenderer?.ready){
    const waitingButton=document.getElementById("startupEnterButton");
    if(waitingButton){waitingButton.disabled=true;waitingButton.textContent="Loading Nanako 3D…";}
    return;
  }
  startupEnterDone=true;
  const splash=document.getElementById("startupSplash");
  const enterBtn=document.getElementById("startupEnterButton");
  // Keep portrait orientation wherever the platform permits it. This call is
  // deliberately started from the same explicit user gesture as audio unlock.
  void requestPortraitOrientationLock();
  // This MUST run synchronously inside the first tap for iOS audio permission.
  unlockAudio();
  if(enterBtn){enterBtn.disabled=true;enterBtn.textContent="Entering…";}
  if(splash)splash.hidden=true;
  status("Nanako is greeting you...");
  cachedPythonIdlePlan=null;
  try{
    nanakoAvatar=nanakoAvatar||document.getElementById("nanakoAvatar");
    nanakoMotion=nanakoMotion||document.querySelector(".nanako-motion");
    renderAnimationFrame({emotion:"neutral",action:"idle",eyes:"open",mouth:"closed",scale:1,translate_y:0});
    if(!startupGreetingData)await fetchStartupGreeting();
    if(startupGreetingData&&!muted){
      const ok=await playStartupGreetingIfReady(true);
      if(!ok)console.warn("[Nanako Startup] greeting data loaded but voice playback did not start");
    }
  }catch(err){
    console.error("[NanaChat Startup Enter]",err);
    error("Nanako's welcome voice could not play.");
  }finally{
    if(!currentAudio&&!active)status("Ready to chat");
    if(enterBtn){enterBtn.disabled=false;enterBtn.textContent="Enter";}
  }
}

async function startMode(){
  if(active)return;
  try{
    void requestPortraitOrientationLock();
    active=true;convButton();
    status("Starting microphone...");
    await begin();
  }catch(x){
    console.error(x);
    const name=String(x?.name||"");
    const message=String(x?.message||"");
    if(name==="NotAllowedError"||name==="SecurityError")error("Microphone permission was denied. Allow microphone access in Chrome settings and try again.");
    else if(name==="NotFoundError")error("No microphone was found on this device.");
    else if(name==="NotReadableError")error("The microphone is busy in another app. Close that app and try again.");
    else if(message)error(message);
    else error("Nanako could not start the microphone.");
    await stopMode();
  }
}

async function stopMode(){
  active=false;await setServerNanakoSpeaking(false);await stopRealtimeSession();await stopMicBridge();await stopAudio(false);convButton();status("Ready to chat");
}
async function reset(){if(!window.confirm("Forget Nanako’s saved conversation, preferences, dislikes, interaction history, and Japanese progress? This cannot be undone."))return;await stopVisualAwareness({silent:true});await stopMode();try{await fetch(RESET,{method:"POST"})}catch{}history.length=0;persistentFacts=[];learnerMemory={preferences:[],topic_affinities:[],language_progress:[],interaction_patterns:[]};persistentUserName="";startupGreetingData=null;startupGreetingPlayed=false;startupGreetingLoading=null;startupGreetingPlayPromise=null;startupGestureArmed=false;startupEnterDone=false;try{localStorage.removeItem(USER_NAME_KEY);localStorage.setItem(MEMORY_KEY,JSON.stringify({version:5,updated_at:Date.now(),reset_complete:true,facts:[],learner_memory:learnerMemory,profile:{user_name:""}}))}catch{}renderHistory();setScore(0);e.jp.textContent="はじめまして！ななこです。今日は元気？";e.roText.textContent=e.enText.textContent="";e.corr.hidden=e.settings.hidden=e.historyModal.hidden=true;const splash=document.getElementById("startupSplash");if(splash)splash.hidden=false;status("Ready for a fresh start");void fetchStartupGreeting()}

async function restartMicForSettingChange(settingLabel){
  if(!active)return;
  status(`Switching ${settingLabel}...`);
  userSpeechActive=false;micCapturePaused=true;micQueue=[];micBatch=[];
  await stopAudio(false);
  await restartPythonMicSession();
  // A language-setting change is not an emotional event. Do not carry an old
  // embarrassed/scared/etc. idle pose into the newly configured session.
  returnToPythonIdle({emotion:"neutral"});
  micCapturePaused=false;
  status("Listening...");
}

function disableSettingButtons(disabled){
  e.levelGrid.querySelectorAll("[data-level]").forEach(button=>button.disabled=disabled);
  e.styleGrid.querySelectorAll("[data-style]").forEach(button=>button.disabled=disabled);
}

async function selectJapaneseLevel(nextLevel){
  const next=String(nextLevel||"auto").toLowerCase();
  if(!/^(?:auto|n[1-5])$/.test(next)||settingSwitchBusy)return;
  if(next===level){updateLevelDisplay();return}
  settingSwitchBusy=true;disableSettingButtons(true);
  try{
    level=next;autoEffectiveLevel="";
    e.levelGrid.querySelectorAll("[data-level]").forEach(button=>button.classList.toggle("active",button.dataset.level===level));
    updateLevelDisplay();
    await restartMicForSettingChange(`to ${label(level)}`);
    console.log(`[Nanako Level] ${label(level)} active • microphone session restarted safely`);
  }catch(err){
    console.error("[Nanako Level switch]",err);error("The level changed, but the microphone could not restart. Tap End Conversation, then Start Conversation.");status("Microphone restart needed");
  }finally{
    settingSwitchBusy=false;disableSettingButtons(false);
  }
}

async function selectSpeechStyle(nextStyle){
  const next=String(nextStyle||"auto").toLowerCase();
  if(!/^(?:auto|casual|formal)$/.test(next)||settingSwitchBusy)return;
  if(next===speechStyle){updateStyleDisplay();return}
  settingSwitchBusy=true;disableSettingButtons(true);
  try{
    speechStyle=next;autoEffectiveStyle="";
    e.styleGrid.querySelectorAll("[data-style]").forEach(button=>button.classList.toggle("active",button.dataset.style===speechStyle));
    updateStyleDisplay();
    await restartMicForSettingChange(`style to ${speechStyle}`);
    console.log(`[Nanako Style] ${speechStyle} active • microphone session restarted safely`);
  }catch(err){
    console.error("[Nanako Style switch]",err);error("The speaking style changed, but the microphone could not restart. Tap End Conversation, then Start Conversation.");status("Microphone restart needed");
  }finally{
    settingSwitchBusy=false;disableSettingButtons(false);
  }
}

e.send.onclick=send;e.input.onkeydown=x=>{if(x.key==="Enter"){x.preventDefault();send()}};e.camera.onclick=openCamera;e.closeCamera.onclick=closeCamera;e.askCamera.onclick=askCamera;e.cameraModal.onclick=x=>{if(x.target===e.cameraModal)void closeCamera()};e.awareness.onclick=toggleVisualAwareness;e.ro.onclick=()=>{showRO=!showRO;quick()};e.en.onclick=()=>{showEN=!showEN;quick()};if(e.historyRO)e.historyRO.onclick=()=>{showRO=!showRO;quick()};if(e.historyEN)e.historyEN.onclick=()=>{showEN=!showEN;quick()};e.mute.onclick=async()=>{muted=!muted;quick();if(muted&&currentAudio)await stopAudio(active)};e.conv.onclick=async()=>{active?await stopMode():await startMode()};e.menu.onclick=()=>e.settings.hidden=false;e.closeSettings.onclick=()=>e.settings.hidden=true;e.historyBtn.onclick=()=>{e.settings.hidden=true;e.historyModal.hidden=false;quick()};e.closeHistory.onclick=()=>e.historyModal.hidden=true;e.settings.onclick=x=>{if(x.target===e.settings)e.settings.hidden=true};e.historyModal.onclick=x=>{if(x.target===e.historyModal)e.historyModal.hidden=true};e.levelGrid.onclick=x=>{const button=x.target.closest("[data-level]");if(button)void selectJapaneseLevel(button.dataset.level)};e.styleGrid.onclick=x=>{const button=x.target.closest("[data-style]");if(button)void selectSpeechStyle(button.dataset.style)};e.reset.onclick=reset;
window.addEventListener("beforeunload",()=>{
  stopAnimationPlan();
  active=false;micCapturePaused=true;
  try{micProcessor?.disconnect()}catch{}
  try{micWorkletNode?.disconnect()}catch{}
  try{micSource?.disconnect()}catch{}
  try{stream?.getTracks().forEach(t=>t.stop())}catch{}
  try{cameraStream?.getTracks().forEach(t=>t.stop())}catch{}
  try{awarenessStream?.getTracks().forEach(t=>t.stop())}catch{}
  currentAudio?.pause();
});

let foregroundRecoveryBusy=false,lastForegroundRecoveryAt=0;
async function recoverAfterForeground(){
  if(document.visibilityState!=="visible"||foregroundRecoveryBusy)return;
  const now=Date.now();if(now-lastForegroundRecoveryAt<500)return;
  lastForegroundRecoveryAt=now;foregroundRecoveryBusy=true;
  try{
    // iOS/PWA app switching frequently suspends WebAudio while leaving the
    // MediaStream object looking "live". Resume every audio context first.
    for(const ac of [fishAudioCtx,ctx,realtimeAudioContext]){
      try{if(ac&&ac.state==="suspended")await ac.resume()}catch(err){console.warn("[Nanako Foreground] AudioContext resume failed",err)}
    }
    if(currentAudio){console.log("[Nanako Foreground] voice playback/context resumed");return;}
    requestIdleAnimation();
    if(!active)return;
    status("Reconnecting microphone...");
    micCapturePaused=true;micQueue=[];micBatch=[];micZeroChunkCount=0;
    // A server-side VAD session can become stale while the phone app is frozen.
    // Starting a fresh session here is cheap and avoids the intermittent
    // "I can hear you but Nanako never replies" state after app switching.
    await restartPythonMicSession();
    const liveTrack=stream?.getAudioTracks?.().find(t=>t.readyState==="live"&&!t.muted);
    if(!liveTrack||!ctx||ctx.state==="closed"||(!micProcessor&&!micWorkletNode)){
      try{micProcessor?.disconnect()}catch{};try{micSource?.disconnect()}catch{};
      micProcessor=null;micSource=null;
      try{await ctx?.close()}catch{};ctx=null;
      try{stream?.getTracks().forEach(t=>t.stop())}catch{};stream=null;
      await ensureMicHardware();
    }else if(ctx.state==="suspended"){await ctx.resume().catch(()=>{});}
    micCapturePaused=false;status("Listening...");
    console.log("[Nanako Foreground] microphone + Python session recovered");
  }catch(err){
    console.error("[Nanako Foreground recovery]",err);
    micCapturePaused=false;
    // Keep the automatic digital-zero detector as a second recovery path.
    if(active)setTimeout(()=>begin().catch(x=>console.warn("[Nanako Foreground begin retry]",x)),180);
  }finally{foregroundRecoveryBusy=false;}
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(()=>void recoverAfterForeground(),80)});
window.addEventListener("pageshow",()=>setTimeout(()=>void recoverAfterForeground(),100));
window.addEventListener("focus",()=>{if(document.visibilityState==="visible")setTimeout(()=>void recoverAfterForeground(),120)});


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
  nanakoMotion=document.querySelector(".nanako-motion");
  if(e.jp)e.jp.textContent=rememberDetectedUserName()?`おかえり、${rememberDetectedUserName()}！`:`はじめまして！ななこです。`;
  renderAnimationFrame({emotion:"neutral",action:"idle",eyes:"open",mouth:"closed",scale:1,translate_y:0});
  await requestIdleAnimation({preferCache:false});
  // Prepare and display the randomized greeting immediately, but the explicit
  // splash-screen Enter button provides the Safari-safe user gesture that lets
  // Nanako actually speak the welcome line before the chat interaction begins.
  await fetchStartupGreeting();
  updateResourceDiagnostics();
  console.log(`[NanaChat] v11 Step 2.19.3 QWEN3-ASR-FLASH + QWEN3.5-FLASH + FISH-AUDIO-STREAMING + FAST TURN + COMPLETE HISTORY TRANSLATIONS VERIFIED runtime=${CLIENT_BUILD} • learner model: ${learnerMemory.preferences.length} preferences, ${learnerMemory.language_progress.length} language patterns, ${learnerMemory.interaction_patterns.length} interaction patterns • user=${persistentUserName||"unknown"}`);
}

boot();
})();
