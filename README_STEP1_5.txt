NANAKO v11 STEP 1.5 — FRONTEND

This is still a thin frontend.

The lip-tail correction itself is mostly server-side: Python now creates more sensitive 60 ms mouth frames from the actual Ono Anna WAV and preserves quiet final speech. The frontend keeps Step 1.4's audio.currentTime renderer and preloaded facial assets.

No animation decision logic or microphone VAD logic has been moved back into HTML/CSS/JS.
