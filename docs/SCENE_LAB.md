# Scene Lab

Open `/lab` to tune the experience with the debug HUD and lab controls enabled.

The lab provides:

- timeline scrubbing from 0 to 1
- quality tier override
- reduced-motion preview
- free-camera mode using OrbitControls
- camera-state copy to clipboard
- scene name, actual camera values, draw calls and triangle count

## Camera tuning workflow

1. Scrub to the beginning or end of the target scene.
2. Enable **Free camera**.
3. Orbit, pan and zoom to the intended composition.
4. Click **Copy camera state**.
5. Paste the position, target and FOV values into the appropriate `from` or `to` keyframe in `config/experience.json`.
6. Disable Free camera and scrub through the scene to review the motion.

This is intentionally lightweight. It is a tuning surface, not a replacement for Blender or a DCC camera editor.
