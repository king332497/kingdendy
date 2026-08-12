# Admin UI Settings — Baseline Safe

## Jaminan baseline
Versi ini bersifat non-destructive terhadap tampilan publik.

- Deploy paket ini **tidak menerapkan warna, radius, font, atau teks Dormant default** ke website publik.
- Website publik hanya menerima override setelah administrator secara eksplisit menekan **Simpan Tampilan** atau **Simpan Notifikasi**.
- Jika `/api/ui-config` gagal dibaca, frontend memilih **no-op** dan mempertahankan CSS/HTML existing.
- Record konfigurasi lama (schema sebelum v2) sengaja diabaikan sehingga tidak dapat mengubah tampilan saat paket ini pertama kali di-deploy.
- Tombol **Gunakan Tampilan Asli** menonaktifkan seluruh override tema.
- Tombol **Gunakan Dormant Asli** menonaktifkan seluruh override Dormant.

## Pemisahan konfigurasi
Tema dan Notif Dormant dipublikasikan secara independen:

- Mengubah Dormant tidak otomatis mengaktifkan override tema.
- Mengubah tema tidak otomatis mengubah Notif Dormant.

## Telegram
Integrasi Telegram tidak disentuh oleh fitur Admin UI Settings.
