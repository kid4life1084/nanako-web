NANAKO v11 STEP 1.3 — GITHUB THIN FRONTEND

Upload the CONTENTS of this ZIP to the GitHub Pages repository root.

Animation architecture:
- HTML/CSS contain no Nanako animation timing logic.
- CSS has no Nanako keyframe animations.
- Python sends precomputed animation plans.
- JavaScript only renders the returned animation frames/transforms.

Microphone architecture:
- Browser only requests mic permission, captures PCM, resamples to 16 kHz mono, batches it, and sends it to Alibaba.
- Browser no longer contains VAD thresholds, RMS/noise-floor calibration, speech start/end timers, silence cutoff, max-turn logic, or MediaRecorder turn decisions.
- Python owns noise-floor tracking, VAD, speech start/end, no-speech timeout, max-turn cutoff, turn buffering, and barge-in gating.
- Python tells the browser when a completed turn exists; the browser then requests the Nanako response for that server-owned turn.

The browser must still contain a small hardware/network bridge because a remote Python server cannot directly access the user's physical microphone.
