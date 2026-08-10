// api/proxy.js
export const config = {
  runtime: 'edge', // Menggunakan Edge Function (paling cepat & murah)
};

export default async function handler(request) {
  // Tangani CORS Preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Hanya izinkan POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, description: 'Method must be POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    // Ambil file dari FormData yang dikirim frontend
    const formData = await request.formData();
    const file = formData.get('file');
    const caption = formData.get('caption') || 'Dokumen';

    if (!file) {
      return new Response(JSON.stringify({ ok: false, description: 'File tidak ditemukan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 🔐 Ganti dengan token BARU Anda (karena yang lama sudah bocor)
    const botToken = '8655916807:AAHLgXatTlPGoESOI46HOKA6RYDVy-vstjE'; 
    const chatId = '6959842489';

    const isImage = file.type.startsWith('image/');
    const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
    const field = isImage ? 'photo' : 'document';

    // Siapkan payload untuk Telegram (pakai FormData native Edge)
    const tgForm = new FormData();
    tgForm.append('chat_id', chatId);
    tgForm.append('caption', caption);
    tgForm.append(field, file, file.name);

    // Kirim ke Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
      method: 'POST',
      body: tgForm,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, description: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}