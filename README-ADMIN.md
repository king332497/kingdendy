# KBSTARFinance Simulation — Admin Realtime Edition

## Scope

This is a **demo/simulation-only** website. The admin feature can only move an anonymous demo session between a fixed backend whitelist of internal routes.

It cannot:
- open arbitrary URLs;
- execute JavaScript commands;
- control tabs outside this site;
- access the device;
- read form fields;
- receive password, PIN Demo, OTP, NIK Demo, document contents, signature canvas data, card data, or bank-account input.

## Architecture

`Admin Panel -> Node backend -> SSE realtime channel -> browser demo session -> client whitelist -> internal navigation`

The browser sends only:
- anonymous 6-character Session ID (cookie generated server-side);
- current route code;
- presence / last-seen timestamps.

No queued command is retained for offline users. A move request against an offline session is rejected.

## Run

Requires Node.js 20+ and **no npm dependencies**.

### 1. Generate a password hash

```bash
PASSWORD_TO_HASH='replace-with-a-long-admin-password' npm run hash-admin
```

Copy the returned value and start:

```bash
ADMIN_PASSWORD_HASH='scrypt$...' HOST=0.0.0.0 PORT=8080 npm start
```

For local testing only, `ADMIN_PASSWORD` is also supported. Production should use `ADMIN_PASSWORD_HASH`.

### 2. Open

- Demo website: `http://localhost:8080/`
- Admin: `http://localhost:8080/admin`

## Whitelisted route codes

- HOME
- LOGIN
- IDENTITAS
- VERIFIKASI
- PROFIL
- DETAIL_PINJAMAN
- RINGKASAN
- TAHAP_8
- PIN_DEMO
- TAHAP_9
- DASHBOARD

The admin never submits a URL. It submits only a route code. Both backend and browser maintain their own fixed whitelist.

## Security controls

- Admin authentication required.
- Scrypt password hash support.
- In-memory HttpOnly admin session cookie.
- CSRF token required for admin mutations.
- Same-origin checks for POST requests.
- Route whitelist on backend and browser.
- No arbitrary URL or JavaScript payload accepted.
- Login rate limiting.
- Security headers, no camera/microphone/geolocation/payment permissions.
- Audit log: `data/admin-audit.log` (not exposed by static server).
- Audit contains only admin ID, anonymous session ID, route source/target, timestamp, and command status.

## Realtime behavior

SSE is used in both directions that require server push:
- user browser subscribes to its navigation channel;
- admin panel subscribes to live session/audit updates.

Admin actions use authenticated POST requests. A command is marked `SUCCESS` only after the target browser reports that it arrived on the target route. Commands time out after 12 seconds if the browser does not confirm via presence.

## Deployment note

The included backend is a **single-process stateful Node deployment**. It is appropriate for a VPS or stateful Node host. If horizontally scaled to multiple instances, move session presence/commands to shared infrastructure such as Redis pub/sub or a managed realtime service and move audit storage to a persistent database.


## Vercel Marketplace Redis
Backend menerima `KV_REST_API_URL` + `KV_REST_API_TOKEN` dari integrasi Upstash/Vercel. Alias direct Upstash `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` juga didukung.
