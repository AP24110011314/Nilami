#!/usr/bin/env bash
# Starts MongoDB (replica set rs0 on 27018), Redis (6380) and Mailpit (1025/8025). No Docker.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/.data"
mkdir -p "$DATA/mongo" "$DATA/redis" "$DATA/logs" "$DATA/pids"

port_busy() { lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# Safety: never touch 5000/7000 (macOS AirPlay Receiver)
for p in 5000 7000; do
  if port_busy "$p"; then echo "note: port $p is used by macOS (AirPlay). Nilami does not use it."; fi
done

# MongoDB single-node replica set (needed for transactions)
if ! port_busy 27018; then
  python3 -c "
import os, subprocess, sys
if os.fork() == 0:
    os.setsid()
    proc = subprocess.Popen([
        'mongod', '--replSet', 'rs0', '--port', '27018', '--bind_ip', '127.0.0.1',
        '--dbpath', '$DATA/mongo', '--logpath', '$DATA/logs/mongod.log'
    ])
    with open('$DATA/pids/mongod.pid', 'w') as f:
        f.write(str(proc.pid))
    sys.exit(0)
"
  for i in {1..25}; do
    if port_busy 27018; then break; fi
    sleep 0.2
  done
  echo "mongod started on 27018"
fi
mongosh --quiet --port 27018 --eval '
  try { rs.status().ok }
  catch (e) { rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27018" }] }) }
' >/dev/null
echo "replica set rs0 ready"

# Redis (noeviction is REQUIRED by BullMQ)
if ! port_busy 6380; then
  redis-server --port 6380 --bind 127.0.0.1 --dir "$DATA/redis" \
    --appendonly yes --maxmemory-policy noeviction \
    --daemonize yes --logfile "$DATA/logs/redis.log" --pidfile "$DATA/pids/redis.pid" >/dev/null
  echo "redis started on 6380"
fi

# Mailpit (dev SMTP catcher + web UI)
if ! port_busy 8025; then
  nohup mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025 \
    --database "$DATA/mailpit.db" >"$DATA/logs/mailpit.log" 2>&1 &
  echo $! >"$DATA/pids/mailpit.pid"
  echo "mailpit UI http://localhost:8025"
fi

echo "Infra ready: mongo 27018 | redis 6380 | mailpit 1025/8025"
