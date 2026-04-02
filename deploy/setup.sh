#!/usr/bin/env bash
# One-time VPS bootstrap. Run as root on a fresh Ubuntu VPS.
# Usage: bash deploy/setup.sh
set -euo pipefail

APP_DIR="/opt/gft-usher-tools"
APP_USER="gft"

echo "=== Creating app user ==="
if ! id "$APP_USER" &>/dev/null; then
  useradd --system --create-home --shell /bin/bash "$APP_USER"
fi

echo "=== Installing bun ==="
if [ ! -f "/home/$APP_USER/.bun/bin/bun" ]; then
  sudo -u "$APP_USER" bash -c 'curl -fsSL https://bun.sh/install | bash'
fi

echo "=== Installing caddy ==="
if ! command -v caddy &>/dev/null; then
  apt-get update -qq
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi

echo "=== Setting up app directory ==="
if [ ! -d "$APP_DIR/.git" ]; then
  echo "ERROR: Clone the repo to $APP_DIR first:"
  echo "  git clone https://github.com/evangriffiths/gft-usher-tools.git $APP_DIR"
  exit 1
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "=== Installing dependencies + building ==="
sudo -u "$APP_USER" bash -c "export PATH=/home/$APP_USER/.bun/bin:\$PATH && cd $APP_DIR && bun install && bun run build"

echo "=== Initial data sync ==="
sudo -u "$APP_USER" bash -c "export PATH=/home/$APP_USER/.bun/bin:\$PATH && cd $APP_DIR && bun run src/server/sync-cli.ts all"

echo "=== Installing systemd units ==="
bash "$APP_DIR/deploy/deploy.sh"

echo "=== Configuring caddy ==="
# Append our site block if not already present (don't overwrite other apps)
if ! grep -q "gftushers.evangriffiths.org" /etc/caddy/Caddyfile 2>/dev/null; then
  echo "" >> /etc/caddy/Caddyfile
  cat "$APP_DIR/deploy/Caddyfile" >> /etc/caddy/Caddyfile
fi
systemctl enable caddy
systemctl reload caddy

echo "=== Setup complete ==="
echo "Verify: systemctl status gft-usher"
echo "Verify: systemctl list-timers 'gft-*'"
echo "Verify: curl https://gftushers.evangriffiths.org/api/sync/status"
