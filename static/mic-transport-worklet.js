class NanakoMicTransportProcessor extends AudioWorkletProcessor {
  constructor(){super();this.buffer=[];this.port.onmessage=event=>{if(event.data?.type==="reset")this.buffer=[];};}
  process(inputs,outputs){
    const input=inputs[0]?.[0],output=outputs[0]?.[0];if(output)output.fill(0);if(!input)return true;
    for(let i=0;i<input.length;i++)this.buffer.push(input[i]);
    while(this.buffer.length>=2048){const copy=Float32Array.from(this.buffer.splice(0,2048));this.port.postMessage({type:"audio",samples:copy},[copy.buffer]);}
    return true;
  }
}
registerProcessor("nanako-mic-transport",NanakoMicTransportProcessor);
