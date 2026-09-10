# Animated Assets

Forge supports ordinary GLB animation and scroll-scrubbed animation.

## `AnimatedGLTF`

Use for looping or autonomous model clips such as ambient machinery, subtle character motion or a door that is triggered by interaction.

## `ScrubbedGLTF`

Maps one GLB animation clip directly to a scene's normalized progress. This is useful for doors opening as the camera approaches, mechanical exploded views, construction sequences and product transformations.

## `ScrubbedVideoPlane`

Maps a video's playback position to scene progress. Use only when a real-time 3D solution is unnecessary or when the source material is intentionally prerendered. Scrubbed video can be extremely effective for high-end transitions, but it carries bandwidth and decoding cost.

Do not mix autonomous animation and scroll-scrubbing on the same transform or clip without a clear ownership strategy.
