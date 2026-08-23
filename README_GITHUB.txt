NANAKO v11 STEP 1.5 — GITHUB THIN FRONTEND

Upload the CONTENTS of this ZIP to the GitHub Pages repository root.

Animation architecture:
- HTML/CSS contain no Nanako animation timing logic.
- CSS has no Nanako keyframe animations.
- Python sends precomputed animation plans derived from the returned TTS WAV.
- JavaScript only renders the returned image frames/transforms against HTMLAudio.currentTime.
- Step 1.5 keeps the Step 1.4 audio-clock synchronization and works with the new server-side quiet-tail lip plan.

Microphone architecture:
- Browser only requests mic permission, captures PCM, resamples to 16 kHz mono, batches it, and sends it to Alibaba.
- Browser contains no VAD thresholds, RMS/noise-floor calibration, speech start/end timers, silence cutoff, max-turn logic, or MediaRecorder turn decisions.
- Python owns room-noise tracking, VAD, speech start/end, no-speech timeout, max-turn cutoff, turn buffering, and barge-in gating.

Persona architecture:
- Persona/scenario decisions are server-side Python/Qwen instructions, not frontend code.
- Step 1.5 backend anchors Nanako as a mid-20s Japanese receptionist meeting the learner for the first time at a language exchange.
