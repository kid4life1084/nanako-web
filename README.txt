NANAKO QWEN3.5-OMNI-FLASH TEST BUILD v8

Frontend based on the user's stable layered-face safety build.

Changes:
- Voice Output button added inside the ... settings popup.
- Highlighted ON = Qwen3.5-Omni-Flash generates spoken audio.
- OFF = text response only; Omni audio output is not requested.
- Setting is saved in localStorage on the device.
- Existing layered face, blinking, mouth lip-sync, manual interrupt, and no-idle-mouth behavior are retained.

Backend requirement:
Deploy the matching alibaba_backend/app.py from the full bundle.
The frontend alone cannot switch the AI provider.


v8.4 Omni frontend audio fix:
- Voice Output ON now converts returned base64 WAV into a Blob URL before HTMLAudio playback.
- This avoids large data: URL playback issues in iOS Safari.
- Direct HTMLAudio remains in use; no GainNode/compressor processing.
- Added playback diagnostics and media error reporting.
- Service worker cache bumped to force Safari/GitHub Pages to fetch the updated JS.


v8.5: Split Omni reasoning and speech into separate requests to prevent long audio generation from trapping the conversation in Thinking.


v8.7 VAD reliability fix:
- Prevents the user's first words from contaminating room-noise calibration.
- Speech can trigger during calibration instead of being ignored.
- Slightly lower normal-voice start/continue thresholds.
- Faster no-speech mic reacquisition (8s).
- Settings debug now shows live Room and Start threshold dB.
