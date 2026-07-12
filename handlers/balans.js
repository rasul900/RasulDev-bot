import { Markup } from "telegraf";
import { isAdmin } from "../config/admin.js";
import User from "../models/User.js"; // o'z modelingizga moslashtiring
import { sendBalanceMenu } from "../keyboards/BalansMenu.js";
import { successCb, primaryCb, dangerCb, successUrl, primaryUrl } from "../keyboards/styledButton.js";
import { saveTelegramPhoto } from "../services/fileStorage.js";

const REFERRAL_BONUS = 5000; // har bir do'st uchun bonus (so'm)

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
  const user     = await User.findOne({ telegramId: ctx.from.id });
  const botInfo  = await ctx.telegram.getMe();
  const refLink  = `https://t.me/${botInfo.username}?start=ref_${ctx.from.id}`;
  const refCount = user?.referrals?.length || 0;
  const earned   = refCount * REFERRAL_BONUS;

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

// ── Referal statistika yangilash ──────────────────────────────
export const refStatsCallback = async (ctx) => {
  const user     = await User.findOne({ telegramId: ctx.from.id });
  const botInfo  = await ctx.telegram.getMe();
  const refLink  = `https://t.me/${botInfo.username}?start=ref_${ctx.from.id}`;
  const refCount = user?.referrals?.length || 0;
  const earned   = refCount * REFERRAL_BONUS;

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

// ── Balansni to'ldirish — usul tanlash ───────────────────────
export const topUpHandler = async (ctx) => {
  await ctx.reply(
    `💰 *Balansni to'ldirish*\n\n` +
    `To'lov usulini tanlang:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [successCb("💳 Click / Payme orqali", "topup_card")],
          [primaryCb("👨‍💼 Admin orqali (chek)", "topup_admin")],
        ],
      },
    }
  );
};

// ── Click / Payme ─────────────────────────────────────────────
export const topUpCardCallback = async (ctx) => {
  ctx.session ??= {};
  ctx.session.awaitingTopUpAmount = true;
  ctx.session.topUpMethod         = "card";

  await ctx.editMessageText(
    `💳 *Click / Payme orqali to'ldirish*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 Minimal: *10,000 so'm*\n` +
    `📌 Maksimal: *5,000,000 so'm*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💬 Qancha so'm to'ldirmoqchisiz?\n` +
    `_Faqat raqam kiriting (masalan: 50000)_`,
    {
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
    }
  );
  await ctx.answerCbQuery();
};

// ── Tez miqdor tugmalari ──────────────────────────────────────
export const quickAmountCallback = async (ctx) => {
  const amount = parseInt(ctx.callbackQuery.data.split("_")[1]);

  ctx.session ??= {};
  ctx.session.topUpAmount         = amount;
  ctx.session.awaitingTopUpAmount = false;

  await sendPaymentDetails(ctx, amount);
  await ctx.answerCbQuery();
};

// ── Miqdor kiritilganda ───────────────────────────────────────
export const handleTopUpAmountInput = async (ctx) => {
  if (!ctx.session?.awaitingTopUpAmount) return;

  const amount = parseInt(ctx.message.text.trim().replace(/\s/g, ""));

  if (isNaN(amount) || amount < 10000) {
    return ctx.reply("⚠️ Minimal miqdor 10,000 so'm. Qaytadan kiriting:");
  }
  if (amount > 5000000) {
    return ctx.reply("⚠️ Maksimal miqdor 5,000,000 so'm. Qaytadan kiriting:");
  }

  ctx.session.topUpAmount         = amount;
  ctx.session.awaitingTopUpAmount = false;

  await sendPaymentDetails(ctx, amount);
};

// ── To'lov rekvizitlari yuborish ──────────────────────────────
const sendPaymentDetails = async (ctx, amount) => {
  const orderId = `PAY-${ctx.from.id}-${Date.now()}`;

  ctx.session ??= {};
  ctx.session.orderId = orderId;

  await ctx.reply(
    `💳 *To'lov tafsiloti*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Miqdor: *${amount.toLocaleString()} so'm*\n` +
    `🔖 Buyurtma ID: \`${orderId}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💳 *Click:* \`9860 1234 5678 9012\`\n` +
    `💳 *Payme:* \`8600 1234 5678 9012\`\n\n` +
    `👤 Karta egasi: *Ism Familiya*\n\n` +
    `⚠️ _To'lovdan so'ng chek rasmini yuboring!_`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [successCb("📸 Chek yuborish", "send_check")],
          [dangerCb("❌ Bekor qilish", "topup_cancel")],
        ],
      },
    }
  );
};

// ── Chek yuborish (card) ──────────────────────────────────────
export const sendCheckCallback = async (ctx) => {
  ctx.session ??= {};
  ctx.session.awaitingCheck = true;

  await ctx.editMessageText(
    `📸 *Chek rasmini yuboring*\n\n` +
    `_To'lov chekining rasmini yoki skrinini yuboring._`,
    { parse_mode: "Markdown" }
  );
  await ctx.answerCbQuery();
};

// ── Chek rasmi kelganda ───────────────────────────────────────
export const handleCheckPhoto = async (ctx) => {
  const isCardCheck  = ctx.session?.awaitingCheck;
  const isAdminCheck = ctx.session?.awaitingAdminCheck;
  if (!isCardCheck && !isAdminCheck) return;

  const amount  = ctx.session?.topUpAmount;
  const orderId = ctx.session?.orderId || `ADMIN-${ctx.from.id}-${Date.now()}`;
  const ADMIN_ID = process.env.ADMIN_ID;
  const amountText = amount ? `${amount.toLocaleString()} so'm` : "Aniqlanmagan (admin tekshiradi)";

  const fileId =
    ctx.message.photo?.at(-1)?.file_id ||
    (ctx.message.document?.mime_type?.startsWith("image/")
      ? ctx.message.document.file_id
      : null);

  if (!fileId) {
    await ctx.reply("⚠️ Iltimos, chek rasmini yuboring.");
    return;
  }

  ctx.session.awaitingCheck      = false;
  ctx.session.awaitingAdminCheck = false;

  try {
    await saveTelegramPhoto(ctx.telegram, fileId, "checks", `user_${ctx.from.id}`);
  } catch (err) {
    console.error("Chek rasm saqlash xatosi:", err.message);
  }

  const approveButton = amount
    ? successCb("✅ Tasdiqlash", `approve_${ctx.from.id}_${amount}`)
    : successCb("✅ Tasdiqlash (0)", `approve_${ctx.from.id}_0`);

  await ctx.telegram.sendPhoto(
    ADMIN_ID,
    fileId,
    {
      caption:
        `💰 *Yangi to'ldirish so'rovi*\n\n` +
        `👤 Foydalanuvchi: @${ctx.from.username || "yo'q"}\n` +
        `🆔 ID: \`${ctx.from.id}\`\n` +
        `💵 Miqdor: *${amountText}*\n` +
        `🔖 Buyurtma: \`${orderId}\``,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [approveButton, dangerCb("❌ Rad etish", `reject_${ctx.from.id}`)],
        ],
      },
    }
  );

  await ctx.reply(
    `✅ *Chek yuborildi!*\n\n` +
    `Admin tekshirib, balansni tez orada to'ldiradi.\n` +
    `⏳ Odatda 5-15 daqiqa ichida.`,
    { parse_mode: "Markdown" }
  );

  ctx.session = {};
};

// ── Admin orqali to'ldirish ───────────────────────────────────
export const topUpAdminCallback = async (ctx) => {
  ctx.session ??= {};
  ctx.session.awaitingAdminCheck = true;

  await ctx.editMessageText(
    `👨‍💼 *Admin orqali to'ldirish*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `1️⃣ Admin bilan bog'laning: @${process.env.BOT_USERNAME || "Rasul_dev_admin"}\n` +
    `2️⃣ To'lov miqdorini ayting\n` +
    `3️⃣ To'lovni amalga oshiring\n` +
    `4️⃣ Chekni shu yerga yuboring\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📸 *Chek rasmini yuboring:*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [primaryUrl("💬 Admin bilan bog'lanish", `https://t.me/${process.env.BOT_USERNAME || "Rasul_dev_admin"}`)],
          [dangerCb("❌ Bekor qilish", "topup_cancel")],
        ],
      },
    }
  );
  await ctx.answerCbQuery();
};

// ── Admin chekni tasdiqlash ───────────────────────────────────
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

// ── Admin chekni rad etish ────────────────────────────────────
export const handleAdminReject = async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCbQuery("⛔ Ruxsat yo'q", { show_alert: true });
  }

  const userId = ctx.callbackQuery.data.split("_")[1];

  await ctx.telegram.sendMessage(
    userId,
    `❌ *To'ldirish rad etildi.*\n\n` +
    `Chek tasdiqlanmadi. Muammo bo'lsa adminga murojaat qiling: @${process.env.BOT_USERNAME || "Rasul_dev_admin"}`,
    { parse_mode: "Markdown" }
  );

  await ctx.editMessageCaption(
    `❌ *Rad etildi* — User ID: ${userId}`,
    { parse_mode: "Markdown" }
  );
  await ctx.answerCbQuery("❌ Rad etildi");
};

// ── Bekor qilish ──────────────────────────────────────────────
export const topUpCancelCallback = async (ctx) => {
  ctx.session = {};
  await ctx.editMessageText(
    `❌ *Bekor qilindi.*\n\nBalans bo'limiga qaytdingiz.`,
    { parse_mode: "Markdown" }
  );
  await ctx.answerCbQuery("Bekor qilindi");
};
