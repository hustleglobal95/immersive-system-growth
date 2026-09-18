#!/usr/bin/env bash
# Mechanical enforcement of the CLAUDE.md operating contract.
#
# The repository already validates its *configuration* thoroughly -- twenty-eight scripts check
# experience.json, the manifests, motion tracks, camera paths and the cinematic systems. None of
# them read the source, so most of the twenty-four rules in CLAUDE.md were enforced by nothing but
# attention. This is the floor for the ones a machine can decide. Judgement calls -- whether a
# transition is motivated, whether copy reads -- stay with a person and the skills in .claude/.
#
# Pattern borrowed from textura-agency/next16-claude-starter (Unlicense); the rules are this
# project's own.
#
# Usage:  scripts/verify.sh [path ...]      (default scope: src app)
# Exit:   0 = no FAILs, 1 = one or more. WARNs never fail the run.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

SCOPE=("$@"); [ "$#" -eq 0 ] && SCOPE=("src" "app")

RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; DIM=$'\033[2m'; OFF=$'\033[0m'
[ -t 1 ] || { RED=""; YEL=""; GRN=""; DIM=""; OFF=""; }
fails=0; warns=0

report() {
  local level="$1" rule="$2" why="$3" out="${4:-}"
  [ -z "$out" ] && return 0
  if [ "$level" = FAIL ]; then fails=$((fails+1)); printf '%s\n' "${RED}FAIL${OFF}  ${rule}"
  else warns=$((warns+1)); printf '%s\n' "${YEL}WARN${OFF}  ${rule}"; fi
  printf '%s\n' "${DIM}      ${why}${OFF}"
  printf '%s\n' "$out" | head -12 | sed 's/^/      /'
  echo
}

SRC() { grep -rEn --include='*.ts' --include='*.tsx' "$1" "${SCOPE[@]}" 2>/dev/null; }
# Files that declare themselves client components.
CLIENT_FILES() { grep -rl '"use client"' --include='*.ts' --include='*.tsx' "${SCOPE[@]}" 2>/dev/null; }

echo "── Secrets and trust (rules 14, 15, 18) ──────────────────────"

client_env=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  hit="$(grep -nE 'process\.env\.[A-Z_]+' "$f" | grep -vE 'NEXT_PUBLIC_|NODE_ENV' || true)"
  [ -n "$hit" ] && client_env="${client_env}${f}: ${hit}"$'\n'
done < <(CLIENT_FILES)
report FAIL "server secret read inside a client component (rule 14)" \
  "A client component is shipped to the browser. Secrets belong in a route handler or a server module." \
  "$client_env"

report FAIL "plaintext HTTP in a runtime fetch (rule 15)" \
  "Remote content and telemetry endpoints must use HTTPS." \
  "$(SRC "fetch\(['\"]http://" | grep -v 'localhost')"

# Only remote endpoints, and the options object spans several lines, so look at a window.
unbounded=""
while IFS=: read -r file line _; do
  [ -z "$file" ] && continue
  window="$(sed -n "${line},$((line+8))p" "$file")"
  printf '%s' "$window" | grep -q 'signal' || unbounded="${unbounded}${file}:${line}"$'\n'
done < <(SRC 'fetch\((`|'"'"'|")https://')
report WARN "remote fetch without an abort signal (rule 15)" \
  "A remote request must be bounded, or a slow response holds the caller open." "$unbounded"

echo "── One canvas, one clock (rules 1, 20) ───────────────────────"

# Rule 1 allows a documented exception. The Studio's model inspector and the separate Heliot
# experience are those exceptions; this guards the Atelier runtime against gaining a second one.
canvases="$(SRC '<Canvas[ >]' | grep -vE 'SceneCanvas\.tsx|src/studio/|src/experiences/')"
report FAIL "a second React Three Fiber canvas (rule 1)" \
  "One persistent canvas. SceneCanvas owns it; everything else mounts inside." "$canvases"

report WARN "an independent playback clock (rule 20)" \
  "Scene motion is sampled from the one scroll clock. setInterval/setTimeout driving motion is a second clock." \
  "$(SRC 'setInterval\(' | grep -vE 'tests?/|scripts/|studio/|Studio|telemetry')"

echo "── Conversion stays semantic DOM (rules 6, 12) ───────────────"

report FAIL "click handler on a non-interactive element" \
  "Conversion actions must be a real button or link, reachable by keyboard." \
  "$(SRC '<(div|span|li)[^>]*onClick=')"

report WARN "raw anchor for an internal route" \
  "Use next/link so client navigation and prefetch work." \
  "$(SRC '<a[[:space:]]+href=\"/' | grep -vE 'mailto:|tel:')"

# JSX spreads an img across several lines, so alt may not sit on the opening line.
noalt=""
while IFS=: read -r file line _; do
  [ -z "$file" ] && continue
  printf '%s' "$(sed -n "${line},$((line+6))p" "$file")" | grep -q 'alt=' || noalt="${noalt}${file}:${line}"$'\n'
done < <(SRC '<img[[:space:]]')
report WARN "image without an alt attribute" \
  "Every image needs alt; a decorative one takes alt=\"\"." "$noalt"

echo "── Reduced motion (rule 7) ───────────────────────────────────"

if [ -z "$(SRC 'reducedMotion|prefers-reduced-motion')" ]; then
  report FAIL "no reduced-motion path (rule 7)" \
    "A useful reduced-motion path is required." "no reference to reducedMotion anywhere in scope"
fi

echo "── Types and hygiene ─────────────────────────────────────────"

report FAIL "explicit any" \
  "Type it, or use unknown and parse with zod." \
  "$(SRC ':[[:space:]]*any\b|<any>|as any|any\[\]' | grep -vE '\.d\.ts:')"

report WARN "console.log left in source" "Remove before committing." \
  "$(SRC 'console\.(log|debug)' | grep -vE 'scripts/|tests?/')"

report WARN "TODO or FIXME marker" "Resolve it, or move it to an issue." \
  "$(SRC '(TODO|FIXME)' | grep -vE 'tests?/')"

echo "──────────────────────────────────────────────────────────────"
if [ "$fails" -gt 0 ]; then
  printf '%s\n' "${RED}${fails} FAIL${OFF} / ${YEL}${warns} WARN${OFF} — every FAIL must be fixed."
  echo "Also required: npm run check, npm test, npm run lint, npm run build."
  exit 1
fi
printf '%s\n' "${GRN}0 FAIL${OFF} / ${YEL}${warns} WARN${OFF} — mechanical rules pass."
echo "Also required: npm run check, npm test, npm run lint, npm run build."
exit 0
