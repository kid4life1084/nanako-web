NANAKO GITHUB PAGES - IDLE ANIMATION V1

Fully extract this ZIP before uploading to GitHub.

Correct repository structure:

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

Implemented:
- original user-provided Nanako open/half/closed eye frames
- natural open -> half -> closed -> half -> open blink
- randomized blink every ~2.7 to 7 seconds
- occasional double blink
- subtle breathing animation
- tiny slow body sway
- no changes to voice, VAD, barge-in, TTS, JLPT, history, or chat behavior

Upload ONLY this frontend package to GitHub Pages.
