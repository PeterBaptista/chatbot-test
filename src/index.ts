import http from "node:http";

import { env } from "./common/utils/envConfig";
import { app } from "./server";
import { connectToWhatsApp } from "./wss";

const server = http.createServer(app);

// Attach WebSocket server to HTTP server
connectToWhatsApp();

// Start HTTP server
server.listen(env.PORT, () => {
  const { NODE_ENV, PORT, HOST } = env;
  console.log(`Server (${NODE_ENV}) running at http://${HOST}:${PORT}`);
});

// Graceful shutdown
const onCloseSignal = () => {
  console.log("SIGINT/SIGTERM received, shutting down");
  server.close(() => {
    console.log("Server closed");
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
