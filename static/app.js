(()=>{
"use strict";

// ============================================================
// NANAKO CHARACTER RENDERER v6
// One visible <img> only. No canvas. No stacked portrait layers.
// Idle and talking are mutually exclusive animation states.
// ============================================================
const NANAKO_FRAMES = {
  idle: {
    open: "./static/characters/nanako/idle/idle_open.png",
    half: "./static/characters/nanako/idle/idle_half.png",
    closed: "./static/characters/nanako/idle/idle_closed.png"
  },
  talk: [
    "./static/characters/nanako/talk/talk_0.png",
    "./static/characters/nanako/talk/talk_1.png",
    "./static/characters/nanako/talk/talk_2.png",
    "./static/characters/nanako/talk/talk_3.png",
    "./static/characters/nanako/talk/talk_4.png"
  ]
};

const frameCache = new Map();
let nanakoImage = null;
let nanakoMotion = null;
let rendererReady = false;
let characterMode = "idle"; // idle | talking
let idleEnabled = false;
let blinkTimer = 0;
let blinkToken = 0;
let talkTimer = 0;
let talkStep = 0;

function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

function loadFrame(key, src){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.decoding = "async";
    img.onload = async ()=>{
      try{ if(img.decode) await img.decode(); }catch{}
      frameCache.set(key, img);
      resolve();
    };
    img.onerror = ()=>reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

async function preloadAllFrames(){
  const jobs = [
    loadFrame("idle:open", NANAKO_FRAMES.idle.open),
    loadFrame("idle:half", NANAKO_FRAMES.idle.half),
    loadFrame("idle:closed", NANAKO_FRAMES.idle.closed),
    ...NANAKO_FRAMES.talk.map((src,i)=>loadFrame(`talk:${i}`, src))
  ];
  await Promise.all(jobs);
  rendererReady = true;
  console.log("[Nanako Renderer] 8 frames loaded and decoded.");
}

function frameSrc(key){
  const cached = frameCache.get(key);
  return cached?.src || "";
}

function showFrame(key){
  if(!nanakoImage) return;
  const src = frameSrc(key);
  if(src && nanakoImage.src !== src){
    nanakoImage.src = src;
  }
}

function showIdle(name="open"){ showFrame(`idle:${name}`); }
function showTalk(index=0){ showFrame(`talk:${index}`); }

function cancelBlink(){
  clearTimeout(blinkTimer);
  blinkTimer = 0;
  blinkToken += 1;
}

async function blinkOnce(doubleBlink=false){
  const token = ++blinkToken;
  if(characterMode !== "idle" || !idleEnabled) return;

  showIdle("half");
  await sleep(72);
  if(token!==blinkToken || characterMode!=="idle") return;
  showIdle("closed");
  await sleep(98);
  if(token!==blinkToken || characterMode!=="idle") return;
  showIdle("half");
  await sleep(64);
  if(token!==blinkToken || characterMode!=="idle") return;
  showIdle("open");

  if(doubleBlink){
    await sleep(150);
    if(token!==blinkToken || characterMode!=="idle") return;
    showIdle("half");
    await sleep(58);
    if(token!==blinkToken || characterMode!=="idle") return;
    showIdle("closed");
    await sleep(86);
    if(token!==blinkToken || characterMode!=="idle") return;
    showIdle("half");
    await sleep(55);
    if(token!==blinkToken || characterMode!=="idle") return;
    showIdle("open");
  }
}

function scheduleBlink(first=false){
  cancelBlink();
  if(characterMode !== "idle" || !idleEnabled) return;
  const delay = first ? 1200 : 3200 + Math.random()*4200;
  blinkTimer = setTimeout(async()=>{
    await blinkOnce(Math.random()<0.14);
    scheduleBlink(false);
  }, delay);
}

function startIdleLoop(first=false){
  clearTimeout(talkTimer);
  talkTimer = 0;
  talkStep = 0;
  characterMode = "idle";
  idleEnabled = true;
  if(nanakoMotion) nanakoMotion.classList.remove("talking");
  showIdle("open");
  scheduleBlink(first);
}

function stopIdleLoop(){
  idleEnabled = false;
  cancelBlink();
}

const TALK_SEQUENCE = [1,2,1,3,2,1,0,1,2,4,2,1,0,2,1,3,2,1];
function runTalkLoop(){
  if(characterMode !== "talking") return;
  showTalk(TALK_SEQUENCE[talkStep % TALK_SEQUENCE.length]);
  talkStep += 1;
  // Anime-style discrete mouth changes; no opacity transitions.
  talkTimer = setTimeout(runTalkLoop, 118 + Math.random()*34);
}

function startTalkingLoop(){
  stopIdleLoop();
  characterMode = "talking";
  talkStep = 0;
  if(nanakoMotion) nanakoMotion.classList.add("talking");
  showTalk(1);
  clearTimeout(talkTimer);
  talkTimer = setTimeout(runTalkLoop, 90);
  console.log("[Nanako Renderer] TALKING state active.");
}

function stopTalkingLoop(){
  clearTimeout(talkTimer);
  talkTimer = 0;
  startIdleLoop(false);
  console.log("[Nanako Renderer] IDLE state active.");
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
const $=id=>document.getElementById(id),e={levelBadge:$("levelBadge"),scoreFill:$("scoreFill"),scoreText:$("scoreText"),settingsScore:$("settingsScore"),settingsScoreFill:$("settingsScoreFill"),userTranscript:$("userTranscript"),userTranscriptText:$("userTranscriptText"),status:$("statusText"),ro:$("romajiButton"),en:$("englishButton"),mute:$("muteButton"),jp:$("japaneseReply"),roSec:$("romajiSection"),enSec:$("englishSection"),roText:$("romajiReply"),enText:$("englishReply"),input:$("messageInput"),send:$("sendButton"),conv:$("conversationButton"),corr:$("correctionToast"),wrong:$("wrongText"),correct:$("correctText"),err:$("errorToast"),settings:$("settingsModal"),menu:$("menuButton"),closeSettings:$("closeSettingsButton"),historyBtn:$("historyButton"),historyModal:$("historyModal"),closeHistory:$("closeHistoryButton"),historyEmpty:$("historyEmpty"),historyList:$("historyList"),levelValue:$("levelValue"),levelGrid:$("levelGrid"),reset:$("resetButton"),debugMic:$("debugMic"),debugRoom:$("debugRoom"),debugSpeech:$("debugSpeech"),debugTurn:$("debugTurn")};
let level="auto",score=0,showRO=false,showEN=false,muted=false,active=false,busy=false,currentAudio=null,stream=null,rec=null,chunks=[],ctx=null,analyser=null,data=null,raf=0,noiseSamples=[],noiseFloor=.003,lastGoodNoiseFloor=.003,hasGoodNoiseFloor=false,speech=false,candidate=0,firstSpeech=0,lastSpeech=0,turnStart=0,transcriptTimer=0,correctionTimer=0,uploadThisRecording=false,audioUnlocked=false;const history=[];const ttsAudio=new Audio();ttsAudio.preload="auto";ttsAudio.playsInline=true;
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
function convButton(){e.conv.classList.toggle("active",active);if(currentAudio&&active){e.conv.classList.add("interrupt");e.conv.textContent="✋ Interrupt Nanako"}else{e.conv.classList.remove("interrupt");e.conv.textContent=active?"⏹ End Conversation":"🎤 Start Conversation"}}
async function jsonResp(r){let d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.error||d?.message||`Request failed (${r.status})`);return d}
async function apply(d,user){e.jp.textContent=String(d?.reply||"");e.roText.textContent=String(d?.romaji||"");e.enText.textContent=String(d?.english||"");let s=Number(d?.conversation_score??d?.score??d?.analysis?.conversation_score);if(Number.isFinite(s))setScore(s);let x=correction(d);showCorrection(x);addHistory("user",user,x);addHistory("assistant",d?.reply||"");let b=d?.audio_base64||d?.tts_audio_base64||d?.audio||"",m=d?.audio_mime||d?.mime_type||"audio/wav";if(b&&!muted)await play(b,m);else if(active)setTimeout(begin,20)}
async function send(){let t=e.input.value.trim();if(!t||busy)return;busy=true;status("Nanako is thinking...");try{let r=await fetch(CHAT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t,level})}),d=await jsonResp(r);e.input.value="";transcript(t);await apply(d,t)}catch(x){console.error(x);error(x.message);status("Chat failed.")}finally{busy=false;if(!currentAudio&&!active)status("Ready to chat")}}
function normalizeAudioSource(b,m){let v=String(b||"");if(!v)return"";if(v.startsWith("data:"))return v;return`data:${m||"audio/wav"};base64,${v}`}
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

  // Critical Safari simplification:
  // completely release microphone capture while Nanako is speaking.
  // There is NO voice barge-in detection in this build.
  cleanup();
  release();

  const a=ttsAudio;
  a.src=normalizeAudioSource(b,m);
  a.preload="auto";
  a.volume=1;
  a.playbackRate=.86;
  a.defaultPlaybackRate=.86;
  currentAudio=a;
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
    console.error("[Nanako Audio] Playback error.");
    finish();
  };

  try{
    await a.play();
    if(currentAudio===a&&characterMode!=="talking")startTalkingLoop();
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
async function uploadVoice(b){if(!active)return;busy=true;status("Nanako is thinking...");try{let f=new FormData(),type=b.type||"audio/mp4",ext=type.includes("mp4")?"m4a":type.includes("ogg")?"ogg":"webm";f.append("audio",b,`nanako_voice.${ext}`);f.append("level",level);let r=await fetch(VOICE,{method:"POST",body:f}),d=await jsonResp(r);if(d?.ignored){if(active){status("Listening...");setTimeout(begin,60)}return}let t=String(d?.transcript||"");console.log("[Nanako Web Voice] Transcript:",t);transcript(t);await apply(d,t)}catch(x){console.error(x);error(x.message);status("Voice turn failed");if(active)setTimeout(begin,500)}finally{busy=false}}
async function begin(){if(!active||busy||currentAudio||rec?.state==="recording")return;await startRec()}
async function startMode(){if(active)return;try{await unlockAudio();active=true;convButton();status("Listening...");await begin()}catch(x){console.error(x);error("Please allow microphone access in Safari.")}}
async function stopMode(){active=false;if(rec?.state==="recording")stopRec(false);cleanup();release();await stopAudio(false);convButton();status("Ready to chat")}
async function reset(){await stopMode();try{await fetch(RESET,{method:"POST"})}catch{}history.length=0;renderHistory();setScore(0);e.jp.textContent="こんにちは！ななこです。今日も気楽に話そう。";e.roText.textContent=e.enText.textContent="";e.corr.hidden=e.settings.hidden=e.historyModal.hidden=true}

e.send.onclick=send;e.input.onkeydown=x=>{if(x.key==="Enter"){x.preventDefault();send()}};e.ro.onclick=()=>{showRO=!showRO;quick()};e.en.onclick=()=>{showEN=!showEN;quick()};e.mute.onclick=async()=>{muted=!muted;quick();if(muted&&currentAudio)await stopAudio(active)};e.conv.onclick=async()=>{if(currentAudio&&active){console.log("[Nanako] Manual interruption.");stopAudio(true);return}active?await stopMode():await startMode()};e.menu.onclick=()=>e.settings.hidden=false;e.closeSettings.onclick=()=>e.settings.hidden=true;e.historyBtn.onclick=()=>{e.settings.hidden=true;e.historyModal.hidden=false};e.closeHistory.onclick=()=>e.historyModal.hidden=true;e.settings.onclick=x=>{if(x.target===e.settings)e.settings.hidden=true};e.historyModal.onclick=x=>{if(x.target===e.historyModal)e.historyModal.hidden=true};e.levelGrid.onclick=x=>{let b=x.target.closest("[data-level]");if(!b)return;level=b.dataset.level;e.levelGrid.querySelectorAll("[data-level]").forEach(c=>c.classList.toggle("active",c.dataset.level===level));e.levelBadge.textContent=e.levelValue.textContent=label(level)};e.reset.onclick=reset;
window.addEventListener("beforeunload",()=>{stopTalkingLoop();stopIdleLoop();active=false;try{if(rec?.state==="recording")rec.stop()}catch{}cleanup();release();currentAudio?.pause()});if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));

async function boot(){
  setScore(0);quick();convButton();renderHistory();nanakoImage=document.getElementById("nanakoImage");nanakoMotion=document.querySelector(".nanako-motion");
  try{
    await preloadAllFrames();
    startIdleLoop(true);
    console.log("[Nanako] Single-renderer build loaded.");
  }catch(err){
    console.error("[Nanako Renderer] Failed to preload:", err);
    error("Nanako images failed to load.");
  }
}

boot();
})();
