NANAKO v6 - MANUAL INTERRUPT + SINGLE IMAGE RENDERER

PURPOSE
This build removes the browser workload that was causing the previous Safari tests to become choppy.

ANIMATION
- Uses ONE visible <img> element for Nanako.
- There are NO stacked idle/talking portrait layers.
- There is NO canvas clear/redraw cycle.
- There is NO opacity crossfade between frames.
- There is NO black PNG/background layer behind the talking frames.
- All 8 user-supplied 627x627 transparent PNGs are preloaded and decoded before animation begins.
- IDLE state: only idle_open / idle_half / idle_closed are used.
- TALKING state: idle timer is cancelled completely and only talk_0..talk_4 are used.
- When TTS finishes or is manually interrupted, talking stops and the idle loop restarts.
- Breathing/sway animation is disabled while Nanako talks, then resumes during idle.

VOICE / INTERRUPT
- Hands-free voice barge-in detection has been COMPLETELY REMOVED.
- There is no microphone analyser running while Nanako speaks.
- The microphone stream is fully released before TTS playback begins.
- The microphone is reacquired only after Nanako finishes speaking or you press the Interrupt Nanako button.
- Manual Interrupt Nanako remains available while she is speaking.
- Experimental Web Audio gain/compressor processing has been removed.
- Nanako TTS uses plain HTMLAudio playback again at 0.86x.

LISTENING
- Restored the previously stable browser VAD settings:
  calibration 350 ms
  minimum speech 220 ms
  end-of-turn silence 1500 ms
  start floor 0.007
  continue floor 0.0045
  start multiplier 1.5
  continue multiplier 1.15

ASSETS
Idle: 3 x 627x627 transparent PNG
Talking: 5 x 627x627 transparent PNG

UPLOAD
1. Fully extract this ZIP.
2. Upload the extracted files/folders to the GitHub Pages repo, replacing the previous frontend.
3. Keep the folder structure intact.
4. Wait for GitHub Pages deployment.
5. Reopen the page in Safari. A private tab is useful for the first test if Safari caches the old service worker.
