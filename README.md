# KB BANK FIANCE — UI Prototype

## Paket GitHub Web Upload Safe

Paket ini sengaja menggunakan struktur **flat/root** agar mudah diunggah melalui
halaman GitHub `Add file → Upload files` tanpa kehilangan struktur folder.

Semua file HTML, CSS, dan JavaScript berada di root repository. Seluruh referensi
`href` dan `src` telah disesuaikan dengan struktur tersebut.

## Alur

Login → Form Identitas → Verifikasi SMS → Upload Dokumen → Form Pinjaman →
Ringkasan Pengajuan → Konfirmasi PIN → Proses Pengajuan → Hasil Pengajuan →
Dashboard

## Upload ke GitHub

1. Ekstrak ZIP.
2. Buka folder hasil ekstraksi.
3. Tekan `Ctrl + A`.
4. Drag seluruh isi folder ke GitHub.
5. Commit changes.

Pastikan file berikut langsung terlihat di root repository:
- `index.html`
- `style.css`
- `storage.js`
- halaman HTML lainnya

## Deploy ke Vercel

- Framework Preset: `Other`
- Root Directory: `./`
- Build Command: kosong
- Output Directory: kosong

Tidak diperlukan `vercel.json`.

## Ruang Lingkup

Proyek ini merupakan UI Prototype. Backend, database, SMS Gateway, upload server,
verifikasi PIN server, mesin keputusan, audit log server, dan pencairan dana
tidak diimplementasikan.
