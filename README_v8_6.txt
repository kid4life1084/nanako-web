Nanako Omni Flash v8.6 - Frontend State Machine Fix

Changes:
- Frontend-only update. No Alibaba backend changes required.
- Replaces scattered microphone restart timers with one guarded scheduler.
- Voice reasoning is always requested text-only; speech is requested separately via /api/speak.
- Explicit busy-state cleanup before listening resumes.
- Adds turn serial protection against stale async callbacks.
- Keeps Voice Output toggle, Ono Anna speech, direct HTMLAudio, layered face, manual interrupt, and no idle mouth movement.
- Bumps service-worker cache and adds cache-busting query strings for app.js/style.css.

Upload the CONTENTS of this ZIP to the GitHub Pages repo root.
