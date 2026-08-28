#!/bin/sh
set -eu

APP_DIR="${BLOMOON_DEPLOY_DIR:-/opt/blomoon}"
COMPOSE_FILE="${BLOMOON_COMPOSE_FILE:-compose.prod.yml}"
ENV_FILE="${BLOMOON_ENV_FILE:-.env.production}"
REGISTRY_IMAGE="${BLOMOON_REGISTRY_IMAGE:-}"
IMAGE_TAG="${1:-${BLOMOON_IMAGE_TAG:-main}}"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it from .env.production.example before deploying." >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [ -n "$REGISTRY_IMAGE" ]; then
  export BLOMOON_IMAGE="$REGISTRY_IMAGE:$IMAGE_TAG"
  export BLOMOON_MIGRATE_IMAGE="$REGISTRY_IMAGE-migrate:$IMAGE_TAG"
fi

if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull traefik postgres app migrate
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres traefik
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile migrate run --rm migrate
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d app

HEALTH_URL="${BLOMOON_HEALTH_URL:-https://${BLOMOON_DOMAIN:-localhost}/api/health}"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    echo "Blomoon deployed: $HEALTH_URL"
    exit 0
  fi
  echo "Health check failed on attempt $attempt; retrying..."
  sleep 5
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=120 app
exit 1
