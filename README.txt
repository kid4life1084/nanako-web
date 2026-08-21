NANAKO LAYERED FACE v7.1 FIX

- Uses the user's corrected 627x627 transparent base portrait with nose.
- Fixes an undefined JavaScript variable that could let voice begin playing,
  then immediately trigger a false playback error and stop lip animation.
- Talking animation now starts reliably when TTS playback starts.
- Eye blinking remains independent while Nanako speaks.
- Idle eye animation is more natural: variable timing, occasional double blink,
  and occasional slower half-lidded glance.
- Added subtle idle mouth behavior: roughly every 6.5-15 seconds Nanako may
  briefly open her mouth slightly and close it again. Occasionally it opens
  a little more for a very short moment.
- Idle mouth movement automatically stops while she is speaking.
- Manual interrupt remains the only speech interruption method.
- Direct HTMLAudio playback remains; no gain/compressor processing.
- Adds Safari tab-resume handling so idle animation restarts cleanly after the
  page has been backgrounded for a long time.

UPLOAD:
Fully extract this ZIP and replace the existing GitHub Pages frontend with
the extracted files/folders.


Safety build update:
- Idle mouth movement removed.
- In idle/listening state Nanako keeps her mouth closed.
- Blinking remains active.
