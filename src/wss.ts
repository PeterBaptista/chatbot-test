import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  jidNormalizedUser,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";

export async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(
    "./auth_info_baileys"
  );

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Mostra QR no terminal
  });

  // --- Eventos de conexão e QR Code ---
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📸 QR Code recebido, gerando imagem...");
      QRCode.toFile("./qrcode.png", qr, { width: 300 }, (err) => {
        if (err) console.error("Erro ao salvar QR Code:", err);
        else console.log("✅ QR Code salvo como qrcode.png");
      });
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      console.log("❌ Conexão fechada. Motivo:", reason);

      // Tenta reconectar automaticamente, exceto se tiver sido desconectado manualmente
      if (reason !== DisconnectReason.loggedOut) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("✅ Bot conectado ao WhatsApp!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // --- Recebimento de mensagens ---
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    console.log("🚀 Mensagem recebida:", JSON.stringify(m, null, 2));

    const sender = jidNormalizedUser(m?.key?.remoteJid ?? undefined);

    // --- Quando usuário clica em um botão ---
    if (m.message.buttonsResponseMessage) {
      const buttonId = m.message.buttonsResponseMessage.selectedButtonId;
      console.log("⚡ Botão clicado:", buttonId);

      if (buttonId === "pedido") {
        await sock.sendMessage(sender, { text: "🍔 Pedido iniciado!" });
      } else if (buttonId === "status") {
        await sock.sendMessage(sender, {
          text: "📦 Seu pedido está a caminho!",
        });
      } else if (buttonId === "suporte") {
        await sock.sendMessage(sender, {
          text: "☎️ Conectando com suporte...",
        });
      }
      return;
    }

    // --- Mensagens normais de texto ---
    const messageText =
      m.message.conversation || m.message.extendedTextMessage?.text;

    console.log("💬 Texto recebido:", messageText);

    if (
      messageText?.toLowerCase() === "menu" ||
      messageText?.toLowerCase() === "pedido"
    ) {
      const buttons = [
        {
          buttonId: "pedido",
          buttonText: { displayText: "🍔 Fazer Pedido" },
          type: 1,
        },
        {
          buttonId: "status",
          buttonText: { displayText: "📦 Ver Status" },
          type: 1,
        },
        {
          buttonId: "suporte",
          buttonText: { displayText: "☎️ Falar com Suporte" },
          type: 1,
        },
      ];
    } else if (messageText?.toLowerCase() === "ping") {
      await sock.sendMessage(sender, { text: "pong!" });
    }
  });
}

// --- Função para enviar botões interativos ---
// --- Função para enviar botões interativos ---
