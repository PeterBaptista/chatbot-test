import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(
    "./auth_info_baileys"
  );

  const sock = makeWASocket({
    auth: state,
  });

  // --- Handle connection updates & QR ---
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
      if (reason !== DisconnectReason.loggedOut) {
        connectToWhatsApp(); // Reconnect
      }
    } else if (connection === "open") {
      console.log("✅ Bot conectado ao WhatsApp!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // --- Handle incoming messages ---
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const sender = jidNormalizedUser(m.key.remoteJid);

    // Detect interactive button response
    if (m.message.interactiveResponseMessage) {
      const buttonId = m.message.interactiveResponseMessage?.buttonReply?.id;
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

    // Handle normal text messages
    const messageText =
      m.message.conversation || m.message.extendedTextMessage?.text;

    console.log("💬 Mensagem recebida:", messageText);

    if (
      messageText?.toLowerCase() === "menu" ||
      messageText?.toLowerCase() === "pedido"
    ) {
      await sendButtons(sock, sender);
    } else if (messageText?.toLowerCase() === "ping") {
      await sock.sendMessage(sender, { text: "pong!" });
    }
  });
}

// --- Send interactive buttons ---
async function sendButtons(sock, jid) {
  const buttonsMessage = {
    text: "Escolha uma opção abaixo 🍽️",
    footer: "Sistema de Pedidos",
    templateButtons: [
      {
        index: 1,
        quickReplyButton: { displayText: "🍔 Fazer Pedido", id: "pedido" },
      },
      {
        index: 2,
        quickReplyButton: { displayText: "📦 Ver Status", id: "status" },
      },
      {
        index: 3,
        quickReplyButton: {
          displayText: "☎️ Falar com Suporte",
          id: "suporte",
        },
      },
    ],
  };

  await sock.sendMessage(jid, buttonsMessage);
  console.log("✅ Mensagem com botões interativos enviada!");
}

connectToWhatsApp();
