# Admin Panel — Setup

Implementasi ini bersifat additive terhadap website publik. File integrasi Telegram tidak diubah.

## Environment Variables Vercel wajib

1. `ADMIN_PASSWORD_HASH`
   - Buat lokal: `node scripts/generate-admin-hash.mjs "PASSWORD-ADMIN-KUAT"`
   - Salin output `scrypt$...` ke Vercel.
2. `ADMIN_SESSION_SECRET`
   - Random minimal 32 karakter (disarankan 64+).
3. `FIREBASE_DATABASE_URL`
   - Opsional karena project memiliki default URL saat ini.
4. `FIREBASE_DATABASE_SECRET`
   - Opsional hanya bila Firebase RTDB menolak akses REST server-side dan Anda memang memiliki secret/credential yang sesuai.

Setelah Environment Variables ditambahkan, lakukan redeploy.

## Route
- Login: `/admin/login.html`
- Dashboard: `/admin/`

## Batas kontrol
Admin hanya dapat mengarahkan user ke halaman workflow non-sensitif:
- Form Identitas
- Upload
- Form Pinjaman
- Ringkasan
- Proses Pengajuan
- Hasil Pengajuan
- Dashboard

OTP dan PIN sengaja tidak tersedia sebagai target dan tracker tidak menginterupsi user ketika sedang berada pada halaman verifikasi/PIN.

## Catatan keamanan
Panel admin menggunakan cookie HttpOnly + SameSite=Strict, CSRF token, HMAC session, password hash scrypt, allowlist target, output escaping, dan audit log sederhana di Firebase.

Firebase Rules project tetap perlu diaudit terpisah. Kode frontend existing masih memiliki akses Firebase langsung; implementasi ini tidak mengubahnya agar tidak merusak fitur existing.
