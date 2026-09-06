#!/usr/bin/env bash
# Voice On — first push, or any later update. Safe to run repeatedly.
#   bash push.sh                 -> commits and pushes with a default message
#   bash push.sh "your message"  -> uses your commit message
set -euo pipefail

REMOTE="https://github.com/vyshakiyengar/daily_speech_exercise.git"
MSG="${1:-Voice On: guided daily speech fluency practice}"

cd "$(dirname "$0")"
echo "→ repo folder: $(pwd)"

if [ ! -d .git ]; then
  echo "→ initialising git"
  git init -b main >/dev/null
fi

# make sure we are on a branch called main
git rev-parse --verify main >/dev/null 2>&1 || git checkout -b main >/dev/null 2>&1 || true
git symbolic-ref -q HEAD >/dev/null || git checkout -b main >/dev/null

if git remote get-url origin >/dev/null 2>&1; then
  CURRENT="$(git remote get-url origin)"
  if [ "$CURRENT" != "$REMOTE" ]; then
    echo "→ pointing origin at $REMOTE (was $CURRENT)"
    git remote set-url origin "$REMOTE"
  fi
else
  echo "→ adding origin"
  git remote add origin "$REMOTE"
fi

git add -A
if git diff --cached --quiet; then
  echo "→ nothing new to commit"
else
  git commit -m "$MSG" >/dev/null
  echo "→ committed: $MSG"
fi

echo "→ pushing to origin/main"
if ! git push -u origin main 2>/tmp/voiceon_push_err; then
  if grep -qiE 'rejected|non-fast-forward|fetch first' /tmp/voiceon_push_err; then
    echo "→ remote already has commits (a README, probably). Rebasing onto it."
    git pull --rebase origin main
    git push -u origin main
  else
    echo
    echo "Push failed:"
    cat /tmp/voiceon_push_err
    echo
    echo "Most likely you need to authenticate. Either:"
    echo "  gh auth login            # if you have the GitHub CLI"
    echo "  git config --global credential.helper osxkeychain   # then push again and paste a PAT"
    exit 1
  fi
fi

echo
echo "✓ pushed to https://github.com/vyshakiyengar/daily_speech_exercise"
echo "  Next: vercel.com → Add New → Project → import daily_speech_exercise → Deploy"
echo "  Leave build command and output directory empty; vercel.json handles the rest."
