NANAKO 627x627 ANIMATION PERFORMANCE TEST

Purpose:
Test whether reducing the full-frame idle/talking PNGs from 1254x1254 to 627x627
improves animation smoothness in iPhone Safari when opened from GitHub Pages.

This package keeps the existing layered talking-animation renderer and app logic.
The main change is the animation artwork resolution.

Included user-supplied transparent PNGs:
- idle_open.png   627x627 RGBA
- idle_half.png   627x627 RGBA
- idle_closed.png 627x627 RGBA
- talk_0.png      627x627 RGBA
- talk_1.png      627x627 RGBA
- talk_2.png      627x627 RGBA
- talk_3.png      627x627 RGBA
- talk_4.png      627x627 RGBA

Service-worker cache was bumped so Safari should fetch the new images/code.

UPLOAD:
1. Fully extract this ZIP.
2. Upload the extracted files/folders to the GitHub Pages repo, replacing the current frontend.
3. Wait for GitHub Pages to deploy.
4. On iPhone Safari, close the old tab and reopen the GitHub Pages URL.
5. If Safari still shows old assets, clear website data for the GitHub Pages site or use a fresh private tab for the test.
