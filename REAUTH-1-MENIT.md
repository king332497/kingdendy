# Dashboard Re-authentication 1 Menit

Alur tambahan:
Dashboard (60 detik) -> Login -> Verifikasi Kode -> Konfirmasi PIN -> Dashboard.

Data pengajuan yang sudah selesai tidak di-reset. Re-authentication menggunakan sessionStorage `kbDashboardReauth` sehingga mode ini tidak mengubah key aplikasi di `storage.js`.

File yang berubah:
- dashboard-pinjaman.js
- login.js
- verifikasi-sms.js
- konfirmasi-pin.js
