# Forge Agent Safety Contract

This repository contains production creative work. Read this file before browsing, previewing, deploying, editing, or merging anything.

## Absolute preview rule

**SHOW, PREVIEW, OPEN, RUN, CAPTURE, SHARE, and DEPLOY are read-only operations.**

A request to see a project never authorizes an agent to redesign it, simplify it, recreate it, synthesize a substitute, change its creative direction, alter its source, change its assets, update its configuration, or merge code.

When asked to show or preview an existing project:

1. Locate the exact checked-in project and identify the commit SHA being shown.
2. Use the project's existing route, build/export script, and checked-in assets.
3. Serve or deploy that exact project state.
4. If the exact project cannot be served or deployed, report the limitation. **Do not create an approximation.**
5. Never hand-write replacement HTML/CSS/JS, generate a mock, or assemble an alternate Vercel deployment as a stand-in for the repository project.
6. Never modify `main`, merge a PR, force-update a branch, or change project files merely to satisfy a preview request.
7. Never interpret “finish,” “show,” “preview,” or “deploy” as permission to replace existing creative work. Creative changes require an explicit edit/build/redesign instruction from the user.

## Deployment provenance

Every project preview or deployment must be traceable to repository source.

- State the repository commit SHA before deployment.
- Prefer the repository's own build/export path or a Git-connected deployment.
- Do not deploy generated one-off files that are not the checked-in project.
- Do not use remote assets as a shortcut when the project already contains local assets.
- A deployment that does not represent the exact repository project must never be presented as that project.

## Project integrity locks

`config/project-integrity-lock.json` records canonical Git object IDs for protected project trees.

Run:

```bash
npm run project:integrity
```

before previewing, deploying, or declaring a protected project unchanged.

Changing a protected project intentionally requires updating its integrity lock in the same explicit creative-change task. **Preview/show/deploy tasks must never update the lock.**

## HELIOT protection

HELIOT is protected creative work. Its canonical runtime, client config, and local project assets are integrity-locked.

For HELIOT specifically:

- `/heliot` must come from the checked-in HELIOT implementation.
- Do not substitute a new page, static mock, simplified WebGL scene, alternate camera path, rewritten copy, or generated Vercel microsite.
- Do not change HELIOT to make it easier to preview.
- If the exact HELIOT cannot be run, say so and stop rather than showing something else under its name.

## Main-branch safety

- Do not force-update `main` except when the user explicitly asks for an exact rollback/revert and the target commit has been verified first.
- Normal changes go through a branch and pull request.
- Preview/deployment requests do not imply merge approval.
- Do not claim CI, build, browser, or deployment verification unless those exact checks ran against the exact commit being discussed.

## Creative authority

Forge Director, automation, AI agents, and deployment tooling assist human creative authority; they do not silently override it.

If there is any conflict between speed and preservation of existing creative work, preserve the existing work.
