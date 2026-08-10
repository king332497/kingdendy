export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method must be POST', { status: 405 });
    }
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const caption = formData.get('caption') || 'Dokumen';

      if (!file) throw new Error('File tidak ada');

      // Token Anda (Ganti kalau sudah ganti token baru di BotFather)
      const botToken = '7719532232:AAFxr1ddBwpOzlEvbuiISBRb0PHSmUnHl4g';
      const chatId = '6741003817';

      const isImage = file.type.startsWith('image/');
      const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
      const field = isImage ? 'photo' : 'document';

      const tgForm = new FormData();
      tgForm.append('chat_id', chatId);
      tgForm.append('caption', caption);
      tgForm.append(field, file, file.name);

      const response = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
        method: 'POST',
        body: tgForm,
      });

      return new Response(JSON.stringify(await response.json()), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, description: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};