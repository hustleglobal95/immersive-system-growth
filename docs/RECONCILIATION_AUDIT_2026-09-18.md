# Full Reconciliation Audit — 2026-09-18

Baseline reviewed: `main@08640d01628033fcd0ae0f88cd0d84be42224994`

Scope: audit the 20 commits that were still unique on the three known divergent branches, preserve genuinely missing capability, discard superseded/incompatible branch state, and leave one authoritative `main`.

## Branch: research/immersive-intelligence-round-2 — 12 unique commits

| Commit | Subject | Disposition |
| --- | --- | --- |
| `b03322d` | Add 14islands, Monks and North Kingdom production research | Preserved. Missing public research records were transplanted. |
| `c9bbf70` | Add DOM alignment and rendering-substitution research patterns | Preserved. Missing construction patterns and reference mappings were transplanted. |
| `5cd3521` | Add frame, layout and static-transform technical doctrine | Preserved. Missing primary technical doctrines were transplanted. |
| `f561114` | Add direct-source and cross-studio immersive research wave | Preserved. Missing public/direct-source references were transplanted. |
| `8482a83` | Fix technical doctrine array syntax | Superseded. Current main had already fixed the same double-comma defect; the stale hunk was deliberately not replayed. |
| `360cdaa` | Corroborate emerging construction patterns across references | Preserved. Evidence mappings were applied where the current source context still matched. |
| `b1867c8` | Add branching interactive film construction pattern | Preserved as `branching-authored-film`. |
| `dd590a2` | Add interactive film, spatial documentary and cross-medium cases | Preserved. Missing case-study evidence was transplanted. |
| `2146ffe` | Expand evidence-backed immersive failure knowledge | Preserved. Six missing failure lessons were added; the branch's separate malformed comma was repaired during transplant. |
| `2b3f74b` | Add cross-industry immersive construction lenses | Preserved as `constructionLenses.ts`. |
| `519d3ab` | Expose construction-lens coverage in Director research | Preserved in construction directives. |
| `2aba852` | Show construction-lens coverage to Director | Preserved in `scripts/director-prompt.mjs`. |

Net recovered from this branch:
- 26 public/technical references;
- five previously missing construction patterns;
- six failure lessons;
- five primary technical doctrines;
- twelve cross-industry construction lenses;
- Director prompt exposure of lens coverage.

## Branch: chore/project-preview-safety — 7 unique commits

| Commit | Subject | Disposition |
| --- | --- | --- |
| `660dbb8` | Add absolute preview and project-preservation safety contract | Preserved and adapted to current Forge operating rules. |
| `4e84260` | Lock canonical HELIOT project trees | Preserved concept; stale tree hashes were discarded and regenerated from the current canonical HELIOT trees. |
| `ae8cf7c` | Add protected-project integrity audit | Preserved as `scripts/project-integrity-audit.mjs`. |
| `03bd834` | Run project integrity guard in default checks | Preserved; `npm run check` now starts with `npm run project:integrity`. |
| `0de4e4a` | Make preview and deployment preservation non-negotiable | Preserved in `AGENTS.md` and current `CLAUDE.md`. |
| `b427592` | Add project-preservation checks to PR template | Preserved in the current pull-request template. |
| `7955233` | Add ownership protection for HELIOT creative source | Preserved in `.github/CODEOWNERS`. |

The old lock baseline was not copied. The reconciled lock is based on the canonical project trees at `main@08640d01628033fcd0ae0f88cd0d84be42224994`:
- `app/heliot` → `772a30f35f3d6241a5669b6346b0ff740c898614`
- `src/experiences/heliot` → `a2be8d6a738781f0e9643160117c2a223aa29eea`
- `clients/heliot` → `01911ac8d94cc89c82403edb4167c46d78bd0f0d`
- `public/models/heliot` → `3b3fb33945bf140fab4791bc326e4d8e0319ab7f`

## Branch: claude/cinematic-scroll-video-site-j130l9 — 1 unique commit

| Commit | Subject | Disposition |
| --- | --- | --- |
| `d0bd204` | Add standalone scroll-tied video section app | Standalone shell discarded as incompatible/superseded; the useful random-access video lesson was preserved as Forge-native construction knowledge. |

The standalone app intentionally used its own React 18, Tailwind, Vite, mp4box dependencies, remote font/video assets and a separate runtime. Importing that shell would expand dependency and maintenance surface without strengthening the main Forge architecture.

The useful technique was distilled into:
- `decoded-frame-bank-for-hard-scrub` in `constructionKnowledge.ts`;
- linkage to `video-frame-callback-sync` technical doctrine;
- bounded decode/cache/fallback guidance that prefers scrub-optimized delivery video before escalating to WebCodecs/frame-bank complexity.

## Reconciled intelligence state

After recovery and distillation:
- 49 GetLayers catalog seeds;
- 187 broader public/technical references;
- 236 combined references;
- 108 executable construction patterns;
- 25 primary technical doctrines;
- 18 evidence-backed failure lessons;
- 12 cross-industry construction lenses.

Hardcoded tests, audit floors, Director docs, corpus docs, release notes, the repository manifest and Autonomy guidance were synchronized to these counts.

## Repository-safety state

The reconciliation adds:
- `AGENTS.md` exact-project preview/deployment safety contract;
- `.github/CODEOWNERS` protection for HELIOT creative source;
- `config/project-integrity-lock.json` regenerated from the current canonical trees;
- `scripts/project-integrity-audit.mjs`;
- `npm run project:integrity`;
- project-integrity execution at the start of `npm run check`;
- pull-request preservation checklist;
- Visual Director environment variables in `.env.example`.

## Validation caveat

GitHub Actions has recently failed before assigning a runner, with zero workflow steps executed. That infrastructure condition is separate from this reconciliation. The repository now contains stronger local/test/audit gates, but a green hosted-CI result still requires GitHub to provision a runner and execute them.
