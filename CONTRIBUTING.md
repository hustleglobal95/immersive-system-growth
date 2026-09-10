# Contributing

Keep changes aligned with the persistent-world architecture.

Before opening a pull request, run `npm run check` and `npm run build`. New camera paths should be pure samplers, new shaders need performance and fallback notes, and new recipes must cover a contiguous 0 to 1 timeline.

Do not vendor third-party repositories into Forge. Add dependencies through package management and document optional integrations separately.
