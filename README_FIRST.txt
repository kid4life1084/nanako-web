NANAKO PROTOTYPE TUNING V3

This package has TWO parts.

1) github_frontend/
   Upload the CONTENTS of this folder to the existing GitHub Pages repo.

   Changes:
   - microphone reactivates about 120 ms after Nanako finishes
   - keeps the last good room-noise calibration across turns
   - easier speech-start trigger (2.2 -> 1.85)
   - keeps 1500 ms silence before ending the user's turn
   - Nanako voice playback slowed to 0.90x
   - interrupt behavior retained
   - canonical nanako_master.png INCLUDED
   - service-worker cache bumped to v3

2) backend/app.py
   This is the optional updated Alibaba Function Compute backend.

   Changes:
   - keeps Japanese-only microphone ASR
   - adds a conversation rule not to ask for information the user
     literally just provided
   - if the transcript is clearly garbled/uncertain, Nanako should ask
     for repetition instead of inventing meaning

IMPORTANT:
The frontend tuning works after updating GitHub.
The conversation-context rule requires replacing/redeploying Alibaba app.py.
