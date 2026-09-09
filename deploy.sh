#!/bin/sh
set -eu
APP_DIR="${BLOMOON_DEPLOY_DIR:-/opt/blomoon}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# Use the optional app-owned Node installation on VPS hosts without system Node.
if [ -x "$APP_DIR/tools/node/bin/node" ]; then
  PATH="$APP_DIR/tools/node/bin:$PATH"
  export PATH
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 24 is required: install it system-wide or at $APP_DIR/tools/node." >&2
  exit 1
fi
# Lock across automatic and manual deployments, including migrations.
exec flock -n "$APP_DIR/.deploy.lock" node "$SCRIPT_DIR/scripts/deploy.mjs" "${1:-}"
