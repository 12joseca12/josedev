# Cloudflare Tunnel for josecoded-api Worker

This directory documents the Cloudflare Tunnel setup that connects the home server "Omen" to the josecoded-api gateway via a stable, secure hostname.

## Overview

Replaces the ngrok free tunnel with a **named tunnel** (`josecoded-worker`) running on Omen, providing:
- Stable hostname: `worker.josecoded.com`
- Secure ingress: HTTP traffic via the Cloudflare Tunnel
- Service routing: `http://localhost:4000` (Fastify worker)

**Note:** `worker.josecoded.com` is **internal-only**. Only the gateway consumes it with `Bearer WORKER_INTERNAL_TOKEN` auth. The `/health` endpoint is the only unauthenticated route.

## Tunnel Credentials

- **Tunnel name:** `josecoded-worker`
- **Tunnel UUID:** `c0dac20a-a85c-486f-a08f-23caf3fd70c0`
- **Credentials file (on Omen):** `/etc/cloudflared/c0dac20a-a85c-486f-a08f-23caf3fd70c0.json` (secret, NOT in repo)

## Setup (Reference / Already Deployed)

The tunnel and systemd service are already deployed on Omen. Below documents the commands that were used.

### 1. Install cloudflared

```bash
curl -L https://pkg.cloudflare.com/cloudflared-release/downloads/cloudflared-linux-amd64.tgz \
  | tar xz
sudo install -m755 ./cloudflared /usr/local/bin
cloudflared --version
```

### 2. Create the named tunnel

```bash
# Authenticate with Cloudflare (opens browser to authorize josecoded.com zone)
cloudflared tunnel login

# Create the tunnel + save credentials to ~/.cloudflared/<UUID>.json
cloudflared tunnel create josecoded-worker
```

Output included:
- Tunnel UUID: `c0dac20a-a85c-486f-a08f-23caf3fd70c0`
- Credentials file: `~/.cloudflared/c0dac20a-a85c-486f-a08f-23caf3fd70c0.json`

### 3. Configure routing (Ingress)

Create or edit `/home/jose/.cloudflared/config.yml`:

```yaml
tunnel: c0dac20a-a85c-486f-a08f-23caf3fd70c0
credentials-file: /home/jose/.cloudflared/c0dac20a-a85c-486f-a08f-23caf3fd70c0.json

ingress:
  - hostname: worker.josecoded.com
    service: http://localhost:4000
  - service: http_status:404
```

### 4. Register DNS route

```bash
cloudflared tunnel route dns josecoded-worker worker.josecoded.com
```

This creates a CNAME record `worker.josecoded.com` → Cloudflare Tunnel endpoint.

### 5. Install systemd service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
systemctl status cloudflared
```

Verify service is active:
```bash
sudo systemctl status cloudflared
# Should show: active (running)
```

## Verification

### Health Check via Tunnel

```bash
curl -s https://worker.josecoded.com/health
```

Expected response (JSON):
```json
{
  "ok": true,
  "status": "ok",
  "service": "josecoded-backend",
  ...
}
```

No HTML interstitial (which ngrok used to inject) — clean JSON response from Fastify.

### Systemd Logs

```bash
sudo journalctl -u cloudflared -f
```

Monitor real-time tunnel logs to verify ingress routing.

## Cutover from ngrok

The gateway (`josecoded-api/wrangler.jsonc`) changed:
- **Old:** `WORKER_URL: "https://unselfish-underrate-wad.ngrok-free.dev"`
- **New:** `WORKER_URL: "https://worker.josecoded.com"`

Removed ngrok-specific header handling in `src/services/worker.service.ts`:
```ts
// REMOVED:
// if (env.WORKER_URL.includes('ngrok')) {
//   headers['ngrok-skip-browser-warning'] = 'true';
// }
```

## Troubleshooting

### Tunnel disconnected

```bash
sudo systemctl restart cloudflared
sudo journalctl -u cloudflared -n 50
```

### DNS not resolving

```bash
nslookup worker.josecoded.com
# Should resolve to Cloudflare's edge IP
```

### Service not starting

Check credentials file permissions:
```bash
ls -la /home/jose/.cloudflared/c0dac20a-a85c-486f-a08f-23caf3fd70c0.json
# Should be readable by the cloudflared process
```

---

**References:**
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/)
- [Named Tunnel Setup](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/local/)
