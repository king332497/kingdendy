# Sinkronisasi Dashboard Pinjaman

Perubahan yang diterapkan:

1. `form-pinjaman.html` sekarang memuat `storage.js` dan menyimpan data ke `NovaStorage`.
2. Nominal, tenor, tujuan, estimasi angsuran, total pembayaran, dan rekening disinkronkan ke dashboard.
3. `hasil-pengajuan.js` diarahkan ke `dashboard-pinjaman.html`.
4. `login.js` tidak lagi mengarah ke file `dashboard.html` yang tidak tersedia.
5. `dashboard-pinjaman.js` memeriksa sesi, identitas, dan keberadaan data pinjaman sebelum merender dashboard.
6. Data lama (`pinjamanDemoDataV1` dan key legacy) tetap didukung dan dinormalisasi ke struktur aplikasi utama.

Pemeriksaan yang telah dijalankan:

- `node --check` untuk seluruh file JavaScript.
- Pemeriksaan sintaks JavaScript inline.
- Pemeriksaan seluruh referensi script, stylesheet, dan gambar lokal.

Catatan:

- Pengujian browser end-to-end dengan interaksi visual belum dijalankan dalam lingkungan ini.
- Firebase membutuhkan koneksi internet dan aturan database yang sesuai agar sinkronisasi remote berfungsi.
