# Baseline Safety Audit — Admin UI Settings

## Tujuan
Menjamin bahwa deploy fitur Admin Panel **tidak mengubah tampilan website publik** sampai administrator secara eksplisit menyimpan perubahan.

## Mekanisme keselamatan
- `/api/ui-config` mengembalikan override `enabled:false` bila belum ada konfigurasi schema v2.
- `ui-settings.js` melakukan **no-op** jika override belum diaktifkan.
- Kegagalan membaca konfigurasi juga menghasilkan **no-op**, bukan fallback visual.
- Config lama/flat dari eksperimen versi sebelumnya sengaja tidak dianggap aktif.
- Tema dan Notif Dormant dipublikasikan secara independen.
- Tombol `Gunakan Tampilan Asli` menonaktifkan override tema.
- Tombol `Gunakan Dormant Asli` menonaktifkan override Dormant.

## Verifikasi
- Public baseline no-op test: PASS.
- Legacy config disabled-by-default test: PASS.
- HTML parse: PASS.
- Local CSS/JS reference check: PASS (0 missing).
- JavaScript / MJS syntax check: PASS.
- Telegram checksum before/after: IDENTICAL untuk:
  - `api/proxy.js`
  - `upload-dokumen.js`
  - `telegram.js`

## Scope file yang berubah pada revisi ini
- `ui-settings.js`
- `api/_ui-config.js`
- `api/ui-config.js`
- `api/admin-settings.js`
- `admin/admin.js`
- `admin/index.html`
- `admin/admin.css`
- dokumentasi admin UI

File publik existing selain bridge `ui-settings.js` tidak diubah dalam revisi baseline-safety ini.
