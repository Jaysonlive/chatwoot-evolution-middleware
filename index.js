import express from "express";
import axios from "axios";

const app = express();
app.use(express.json({ limit: "50mb" }));

const EVOLUTION_API = process.env.EVOLUTION_API; // ex: https://sua-evolution.com
const EVOLUTION_TOKEN = process.env.EVOLUTION_TOKEN;
const INSTANCE_KEY = process.env.INSTANCE_KEY; // ex: a1moni

app.post("/chatwoot", async (req, res) => {
  try {
    const payload = req.body;

    // Se não tiver anexo, ignora
    if (!payload?.attachments?.length) {
      return res.json({ ok: true, skip: "no media" });
    }

    const media = payload.attachments[0];
    const mediaUrl = media.data_url;
    const mime = media.file_type;
    const phone = payload.conversation?.contact_inbox?.source_id;

    if (!phone) {
      return res.json({ error: "missing phone" });
    }

    // Baixa o arquivo do Chatwoot
    const response = await axios.get(mediaUrl, {
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(response.data);

    console.log("Mídia recebida do Chatwoot, enviando ao Evolution...");

    // Envia a mídia ao Evolution
    const evoRes = await axios.post(
      `${EVOLUTION_API}/message/sendMedia/${INSTANCE_KEY}`,
      {
        number: phone,
        caption: payload.content || "",
        media: buffer.toString("base64"),
        mimetype: mime,
      },
      {
        headers: {
          Authorization: `Bearer ${EVOLUTION_TOKEN}`,
        },
      }
    );

    return res.json({ success: true, evolution: evoRes.data });
  } catch (err) {
    console.error("Erro no middleware:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Middleware Chatwoot → Evolution rodando na porta 3000");
});
