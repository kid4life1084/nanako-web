NANAKO LAYERED FACE v7

Production-style 2D face renderer test for iPhone Safari / GitHub Pages.

ASSET STRUCTURE
static/characters/nanako/layers/
  base/base.png              627x627 blank-face body/head
  eyes/open.png              cropped eye+eyebrow sprite
  eyes/half.png              cropped eye+eyebrow sprite
  eyes/closed.png            cropped eye+eyebrow sprite
  mouth/closed.png           cropped mouth sprite
  mouth/small.png            cropped mouth sprite
  mouth/medium.png           cropped mouth sprite
  mouth/wide.png             cropped mouth sprite
  mouth/round.png            cropped mouth sprite
  placements.json            build-time placement reference

HOW IT WORKS
- Base portrait never changes.
- Exactly one eye overlay is displayed and can blink independently.
- Exactly one mouth overlay is displayed and changes while TTS plays.
- No full-portrait image swapping.
- No stacked full talking/idle portraits.
- No canvas clear/redraw.
- No automatic spoken barge-in. Manual Interrupt Nanako button only.
- Microphone is released while Nanako speaks and reacquired after speech/interrupt.
- TTS audio remains plain HTMLAudio; no gain/compressor processing.
- A separate decoded copy of the TTS is analysed for amplitude only. That analysis does not touch speaker playback.
- Mouth opens/closes in sync with the TTS amplitude and closes on pauses.
- Eye blinking continues independently during speech.

UPLOAD
Fully extract this ZIP, then upload the extracted contents to the GitHub Pages repo with folders intact.
