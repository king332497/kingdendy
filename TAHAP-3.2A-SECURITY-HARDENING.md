# Tahap 3.2A — Security Hardening

Perubahan defensif tanpa perubahan UI, route, perhitungan, atau konsep halaman.

- Integrasi Telegram dinonaktifkan melalui compatibility adapter tanpa network request.
- Token bot dan chat ID dihapus dari frontend.
- Password tidak lagi disimpan ke session localStorage.
- Session lama yang mengandung `password` dibersihkan otomatis saat dibaca.
- OTP dan PIN mentah tidak lagi disimpan ke application state.
- Field legacy `lastOtp` dan `lastPin` dibersihkan otomatis saat application state dibaca.
- Pemanggilan fungsi Telegram yang masih ada di halaman lama tetap aman karena adapter selalu disabled.
