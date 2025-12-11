// index.js

/*
 * Middleware para encaminhar mensagens do Chatwoot para a Evolution API.
 *
 * Envia anexos recebidos via webhook do Chatwoot para o Evolution
 * no formato base64, incluindo número do WhatsApp, legenda e mimetype.
 */

const express = require('express');
const axios   = require('axios');

// Configurações via variáveis de ambiente
const PORT               = process.env.PORT || 3000;
const EVOLUTION_URL      = process.env.EVOLUTION_URL || '';      // Ex.: https://evolutionapi.seudominio.com
const EVOLUTION_TOKEN    = process.env.EVOLUTION_TOKEN || '';    // Token Bearer (se necessário)
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || ''; // Nome da instância Evolution

// Função para normalizar URLs de mídia vindas do Chatwoot
function normaliseMediaUrl(url) {
  if (!url) return '';
  let fixed = url.trim();
  // Corrige urls que começam com 'http://https/'
  fixed = fixed.replace(/^http:\/\/https\//i, 'https://');
  // Remove barras duplas após o protocolo
  fixed = fixed.replace(/^(https?:\/\/)(\/+)/, '$1');
  return fixed;
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// Webhook do Chatwoot
app.post('/chatwoot', async (req, res) => {
  const payload = req.body;
  try {
    // Garante que há anexos
    if (!payload || !payload.message || !Array.isArray(payload.message.attachments) || payload.message.attachments.length === 0) {
      return res.status(200).json({ message: 'Nenhum anexo a processar' });
    }

    // Pega o primeiro anexo
    const attachment = payload.message.attachments[0];
    const mediaUrl   = normaliseMediaUrl(attachment.data_url || attachment.thumb_url || '');
    const mimeType   = attachment.file_type || 'application/octet-stream';
    const caption    = payload.message.content || '';

    // Pega o número de WhatsApp do Chatwoot
    const waNumber = payload.conversation?.contact_inbox?.source_id;
    if (!waNumber) {
      return res.status(400).json({ message: 'Número do WhatsApp não encontrado no payload' });
    }
    if (!mediaUrl) {
      return res.status(400).json({ message: 'URL da mídia inválida' });
    }

    // Baixa o arquivo como arraybuffer
    const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const base64Data = Buffer.from(mediaResponse.data, 'binary').toString('base64');

    // Monta payload para Evolution
    const evoPayload = {
      number:   waNumber,
      caption:  caption,
      media:    base64Data,
      mimetype: mimeType
    };

    // Define headers (envia token se houver)
    const evoHeaders = { 'Content-Type': 'application/json' };
    if (EVOLUTION_TOKEN) {
      evoHeaders['Authorization'] = `Bearer ${EVOLUTION_TOKEN}`;
    }

    // Endpoint da Evolution
    const evoEndpoint = `${EVOLUTION_URL.replace(/\\/+$/, '')}/message/sendMedia/${EVOLUTION_INSTANCE}`;

    // Chama a Evolution API
    await axios.post(evoEndpoint, evoPayload, { headers: evoHeaders });

    return res.status(200).json({ message: 'Mídia encaminhada com sucesso' });
  } catch (error) {
    console.error('Erro no middleware:', error.message);
    return res.status(500).json({ error: 'Falha ao processar o anexo', details: error.message });
  }
});

// Endpoint de verificação
app.get('/', (req, res) => {
  res.send('Middleware Chatwoot → Evolution em execução');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Middleware ouvindo na porta ${PORT}`);
});
