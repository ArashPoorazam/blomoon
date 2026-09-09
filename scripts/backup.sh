#!/bin/sh
set -eu
umask 077
BACKUP_DIR="${BLOMOON_BACKUP_DIR:-/backups}"
mkdir -p "$BACKUP_DIR"
backup_file="$BACKUP_DIR/blomoon-$(date -u +%Y%m%dT%H%M%S)-$$.dump"
trap 'rm -f "$backup_file.tmp"' EXIT HUP INT TERM
pg_dump --format=custom --file="$backup_file.tmp"
pg_restore --list "$backup_file.tmp" >/dev/null
mv "$backup_file.tmp" "$backup_file"
find "$BACKUP_DIR" -type f -name 'blomoon-*.dump' -mtime +14 -delete
printf 'Backup completed: %s\n' "$backup_file"
