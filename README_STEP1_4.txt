Nanako v11 Step 1.4 — Audio Clock Lip-Sync Fix

Purpose
-------
Fix visible mouth/audio drift on mobile while preserving the thin-frontend architecture.

What changed
------------
1. Talking animation now follows HTMLAudio.currentTime instead of wall-clock performance.now().
   This keeps Python's waveform-derived mouth timeline synchronized with Nanako's actual
   audio playback even though her TTS playbackRate is 0.86x.
2. Removed the duplicate talking-plan restart after audio.play(). The onplaying event is
   now the single authoritative renderer start.
3. Preloads all neutral/confused eye and mouth PNG layers so first-use network/decode delay
   on phones cannot hold an old mouth frame.

What did NOT change
-------------------
- Python still owns lip/mouth decisions and timings.
- Python still owns blink, breathing, emotion and state decisions.
- Python still owns VAD, noise tracking, speech start/end, turn control and barge-in.
- Browser JS remains only hardware/network/render glue.
- No Alibaba backend redeploy is required for this Step 1.4 fix.

Deployment
----------
Upload the CONTENTS of this ZIP to the GitHub repository root, replacing the current
Step 1.3 frontend files. Then hard-refresh/reopen the GitHub Pages app on the phone.
