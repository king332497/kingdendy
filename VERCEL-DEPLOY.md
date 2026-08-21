# Deployment Vercel — Admin Realtime Simulation

Versi ini mengganti backend Node stateful lama dengan **Vercel Functions + shared Upstash Redis + polling realtime**.

## Mengapa perlu Redis

Vercel Functions dapat berjalan pada instance yang berbeda. Karena itu session user, current page, pending navigation command, admin session, rate-limit, dan audit log tidak disimpan di memory process. Semua state realtime disimpan di Redis bersama.

## Environment Variables wajib

Tambahkan di **Vercel → Project → Settings → Environment Variables**:

```text
KV_REST_API_URL=https://....upstash.io
KV_REST_API_TOKEN=...
ADMIN_PASSWORD_HASH=scrypt$...$...
```

Untuk test sementara `ADMIN_PASSWORD` juga didukung, tetapi `ADMIN_PASSWORD_HASH` direkomendasikan.

### Membuat hash password admin

Di komputer lokal setelah mengekstrak project:

```bash
PASSWORD_TO_HASH='PASSWORD_ADMIN_ANDA' npm run hash-admin
```

Salin output `scrypt$...$...` ke `ADMIN_PASSWORD_HASH`.

Jangan commit `.env`, password, token Redis, atau hash yang sedang digunakan ke repository publik.

## Membuat Redis

Gunakan Upstash Redis yang terhubung ke project Vercel. Integrasi Marketplace pada project ini menghasilkan `KV_REST_API_URL` dan `KV_REST_API_TOKEN`; backend mendukung nama tersebut secara langsung. Nama `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` juga tetap didukung sebagai fallback.

## Deploy

Pastikan file berikut berada langsung pada **Root Directory** project Vercel:

```text
index.html
admin.html
simulation-runtime.js
vercel.json
package.json
api/
lib/
```

Kemudian lakukan **Redeploy** setelah Environment Variables tersimpan.

## Test konfigurasi backend

Buka:

```text
https://DOMAIN-ANDA/api/health
```

Target hasil:

```json
{
  "ok": true,
  "redisConfigured": true,
  "redisReachable": true,
  "adminCredentialConfigured": true,
  "routes": 11,
  "mode": "vercel-functions+shared-redis+polling"
}
```

Sebelum login, endpoint:

```text
https://DOMAIN-ANDA/api/admin/me
```

harus memberi **HTTP 401 JSON**, bukan Vercel 404.

## Test Admin Panel

Buka:

```text
https://DOMAIN-ANDA/admin
```

atau:

```text
https://DOMAIN-ANDA/admin.html
```

1. Login admin.
2. Buka website utama di browser/HP lain.
3. Admin harus melihat Anonymous Session ID, current page, online/offline, last seen, dan progress.
4. Klik **Pindahkan**.
5. Pilih hanya route whitelist.
6. Konfirmasi.
7. Browser user akan polling command setiap ±2,2 detik dan berpindah otomatis.
8. Setelah halaman tujuan mengirim presence, Admin Panel berubah otomatis tanpa refresh manual.
9. Audit log menampilkan `SENT` lalu `SUCCESS`.

## Perilaku offline

User dianggap online bila presence terakhir kurang dari 15 detik. Jika user offline, backend menolak move dengan HTTP 409 dan mencatat `OFFLINE_REJECTED`. Command tidak disimpan untuk dijalankan saat user kembali.

## Security model

- Admin authentication: password/hash server-side.
- Admin session: signed HttpOnly Secure cookie + session presence di Redis.
- CSRF: token terikat ke signed admin session dan diverifikasi pada action write.
- Same-origin check untuk POST sensitif.
- Route tujuan: backend whitelist 11 route dan browser whitelist yang sama.
- Tidak menerima URL bebas.
- Tidak menerima JavaScript/HTML command.
- Monitoring hanya route metadata anonymous session.
- Tidak membaca atau mengirim field form, password, PIN, OTP, NIK, CVV, nomor kartu, atau data rekening.
- Audit log hanya admin ID, session ID anonim, route asal/tujuan, timestamp, status.

## Endpoint

```text
GET  /api/health
GET  /api/session/bootstrap
POST /api/session/presence
GET  /api/session/command
POST /api/admin/login
GET  /api/admin/me
POST /api/admin/logout
GET  /api/admin/sessions
GET  /api/admin/audit
POST /api/admin/move
```
