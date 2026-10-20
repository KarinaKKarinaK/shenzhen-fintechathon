#!/usr/bin/env bash
# One command: train with FATE, export the model, copy it into the engine, measure the prior.
# Uses fate/.venv (made with uv on first run) unless FATE_VENV points at another venv.
set -euo pipefail
cd "$(dirname "$0")/.."
VENV="${FATE_VENV:-fate/.venv}"
if [ ! -x "$VENV/bin/python" ]; then
  uv venv -p 3.10 "$VENV"
  uv pip install -p "$VENV/bin/python" -r fate/requirements.txt
fi
"$VENV/bin/python" fate/experiment.py
cp fate/model.json web/src/engine/credit/fate-model.json
(cd web && pnpm exec tsx scripts/fate-prior.ts)
