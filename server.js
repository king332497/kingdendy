const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

app.use(cors());

// Cek kesehatan server
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Node.js Proxy Aktif!' });
});

// Konfigurasi upload file
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } // Maks 10 MB
});

// 🔐 Ganti dengan token baru Anda
const TELEGRAM_TOKEN = '7719532232:AAFxr1ddBwpOzlEvbuiISBRb0PHSmUnHl4g'; 
const TELEGRAM_CHAT_ID = '6741003817';

app.post('/api/proxy', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, description: 'File tidak ditemukan' });

    const caption = req.body.caption || 'Dokumen';
    const isImage = req.file.mimetype.startsWith('image/');
    const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
    const field = isImage ? 'photo' : 'document';

    // 🔥 PERBAIKAN UTAMA: Pakai FormData bawaan Node.js (v18+)
    const tgForm = new FormData();
    tgForm.append('chat_id', TELEGRAM_CHAT_ID);
    tgForm.append('caption', caption);
    
    // Multer menyimpan file di memory buffer
    tgForm.append(field, req.file.buffer, req.file.originalname);

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${endpoint}`, {
      method: 'POST',
      body: tgForm
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ ok: false, description: 'Gagal mengirim ke Telegram: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));