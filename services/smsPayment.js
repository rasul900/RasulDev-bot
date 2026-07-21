import Payment from "../models/Payment.js";
import { completePaymentByOrderId } from "./paymentService.js";

const ORDER_ID_RE = /TOPUP-\d+-\d+/i;

const parseAmountString = (raw) => {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\s/g, "").replace(/,/g, ".");
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num);
};

export const parseBankSms = (text) => {
  if (!text || typeof text !== "string") return null;

  const orderId = text.match(ORDER_ID_RE)?.[0]?.toUpperCase() || null;

  const amountPatterns = [
    /(?:summu|summa|miqdor|perevod|popolnenie|credit|tushum|kirim|postupil|o['']tkazma)[:\s]*([\d\s.,]+)\s*(?:UZS|uzs|so['']?m|sum|сум)?/i,
    /([\d][\d\s.,]*)\s*(?:UZS|uzs|so['']?m|sum|сум)/i,
    /(?:\+|tushdi|qabul)[^\d]{0,20}([\d\s.,]+)/i,
  ];

  let amount = null;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseAmountString(match[1]);
      if (amount) break;
    }
  }

  if (!amount) {
    const fallback = text.match(/(\d{1,3}(?:[\s,]\d{3})+(?:\.\d{2})?)/);
    if (fallback) amount = parseAmountString(fallback[1]);
  }

  if (!amount && !orderId) return null;

  return { orderId, amount, raw: text.trim() };
};

export const looksLikeBankSms = (text) => {
  if (!text || text.length < 10) return false;
  const lower = text.toLowerCase();
  const hasKeyword =
    /uzcard|humo|click|payme|perevod|popolnenie|postupil|tushdi|tushum|kirim|o['']tkazma|credit|uzs|so['']m|karta|\*\d{4}/i.test(
      lower
    );
  const hasNumber = /\d{4,}/.test(text);
  return hasKeyword && hasNumber;
};

export const createSmsTopUpPayment = async (ctx, amountUzs) => {
  const orderId = `TOPUP-${ctx.from.id}-${Date.now()}`;

  const payment = await Payment.create({
    orderId,
    telegramId: ctx.from.id,
    username: ctx.from.username || null,
    amount: amountUzs,
    amountTiyin: amountUzs * 100,
    provider: "sms",
    status: "pending",
  });

  return payment;
};

export const processBankSms = async (telegram, smsText, source = "sms") => {
  const parsed = parseBankSms(smsText);
  if (!parsed) {
    return { ok: false, reason: "parse_failed" };
  }

  const { orderId, amount, raw } = parsed;
  let payment = null;

  if (orderId) {
    payment = await Payment.findOne({ orderId, status: "pending", provider: "sms" });
  }

  if (!payment && amount) {
    const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
    payment = await Payment.findOne({
      status: "pending",
      provider: "sms",
      amount,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });
  }

  if (!payment) {
    return { ok: false, reason: "payment_not_found", parsed };
  }

  if (amount && payment.amount !== amount) {
    return { ok: false, reason: "amount_mismatch", parsed, expected: payment.amount };
  }

  const result = await completePaymentByOrderId(
    telegram,
    payment.orderId,
    `${source}; sms: ${raw.slice(0, 120)}`
  );

  if (!result.credited) {
    return { ok: false, reason: "already_paid", payment };
  }

  return { ok: true, payment, parsed };
};

export const isSmsPaymentEnabled = () =>
  process.env.SMS_PAYMENT_ENABLED === "true";
