const express = require("express");
const qrcode = require("qrcode-terminal");
const bodyParser = require("body-parser");
const { Client, LocalAuth } = require("whatsapp-web.js");

const app = express();
app.use(bodyParser.json());

let ultimoQR = null; // 🔹 variável para armazenar o QR atual

// Inicializa o cliente WhatsApp com autenticação local (Railway-friendly)
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

// Evento de geração de QR Code
client.on("qr", (qr) => {
  console.log("📱 Escaneie o QR Code abaixo para conectar o WhatsApp:");
  ultimoQR = qr; // guarda o QR mais recente
  qrcode.generate(qr, { small: true }); // mostra no terminal (opcional)
});

// Endpoint opcional pra exibir o QR no navegador 🔥
app.get("/qr", (req, res) => {
  if (!ultimoQR) {
    return res.send("<h3>Aguardando geração do QR Code... tente novamente em alguns segundos.</h3>");
  }

  const qrImage = `
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#101010;color:white;">
        <h2>📱 Escaneie este QR Code no seu WhatsApp</h2>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ultimoQR)}" />
        <p>Atualize esta página se o QR expirar ⏳</p>
      </body>
    </html>
  `;
  res.send(qrImage);
});

// Conexão bem-sucedida
client.on("ready", () => {
  console.log("✅ WhatsApp conectado com sucesso!");
});

// Reconecta se cair
client.on("disconnected", () => {
  console.log("⚠️ WhatsApp desconectado. Tentando reconectar...");
  client.initialize();
});

client.initialize();

// Endpoint para envio de mensagens
app.post("/send", async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message)
    return res
      .status(400)
      .json({ success: false, error: "Campos 'phone' e 'message' são obrigatórios" });

  try {
    const id = phone.includes("@c.us") ? phone : `${phone}@c.us`;
    await client.sendMessage(id, message);
    console.log(`📤 Mensagem enviada para ${phone}: ${message}`);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inicializa servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
