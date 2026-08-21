# FINAL SIAP PAKAI v5 — Vercel Realtime Admin

## Root cause yang diperbaiki
Halaman Login sampai Dashboard memiliki Content-Security-Policy `script-src 'unsafe-inline'` tanpa `'self'`. Browser karena itu memblokir file eksternal `/simulation-runtime.js`. Efeknya sangat spesifik: halaman depan sempat muncul di Admin, tetapi setelah user pindah ke Login/Verifikasi/Tahap 5 dan seterusnya, runtime monitoring berhenti sehingga Admin tetap membaca halaman lama lalu menandai session Offline.

## Perbaikan final v5
- Semua halaman Tahap 2–10 sekarang memakai `script-src 'self' 'unsafe-inline'` dan `connect-src 'self'`.
- Semua halaman memuat `/simulation-runtime.js?v=5` untuk memutus cache runtime lama pada HP/WebView.
- Namespace Redis baru: `kb-sim:v5`, jadi session salah/stale dari versi lama tidak ikut muncul.
- Online grace window 30 detik untuk toleransi jaringan mobile; heartbeat/polling tetap berjalan beberapa detik sekali.
- Current page dikirim saat bootstrap, heartbeat, dan command poll.
- Tahap 5/6/7 dideteksi berdasarkan screen DOM aktif, bukan hanya URL.
- Command admin tetap route-whitelist; tidak menerima arbitrary URL/JavaScript.
- Node Vercel dipin ke `24.x`.

## Environment Variables yang dibutuhkan di Vercel
- `ADMIN_PASSWORD` (atau hash jika memang digunakan)
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Variabel Redis lain dari integrasi Upstash boleh tetap ada.

## Setelah upload
1. Redeploy Production.
2. Buka `/api/health`; pastikan `ok`, `redisConfigured`, `redisReachable`, `adminCredentialConfigured` bernilai true dan `runtimeVersion` = `5`.
3. Tutup tab user versi lama di HP, lalu buka ulang website dari halaman depan.
4. Login Admin di `/admin`.
5. HP pindah ke Tahap 4/5; Admin harus ikut berubah beberapa detik kemudian.
6. Uji `Pindahkan` ke Tahap 8. Browser HP harus berpindah; current page Admin harus menjadi Tahap 8; audit harus `SUCCESS`.

## Pengujian source
Jalankan `npm test`.
