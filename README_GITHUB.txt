NANAKO v11 STEP 1.2 — GITHUB THIN FRONTEND

Upload the CONTENTS of this ZIP to the GitHub Pages repository root.

Animation architecture:
- HTML/CSS contain no Nanako animation timing logic.
- CSS has no Nanako keyframe animations.
- JavaScript has no blink scheduler, lip-sync audio analysis, emotion timer, or x/y eye/mouth placement table.
- Alibaba Python sends precomputed animation plans.
- JavaScript is only a thin renderer/executor for those plans.

Microphone is still the existing browser implementation in Step 1.2.
Moving VAD/noise/barge-in to Python is the next migration stage.
