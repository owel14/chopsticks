# Chopsticks backend — VPS migration runbook

All code changes (Dockerfile, compose, Caddy config, new GitHub Actions workflow) are already committed on this branch. This doc is the list of **things only you can do** — provision infra, set secrets, flip DNS, retire Azure.

Work top-to-bottom. Don't skip the local test in §2 — it's the cheapest place to catch a broken container.

---

## 1. Gather prerequisites

- [ ] A VPS (Hetzner CX11 / DigitalOcean $6 / Linode Nanode — 1 vCPU, 1 GB RAM is enough). Install Ubuntu 24.04 LTS or Debian 12.
- [ ] A domain or subdomain for the server (e.g. `chopsticks-online.duckdns.org`). You need DNS control.
- [ ] SSH access to the VPS as a sudo-capable non-root user.
- [ ] Docker Desktop (or Docker Engine) on your laptop for the local test.

---

## 2. Test the container locally

The production `docker-compose.yml` does **not** publish port 5000 to your host — Caddy is the only thing allowed to reach the server, and on your laptop you don't have real TLS / a real domain for Caddy to serve. So for the local smoke test, run the server image directly with a host port mapping:

```bash
docker build -t chopsticks-server ./server
docker run --rm -p 5000:5000 chopsticks-server
```

In another terminal:

```bash
curl -i -X POST http://localhost:5000/gamehub/negotiate?negotiateVersion=1
# Expect: HTTP/1.1 200 OK with a JSON body containing "connectionToken"
```

Full end-to-end check (optional but recommended) — leave the container from above running and in a new terminal run the frontend with `NEXT_PUBLIC_SERVER_URL` set to the local container:

```bash
# macOS / Linux / WSL
NEXT_PUBLIC_SERVER_URL=http://localhost:5000 npm run dev
```

```cmd
:: Windows cmd.exe  (quotes matter — without them the trailing space
:: before && becomes part of the value and you get "Invalid URL")
set "NEXT_PUBLIC_SERVER_URL=http://localhost:5000" && npm run dev
```

```powershell
# Windows PowerShell
$env:NEXT_PUBLIC_SERVER_URL="http://localhost:5000"; npm run dev
```

Or, simpler on any OS: add `NEXT_PUBLIC_SERVER_URL=http://localhost:5000` to `.env.local` (it auto-overrides `.env`), then `npm run dev`. Remove the line when you're done so production still points at the right server.

Open two browsers at `http://localhost:3000/online`, create a room in one, join from the other, play a move. Stop the container with `Ctrl+C` when done.

If you also want to confirm the full compose stack builds cleanly (without testing HTTP directly):

```bash
docker compose build
# Optional: docker compose up, then docker compose down
```

If anything fails here, fix it before touching the VPS.

---

## 3. Placeholders (already done)

`Caddyfile` is set to `chopsticks-online.duckdns.org`. `docker-compose.yml`'s `CorsOrigins__0` is `https://chopsticks-online.vercel.app` — the `*.vercel.app` predicate in `server/Program.cs` covers preview deployments, and there's no custom frontend domain to add.

If you ever change the DuckDNS subdomain or add a custom frontend domain, edit `Caddyfile` and/or uncomment `CorsOrigins__1` in `docker-compose.yml`, then `docker compose up -d`.

---

## 4. Prepare the VPS

SSH in, then:

### 4.1 Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Log out and back in so the group change applies. Verify: `docker run --rm hello-world`.

### 4.2 Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4.3 Unattended security upgrades

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 5. Point DNS at the VPS

Using DuckDNS as the DNS provider:

1. Sign in at https://www.duckdns.org.
2. Make sure the `chopsticks-online` subdomain is listed.
3. Set the **current ip** field to `103.100.39.84` and click **update ip**.

Confirm propagation before moving on:

```bash
nslookup chopsticks-online.duckdns.org
# Should return 103.100.39.84
```

Caddy can't obtain a TLS certificate until DNS resolves correctly.

---

## 6. First deploy

On the VPS:

```bash
git clone https://github.com/owel14/chopsticks.git
cd chopsticks
git checkout main   # or the migrate/vps branch until it's merged
docker compose up -d --build
docker compose logs -f caddy
```

Watch for `certificate obtained successfully`. If Caddy errors:
- DNS isn't propagated yet → wait a minute, retry.
- Port 80 blocked → recheck `ufw status`.
- Another process on :80 → `sudo ss -ltnp | grep :80` and stop it.

Verify from your laptop:

```bash
curl -i -X POST https://chopsticks-online.duckdns.org/gamehub/negotiate?negotiateVersion=1
# Expect HTTP/2 200 with JSON containing "connectionToken"
```

---

## 7. Cut the frontend over

1. Go to Vercel → project → Settings → Environment Variables.
2. Edit `NEXT_PUBLIC_SERVER_URL` → `https://chopsticks-online.duckdns.org`.
3. Apply to **Production** and **Preview** (preview branch URLs like `chopsticks-git-*.vercel.app` are already whitelisted server-side by the CORS predicate in `server/Program.cs`, so previews will Just Work as long as the env var is set for them too).
4. Trigger a redeploy — env changes only take effect on a new build.

Smoke test `https://chopsticks-online.vercel.app/online`:
- Create a room in browser A, join from browser B.
- Play a full game.
- In DevTools → Network → WS, confirm the connection is `wss://chopsticks-online.duckdns.org/gamehub?...` and stays open during play.

---

## 8. Wire up the GitHub Actions deploy

The new workflow at `.github/workflows/deploy-vps.yml` SSHes into the VPS, pulls, and rebuilds on every push to `main` that touches `server/`, `docker-compose.yml`, or `Caddyfile`.

### 8.1 Generate a deploy SSH key

On your laptop:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/chopsticks_deploy -N ""
```

Copy the **public** key to the VPS:

```bash
ssh-copy-id -i ~/.ssh/chopsticks_deploy.pub youruser@your.vps.ip
```

### 8.2 Add GitHub secrets

GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Name          | Value                                                  |
|---------------|--------------------------------------------------------|
| `VPS_HOST`    | VPS IP or hostname                                     |
| `VPS_USER`    | your SSH user on the VPS                               |
| `VPS_SSH_KEY` | **private** key contents (`cat ~/.ssh/chopsticks_deploy`) |

### 8.3 Verify

Push a trivial change (e.g. a comment in `Caddyfile`) to `main` and watch the `Deploy server to VPS` action succeed. Then run `docker compose ps` on the VPS to confirm the container was rebuilt.

---

## 9. Decommission Azure

Only after **at least 24 hours** of clean VPS traffic:

1. Azure Portal → App Service `Chopsticks` → **Stop**. Leave it stopped for a week as a panic button.
2. GitHub repo → Settings → Secrets and variables → Actions — delete these three:
   - `AZUREAPPSERVICE_CLIENTID_0D93F0F2D90D447F91D87F9E4EB98D89`
   - `AZUREAPPSERVICE_TENANTID_993632B86F214C3A9FA61C38009DCDDE`
   - `AZUREAPPSERVICE_SUBSCRIPTIONID_E6EE078EEBCE40A1B41ED69ED1505436`
3. After a week, delete the App Service, its App Service Plan, and the resource group.
4. Azure AD → App registrations — remove the federated credential that GitHub OIDC was using.

---

## 10. Rollback plan (if things go sideways mid-cutover)

1. Vercel → set `NEXT_PUBLIC_SERVER_URL` back to `https://chopsticks-abdbgrfwekaxf8f9.australiaeast-01.azurewebsites.net` and redeploy.
2. If the Azure App Service is still running, you're back online in ~30 seconds.
3. Debug the VPS without pressure: `docker compose logs chopsticks-server` and `docker compose logs caddy`.

---

## 11. Day-to-day ops

On the VPS, from `~/chopsticks`:

```bash
docker compose ps                          # status
docker compose logs -f chopsticks-server   # tail app logs
docker compose logs -f caddy               # tail TLS / proxy events
docker compose restart chopsticks-server   # restart just the app
docker compose up -d --build               # manual rebuild + redeploy
docker system prune -f                     # reclaim dangling image layers
```

---

## Gotchas worth knowing

- **Don't run more than one replica.** Rooms live in process memory (`RoomManager` in `server/Services/`). A second instance would have its own room map and players would land on different nodes. If you ever need to scale, add a SignalR Redis backplane first.
- **State vanishes on restart.** That's fine for this game; just don't be surprised when an active match dies during a `docker compose up -d --build`.
- **CORS lives in compose, not appsettings.** `CorsOrigins__N` env vars in `docker-compose.yml` override the array in `server/appsettings.json`. Add new non-Vercel frontend origins there. Any `https://*.vercel.app` origin is already allowed by the predicate in `server/Program.cs`, so you don't need to add preview URLs one by one.
