#!/usr/bin/env sh
# Local and Render start command. Render injects PORT; 8000 is the local default.
set -e
cd "$(dirname "$0")"
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
