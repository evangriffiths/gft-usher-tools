# GFT Usher Tools

Search and filter usher shifts at Glasgow Film Theatre, with automatic film screening matching.

## Local development

```bash
bun install
bun run dev        # Runs server (:3000) + Vite dev server (:5173) concurrently
```

On first run, click **Sync** in the UI to fetch shift and screening data.

Other commands:
```bash
bun run build      # Build frontend for production
bun run start      # Build + run server (production mode, single port)
bun run server     # Run server only
bun run client     # Run Vite dev server only
```

## Deployment

### Prerequisites

- A VPS running Ubuntu 22.04+ (tested on Hetzner)
- A domain with an A record pointing at the VPS IP (e.g. `gftushers.evangriffiths.org`)
- The repo pushed to GitHub

### First-time VPS setup

1. SSH into the VPS as root:

```bash
ssh root@YOUR_VPS_IP
```

2. Clone the repo:

```bash
git clone https://github.com/evangriffiths/gft-usher-tools.git /opt/gft-usher-tools
```

3. Run the bootstrap script:

```bash
bash /opt/gft-usher-tools/deploy/setup.sh
```

This installs bun, caddy, creates a `gft` system user, builds the app, runs an initial data sync, and starts all services.

4. Verify:

```bash
systemctl status gft-usher           # Bun server running
systemctl list-timers 'gft-*'        # Sync timers scheduled
curl https://gftushers.evangriffiths.org/api/sync/status
```

### GitHub Actions auto-deploy

Add two secrets to your GitHub repo (Settings > Secrets > Actions):

- `VPS_HOST` - IP address or hostname of the VPS
- `VPS_SSH_KEY` - Private SSH key for root access to the VPS

Every push to `main` will automatically SSH into the VPS, pull the latest code, rebuild, and restart services.

### What runs on the VPS

| Service | Description |
|---------|-------------|
| `gft-usher.service` | Bun server on port 3000 |
| `gft-sync-shifts.timer` | Syncs shifts from Google Sheet hourly |
| `gft-sync-screenings.timer` | Syncs film screenings from GFT website daily at 4am |
| `caddy` | Reverse proxy with automatic HTTPS |

### Disposable VPS

The VPS is designed to be disposable. To migrate to a new VPS:

1. Provision a new VPS and point the DNS A record at it
2. SSH in, clone the repo, run `setup.sh`
3. Update `VPS_HOST` and `VPS_SSH_KEY` in GitHub secrets
4. Push to main
