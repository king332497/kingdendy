# KBSTARFinance — Simulasi UI Final Mobile Tahap 1–10

## Alur

`index.html` → `login.html` → `identitas.html` → `verifikasi.html` → `profil-pengajuan.html` (Tahap 5–7) → `tahap8.html` → Konfirmasi PIN Demo → `tahap9.html` → `dashboard.html`

## Fokus Final Mobile

Project diaudit pada viewport smartphone 320px, 360px, 390px, dan 430px.
Penyesuaian hanya berupa responsive/mobile safety patch; alur dan fungsi simulasi tetap dipertahankan.

Penyesuaian mobile minimal:
- Tahap 1: CTA dan headline dipadatkan pada layar <=350px agar tetap proporsional.
- Tahap 2: tombol tampil/sembunyikan password memiliki target sentuh minimum 44px.
- Tahap 8: tombol Hapus tanda tangan memiliki target sentuh minimum 44px pada lebar ponsel.
- Tahap 10: badge simulasi panjang tidak lagi dipotong pada layar 320–360px.

## Tahap 10

Dashboard Pinjaman Demo berisi:
- ringkasan nominal, jenis, tenor, dan estimasi cicilan demo;
- informasi cicilan demo;
- stepper proses simulasi;
- rekening pencairan demo dengan format dummy `999########`;
- menu cepat;
- testimonial berlabel `CONTOH TESTIMONI · DATA FIKTIF`.

## State data

Baseline tidak mempersist data lintas file. Dashboard menggunakan fallback yang diberi label jelas sebagai data demo jika data tahap sebelumnya tidak tersedia lintas halaman.

## Keamanan simulasi

- Tidak ada backend atau database.
- Tidak ada API bank, transfer, pencairan, scoring, atau validasi rekening nyata.
- Tidak ada `fetch`/XHR.
- Tidak ada `localStorage`/`sessionStorage`.
- Tidak ada cookie aplikasi.
- Tidak meminta PIN/OTP perbankan, password mobile banking, CVV, atau nomor kartu.
- PIN Demo hanya interaksi frontend dan tidak disimpan/dikirim.
- Nomor rekening demo hanya divalidasi sebagai data dummy pada frontend.
- CSP menetapkan `connect-src 'none'`.

Lihat `MOBILE-AUDIT.md` dan `mobile-verification-report.json` untuk hasil audit teknis.


## Admin Realtime
Lihat `README-ADMIN.md`. Jalankan project melalui `node server.js`; fitur admin tidak bekerja jika HTML dibuka langsung melalui `file://`.
