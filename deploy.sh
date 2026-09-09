#!/bin/sh
set -eu
APP_DIR="${BLOMOON_DEPLOY_DIR:-/opt/blomoon}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# Lock across automatic and manual deployments, including migrations.
exec flock -n "$APP_DIR/.deploy.lock" node "$SCRIPT_DIR/scripts/deploy.mjs" "${1:-}"
