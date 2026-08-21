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
