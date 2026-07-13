import http from "http";
import { handleMulticardWebhook } from "./paymentService.js";

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

export const startPaymentWebhookServer = (telegram) => {
  const port = Number(process.env.PAYMENT_PORT || 3000);
  const publicUrl = process.env.PAYMENT_PUBLIC_URL;

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method === "POST" && req.url === "/webhook/multicard") {
        const raw = await readBody(req);
        const payload = JSON.parse(raw || "{}");
        const result = await handleMulticardWebhook(telegram, payload);
        res.writeHead(result.status || 200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result.body || { ok: true }));
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    } catch (err) {
      console.error("Webhook xatosi:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal_error" }));
    }
  });

  server.listen(port, () => {
    if (publicUrl) {
      console.log(`💳 To'lov webhook: ${publicUrl}/webhook/multicard`);
    } else {
      console.warn("⚠️ PAYMENT_PUBLIC_URL sozlanmagan — avto-to'lov webhook ishlamaydi");
    }
  });

  return server;
};
