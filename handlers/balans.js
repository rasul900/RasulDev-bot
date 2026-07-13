import { isAdmin } from "../config/admin.js";
import User from "../models/User.js";
import { sendBalanceMenu } from "../keyboards/BalansMenu.js";
import { successCb, primaryCb, dangerCb, successUrl } from "../keyboards/styledButton.js";
import { createTopUpPayment } from "../services/paymentService.js";
import { isMulticardConfigured } from "../services/multicard.js";
import { formatPaymentCard } from "../config/paymentCard.js";

const REFERRAL_BONUS = 5000;

const amountKeyboard = {
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        successCb("50,000", "amount_50000"),
        successCb("100,000", "amount_100000"),
      ],
      [
        successCb("250,000", "amount_250000"),
        successCb("500,000", "amount_500000"),
      ],
      [dangerCb("❌ Bekor qilish", "topup_cancel")],
    ],
  },
};

const amountPrompt =
  `💳 *Karta orqali avtomatik to'ldirish*\n\n` +
  `━━━━━━━━━━━━━━━━━━━━\n` +
  `📌 Minimal: *10,000 so'm*\n` +
  `📌 Maksimal: *5,000,000 so'm*\n` +
  `💳 Uzcard, Humo, Visa, Click, Payme\n` +
  `━━━━━━━━━━━━━━━━━━━━\n\n` +
  `✅ Pul tushgach balans *avtomatik* to'ldiriladi\n` +
  `📸 Chek yuborish *shart emas*\n\n` +
  `💬 Qancha so'm to'ldirmoqchisiz?\n` +
  `_Faqat raqam kiriting (masalan: 50000)_`;

// ── Balans menyusi ────────────────────────────────────────────
export const balansHandler = async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });

  await sendBalanceMenu(
    ctx,
    `💼 *Balans bo'limi*\n\n` +
    `💰 Joriy balans: *${(user?.balance || 0).toLocaleString()} so'm*\n\n` +
    `Kerakli bo'limni tanlang:`
  );
};

// ── Pul ishlash — referal ─────────────────────────────────────
export const pulIshlashHandler = async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const botInfo = await ctx.telegram.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=ref_${ctx.from.id}`;
  const refCount = user?.referrals?.length || 0;
  const earned = refCount * REFERRAL_BONUS;

  await ctx.reply(
    `💸 *Referal dasturi*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👥 Taklif qilgan do'stlar: *${refCount} ta*\n` +
    `💵 Referal orqali ishlagan: *${earned.toLocaleString()} so'm*\n` +
    `🎁 Har bir do'st uchun: *${REFERRAL_BONUS.toLocaleString()} so'm*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📤 Havolangizni do'stlaringizga yuboring:\n\n` +
    `\`${refLink}\`\n\n` +
    `_Do'stingiz botga kirishi bilan balansga avtomatik qo'shiladi!_`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [successUrl("📤 Do'stga yuborish", `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🎮 Bu botga qo'shil, birgalikda ishlaylik!")}`)],
          [primaryCb("🔄 Statistikani yangilash", "ref_stats")],
        ],
      },
    }
  );
};

export const refStatsCallback = async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const botInfo = await ctx.telegram.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=ref_${ctx.from.id}`;
  const refCount = user?.referrals?.length || 0;
  const earned = refCount * REFERRAL_BONUS;

  await ctx.editMessageText(
    `💸 *Referal dasturi*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👥 Taklif qilgan do'stlar: *${refCount} ta*\n` +
    `💵 Referal orqali ishlagan: *${earned.toLocaleString()} so'm*\n` +
    `🎁 Har bir do'st uchun: *${REFERRAL_BONUS.toLocaleString()} so'm*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📤 Havolangiz:\n\n` +
    `\`${refLink}\``,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [successUrl("📤 Do'stga yuborish", `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🎮 Bu botga qo'shil!")}`)],
          [primaryCb("🔄 Yangilash", "ref_stats")],
        ],
      },
    }
  );
  await ctx.answerCbQuery("✅ Yangilandi");
};

// ── Balansni to'ldirish — to'g'ridan-to'g'ri karta ────────────
export const topUpHandler = async (ctx) => {
  ctx.session ??= {};
  ctx.session.awaitingTopUpAmount = true;

  const autoNote = isMulticardConfigured()
    ? `✅ Avtomatik to'lov yoqilgan — pul tushsa balans o'zi to'ldiriladi\n`
    : `⚠️ Avtomatik to'lov hozircha yoqilmagan\n`;

  await ctx.reply(
    amountPrompt + `\n\n${autoNote}\n` + formatPaymentCard(),
    amountKeyboard
  );
};

export const topUpCardCallback = async (ctx) => {
  ctx.session ??= {};
  ctx.session.awaitingTopUpAmount = true;

  await ctx.editMessageText(amountPrompt, amountKeyboard);
  await ctx.answerCbQuery();
};

export const quickAmountCallback = async (ctx) => {
  const amount = parseInt(ctx.callbackQuery.data.split("_")[1]);

  ctx.session ??= {};
  ctx.session.awaitingTopUpAmount = false;

  await sendMulticardPayment(ctx, amount);
  await ctx.answerCbQuery();
};

export const handleTopUpAmountInput = async (ctx) => {
  if (!ctx.session?.awaitingTopUpAmount) return;

  const amount = parseInt(ctx.message.text.trim().replace(/\s/g, ""));

  if (isNaN(amount) || amount < 10000) {
    return ctx.reply("⚠️ Minimal miqdor 10,000 so'm. Qaytadan kiriting:");
  }
  if (amount > 5000000) {
    return ctx.reply("⚠️ Maksimal miqdor 5,000,000 so'm. Qaytadan kiriting:");
  }

  ctx.session.awaitingTopUpAmount = false;
  await sendMulticardPayment(ctx, amount);
};

const sendMulticardPayment = async (ctx, amount) => {
  if (!isMulticardConfigured()) {
    const orderId = `TOPUP-${ctx.from.id}-${Date.now()}`;
    await ctx.reply(
      `💳 *Karta orqali to'ldirish*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Miqdor: *${amount.toLocaleString()} so'm*\n` +
      `🔖 Buyurtma: \`${orderId}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${formatPaymentCard()}\n\n` +
      `⚠️ To'lov izohiga buyurtma ID ni yozing.\n` +
      `Pul tushgach balans tez orada to'ldiriladi.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  try {
    const payment = await createTopUpPayment(ctx, amount);

    await ctx.reply(
      `💳 *To'lov sahifasi tayyor*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Miqdor: *${amount.toLocaleString()} so'm*\n` +
      `🔖 Buyurtma: \`${payment.orderId}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👇 *To'lash* tugmasini bosing va kartangizni kiriting.\n` +
      `Pul tushgach balans *avtomatik* to'ldiriladi — chek kerak emas.`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [successUrl("💳 To'lash", payment.checkoutUrl)],
            [dangerCb("❌ Bekor qilish", "topup_cancel")],
          ],
        },
      }
    );
  } catch (err) {
    console.error("Multicard invoice xatosi:", err.message);
    await ctx.reply(
      `❌ To'lov yaratilmadi: ${err.message}\n\nKeyinroq urinib ko'ring.`,
      { parse_mode: "Markdown" }
    );
  }
};

export const topUpCancelCallback = async (ctx) => {
  ctx.session = {};
  await ctx.editMessageText(
    `❌ *Bekor qilindi.*\n\nBalans bo'limiga qaytdingiz.`,
    { parse_mode: "Markdown" }
  );
  await ctx.answerCbQuery("Bekor qilindi");
};

// Admin qo'lda to'ldirish (faqat /admin buyrug'i orqali)
export const handleAdminApprove = async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCbQuery("⛔ Ruxsat yo'q", { show_alert: true });
  }

  const [, userId, amount] = ctx.callbackQuery.data.split("_");

  await User.findOneAndUpdate(
    { telegramId: parseInt(userId) },
    { $inc: { balance: parseInt(amount) } }
  );

  await ctx.telegram.sendMessage(
    userId,
    `✅ *Balansingiz to'ldirildi!*\n\n` +
    `💰 +${parseInt(amount).toLocaleString()} so'm qo'shildi.\n` +
    `Xaridingiz uchun rahmat! 🎉`,
    { parse_mode: "Markdown" }
  );

  await ctx.editMessageCaption(
    `✅ *Tasdiqlandi* — ${parseInt(amount).toLocaleString()} so'm\n👤 User ID: ${userId}`,
    { parse_mode: "Markdown" }
  );
  await ctx.answerCbQuery("✅ Balans to'ldirildi");
};

export const handleAdminReject = async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCbQuery("⛔ Ruxsat yo'q", { show_alert: true });
  }

  const userId = ctx.callbackQuery.data.split("_")[1];

  await ctx.telegram.sendMessage(
    userId,
    `❌ *To'ldirish rad etildi.*\n\n` +
    `Muammo bo'lsa adminga murojaat qiling: @${process.env.BOT_USERNAME || "Rasul_dev_admin"}`,
    { parse_mode: "Markdown" }
  );

  await ctx.editMessageCaption(
    `❌ *Rad etildi* — User ID: ${userId}`,
    { parse_mode: "Markdown" }
  );
  await ctx.answerCbQuery("❌ Rad etildi");
};
