NANAKO NORMAL TALKING ANIMATION v1.2
LAYERED MOUTH RENDERER FIX

WHAT CHANGED
- Talking animation no longer swaps the main image src every ~0.1 sec.
- Instead, the 5 talking frames are preloaded and placed as stacked image layers in the DOM.
- During speech, the app only toggles which talk layer is visible.
- This is much lighter for iPhone Safari and should make Nanako's mouth animation visibly run while she speaks.

PRESERVED
- Existing idle blink animation
- Existing sway/breathing motion
- Existing barge-in
- Existing manual interrupt
- Existing microphone / VAD tuning

UPLOAD
Extract this ZIP first, then upload the extracted frontend files/folders to GitHub Pages, replacing the current frontend.
