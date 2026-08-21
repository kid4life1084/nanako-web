Nanako GitHub Single Renderer v5

What changed:
- Rebuilt Nanako character animation to use ONE canvas renderer only.
- Idle and talking frames are no longer layered on top of each other.
- Removed the old stacked talking-frame method.
- No black underlay PNG trick behind the talking frames.
- Idle loop runs only while Nanako is waiting/listening.
- Talking loop runs only while Nanako is speaking.
- Reduced Safari overhead to improve smoothness.
- Tuned voice detection to be more sensitive and quicker to respond.
- Kept barge-in interruption.

Upload this whole folder structure to GitHub, replacing the old files.
