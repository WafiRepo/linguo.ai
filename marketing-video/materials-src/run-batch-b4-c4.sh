#!/usr/bin/env bash
# Generate the Bagian VII–XVIII images (59) with codex-cli, resuming after failures.
# Only images that don't exist yet are requested, so it is safe to re-run.
# When Codex hits its usage limit the batch fails; we wait and try again.
# Run from marketing-video/materials-src:  bash run-batch-b4-c4.sh
set -u
cd "$(dirname "$0")"
LOG=batch-b4-c4.log
WAIT_SECONDS=${WAIT_SECONDS:-1800}   # 30 minutes between attempts
MAX_ATTEMPTS=${MAX_ATTEMPTS:-24}     # ~12 hours in total

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  pending=$(node -e '
    const fs = require("fs");
    const batch = JSON.parse(fs.readFileSync("batch.json", "utf8"));
    const todo = batch.tasks.filter((t) => /bag\d+/.test(t.id) && !fs.existsSync(t.image));
    fs.writeFileSync("batch-pending.json", JSON.stringify({ jobs: 1, tasks: todo }, null, 1));
    console.log(todo.length);')
  echo "[$(date '+%F %T')] attempt $attempt: $pending images left" | tee -a "$LOG"
  [ "$pending" -eq 0 ] && { echo "[$(date '+%F %T')] ALL DONE" | tee -a "$LOG"; exit 0; }

  npx -y bun C:/Users/user/.claude/skills/baoyu-image-gen/scripts/main.ts \
    --batchfile batch-pending.json --jobs 1 >> "$LOG" 2>&1

  left=$(node -e '
    const fs = require("fs");
    const t = JSON.parse(fs.readFileSync("batch-pending.json", "utf8")).tasks;
    console.log(t.filter((x) => !fs.existsSync(x.image)).length);')
  [ "$left" -eq 0 ] && { echo "[$(date '+%F %T')] ALL DONE" | tee -a "$LOG"; exit 0; }
  echo "[$(date '+%F %T')] $left still missing (quota or error); waiting ${WAIT_SECONDS}s" | tee -a "$LOG"
  sleep "$WAIT_SECONDS"
done
echo "[$(date '+%F %T')] gave up after $MAX_ATTEMPTS attempts" | tee -a "$LOG"
exit 1
