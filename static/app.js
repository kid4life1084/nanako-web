(()=>{
"use strict";

// ============================================================
// NANAKO LAYERED FACE RENDERER v8.4 OMNI FRONTEND AUDIO FIX.2 SAFETY BUILD
// One static 627x627 base + one eye overlay + one mouth overlay.
// Eyes and mouth animate independently. No full portrait swapping.
// ============================================================
const LAYERS = {
  eyes: {
    open: {"x": 212, "y": 202, "w": 206, "h": 76, "file": "./static/characters/nanako/layers/eyes/open.png"},
    half: {"x": 209, "y": 205, "w": 210, "h": 72, "file": "./static/characters/nanako/layers/eyes/half.png"},
    closed: {"x": 208, "y": 258, "w": 215, "h": 30, "file": "./static/characters/nanako/layers/eyes/closed.png"}
  },
  mouth: {
    closed: {"x": 289, "y": 336, "w": 54, "h": 14, "file": "./static/characters/nanako/layers/mouth/closed.png"},
    small: {"x": 288, "y": 333, "w": 55, "h": 23, "file": "./static/characters/nanako/layers/mouth/small.png"},
    medium: {"x": 284, "y": 331, "w": 61, "h": 34, "file": "./static/characters/nanako/layers/mouth/medium.png"},
    wide: {"x": 280, "y": 335, "w": 69, "h": 34, "file": "./static/characters/nanako/layers/mouth/wide.png"},
    round: {"x": 298, "y": 329, "w": 30, "h": 45, "file": "./static/characters/nanako/layers/mouth/round.png"}
  }
};

let nanakoEyes=null,nanakoMouth=null,nanakoMotion=null;
const layerCache=new Map();
let blinkTimer=0,blinkToken=0,blinkEnabled=true;
let idleMouthTimer=0,idleMouthToken=0,idleMouthEnabled=false;
let lipRaf=0,lipRunning=false,lipEnvelope=null,lastLipFrame="closed",lastLipUpdate=0;

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function preloadLayer(key,def){return new Promise((resolve,reject)=>{const im=new Image();im.decoding="async";im.onload=async()=>{try{if(im.decode)await im.decode();}catch{}layerCache.set(key,im);resolve();};im.onerror=()=>reject(new Error(`Could not load ${def.file}`));im.src=def.file;});}
async function preloadFaceLayers(){const jobs=[];for(const [k,v] of Object.entries(LAYERS.eyes))jobs.push(preloadLayer(`eyes:${k}`,v));for(const [k,v] of Object.entries(LAYERS.mouth))jobs.push(preloadLayer(`mouth:${k}`,v));await Promise.all(jobs);console.log("[Nanako Layers] All eye/mouth sprites loaded and decoded.");}
function placePart(el,def){if(!el||!def)return;el.style.left=`${def.x/627*100}%`;el.style.top=`${def.y/627*100}%`;el.style.width=`${def.w/627*100}%`;el.style.height=`${def.h/627*100}%`;}
function setEyes(name){const def=LAYERS.eyes[name];const im=layerCache.get(`eyes:${name}`);if(!def||!im||!nanakoEyes)return;placePart(nanakoEyes,def);if(nanakoEyes.src!==im.src)nanakoEyes.src=im.src;}
function setMouth(name){const def=LAYERS.mouth[name];const im=layerCache.get(`mouth:${name}`);if(!def||!im||!nanakoMouth)return;placePart(nanakoMouth,def);if(lastLipFrame!==name||nanakoMouth.src!==im.src){nanakoMouth.src=im.src;lastLipFrame=name;}}
function cancelBlink(){clearTimeout(blinkTimer);blinkTimer=0;blinkToken+=1;}

async function blinkOnce(doubleBlink=false){
  const token=++blinkToken;
  if(!blinkEnabled)return;

  setEyes("half");
  await sleep(72);
  if(token!==blinkToken||!blinkEnabled)return;

  setEyes("closed");
  await sleep(96);
  if(token!==blinkToken||!blinkEnabled)return;

  setEyes("half");
  await sleep(62);
  if(token!==blinkToken||!blinkEnabled)return;

  setEyes("open");

  if(doubleBlink){
    await sleep(135+Math.random()*55);
    if(token!==blinkToken||!blinkEnabled)return;

    setEyes("half");
    await sleep(56);
    if(token!==blinkToken||!blinkEnabled)return;

    setEyes("closed");
    await sleep(82);
    if(token!==blinkToken||!blinkEnabled)return;

    setEyes("half");
    await sleep(52);
    if(token!==blinkToken||!blinkEnabled)return;

    setEyes("open");
  }
}

async function sleepyHalfBlink(){
  const token=++blinkToken;
  if(!blinkEnabled)return;

  setEyes("half");
  await sleep(180+Math.random()*170);
  if(token!==blinkToken||!blinkEnabled)return;
  setEyes("open");
}

function scheduleBlink(first=false){
  cancelBlink();
  if(!blinkEnabled)return;

  const delay=first ? 1100 : 2600+Math.random()*4300;

  blinkTimer=setTimeout(async()=>{
    const r=Math.random();
    if(r<.10){
      await blinkOnce(true);
    }else if(r<.18){
      await sleepyHalfBlink();
    }else{
      await blinkOnce(false);
    }
    scheduleBlink(false);
  },delay);
}

function cancelIdleMouth(){
  clearTimeout(idleMouthTimer);
  idleMouthTimer=0;
  idleMouthToken+=1;
}

async function idleMouthMoment(){
  const token=++idleMouthToken;
  if(!idleMouthEnabled||lipRunning||currentAudio)return;

  setMouth("small");
  await sleep(110+Math.random()*90);

  if(token!==idleMouthToken||!idleMouthEnabled||lipRunning||currentAudio)return;

  if(Math.random()<.16){
    setMouth("medium");
    await sleep(80+Math.random()*70);
    if(token!==idleMouthToken||!idleMouthEnabled||lipRunning||currentAudio)return;
  }

  setMouth("closed");
}

function scheduleIdleMouth(first=false){
  cancelIdleMouth();
  if(!idleMouthEnabled||lipRunning)return;

  const delay=first
    ? 5200+Math.random()*3000
    : 6500+Math.random()*8500;

  idleMouthTimer=setTimeout(async()=>{
    await idleMouthMoment();
    scheduleIdleMouth(false);
  },delay);
}

function startIdleLoop(first=false){
  blinkEnabled=true;
  idleMouthEnabled=false;
  cancelIdleMouth();
  if(!lipRunning)setMouth("closed");
  if(nanakoMotion)nanakoMotion.classList.remove("talking");
  scheduleBlink(first);
}

function stopIdleLoop(){
  blinkEnabled=false;
  idleMouthEnabled=false;
  cancelBlink();
  cancelIdleMouth();
  setMouth("closed");
}

function bytesFromAudioSource(b){let s=String(b||"");if(!s)return null;if(s.startsWith("data:"))s=s.slice(s.indexOf(",")+1);try{const bin=atob(s);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;}catch{return null;}}
async function buildLipEnvelope(b){const ab=bytesFromAudioSource(b);if(!ab)return null;const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;const AC=window.AudioContext||window.webkitAudioContext;if(!OAC&&!AC)return null;let ac=null;let offline=true;try{if(OAC){ac=new OAC(1,1,44100);}else{ac=new AC();offline=false;}const buf=await ac.decodeAudioData(ab.slice(0));const sr=buf.sampleRate,binSec=.04,bin=Math.max(1,Math.round(sr*binSec)),len=Math.ceil(buf.length/bin),vals=new Float32Array(len);for(let i=0;i<len;i++){let sum=0,count=0;const start=i*bin,end=Math.min(buf.length,start+bin);for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let j=start;j<end;j+=2){const v=d[j];sum+=v*v;count++;}}vals[i]=count?Math.sqrt(sum/count):0;}const sorted=Array.from(vals).filter(v=>v>0).sort((a,b)=>a-b);const pct=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]:0;const floor=pct(.18),peak=Math.max(pct(.9),floor+.0001);const norm=new Float32Array(vals.length);let sm=0;for(let i=0;i<vals.length;i++){let n=Math.max(0,Math.min(1,(vals[i]-floor)/(peak-floor)));sm=sm*.46+n*.54;norm[i]=sm;}return{binSec,values:norm};}catch(err){console.warn("[Nanako LipSync] Audio analysis unavailable; rhythmic fallback will be used.",err);return null;}finally{if(!offline){try{await ac?.close();}catch{}}}}
function fallbackMouth(t){const seq=["small","medium","small","wide","medium","small","closed","medium","round","medium","small"];return seq[Math.floor(t*9)%seq.length];}
function envelopeMouth(t){if(!lipEnvelope)return fallbackMouth(t);const i=Math.max(0,Math.min(lipEnvelope.values.length-1,Math.floor(t/lipEnvelope.binSec)));const v=lipEnvelope.values[i]||0;if(v<.075)return "closed";if(v<.27)return "small";if(v<.57)return "medium";const phase=Math.floor(t*7);if(v<.8&&phase%9===0)return "round";return "wide";}
function lipTick(now){if(!lipRunning||!currentAudio)return;if(now-lastLipUpdate>=70){lastLipUpdate=now;setMouth(envelopeMouth(currentAudio.currentTime||0));}lipRaf=requestAnimationFrame(lipTick);}
function startTalkingLoop(){
  if(lipRunning)return;
  lipRunning=true;
  idleMouthEnabled=false;
  cancelIdleMouth();
  lastLipUpdate=0;
  if(nanakoMotion)nanakoMotion.classList.add("talking");
  setMouth("small");
  cancelAnimationFrame(lipRaf);
  lipRaf=requestAnimationFrame(lipTick);
  console.log("[Nanako Layers] TALKING: lip sync active; idle mouth movement disabled in this safety build.");
}

function stopTalkingLoop(){
  lipRunning=false;
  cancelAnimationFrame(lipRaf);
  lipRaf=0;
  lipEnvelope=null;
  setMouth("closed");
  idleMouthEnabled=false;
  cancelIdleMouth();
  if(nanakoMotion)nanakoMotion.classList.remove("talking");
  console.log("[Nanako Layers] TALKING stopped; mouth returns to closed idle state.");
}

// ============================================================
// APP / VOICE LOGIC
// ============================================================
const API="https://nanako-web-pokbkohedy.ap-southeast-1.fcapp.run",CHAT=`${API}/api/chat`,VOICE=`${API}/api/voice`,RESET=`${API}/api/reset`;
const VAD={
  calibrationMs:350,
  minSpeechMs:220,
  silenceToEndMs:1500,
  noSpeechRestartMs:12000,
  maxTurnMs:30000,
  startFloor:.007,
  continueFloor:.0045,
  startNoiseMultiplier:1.5,
  continueNoiseMultiplier:1.15
};
const $=id=>document.getElementById(id),e={levelBadge:$("levelBadge"),scoreFill:$("scoreFill"),scoreText:$("scoreText"),settingsScore:$("settingsScore"),settingsScoreFill:$("settingsScoreFill"),userTranscript:$("userTranscript"),userTranscriptText:$("userTranscriptText"),status:$("statusText"),ro:$("romajiButton"),en:$("englishButton"),mute:$("muteButton"),jp:$("japaneseReply"),roSec:$("romajiSection"),enSec:$("englishSection"),roText:$("romajiReply"),enText:$("englishReply"),input:$("messageInput"),send:$("sendButton"),conv:$("conversationButton"),corr:$("correctionToast"),wrong:$("wrongText"),correct:$("correctText"),err:$("errorToast"),settings:$("settingsModal"),menu:$("menuButton"),closeSettings:$("closeSettingsButton"),historyBtn:$("historyButton"),historyModal:$("historyModal"),closeHistory:$("closeHistoryButton"),historyEmpty:$("historyEmpty"),historyList:$("historyList"),levelValue:$("levelValue"),levelGrid:$("levelGrid"),reset:$("resetButton"),debugMic:$("debugMic"),debugRoom:$("debugRoom"),debugSpeech:$("debugSpeech"),debugTurn:$("debugTurn"),voiceOutput:$("voiceOutputButton")};
let level="auto",score=0,showRO=false,showEN=false,muted=false,voiceOutput=localStorage.getItem("nanako_voice_output")!=="false",active=false,busy=false,currentAudio=null,currentAudioObjectUrl="",stream=null,rec=null,chunks=[],ctx=null,analyser=null,data=null,raf=0,noiseSamples=[],noiseFloor=.003,lastGoodNoiseFloor=.003,hasGoodNoiseFloor=false,speech=false,candidate=0,firstSpeech=0,lastSpeech=0,turnStart=0,transcriptTimer=0,correctionTimer=0,uploadThisRecording=false,audioUnlocked=false;const history=[];const ttsAudio=new Audio();ttsAudio.preload="auto";ttsAudio.playsInline=true;
const SILENT_WAV="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const status=t=>e.status.textContent=t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),label=l=>l==="auto"?"Auto":l.toUpperCase();
function setScore(v){score=clamp(Math.round(Number(v)||0),0,100);let w=`${score}%`;e.scoreText.textContent=score;e.scoreFill.style.width=w;e.settingsScore.textContent=`${score} / 100`;e.settingsScoreFill.style.width=w}
function error(m){e.err.textContent=String(m||"Something went wrong.");e.err.hidden=false;clearTimeout(error.t);error.t=setTimeout(()=>e.err.hidden=true,6000)}
function transcript(t){clearTimeout(transcriptTimer);if(!t){e.userTranscript.hidden=true;return}e.userTranscriptText.textContent=t;e.userTranscript.style.opacity="1";e.userTranscript.hidden=false;transcriptTimer=setTimeout(()=>{e.userTranscript.style.opacity="0";setTimeout(()=>e.userTranscript.hidden=true,420)},2200)}
function correction(d){let a=d?.analysis&&typeof d.analysis==="object"?d.analysis:{},o=String(a.wrong_text??a.original??a.original_text??a.user_text??"").trim(),c=String(a.correct_text??a.corrected??a.corrected_text??a.correction??"").trim(),n=a.needs_correction===true||a.correct===false||a.is_correct===false||!!(o&&c&&o!==c);return{n,o,c}}
function showCorrection(x){clearTimeout(correctionTimer);if(!x.n||!x.o||!x.c){e.corr.hidden=true;return}e.wrong.textContent=x.o;e.correct.textContent=`→ ${x.c}`;e.corr.hidden=false;correctionTimer=setTimeout(()=>e.corr.hidden=true,7000)}
function addHistory(role,text,x=null){history.push({role,text:String(text||""),wrong:x?.n?x.o:"",corrected:x?.n?x.c:""});renderHistory()}
function renderHistory(){e.historyList.innerHTML="";e.historyEmpty.hidden=history.length>0;history.forEach(h=>{let b=document.createElement("div");b.className=`history-bubble ${h.role==="user"?"user":""}`;let r=document.createElement("div");r.className="history-role";r.textContent=h.role==="user"?"YOU":"NANAKO";let t=document.createElement("div");t.className="history-text";t.textContent=h.text;b.append(r,t);if(h.wrong&&h.corrected){let c=document.createElement("div");c.className="history-correction";c.innerHTML=`<div class="history-wrong"></div><div class="history-correct"></div>`;c.children[0].textContent=h.wrong;c.children[1].textContent=h.corrected;b.append(c)}e.historyList.append(b)})}
function quick(){e.ro.classList.toggle("active",showRO);e.roSec.hidden=!showRO;e.en.classList.toggle("active",showEN);e.enSec.hidden=!showEN;e.mute.classList.toggle("active",muted);e.mute.textContent=muted?"🔇":"🔊"}
function updateVoiceOutputUi(){if(!e.voiceOutput)return;e.voiceOutput.classList.toggle("active",voiceOutput);e.voiceOutput.textContent=voiceOutput?"ON":"OFF";e.voiceOutput.setAttribute("aria-pressed",voiceOutput?"true":"false")}
function setVoiceOutput(v){voiceOutput=!!v;localStorage.setItem("nanako_voice_output",voiceOutput?"true":"false");updateVoiceOutputUi();if(!voiceOutput&&currentAudio)stopAudio(active);console.log(`[Nanako Omni] Voice output ${voiceOutput?"ON":"OFF"}`)}
function convButton(){e.conv.classList.toggle("active",active);if(currentAudio&&active){e.conv.classList.add("interrupt");e.conv.textContent="✋ Interrupt Nanako"}else{e.conv.classList.remove("interrupt");e.conv.textContent=active?"⏹ End Conversation":"🎤 Start Conversation"}}
async function jsonResp(r){let d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.error||d?.message||`Request failed (${r.status})`);return d}
async function apply(d,user){e.jp.textContent=String(d?.reply||"");e.roText.textContent=String(d?.romaji||"");e.enText.textContent=String(d?.english||"");let s=Number(d?.conversation_score??d?.score??d?.analysis?.conversation_score);if(Number.isFinite(s))setScore(s);let x=correction(d);showCorrection(x);addHistory("user",user,x);addHistory("assistant",d?.reply||"");let b=d?.audio_base64||d?.tts_audio_base64||d?.audio||"",m=d?.audio_mime||d?.mime_type||"audio/wav";if(b&&!muted)await play(b,m);else if(active)setTimeout(begin,20)}
async function send(){let t=e.input.value.trim();if(!t||busy)return;busy=true;status("Nanako is thinking...");try{let r=await fetch(CHAT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t,level,voice_output:(voiceOutput&&!muted)})}),d=await jsonResp(r);e.input.value="";transcript(t);await apply(d,t)}catch(x){console.error(x);error(x.message);status("Chat failed.")}finally{busy=false;if(!currentAudio&&!active)status("Ready to chat")}}
function normalizeAudioSource(b,m){let v=String(b||"");if(!v)return"";if(v.startsWith("data:"))return v;return`data:${m||"audio/wav"};base64,${v}`}
function audioBlobUrlFromBase64(b,m){
  let v=String(b||"").trim();
  if(!v)return"";
  if(v.startsWith("data:"))v=v.slice(v.indexOf(",")+1);
  const bin=atob(v);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  const blob=new Blob([bytes],{type:m||"audio/wav"});
  return URL.createObjectURL(blob);
}
function revokeCurrentAudioObjectUrl(){
  if(currentAudioObjectUrl){try{URL.revokeObjectURL(currentAudioObjectUrl)}catch{}currentAudioObjectUrl="";}
}
async function unlockAudio(){
  if(audioUnlocked) return;
  try{
    // Unlock plain HTMLAudio inside the user's tap gesture.
    // No Web Audio gain/compressor is used in this build.
    ttsAudio.src=SILENT_WAV;
    ttsAudio.volume=.01;
    await ttsAudio.play();
    ttsAudio.pause();
    ttsAudio.currentTime=0;
    ttsAudio.volume=1;
    audioUnlocked=true;
    console.log("[Nanako Audio] Plain iOS playback unlocked.");
  }catch(x){
    console.warn("[Nanako Audio] unlock attempt failed:",x);
  }
}

async function stopAudio(resume=false){
  if(currentAudio){
    try{
      currentAudio.onplaying=null;
      currentAudio.onended=null;
      currentAudio.onerror=null;
      currentAudio.pause();
      currentAudio.src="";
      currentAudio.load();
      revokeCurrentAudioObjectUrl();
    }catch{}
    currentAudio=null;
  }
  stopTalkingLoop();
  convButton();
  if(resume&&active){
    status("Listening...");
    setTimeout(begin,40);
  }
}

async function play(b,m){
  if(!b||muted){
    if(active)setTimeout(begin,40);
    return false;
  }

  await stopAudio(false);

  // Safari simplification:
  // completely release microphone capture while Nanako is speaking.
  // Interruption is manual via the on-screen button.
  cleanup();
  release();

  // Reset old lip-sync analysis. The analysis uses a separate copy and
  // never modifies the actual HTMLAudio playback.
  lipEnvelope=null;

  const a=ttsAudio;
  revokeCurrentAudioObjectUrl();
  try{
    currentAudioObjectUrl=audioBlobUrlFromBase64(b,m);
    a.src=currentAudioObjectUrl;
    console.log(`[Nanako Audio] Omni WAV prepared as Blob URL (${String(b).length} base64 chars, mime=${m||"audio/wav"}).`);
  }catch(blobErr){
    console.warn("[Nanako Audio] Blob conversion failed; falling back to data URL.",blobErr);
    a.src=normalizeAudioSource(b,m);
  }
  a.preload="auto";
  a.volume=1;
  a.playbackRate=.86;
  a.defaultPlaybackRate=.86;
  currentAudio=a;
  try{a.load();}catch{}

  buildLipEnvelope(b)
    .then(env=>{if(currentAudio===a)lipEnvelope=env;})
    .catch(()=>{});

  convButton();

  let finished=false;
  const finish=()=>{
    if(finished)return;
    finished=true;
    stopTalkingLoop();
    if(currentAudio===a)currentAudio=null;
    convButton();
    if(active){
      status("Listening...");
      // Reacquire mic only AFTER TTS is completely finished or interrupted.
      setTimeout(begin,50);
    }else{
      status("Ready to chat");
    }
  };

  a.onplaying=()=>{
    if(currentAudio!==a)return;
    startTalkingLoop();
    status("Nanako is speaking...");
    convButton();
    console.log("[Nanako Audio] Playback started. Mic is OFF during TTS.");
  };
  a.onended=()=>{
    console.log("[Nanako Audio] Finished speaking.");
    finish();
  };
  a.onerror=()=>{
    const me=a.error;
    console.error("[Nanako Audio] Playback error.",me?{code:me.code,message:me.message}:"unknown media error");
    error(`Nanako audio playback error${me?.code?` (code ${me.code})`:""}.`);
    finish();
  };

  try{
    await a.play();
    if(currentAudio===a&&!lipRunning)startTalkingLoop();
    return true;
  }catch(x){
    console.error("[Nanako TTS] Playback failed:",x);
    error("Nanako's voice could not play. Tap Start Conversation once more to unlock audio.");
    finish();
    return false;
  }
}

async function mic(){if(stream&&stream.getTracks().some(t=>t.readyState==="live"))return stream;if(!navigator.mediaDevices?.getUserMedia)throw new Error("Microphone access requires HTTPS.");stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});return stream}
function release(){stream?.getTracks().forEach(t=>t.stop());stream=null}
function mime(){let c=["audio/mp4","audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"];return c.find(t=>MediaRecorder.isTypeSupported?.(t))||""}
function rms(a){let s=0;for(let v of a)s+=v*v;return Math.sqrt(s/a.length)}
function cleanup(){if(raf)cancelAnimationFrame(raf);raf=0;try{ctx?.close()}catch{}ctx=analyser=data=null}
function monitor(){if(!active||!rec||rec.state!=="recording"||!analyser||!data)return;analyser.getFloatTimeDomainData(data);let r=rms(data),now=performance.now(),age=now-turnStart;let db=r>0?20*Math.log10(r):-120,room=noiseFloor>0?20*Math.log10(noiseFloor):-120;e.debugMic.textContent=`Mic: ${db.toFixed(1)} dB`;e.debugRoom.textContent=`Room: ${room.toFixed(1)} dB`;e.debugSpeech.textContent=`Speech: ${speech?"Detected":"Waiting"}`;e.debugTurn.textContent=`Turn: ${(age/1000).toFixed(1)} sec`;
if(!hasGoodNoiseFloor&&age<VAD.calibrationMs){noiseSamples.push(r);if(noiseSamples.length){let sorted=[...noiseSamples].sort((a,b)=>a-b);noiseFloor=sorted[Math.floor(sorted.length*.5)]||noiseFloor}raf=requestAnimationFrame(monitor);return}
if(!hasGoodNoiseFloor){if(noiseSamples.length){let sorted=[...noiseSamples].sort((a,b)=>a-b);noiseFloor=sorted[Math.floor(sorted.length*.5)]||noiseFloor}lastGoodNoiseFloor=noiseFloor;hasGoodNoiseFloor=true;console.log("[Nanako Web VAD] Room calibration saved:",noiseFloor.toFixed(5))}else{noiseFloor=lastGoodNoiseFloor}
let st=Math.max(VAD.startFloor,noiseFloor*VAD.startNoiseMultiplier),ct=Math.max(VAD.continueFloor,noiseFloor*VAD.continueNoiseMultiplier);
if(!speech){if(r>=st){if(!candidate)candidate=now;if(now-candidate>=VAD.minSpeechMs){speech=true;firstSpeech=now;lastSpeech=now;status("I'm listening...");console.log("[Nanako Web VAD] Speech started.")}}else{candidate=0}if(age>=VAD.noSpeechRestartMs){console.log("[Nanako Web VAD] No speech timeout.");stopRec(false);return}}else{if(r>=ct)lastSpeech=now;if(now-firstSpeech>=VAD.minSpeechMs&&now-lastSpeech>=VAD.silenceToEndMs){console.log("[Nanako Web VAD] End of speech:",Math.round(now-lastSpeech),"ms silence");stopRec(true);return}}
if(age>=VAD.maxTurnMs){stopRec(speech);return}raf=requestAnimationFrame(monitor)}
async function startRec(){if(!active||busy||currentAudio||rec?.state==="recording")return;try{let s=await mic();if(!window.MediaRecorder)throw new Error("This browser does not support MediaRecorder.");cleanup();let AC=window.AudioContext||window.webkitAudioContext;if(AC){ctx=new AC();if(ctx.state==="suspended")await ctx.resume();let src=ctx.createMediaStreamSource(s);analyser=ctx.createAnalyser();analyser.fftSize=1024;data=new Float32Array(analyser.fftSize);src.connect(analyser)}chunks=[];noiseSamples=[];noiseFloor=hasGoodNoiseFloor?lastGoodNoiseFloor:.003;speech=false;candidate=0;firstSpeech=lastSpeech=0;uploadThisRecording=false;turnStart=performance.now();let mt=mime();rec=mt?new MediaRecorder(s,{mimeType:mt}):new MediaRecorder(s);let rr=rec;rr.ondataavailable=x=>{if(x.data?.size)chunks.push(x.data)};rr.onstop=async()=>{rec=null;cleanup();if(!uploadThisRecording||!chunks.length){chunks=[];if(active)setTimeout(begin,60);return}let type=rr.mimeType||chunks[0]?.type||"audio/mp4",b=new Blob(chunks,{type});chunks=[];await uploadVoice(b)};rr.start(160);status("Listening...");raf=requestAnimationFrame(monitor)}catch(x){console.error(x);error(x.message);status("Microphone unavailable");await stopMode()}}
function stopRec(upload=true){if(!rec)return;if(raf)cancelAnimationFrame(raf);raf=0;uploadThisRecording=upload;if(rec.state!=="inactive")rec.stop()}
async function uploadVoice(b){if(!active)return;busy=true;status("Nanako is thinking...");try{let f=new FormData(),type=b.type||"audio/mp4",ext=type.includes("mp4")?"m4a":type.includes("ogg")?"ogg":"webm";f.append("audio",b,`nanako_voice.${ext}`);f.append("level",level);f.append("voice_output",(voiceOutput&&!muted)?"true":"false");let r=await fetch(VOICE,{method:"POST",body:f}),d=await jsonResp(r);if(d?.ignored){if(active){status("Listening...");setTimeout(begin,60)}return}let t=String(d?.transcript||"");console.log("[Nanako Web Voice] Transcript:",t);transcript(t);await apply(d,t)}catch(x){console.error(x);error(x.message);status("Voice turn failed");if(active)setTimeout(begin,500)}finally{busy=false}}
async function begin(){if(!active||busy||currentAudio||rec?.state==="recording")return;await startRec()}
async function startMode(){if(active)return;try{await unlockAudio();active=true;convButton();status("Listening...");await begin()}catch(x){console.error(x);error("Please allow microphone access in Safari.")}}
async function stopMode(){active=false;if(rec?.state==="recording")stopRec(false);cleanup();release();await stopAudio(false);convButton();status("Ready to chat")}
async function reset(){await stopMode();try{await fetch(RESET,{method:"POST"})}catch{}history.length=0;renderHistory();setScore(0);e.jp.textContent="こんにちは！ななこです。今日も気楽に話そう。";e.roText.textContent=e.enText.textContent="";e.corr.hidden=e.settings.hidden=e.historyModal.hidden=true}

e.send.onclick=send;e.input.onkeydown=x=>{if(x.key==="Enter"){x.preventDefault();send()}};e.ro.onclick=()=>{showRO=!showRO;quick()};e.en.onclick=()=>{showEN=!showEN;quick()};e.mute.onclick=async()=>{muted=!muted;quick();if(muted&&currentAudio)await stopAudio(active)};e.conv.onclick=async()=>{if(currentAudio&&active){console.log("[Nanako] Manual interruption.");stopAudio(true);return}active?await stopMode():await startMode()};e.menu.onclick=()=>e.settings.hidden=false;e.closeSettings.onclick=()=>e.settings.hidden=true;e.historyBtn.onclick=()=>{e.settings.hidden=true;e.historyModal.hidden=false};e.closeHistory.onclick=()=>e.historyModal.hidden=true;e.settings.onclick=x=>{if(x.target===e.settings)e.settings.hidden=true};e.historyModal.onclick=x=>{if(x.target===e.historyModal)e.historyModal.hidden=true};e.levelGrid.onclick=x=>{let b=x.target.closest("[data-level]");if(!b)return;level=b.dataset.level;e.levelGrid.querySelectorAll("[data-level]").forEach(c=>c.classList.toggle("active",c.dataset.level===level));e.levelBadge.textContent=e.levelValue.textContent=label(level)};e.reset.onclick=reset;if(e.voiceOutput)e.voiceOutput.onclick=()=>setVoiceOutput(!voiceOutput);updateVoiceOutputUi();
window.addEventListener("beforeunload",()=>{
  stopTalkingLoop();
  stopIdleLoop();
  active=false;
  try{if(rec?.state==="recording")rec.stop()}catch{}
  cleanup();
  release();
  currentAudio?.pause();
});

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible")return;

  // Safari can suspend animation timers when a tab is backgrounded.
  // Re-establish the idle face cleanly after returning.
  if(!currentAudio){
    setEyes("open");
    setMouth("closed");
    startIdleLoop(false);
  }
});

if("serviceWorker"in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
}

async function boot(){
  setScore(0);quick();convButton();renderHistory();nanakoEyes=document.getElementById("nanakoEyes");nanakoMouth=document.getElementById("nanakoMouth");nanakoMotion=document.querySelector(".nanako-motion");
  try{
    await preloadFaceLayers();
    setEyes("open");
    setMouth("closed");
    startIdleLoop(true);
    console.log("[Nanako] Layered-face renderer v7.1 FIX loaded.");
  }catch(err){
    console.error("[Nanako Renderer] Failed to preload:", err);
    error("Nanako images failed to load.");
  }
}

boot();
})();
