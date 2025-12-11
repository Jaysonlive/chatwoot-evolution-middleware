// index.js - Middleware Chatwoot → Evolution (CommonJS)

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;
const EVOLUTION_URL = process.env.EVOLUTION_URL || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || '';
const EVOLUTION_TOKEN = process.env.EVOLUTION_TOKEN || ''; // se usar token na Evolution

// Remove / extra se tiver no final da URL
function getBaseUrl(url) {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

if (!EVOLUTION_URL || !EVOLUTION_INSTANCE) {
  console.error('❌ Defina EVOLUTION_URL e EVOLUTION_INSTANCE nas variáveis de ambiente!');
}

// Rota que o Chatwoot vai chamar
app.post('/chatwoot-hook', async (req, res) => {
  try {
    const payload = req.body;
    const message = payload?.message;

    if (!message) {
      return res.status(200).json({ ok: true, ignore: 'sem message no payload' });
    }

    // Só reenviar mensagens do agente
    if (!message.sender || message.sender.type !== 'agent') {
      return res.status(200).json({ ok: true, ignore: 'não é mensagem de agente' });
    }

    const phone = message?.additional_attributes?.phone;
    if (!phone) {
      return res.status(200).json({ ok: true, ignore: 'sem telefone em additional_attributes.phone' });
    }

    const number = phone.replace(/\D/g, '');
    const to = `${number}@s.whatsapp.net`;
    const baseUrl = getBaseUrl(EVOLUTION_URL);

    let endpoint = '';
    let body = {};

    // TEXTO
    if (message.content_type === 'text') {
      endpoint = `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE}`;
      body = {
        number: to,
        text: message.content || ''
      };

    // IMAGEM
    } else if (message.content_type === 'image') {
      const attachment = message.attachments && message.attachments[0];
      const mediaUrl = attachment?.data_url || attachment?.file_url;

      endpoint = `${baseUrl}/message/sendMedia/${EVOLUTION_INSTANCE}`;
      body = {
        number: to,
        type: 'image',
        caption: message.content || '',
        url: mediaUrl
      };

    } else {
      // outros tipos ainda não tratados
      return res.status(200).json({ ok: true, ignore: `tipo ${message.content_type} ainda não tratado` });
    }

    const headers = {
      'Content-Type': 'application/json'
    };
    if (EVOLUTION_TOKEN) {
      headers['Authorization'] = `Bearer ${EVOLUTION_TOKEN}`;
    }

    // Node 20 já tem fetch global
    const evoRes = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const evoText = await evoRes.text();
    console.log('➡️ Enviado para Evolution:', evoRes.status, evoText);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Erro no middleware:', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Rota simples pra testar no navegador
app.get('/', (req, res) => {
  res.send('Middleware Chatwoot → Evolution rodando!');
});

app.listen(PORT, () => {
  console.log(`Middleware Chatwoot → Evolution rodando na porta ${PORT}`);
});
