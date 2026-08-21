NANAKO NORMAL TALKING ANIMATION v1.1
TALKING FIX + LOUDER VOICE

Fully extract this ZIP before uploading it to GitHub.

FIX 1 - TALKING ANIMATION
- Talking no longer waits for an async preload success flag.
- All 5 mouth images are explicitly preloaded by index.html.
- The first talk frame is shown immediately when TTS begins.
- A second fallback start occurs immediately after audio.play() succeeds.
- Mouth frames then update every ~86-144 ms.
- Manual interrupt and hands-free barge-in still stop the mouth instantly.
- Idle open/blink animation resumes when speaking ends.

FIX 2 - NANAKO VOICE TOO SOFT
- HTML audio was already at its maximum volume=1.
- This build adds a Web Audio GainNode at 1.65x.
- A gentle compressor reduces clipping on loud syllables.
- The boost is initialized from the user's Start Conversation tap for iOS Safari.
- If Web Audio boost is unavailable, Nanako falls back to normal audio automatically.

PRESERVED
- VAD/microphone tuning
- 1500 ms end-of-turn silence
- fast listening restart
- slower 0.86x Nanako TTS playback
- hands-free barge-in
- manual Interrupt Nanako
- idle blinking/breathing/sway

UPLOAD
Upload ONLY the extracted frontend files/folders to GitHub Pages.
No Alibaba backend changes are included.
