NANAKO IDLE ANIMATION v1.2 - BLINK FIX

This fixes the blink not appearing.

Cause fixed:
The previous build created a new asynchronous image-loader every time an eye
frame changed. Those loaders could finish out of order, effectively hiding the
blink.

v1.2 now:
- preloads open / half / closed once
- switches already-cached image frames directly
- performs a visible test blink about 1.2 seconds after page load
- then blinks naturally at random intervals of about 3–7 seconds
- about 12% chance of a quick double blink
- keeps breathing and subtle body sway
- keeps voice, VAD, slower TTS and barge-in unchanged

Fully unzip this package before uploading it to GitHub.
Upload the complete extracted folder structure over the current frontend.
