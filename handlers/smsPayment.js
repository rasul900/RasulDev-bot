import { isAdmin } from "../config/admin.js";
import {
  looksLikeBankSms,
  processBankSms,
  isSmsPaymentEnabled,
} from "../services/smsPayment.js";

export const handleAdminSmsForward = async (ctx) => {
  if (!isSmsPaymentEnabled()) return false;
  if (!isAdmin(ctx.from.id)) return false;

  const text = ctx.message?.text?.trim();
  if (!text || !looksLikeBankSms(text)) return false;

  const result = await processBankSms(ctx.telegram, text, "admin_forward");

  if (result.ok) {
    await ctx.reply(
      `✅ *SMS orqali to'lov tasdiqlandi!*\n\n` +
      `👤 User: \`${result.payment.telegramId}\`\n` +
      `💰 Summa: *${result.payment.amount.toLocaleString()} so'm*\n` +
      `🔖 Buyurtma: \`${result.payment.orderId}\``,
      { parse_mode: "Markdown" }
    );
    return true;
  }

  if (result.reason === "payment_not_found") {
    await ctx.reply(
      `⚠️ SMS o'qildi, lekin mos buyurtma topilmadi.\n` +
      `Summa: ${result.parsed?.amount?.toLocaleString() || "?"} so'm\n` +
      `ID: ${result.parsed?.orderId || "yo'q"}`
    );
    return true;
  }

  if (result.reason === "amount_mismatch") {
    await ctx.reply(
      `⚠️ Summa mos kelmadi.\nKutilgan: ${result.expected?.toLocaleString()} so'm`
    );
    return true;
  }

  if (result.reason === "already_paid") {
    await ctx.reply("ℹ️ Bu to'lov allaqachon tasdiqlangan.");
    return true;
  }

  return false;
};

export const handleSmsWebhook = async (telegram, body) => {
  const secret = process.env.SMS_WEBHOOK_SECRET;
  if (secret && body.secret !== secret) {
    return { ok: false, status: 401, body: { error: "unauthorized" } };
  }

  const text = body.text || body.message || body.sms || body.body;
  if (!text) {
    return { ok: false, status: 400, body: { error: "no_text" } };
  }

  const result = await processBankSms(telegram, text, "webhook");

  if (result.ok) {
    try {
      await telegram.sendMessage(
        process.env.ADMIN_ID,
        `📩 SMS webhook: +${result.payment.amount.toLocaleString()} so'm — user ${result.payment.telegramId}`
      );
    } catch {
      /* ignore */
    }
    return { ok: true, status: 200, body: { success: true } };
  }

  return { ok: true, status: 200, body: { success: false, reason: result.reason } };
};
