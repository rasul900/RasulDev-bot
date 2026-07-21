import http from "http";
import { handleMulticardWebhook } from "./paymentService.js";
import { handleSmsWebhook } from "../handlers/smsPayment.js";
import { isSmsPaymentEnabled } from "./smsPayment.js";

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

export const startPaymentWebhookServer = (telegram) => {
  const port = Number(process.env.PORT || process.env.PAYMENT_PORT || 3000);
  const publicUrl = process.env.PAYMENT_PUBLIC_URL;
  const smsEnabled = isSmsPaymentEnabled();

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, bot: true }));
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

      if (req.method === "POST" && req.url === "/webhook/sms" && smsEnabled) {
        const raw = await readBody(req);
        let payload = {};
        try {
          payload = JSON.parse(raw || "{}");
        } catch {
          payload = { text: raw };
        }
        const result = await handleSmsWebhook(telegram, payload);
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

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `❌ HTTP server ${port}-portda band. ` +
          `Bot polling ishlashda davom etadi.`
      );
    } else {
      console.error("HTTP server xatosi:", err.message);
    }
  });

  server.listen(port, () => {
    console.log(`🌐 Health server: http://0.0.0.0:${port}/health`);
    if (publicUrl) {
      console.log(`💳 Multicard webhook: ${publicUrl}/webhook/multicard`);
    }
    if (smsEnabled) {
      console.log(`📩 SMS webhook: port ${port}/webhook/sms`);
    }
  });

  return server;
};


export const startSmsWebhookOnly = (telegram) => {
  if (!isSmsPaymentEnabled()) return null;
  return startPaymentWebhookServer(telegram);
};
