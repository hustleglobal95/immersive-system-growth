#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  printf '\nForge Studio needs Node.js 22.13 or newer. Install Node and reopen this launcher.\n'
  printf 'Press Return to close. '
  read answer
  exit 1
fi
node scripts/start-studio.mjs
status=$?
if [ "$status" -ne 0 ]; then
  printf '\nStudio did not start. The error is above. Press Return to close. '
  read answer
fi
exit "$status"
