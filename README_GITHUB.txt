NANAKO v11 STEP 1.6 — GITHUB THIN FRONTEND

Upload the CONTENTS of this ZIP to the GitHub repository root.

Frontend responsibilities remain minimal:
- microphone permission / hardware capture
- 16 kHz PCM transport
- audio playback
- rendering Python animation frames

Step 1.6 fixes:
- correct return to Python idle after TTS ends
- mobile Safari playback-end watchdog
- muted/no-audio talking-plan cleanup

No browser animation decision engine, RMS/VAD, noise-floor logic, silence cutoff, or mouth-selection logic has been reintroduced.
