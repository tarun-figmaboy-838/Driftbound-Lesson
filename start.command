#!/bin/sh
# Drone Defense Briefing launcher (macOS): double-click to open the angle lesson.
# Serves this folder on your own Mac only (127.0.0.1) and opens it in your browser.
cd "$(dirname "$0")" || exit 1
PORT=8124
while lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT + 1)); done
( sleep 1; open "http://127.0.0.1:$PORT" ) &
exec python3 serve.py "$PORT"
