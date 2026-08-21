
(()=>{"use strict";

// ============================================================
// NANAKO IDLE ANIMATION v1.2
// Uses the user's three aligned eye frames.
// ============================================================
const NANAKO_IDLE_FRAMES = {
  open: "./static/characters/nanako/idle/idle_open.png",
  half: "./static/characters/nanako/idle/idle_half.png",
  closed: "./static/characters/nanako/idle/idle_closed.png"
};

let nanakoBlinkTimer = 0;
let nanakoBlinking = false;
let nanakoIdleStopped = false;
let nanakoIdleReady = false;

function sleepIdle(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadNanakoIdleFrame(src){
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

async function preloadNanakoIdleFrames(){
  try{
    await Promise.all(
      Object.values(NANAKO_IDLE_FRAMES).map(loadNanakoIdleFrame)
    );
    nanakoIdleReady = true;
    console.log("[Nanako Idle] All blink frames preloaded.");
    return true;
  }catch(error){
    console.error("[Nanako Idle] Frame preload failed:", error);
    nanakoIdleReady = false;
    return false;
  }
}

function setNanakoEyeFrame(name){
  const image = document.getElementById("nanakoImage");
  const src = NANAKO_IDLE_FRAMES[name];

  if(!image || !src) return;

  // Frames have already been preloaded, so switch them directly.
  // Avoiding a new Image() probe here prevents async frame-order races.
  image.src = src;
  image.dataset.eyeFrame = name;
}

async function runNanakoBlink(doubleBlink=false){
  if(nanakoBlinking || nanakoIdleStopped || !nanakoIdleReady) return;

  nanakoBlinking = true;

  try{
    // Natural blink: open -> half -> closed -> half -> open
    setNanakoEyeFrame("half");
    await sleepIdle(72);

    setNanakoEyeFrame("closed");
    await sleepIdle(105);

    setNanakoEyeFrame("half");
    await sleepIdle(68);

    setNanakoEyeFrame("open");

    // About 12% of blinks are a quick natural double blink.
    if(doubleBlink && !nanakoIdleStopped){
      await sleepIdle(145);

      setNanakoEyeFrame("half");
      await sleepIdle(62);

      setNanakoEyeFrame("closed");
      await sleepIdle(90);

      setNanakoEyeFrame("half");
      await sleepIdle(58);

      setNanakoEyeFrame("open");
    }
  }finally{
    nanakoBlinking = false;
  }
}

function scheduleNanakoBlink(first=false){
  clearTimeout(nanakoBlinkTimer);

  if(nanakoIdleStopped || !nanakoIdleReady) return;

  // First blink is intentionally soon so you can immediately confirm it works.
  // Normal idle blinks then happen irregularly, usually every 3–7 seconds.
  const delay = first
    ? 1200
    : 3000 + Math.random() * 4000;

  nanakoBlinkTimer = window.setTimeout(async () => {
    const doubleBlink = Math.random() < 0.12;
    await runNanakoBlink(doubleBlink);
    scheduleNanakoBlink(false);
  }, delay);
}

async function startNanakoIdleAnimation(){
  nanakoIdleStopped = false;
  setNanakoEyeFrame("open");

  const loaded = await preloadNanakoIdleFrames();

  if(!loaded){
    const image = document.getElementById("nanakoImage");
    if(image){
      image.src = "./static/characters/nanako/nanako_master.png";
    }
    return;
  }

  // Preload talking frames in the background for instant TTS animation.
  preloadNanakoTalkFrames();

  // Test blink ~1.2 seconds after page load, then normal randomized blinking.
  scheduleNanakoBlink(true);
}

function stopNanakoIdleAnimation(){
  nanakoIdleStopped = true;
  clearTimeout(nanakoBlinkTimer);
  setNanakoEyeFrame("open");
}

// ============================================================
// NANAKO NORMAL TALKING ANIMATION v1
// Five full-frame mouth states synchronized to TTS playback.
// ============================================================
const NANAKO_TALK_FRAMES = [
  "./static/characters/nanako/talk/talk_0.png",
  "./static/characters/nanako/talk/talk_1.png",
  "./static/characters/nanako/talk/talk_2.png",
  "./static/characters/nanako/talk/talk_3.png",
  "./static/characters/nanako/talk/talk_4.png"
];

let nanakoTalkTimer = 0;
let nanakoTalking = false;
let nanakoTalkReady = false;
let nanakoLastTalkFrame = 0;

async function preloadNanakoTalkFrames(){
  try{
    await Promise.all(
      NANAKO_TALK_FRAMES.map(loadNanakoIdleFrame)
    );
    nanakoTalkReady = true;
    console.log("[Nanako Talk] Five talking frames preloaded.");
    return true;
  }catch(error){
    console.error("[Nanako Talk] Frame preload failed:", error);
    nanakoTalkReady = false;
    return false;
  }
}

function setNanakoTalkFrame(index){
  const image = document.getElementById("nanakoImage");
  const src = NANAKO_TALK_FRAMES[index];

  if(!image || !src) return;

  image.onerror = () => {
    console.warn("[Nanako Talk] Could not load:", src);
    image.onerror = null;
    image.src = NANAKO_IDLE_FRAMES.open;
  };

  image.src = src;
  image.dataset.talkFrame = String(index);
}

function chooseNextNanakoTalkFrame(){
  // Weighted toward small/medium mouth openings.
  // Wide and rounded shapes appear as accents rather than every cycle.
  const choices = [0,0,1,1,1,1,2,2,2,3,4];
  let next = choices[Math.floor(Math.random() * choices.length)];

  if(next === nanakoLastTalkFrame){
    next = choices[Math.floor(Math.random() * choices.length)];
  }

  nanakoLastTalkFrame = next;
  return next;
}

function scheduleNanakoTalkFrame(){
  clearTimeout(nanakoTalkTimer);
  if(!nanakoTalking) return;

  setNanakoTalkFrame(chooseNextNanakoTalkFrame());

  // Slight timing variation avoids a mechanical flipbook rhythm.
  nanakoTalkTimer = window.setTimeout(
    scheduleNanakoTalkFrame,
    86 + Math.random() * 58
  );
}

function startNanakoTalkingAnimation(){
  nanakoTalking = true;

  // Suspend idle blinking while the full-frame mouth portraits are active.
  clearTimeout(nanakoBlinkTimer);
  nanakoBlinking = false;

  // IMPORTANT:
  // Do not block animation on an async preload flag. The browser can display
  // already cached/preloaded frames immediately, and can fetch any missing
  // frame on demand. This makes the mouth loop robust on iPhone Safari.
  nanakoLastTalkFrame = 0;
  setNanakoTalkFrame(1);

  clearTimeout(nanakoTalkTimer);
  nanakoTalkTimer = window.setTimeout(
    scheduleNanakoTalkFrame,
    70
  );

  console.log("[Nanako Talk] Talking animation STARTED.");
}

function stopNanakoTalkingAnimation(){
  nanakoTalking = false;
  clearTimeout(nanakoTalkTimer);
  nanakoTalkTimer = 0;

  setNanakoEyeFrame("open");

  if(!nanakoIdleStopped && nanakoIdleReady){
    scheduleNanakoBlink(false);
  }
}

const API="https://nanako-web-pokbkohedy.ap-southeast-1.fcapp.run",CHAT=`${API}/api/chat`,VOICE=`${API}/api/voice`,RESET=`${API}/api/reset`;
const VAD={calibrationMs:350,minSpeechMs:220,silenceToEndMs:1500,noSpeechRestartMs:12000,maxTurnMs:30000,startFloor:.007,continueFloor:.0045,startNoiseMultiplier:1.5,continueNoiseMultiplier:1.15};
const $=id=>document.getElementById(id),e={levelBadge:$("levelBadge"),scoreFill:$("scoreFill"),scoreText:$("scoreText"),settingsScore:$("settingsScore"),settingsScoreFill:$("settingsScoreFill"),userTranscript:$("userTranscript"),userTranscriptText:$("userTranscriptText"),status:$("statusText"),ro:$("romajiButton"),en:$("englishButton"),mute:$("muteButton"),jp:$("japaneseReply"),roSec:$("romajiSection"),enSec:$("englishSection"),roText:$("romajiReply"),enText:$("englishReply"),input:$("messageInput"),send:$("sendButton"),conv:$("conversationButton"),corr:$("correctionToast"),wrong:$("wrongText"),correct:$("correctText"),err:$("errorToast"),settings:$("settingsModal"),menu:$("menuButton"),closeSettings:$("closeSettingsButton"),historyBtn:$("historyButton"),historyModal:$("historyModal"),closeHistory:$("closeHistoryButton"),historyEmpty:$("historyEmpty"),historyList:$("historyList"),levelValue:$("levelValue"),levelGrid:$("levelGrid"),reset:$("resetButton"),debugMic:$("debugMic"),debugRoom:$("debugRoom"),debugSpeech:$("debugSpeech"),debugTurn:$("debugTurn")};
let level="auto",score=0,showRO=false,showEN=false,muted=false,active=false,busy=false,currentAudio=null,stream=null,rec=null,chunks=[],ctx=null,analyser=null,data=null,raf=0,noiseSamples=[],noiseFloor=.003,lastGoodNoiseFloor=.003,hasGoodNoiseFloor=false,speech=false,candidate=0,firstSpeech=0,lastSpeech=0,turnStart=0,transcriptTimer=0,correctionTimer=0,uploadThisRecording=false,audioUnlocked=false,bargeCtx=null,bargeAnalyser=null,bargeData=null,bargeRaf=0,bargeCandidate=0,ttsStartedAt=0,bargeBusy=false;const history=[];const ttsAudio=new Audio();ttsAudio.preload="auto";ttsAudio.playsInline=true;
let ttsBoostCtx=null,ttsBoostSource=null,ttsBoostGain=null,ttsBoostCompressor=null,ttsBoostReady=false;
const SILENT_WAV="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const status=t=>e.status.textContent=t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),label=l=>l==="auto"?"Auto":l.toUpperCase();
function setScore(v){score=clamp(Math.round(Number(v)||0),0,100);let w=`${score}%`;e.scoreText.textContent=score;e.scoreFill.style.width=w;e.settingsScore.textContent=`${score} / 100`;e.settingsScoreFill.style.width=w}
function error(m){e.err.textContent=String(m||"Something went wrong.");e.err.hidden=false;clearTimeout(error.t);error.t=setTimeout(()=>e.err.hidden=true,6000)}
function transcript(t){clearTimeout(transcriptTimer);if(!t){e.userTranscript.hidden=true;return}e.userTranscriptText.textContent=t;e.userTranscript.style.opacity="1";e.userTranscript.hidden=false;transcriptTimer=setTimeout(()=>{e.userTranscript.style.opacity="0";setTimeout(()=>e.userTranscript.hidden=true,450)},3200)}
function correction(d){let a=d?.analysis&&typeof d.analysis==="object"?d.analysis:{},o=String(a.wrong_text??a.original??a.original_text??a.user_text??"").trim(),c=String(a.correct_text??a.corrected??a.corrected_text??a.correction??"").trim(),n=a.needs_correction===true||a.correct===false||a.is_correct===false||!!(o&&c&&o!==c);return{n,o,c}}
function showCorrection(x){clearTimeout(correctionTimer);if(!x.n||!x.o||!x.c){e.corr.hidden=true;return}e.wrong.textContent=x.o;e.correct.textContent=`→ ${x.c}`;e.corr.hidden=false;correctionTimer=setTimeout(()=>e.corr.hidden=true,7000)}
function addHistory(role,text,x=null){history.push({role,text:String(text||""),wrong:x?.n?x.o:"",corrected:x?.n?x.c:""});renderHistory()}
function renderHistory(){e.historyList.innerHTML="";e.historyEmpty.hidden=history.length>0;history.forEach(h=>{let b=document.createElement("div");b.className=`history-bubble ${h.role==="user"?"user":""}`;let r=document.createElement("div");r.className="history-role";r.textContent=h.role==="user"?"YOU":"NANAKO";let t=document.createElement("div");t.className="history-text";t.textContent=h.text;b.append(r,t);if(h.wrong&&h.corrected){let c=document.createElement("div");c.className="history-correction";c.innerHTML=`<div class="history-wrong"></div><div class="history-correct"></div>`;c.children[0].textContent=h.wrong;c.children[1].textContent=h.corrected;b.append(c)}e.historyList.append(b)})}
function quick(){e.ro.classList.toggle("active",showRO);e.roSec.hidden=!showRO;e.en.classList.toggle("active",showEN);e.enSec.hidden=!showEN;e.mute.classList.toggle("active",muted);e.mute.textContent=muted?"🔇":"🔊"}
function convButton(){e.conv.classList.toggle("active",active);if(currentAudio&&active){e.conv.classList.add("interrupt");e.conv.textContent="✋ Interrupt Nanako"}else{e.conv.classList.remove("interrupt");e.conv.textContent=active?"⏹ End Conversation":"🎤 Start Conversation"}}
async function jsonResp(r){let d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.error||d?.message||`Request failed (${r.status})`);return d}
async function apply(d,user){e.jp.textContent=String(d?.reply||"");e.roText.textContent=String(d?.romaji||"");e.enText.textContent=String(d?.english||"");let s=Number(d?.conversation_score??d?.score??d?.analysis?.conversation_score);if(Number.isFinite(s))setScore(s);let x=correction(d);showCorrection(x);addHistory("user",user,x);addHistory("assistant",d?.reply||"");let b=d?.audio_base64||d?.tts_audio_base64||d?.audio||"",m=d?.audio_mime||d?.mime_type||"audio/wav";console.log("[Nanako Audio] Audio found:",Boolean(b),m);if(b&&!muted)await play(b,m);else if(active)setTimeout(begin,60)}
async function send(){let t=e.input.value.trim();if(!t||busy)return;busy=true;status("Nanako is thinking...");try{let r=await fetch(CHAT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t,level})}),d=await jsonResp(r);e.input.value="";transcript(t);await apply(d,t)}catch(x){console.error(x);error(x.message);status("Chat failed.")}finally{busy=false;if(!currentAudio&&!active)status("Ready to chat")}}
function normalizeAudioSource(b,m){let v=String(b||"");if(!v)return"";if(v.startsWith("data:"))return v;return`data:${m||"audio/wav"};base64,${v}`}

async function ensureNanakoTtsBoost(){
  if(ttsBoostReady){
    try{
      if(ttsBoostCtx?.state==="suspended") await ttsBoostCtx.resume();
    }catch{}
    return true;
  }

  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass){
    console.warn("[Nanako Audio] Web Audio unavailable; using normal volume.");
    return false;
  }

  try{
    ttsBoostCtx=new AudioContextClass();
    ttsBoostSource=ttsBoostCtx.createMediaElementSource(ttsAudio);
    ttsBoostGain=ttsBoostCtx.createGain();
    ttsBoostCompressor=ttsBoostCtx.createDynamicsCompressor();

    // HTMLMediaElement.volume cannot exceed 1.0.
    // A gain stage gives Nanako a useful speaker-volume boost.
    ttsBoostGain.gain.value=1.65;

    // Gentle compression protects against harsh clipping on louder syllables.
    ttsBoostCompressor.threshold.value=-16;
    ttsBoostCompressor.knee.value=12;
    ttsBoostCompressor.ratio.value=3;
    ttsBoostCompressor.attack.value=.004;
    ttsBoostCompressor.release.value=.18;

    ttsBoostSource.connect(ttsBoostGain);
    ttsBoostGain.connect(ttsBoostCompressor);
    ttsBoostCompressor.connect(ttsBoostCtx.destination);

    if(ttsBoostCtx.state==="suspended"){
      await ttsBoostCtx.resume();
    }

    ttsBoostReady=true;
    console.log("[Nanako Audio] Speaker boost enabled at 1.65x.");
    return true;
  }catch(error){
    console.warn("[Nanako Audio] Speaker boost unavailable; direct audio remains active.",error);
    ttsBoostReady=false;
    return false;
  }
}
async function unlockAudio(){if(audioUnlocked){await ensureNanakoTtsBoost();return}try{await ensureNanakoTtsBoost();ttsAudio.src=SILENT_WAV;ttsAudio.volume=.01;await ttsAudio.play();ttsAudio.pause();ttsAudio.currentTime=0;ttsAudio.volume=1;audioUnlocked=true;console.log("[Nanako Audio] iOS playback unlocked + volume boost ready.")}catch(x){console.warn("[Nanako Audio] unlock attempt failed:",x)}}
function stopAudio(resume=false){stopNanakoTalkingAnimation();if(currentAudio){try{currentAudio.pause();currentAudio.src="";currentAudio.load()}catch{}currentAudio=null}convButton();if(resume&&active){status("Listening...");setTimeout(begin,60)}}
async function play(b,m){if(!b||muted){if(active)setTimeout(begin,60);return false}stopAudio(false);let a=ttsAudio;a.src=normalizeAudioSource(b,m);a.preload="auto";a.volume=1;a.playbackRate=.86;a.defaultPlaybackRate=.86;currentAudio=a;if(ttsBoostCtx?.state==="suspended"){ttsBoostCtx.resume().catch(()=>{})}convButton();let finish=()=>{stopNanakoTalkingAnimation();if(currentAudio===a)currentAudio=null;convButton();if(active){status("Listening...");setTimeout(begin,60)}else status("Ready to chat")};a.onplaying=()=>{if(currentAudio!==a)return;ttsStartedAt=performance.now();bargeCandidate=0;startNanakoTalkingAnimation();status("Nanako is speaking...");convButton();console.log("[Nanako Audio] Playback started + talking animation.")};a.onended=()=>{console.log("[Nanako Audio] Finished speaking.");finish()};a.onerror=()=>{console.error("[Nanako Audio] Playback error.");finish()};try{await a.play();if(currentAudio===a&&!nanakoTalking)startNanakoTalkingAnimation();return true}catch(x){console.error("[Nanako TTS] Playback failed:",x);error("Nanako's voice could not play. Tap Start Conversation once more to unlock audio.");finish();return false}}
async function mic(){if(stream&&stream.getTracks().some(t=>t.readyState==="live"))return stream;if(!navigator.mediaDevices?.getUserMedia)throw new Error("Microphone access requires HTTPS.");stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});return stream}
function release(){stream?.getTracks().forEach(t=>t.stop());stream=null}
function mime(){let c=["audio/mp4","audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"];return c.find(t=>MediaRecorder.isTypeSupported?.(t))||""}
function rms(a){let s=0;for(let v of a)s+=v*v;return Math.sqrt(s/a.length)}function median(a){if(!a.length)return .003;let s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]}
function stopBargeMonitor(){
  if(bargeRaf)cancelAnimationFrame(bargeRaf);
  bargeRaf=0;
  try{bargeCtx?.close()}catch{}
  bargeCtx=bargeAnalyser=bargeData=null;
  bargeCandidate=0;
  bargeBusy=false;
}
async function startBargeMonitor(){
  if(!active||!stream||bargeAnalyser)return;
  let AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  try{
    bargeCtx=new AC();
    if(bargeCtx.state==="suspended")await bargeCtx.resume();
    let src=bargeCtx.createMediaStreamSource(stream);
    bargeAnalyser=bargeCtx.createAnalyser();
    bargeAnalyser.fftSize=1024;
    bargeAnalyser.smoothingTimeConstant=.12;
    bargeData=new Float32Array(bargeAnalyser.fftSize);
    src.connect(bargeAnalyser);
    const tick=()=>{
      if(!active||!bargeAnalyser||!bargeData)return;
      bargeAnalyser.getFloatTimeDomainData(bargeData);
      let r=rms(bargeData),now=performance.now();

      // Only look for barge-in while Nanako is actually speaking.
      // iOS echo cancellation removes most of Nanako's speaker output.
      if(currentAudio && !bargeBusy && now-ttsStartedAt>450){
        let base=hasGoodNoiseFloor?lastGoodNoiseFloor:noiseFloor;
        let threshold=Math.max(.013,base*2.5);

        if(r>=threshold){
          if(!bargeCandidate)bargeCandidate=now;

          if(now-bargeCandidate>=220){
            bargeBusy=true;
            bargeCandidate=0;
            console.log("[Nanako Barge-in] User speech detected. Interrupting TTS.");
            stopAudio(false);
            status("Listening...");
            setTimeout(async()=>{
              bargeBusy=false;
              await begin();
            },35);
          }
        }else{
          bargeCandidate=0;
        }
      }else if(!currentAudio){
        bargeCandidate=0;
      }

      bargeRaf=requestAnimationFrame(tick);
    };
    bargeRaf=requestAnimationFrame(tick);
    console.log("[Nanako Barge-in] Hands-free interruption enabled.");
  }catch(x){
    console.warn("[Nanako Barge-in] Could not start:",x);
    stopBargeMonitor();
  }
}

function cleanup(){if(raf)cancelAnimationFrame(raf);raf=0;try{ctx?.close()}catch{}ctx=analyser=data=null}
function monitor(){
  if(!active||!rec||rec.state!=="recording"||!analyser||!data)return;
  analyser.getFloatTimeDomainData(data);
  let r=rms(data),now=performance.now(),age=now-turnStart;
  let db=r>0?20*Math.log10(r):-120,room=noiseFloor>0?20*Math.log10(noiseFloor):-120;
  e.debugMic.textContent=`Mic: ${db.toFixed(1)} dB`;
  e.debugRoom.textContent=`Room: ${room.toFixed(1)} dB`;
  e.debugSpeech.textContent=`Speech: ${speech?"Detected":"Waiting"}`;
  e.debugTurn.textContent=`Turn: ${(age/1000).toFixed(1)} sec`;

  // First listening turn calibrates the room. Later turns reuse the last
  // known good room level so speech immediately after Nanako finishes
  // is not lost during another calibration window.
  if(!hasGoodNoiseFloor && age<VAD.calibrationMs){
    noiseSamples.push(r);
    if(noiseSamples.length){
      let sorted=[...noiseSamples].sort((a,b)=>a-b);
      noiseFloor=sorted[Math.floor(sorted.length*.5)]||noiseFloor;
    }
    raf=requestAnimationFrame(monitor);
    return;
  }

  if(!hasGoodNoiseFloor){
    if(noiseSamples.length){
      let sorted=[...noiseSamples].sort((a,b)=>a-b);
      noiseFloor=sorted[Math.floor(sorted.length*.5)]||noiseFloor;
    }
    lastGoodNoiseFloor=noiseFloor;
    hasGoodNoiseFloor=true;
    console.log("[Nanako Web VAD] Room calibration saved:",noiseFloor.toFixed(5));
  }else{
    noiseFloor=lastGoodNoiseFloor;
  }

  let st=Math.max(VAD.startFloor,noiseFloor*VAD.startNoiseMultiplier);
  let ct=Math.max(VAD.continueFloor,noiseFloor*VAD.continueNoiseMultiplier);

  if(!speech){
    if(r>=st){
      if(!candidate)candidate=now;
      if(now-candidate>=VAD.minSpeechMs){
        speech=true;
        firstSpeech=now;
        lastSpeech=now;
        status("I'm listening...");
        console.log("[Nanako Web VAD] Speech started.");
      }
    }else{
      candidate=0;
    }

    if(age>=VAD.noSpeechRestartMs){
      console.log("[Nanako Web VAD] No speech timeout.");
      stopRec(false);
      return;
    }
  }else{
    if(r>=ct)lastSpeech=now;

    if(
      now-firstSpeech>=VAD.minSpeechMs &&
      now-lastSpeech>=VAD.silenceToEndMs
    ){
      console.log(
        "[Nanako Web VAD] End of speech:",
        Math.round(now-lastSpeech),
        "ms silence"
      );
      stopRec(true);
      return;
    }
  }

  if(age>=VAD.maxTurnMs){
    stopRec(speech);
    return;
  }

  raf=requestAnimationFrame(monitor);
}
async function startRec(){if(!active||busy||currentAudio||rec?.state==="recording")return;try{let s=await mic();if(!window.MediaRecorder)throw new Error("This browser does not support MediaRecorder.");cleanup();let AC=window.AudioContext||window.webkitAudioContext;if(AC){ctx=new AC();if(ctx.state==="suspended")await ctx.resume();let src=ctx.createMediaStreamSource(s);analyser=ctx.createAnalyser();analyser.fftSize=1024;data=new Float32Array(analyser.fftSize);src.connect(analyser)}chunks=[];noiseSamples=[];noiseFloor=hasGoodNoiseFloor?lastGoodNoiseFloor:.003;speech=false;candidate=0;firstSpeech=lastSpeech=0;uploadThisRecording=false;turnStart=performance.now();let mt=mime();rec=mt?new MediaRecorder(s,{mimeType:mt}):new MediaRecorder(s);let rr=rec,upload=true;rr.ondataavailable=x=>{if(x.data?.size)chunks.push(x.data)};rr.onstop=async()=>{rec=null;cleanup();if(!uploadThisRecording||!chunks.length){chunks=[];if(active)setTimeout(begin,100);return}let type=rr.mimeType||chunks[0]?.type||"audio/mp4",b=new Blob(chunks,{type});chunks=[];await uploadVoice(b)};rr.start(180);status("Listening...");raf=requestAnimationFrame(monitor)}catch(x){console.error(x);error(x.message);status("Microphone unavailable");await stopMode()}}
function stopRec(upload=true){if(!rec)return;if(raf)cancelAnimationFrame(raf);raf=0;uploadThisRecording=upload;if(rec.state!=="inactive")rec.stop()}
async function uploadVoice(b){if(!active)return;busy=true;status("Nanako is thinking...");try{let f=new FormData(),type=b.type||"audio/mp4",ext=type.includes("mp4")?"m4a":type.includes("ogg")?"ogg":"webm";f.append("audio",b,`nanako_voice.${ext}`);f.append("level",level);let r=await fetch(VOICE,{method:"POST",body:f}),d=await jsonResp(r);if(d?.ignored){if(active){status("Listening...");setTimeout(begin,100)}return}let t=String(d?.transcript||"");console.log("[Nanako Web Voice] Transcript:",t);transcript(t);await apply(d,t)}catch(x){console.error(x);error(x.message);status("Voice turn failed");if(active)setTimeout(begin,800)}finally{busy=false}}
async function begin(){if(!active||busy||currentAudio||rec?.state==="recording")return;await startRec()}
async function startMode(){if(active)return;try{await unlockAudio();await mic();active=true;await startBargeMonitor();convButton();status("Listening...");await begin()}catch(x){error("Please allow microphone access in Safari.")}}
async function stopMode(){active=false;if(rec?.state==="recording")stopRec(false);cleanup();stopBargeMonitor();release();await stopAudio(false);convButton();status("Ready to chat")}
async function reset(){await stopMode();try{await fetch(RESET,{method:"POST"})}catch{}history.length=0;renderHistory();setScore(0);e.jp.textContent="こんにちは！ななこです。今日も気楽に話そう。";e.roText.textContent=e.enText.textContent="";e.corr.hidden=e.settings.hidden=e.historyModal.hidden=true}
e.send.onclick=send;e.input.onkeydown=x=>{if(x.key==="Enter"){x.preventDefault();send()}};e.ro.onclick=()=>{showRO=!showRO;quick()};e.en.onclick=()=>{showEN=!showEN;quick()};e.mute.onclick=async()=>{muted=!muted;quick();if(muted&&currentAudio)await stopAudio(active)};e.conv.onclick=async()=>{if(currentAudio&&active){console.log("[Nanako] Manual interruption.");stopAudio(true);return}active?await stopMode():await startMode()};e.menu.onclick=()=>e.settings.hidden=false;e.closeSettings.onclick=()=>e.settings.hidden=true;e.historyBtn.onclick=()=>{e.settings.hidden=true;e.historyModal.hidden=false};e.closeHistory.onclick=()=>e.historyModal.hidden=true;e.settings.onclick=x=>{if(x.target===e.settings)e.settings.hidden=true};e.historyModal.onclick=x=>{if(x.target===e.historyModal)e.historyModal.hidden=true};e.levelGrid.onclick=x=>{let b=x.target.closest("[data-level]");if(!b)return;level=b.dataset.level;e.levelGrid.querySelectorAll("[data-level]").forEach(c=>c.classList.toggle("active",c.dataset.level===level));e.levelBadge.textContent=e.levelValue.textContent=label(level)};e.reset.onclick=reset;
window.addEventListener("beforeunload",()=>{stopNanakoTalkingAnimation();stopNanakoIdleAnimation();active=false;try{if(rec?.state==="recording")rec.stop()}catch{}cleanup();stopBargeMonitor();release();currentAudio?.pause()});if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
setScore(0);quick();convButton();renderHistory();startNanakoIdleAnimation();console.log("[Nanako] Web prototype loaded with idle animation.");
})();
