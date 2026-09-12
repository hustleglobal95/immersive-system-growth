# Browser recipe editor

The Recipe workspace is the browser authoring entry point for a client experience. It is intentionally different from the template gallery: the gallery selects a starting structure, while the recipe editor loads that structure into the draft and exposes the first direction pass.

The workspace edits the same validated experience object used by the production runtime. It can change project identity, scene copy, camera path, hero motion, active scene, and portable motion or transition presets. The output remains ordinary `experience.json` data and can continue through Sequence, Masks, Layers, Preview, and the review PR workflow.

Recipe changes remain in Studio local storage until the user exports them or opens a review pull request. No client source file is overwritten by selecting or editing a recipe.