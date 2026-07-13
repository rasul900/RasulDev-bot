import Payment from "../models/Payment.js";
import User from "../models/User.js";
import {
  createInvoice,
  getInvoiceStatus,
  verifyWebhookSign,
  isMulticardConfigured,
} from "./multicard.js";

const buildUrls = async (telegram, orderId) => {
  const botInfo = await telegram.getMe();
  const publicUrl = (process.env.PAYMENT_PUBLIC_URL || "").replace(/\/$/, "");
  const botLink = `https://t.me/${botInfo.username}?start=pay_${orderId}`;

  return {
    callbackUrl: publicUrl ? `${publicUrl}/webhook/multicard` : undefined,
    returnUrl: botLink,
    returnErrorUrl: botLink,
  };
};

export const createTopUpPayment = async (ctx, amountUzs) => {
  if (!isMulticardConfigured()) {
    throw new Error("To'lov tizimi sozlanmagan");
  }

  const orderId = `TOPUP-${ctx.from.id}-${Date.now()}`;
  const urls = await buildUrls(ctx.telegram, orderId);

  if (!urls.callbackUrl) {
    throw new Error("PAYMENT_PUBLIC_URL sozlanmagan (webhook uchun)");
  }

  const invoice = await createInvoice({
    orderId,
    amountUzs,
    ...urls,
  });

  const payment = await Payment.create({
    orderId,
    telegramId: ctx.from.id,
    username: ctx.from.username || null,
    amount: amountUzs,
    amountTiyin: invoice.amountTiyin,
    externalUuid: invoice.uuid,
    checkoutUrl: invoice.checkoutUrl || invoice.shortLink,
    status: "pending",
  });

  return payment;
};

const creditUserBalance = async (payment, note = "") => {
  if (payment.status === "paid") return false;

  await User.findOneAndUpdate(
    { telegramId: payment.telegramId },
    { $inc: { balance: payment.amount } }
  );

  payment.status = "paid";
  payment.paidAt = new Date();
  if (note) payment.note = note;
  await payment.save();
  return true;
};

const isPaidAmountValid = (payment, amountTiyin) =>
  Number(amountTiyin) === Number(payment.amountTiyin);

export const notifyPaymentSuccess = async (telegram, payment) => {
  try {
    await telegram.sendMessage(
      payment.telegramId,
      `✅ *To'lov muvaffaqiyatli!*\n\n` +
      `💰 +${payment.amount.toLocaleString()} so'm balansingizga qo'shildi.\n` +
      `🔖 Buyurtma: \`${payment.orderId}\`\n\n` +
      `Xaridingiz uchun rahmat! 🎉`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("To'lov xabari yuborilmadi:", err.message);
  }
};

export const completePaymentByOrderId = async (telegram, orderId, note = "") => {
  const payment = await Payment.findOne({ orderId });
  if (!payment) return { ok: false, reason: "not_found" };

  const credited = await creditUserBalance(payment, note);
  if (credited && telegram) {
    await notifyPaymentSuccess(telegram, payment);
  }
  return { ok: true, credited, payment };
};

export const handleMulticardWebhook = async (telegram, payload) => {
  if (!verifyWebhookSign(payload)) {
    return { ok: false, status: 401, body: { success: false, message: "Noto'g'ri imzo" } };
  }

  const payment = await Payment.findOne({ orderId: payload.invoice_id });
  if (!payment) {
    return { ok: false, status: 200, body: { success: false, message: "Buyurtma topilmadi" } };
  }

  if (!isPaidAmountValid(payment, payload.amount)) {
    console.error(
      `To'lov summasi mos kelmadi: ${payload.amount} tiyin, kutilgan: ${payment.amountTiyin}`
    );
    return { ok: false, status: 200, body: { success: false, message: "Summa mos kelmadi" } };
  }

  if (payload.status && payload.status !== "success") {
    payment.status = "failed";
    payment.note = `status: ${payload.status}`;
    await payment.save();
    return { ok: true, status: 200, body: { success: true } };
  }

  await completePaymentByOrderId(
    telegram,
    payment.orderId,
    `webhook; uuid: ${payload.uuid}; ps: ${payload.ps || "-"}`
  );

  return { ok: true, status: 200, body: { success: true } };
};

export const checkAndCompletePayment = async (telegram, orderId) => {
  const payment = await Payment.findOne({ orderId });
  if (!payment) return { ok: false, message: "Buyurtma topilmadi" };
  if (payment.status === "paid") return { ok: true, message: "allaqachon_tolangan" };

  if (!payment.externalUuid) {
    return { ok: false, message: "To'lov ma'lumoti topilmadi" };
  }

  try {
    const invoice = await getInvoiceStatus(payment.externalUuid);
    const status =
      invoice?.payment?.status ||
      invoice?.status ||
      invoice?.payment_status;
    const paidAmount =
      invoice?.payment?.amount ||
      invoice?.amount ||
      invoice?.payment?.total_amount;

    if (status === "success" || status === "paid") {
      if (paidAmount && !isPaidAmountValid(payment, paidAmount)) {
        return { ok: false, message: "summa_mos_kelmadi" };
      }
      await completePaymentByOrderId(telegram, orderId, "auto_check");
      return { ok: true, message: "tolandi" };
    }

    return { ok: false, message: "kutilmoqda", status };
  } catch (err) {
    return { ok: false, message: err.message };
  }
};

export const handlePaymentStart = async (ctx, orderId) => {
  const payment = await Payment.findOne({ orderId, telegramId: ctx.from.id });
  if (!payment) {
    await ctx.reply("❌ To'lov buyurtmasi topilmadi.");
    return true;
  }

  if (payment.status === "paid") {
    await ctx.reply(
      `✅ Bu to'lov allaqachon tasdiqlangan.\n💰 +${payment.amount.toLocaleString()} so'm qo'shilgan.`
    );
    return true;
  }

  const result = await checkAndCompletePayment(ctx.telegram, orderId);
  if (result.message === "tolandi") {
    await ctx.reply(
      `✅ *To'lov tasdiqlandi!*\n\n` +
      `💰 +${payment.amount.toLocaleString()} so'm balansingizga avtomatik qo'shildi.`,
      { parse_mode: "Markdown" }
    );
    return true;
  }

  if (payment.status === "paid") {
    await ctx.reply(
      `✅ *To'lov muvaffaqiyatli!*\n\n` +
      `💰 +${payment.amount.toLocaleString()} so'm balansingizga qo'shilgan.`
    );
    return true;
  }

  await ctx.reply(
    `⏳ To'lov qayta ishlanmoqda...\n\n` +
    `Pul tushgach balans *avtomatik* to'ldiriladi. Hech qanday chek yuborish shart emas.`,
    { parse_mode: "Markdown" }
  );
  return true;
};

export const startPaymentPoller = (telegram) => {
  const intervalMs = Number(process.env.PAYMENT_POLL_MS || 30000);

  setInterval(async () => {
    try {
      const pending = await Payment.find({
        status: "pending",
        externalUuid: { $ne: null },
      })
        .sort({ createdAt: 1 })
        .limit(30);

      for (const payment of pending) {
        await checkAndCompletePayment(telegram, payment.orderId);
      }
    } catch (err) {
      console.error("To'lov poller xatosi:", err.message);
    }
  }, intervalMs);
};
