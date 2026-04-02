#!/usr/bin/env bash
# Deploy script - called by GitHub Actions on every push, and by setup.sh.
# Run as root (or with sudo). Idempotent.
set -euo pipefail

APP_DIR="/opt/gft-usher-tools"
APP_USER="gft"
BUN_PATH="/home/$APP_USER/.bun/bin"

cd "$APP_DIR"

echo "=== Installing dependencies ==="
sudo -u "$APP_USER" bash -c "export PATH=$BUN_PATH:\$PATH && cd $APP_DIR && bun install --frozen-lockfile"

echo "=== Building frontend ==="
sudo -u "$APP_USER" bash -c "export PATH=$BUN_PATH:\$PATH && cd $APP_DIR && bun run build"

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
# Ensure our site block is present without overwriting other apps
if ! grep -q "gftushers.evangriffiths.org" /etc/caddy/Caddyfile 2>/dev/null; then
  echo "" >> /etc/caddy/Caddyfile
  cat deploy/Caddyfile >> /etc/caddy/Caddyfile
fi
systemctl reload caddy

echo "=== Deploy complete ==="
systemctl status gft-usher --no-pager || true
