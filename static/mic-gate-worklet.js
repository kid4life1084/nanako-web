class NanakoMicGateProcessor extends AudioWorkletProcessor {
  constructor(){
    super();this.noise=.003;this.open=false;this.hold=0;this.buffer=[];this.pre=[];
    this.port.onmessage=e=>{if(e.data?.type==="reset"){this.noise=.003;this.open=false;this.hold=0;this.buffer=[];this.pre=[];}};
  }
  emit(samples){const copy=Float32Array.from(samples);this.port.postMessage({type:"audio",samples:copy},[copy.buffer]);}
  process(inputs,outputs){
    const input=inputs[0]?.[0],output=outputs[0]?.[0];if(output)output.fill(0);if(!input)return true;
    for(let i=0;i<input.length;i++)this.buffer.push(input[i]);
    if(this.buffer.length<2048)return true;
    const block=this.buffer.splice(0,2048);let sum=0;for(const v of block)sum+=v*v;
    // This is transport gating only. In loud places cap the threshold so quiet
    // close-mic speech still reaches Python's authoritative adaptive VAD.
    const rms=Math.sqrt(sum/block.length),threshold=Math.max(.004,Math.min(.012,this.noise*1.35));
    if(!this.open&&rms<threshold)this.noise=this.noise*.97+rms*.03;
    if(rms>=threshold){if(!this.open){this.open=true;for(const old of this.pre)this.emit(old);this.pre=[];}this.hold=Math.round(sampleRate*1.25/2048);}
    else if(this.open&&this.hold>0)this.hold--;else if(this.open){this.open=false;this.port.postMessage({type:"gate_closed"});}
    if(this.open)this.emit(block);else{this.pre.push(block);while(this.pre.length>Math.ceil(sampleRate*.5/2048))this.pre.shift();}
    return true;
  }
}
registerProcessor("nanako-mic-gate",NanakoMicGateProcessor);
