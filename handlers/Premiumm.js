import { premiumShopMenu, premiumForWhomMenu } from "../keyboards/PremiumMenu.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { giftPremiumViaFragment, isFragmentConfigured } from "../services/fragment.js";
import { notifyAdminNewOrder, notifyAdminFailure } from "./Stars.js";

const PREMIUM_PLANS = {
  3:  { label: "3 oy",  price: 155000 },
  6:  { label: "6 oy",  price: 225000 },
  12: { label: "12 oy", price: 375000 },
};

const fmt = (n) => n.toLocaleString("uz-UZ") + " so'm";

const INTRO_TEXT =
  `👑 *Telegram Premium*\n\n` +
  `ℹ️ *IMKONIYATLAR*\n\n` +
  `⚡ Tezroq yuklab olish tezligi\n` +
  `💾 Kengaytirilgan xotira limiti\n` +
  `🚫 Reklamalarsiz foydalanish\n` +
  `🎙 Ovozni matnga aylantirish imkoniyati\n` +
  `😎 Animatsiyali emoji va eksklyuziv stikerlar\n` +
  `💬 Kengaytirilgan limitlar va chat boshqaruvi\n\n` +
  `🎯 Telegram Premium muddatini tanlang 👇`;

// ── Bosh sahifa ──────────────────────────────────────────────
export const PremiumShop = async (ctx) => {
  await ctx.reply(INTRO_TEXT, {
    parse_mode: "Markdown",
    reply_markup: premiumShopMenu,
  });
};

// ── Muddatni tanlash → Kim uchun? ────────────────────────────
export const handleBuyPremium = async (ctx) => {
  const months = parseInt(ctx.callbackQuery.data.split("_")[2]);
  const plan   = PREMIUM_PLANS[months];
  if (!plan) return ctx.answerCbQuery("Noma'lum tarif");

  ctx.session ??= {};
  ctx.session.pendingPremiumMonths = months;
  ctx.session.pendingPremiumPrice  = plan.price;

  await ctx.editMessageText(
    `👑 *Telegram Premium — ${plan.label}*\n💰 Narx: *${fmt(plan.price)}*\n\nBu kim uchun?`,
    {
      parse_mode: "Markdown",
      reply_markup: premiumForWhomMenu(months),
    }
  );
  await ctx.answerCbQuery();
};

// ── O'zim uchun ──────────────────────────────────────────────
export const handlePremiumForSelf = async (ctx) => {
  const months = parseInt(ctx.callbackQuery.data.split("_")[1]);
  const plan   = PREMIUM_PLANS[months];

  ctx.session ??= {};
  ctx.session.pendingPremiumMonths = months;
  ctx.session.pendingPremiumPrice  = plan.price;
  ctx.session.premiumTargetUser    = null;

  await ctx.editMessageText(
    `🛍 *Buyurtma tafsiloti*\n\n` +
    `👑 Tarif: *${plan.label}*\n` +
    `💰 Narx: *${fmt(plan.price)}*\n` +
    `👤 Kimga: *O'zingizga*\n\n` +
    `To'lovni tasdiqlaysizmi?`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Tasdiqlash",   callback_data: "confirm_premium" }],
          [{ text: "❌ Bekor qilish", callback_data: "premium_shop" }],
        ],
      },
    }
  );
  await ctx.answerCbQuery();
};

// ── Boshqa foydalanuvchi uchun ───────────────────────────────
export const handlePremiumForOther = async (ctx) => {
  const months = parseInt(ctx.callbackQuery.data.split("_")[1]);

  ctx.session ??= {};
  ctx.session.pendingPremiumMonths  = months;
  ctx.session.pendingPremiumPrice   = PREMIUM_PLANS[months].price;
  ctx.session.awaitingPremiumUserId = true;

  await ctx.editMessageText(
    `👤 *Foydalanuvchi @username yoki ID sini yuboring:*\n\n` +
    `_Masalan: @username yoki 123456789_`,
    { parse_mode: "Markdown" }
  );
  await ctx.answerCbQuery();
};

// ── Username/ID kiritilganda ─────────────────────────────────
export const handlePremiumUserIdInput = async (ctx) => {
  if (!ctx.session?.awaitingPremiumUserId) return;

  const target  = ctx.message.text.trim();
  const months  = ctx.session.pendingPremiumMonths;
  const price   = ctx.session.pendingPremiumPrice;
  const plan    = PREMIUM_PLANS[months];

  ctx.session.premiumTargetUser    = target;
  ctx.session.awaitingPremiumUserId = false;

  await ctx.reply(
    `🎁 *Buyurtma tafsiloti*\n\n` +
    `👑 Tarif: *${plan.label}*\n` +
    `💰 Narx: *${fmt(price)}*\n` +
    `👤 Kimga: *${target}*\n\n` +
    `To'lovni tasdiqlaysizmi?`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Tasdiqlash",   callback_data: "confirm_premium" }],
          [{ text: "❌ Bekor qilish", callback_data: "premium_shop" }],
        ],
      },
    }
  );
};

// ── Tasdiqlash ───────────────────────────────────────────────
export const handleConfirmPremium = async (ctx) => {
  const { pendingPremiumMonths: months, pendingPremiumPrice: price, premiumTargetUser: target } =
    ctx.session ?? {};

  const plan = PREMIUM_PLANS[months];

  if (!months || !price || !plan) {
    await ctx.answerCbQuery("⚠️ Buyurtma topilmadi", { show_alert: true });
    return;
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    await ctx.answerCbQuery("⚠️ Avval ro'yxatdan o'ting", { show_alert: true });
    return;
  }

  if ((user.balance || 0) < price) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `❌ *Balans yetarli emas!*\n\n` +
      `💰 Kerak: *${price.toLocaleString()} so'm*\n` +
      `💳 Sizda: *${(user.balance || 0).toLocaleString()} so'm*\n\n` +
      `"💰 Balansni to'ldirish" orqali hisobingizni to'ldiring.`,
      { parse_mode: "Markdown" }
    );
    ctx.session = {};
    return;
  }

  const recipient = target
    ? String(target).replace("@", "")
    : ctx.from.username;

  if (!recipient) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `❌ *Username topilmadi!*\n\n` +
      `Premium sovg'a qilish uchun Telegram username kerak.`,
      { parse_mode: "Markdown" }
    );
    ctx.session = {};
    return;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText("⏳ To'lov amalga oshirilmoqda, kuting...");

  user.balance -= price;
  await user.save();

  const order = await Order.create({
    telegramId: ctx.from.id,
    username: ctx.from.username || null,
    type: "premium",
    quantity: months,
    amount: price,
    status: "processing",
    note: `recipient: @${recipient}; ${plan.label}`,
  });

  ctx.session = {};

  if (!isFragmentConfigured()) {
    order.status = "pending";
    await order.save();
    await notifyAdminNewOrder(ctx, `👑 Premium ${plan.label}`, months, price, recipient, order._id);
    await ctx.editMessageText(
      `✅ *Buyurtma qabul qilindi!*\n\n` +
      `👑 Premium ${plan.label} — @${recipient}\n` +
      `💰 ${price.toLocaleString()} so'm balansdan yechildi.\n\n` +
      `⏳ Admin qo'lda tez orada faollashtiradi.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const result = await giftPremiumViaFragment(recipient, months);

  if (result.ok) {
    order.status = "completed";
    order.note = `recipient: @${recipient}; ${plan.label}; reqId: ${result.reqId}`;
    await order.save();

    await ctx.editMessageText(
      `✅ *Muvaffaqiyatli faollashtirildi!*\n\n` +
      `👑 Telegram Premium ${plan.label} → @${recipient}\n` +
      `💰 ${price.toLocaleString()} so'm\n\n` +
      `🎉 Xaridingiz uchun rahmat!`,
      { parse_mode: "Markdown" }
    );
  } else {
    user.balance += price;
    await user.save();
    order.status = "cancelled";
    order.note = `refunded; error: ${result.error || result.reason}`;
    await order.save();

    await ctx.editMessageText(
      `❌ *Faollashtirib bo'lmadi.*\n\n` +
      `💰 ${price.toLocaleString()} so'm balansingizga qaytarildi.\n\n` +
      `Iltimos, username to'g'riligini tekshiring yoki keyinroq urinib ko'ring.`,
      { parse_mode: "Markdown" }
    );
    await notifyAdminFailure(ctx, `👑 Premium ${plan.label}`, months, recipient, result);
  }
};

// ── Premium menyusiga qaytish ────────────────────────────────
export const handlePremiumBack = async (ctx) => {
  await ctx.editMessageText(INTRO_TEXT, {
    parse_mode: "Markdown",
    reply_markup: premiumShopMenu,
  });
  await ctx.answerCbQuery();
};