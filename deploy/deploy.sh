#!/usr/bin/env bash
# Deploy script - called by GitHub Actions on every push, and by setup.sh.
# Run as root (or with sudo). Idempotent.
set -euo pipefail

APP_DIR="/opt/gft-usher-tools"
APP_USER="gft"
BUN="/home/$APP_USER/.bun/bin/bun"

cd "$APP_DIR"

echo "=== Installing dependencies ==="
sudo -u "$APP_USER" "$BUN" install --frozen-lockfile

echo "=== Building frontend ==="
sudo -u "$APP_USER" "$BUN" run build

echo "=== Installing systemd units ==="
cp deploy/gft-usher.service /etc/systemd/system/
cp deploy/gft-sync-shifts.service /etc/systemd/system/
cp deploy/gft-sync-shifts.timer /etc/systemd/system/
cp deploy/gft-sync-screenings.service /etc/systemd/system/
cp deploy/gft-sync-screenings.timer /etc/systemd/system/

systemctl daemon-reload

echo "=== Enabling and starting services ==="
systemctl enable gft-usher
systemctl restart gft-usher

systemctl enable gft-sync-shifts.timer
systemctl start gft-sync-shifts.timer

systemctl enable gft-sync-screenings.timer
systemctl start gft-sync-screenings.timer

echo "=== Updating Caddyfile ==="
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy

echo "=== Deploy complete ==="
systemctl status gft-usher --no-pager || true
