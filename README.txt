NANAKO GITHUB PAGES - IDLE ANIMATION V1.1 FIX

This fixes the broken image loading caused by incorrect service-worker paths.

IMPORTANT:
Fully extract this ZIP first.
Upload the extracted files/folders to the repository root.

Correct structure:

index.html
manifest.webmanifest
sw.js
README.txt
static/
  app.js
  style.css
  characters/
    nanako/
      nanako_master.png
      idle/
        idle_open.png
        idle_half.png
        idle_closed.png

This build:
- fixes service-worker asset paths
- removes old broken caches automatically
- keeps blink + breathing + sway
- adds fallback to nanako_master.png if any idle frame is missing
- preserves voice/VAD/barge-in behavior
