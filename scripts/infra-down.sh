#!/usr/bin/env bash
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/.data"
mongosh --quiet --port 27018 admin --eval 'db.shutdownServer()' >/dev/null 2>&1 && echo "mongod stopped"
redis-cli -p 6380 shutdown save >/dev/null 2>&1 && echo "redis stopped"
if [ -f "$DATA/pids/mailpit.pid" ]; then kill "$(cat "$DATA/pids/mailpit.pid")" 2>/dev/null && echo "mailpit stopped"; rm -f "$DATA/pids/mailpit.pid"; fi
