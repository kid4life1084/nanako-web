NANAKO v11 STEP 1.6 — THIN FRONTEND STABILIZATION

- Fixes the Step 1.5 bug that requested idle before currentAudio was cleared.
- Adds a mobile playback-end watchdog because Safari can occasionally miss onended.
- Talking animation remains driven by Python frames and HTMLAudio.currentTime.
- No CSS animation engine or browser VAD/noise-decision system was reintroduced.
- Browser still performs only hardware capture, PCM transport, audio playback, and frame rendering.
