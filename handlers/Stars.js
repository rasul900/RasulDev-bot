import { starsShopMenu, forWhomMenu } from "../keyboards/StarsMenu.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { buyStarsViaFragment, isFragmentConfigured } from "../services/fragment.js";

// Narxlar jadvali: stars -> so'm
const PRICES = {
  50:    10500,
  75:    15750,
  100:   21000,
  150:   31500,
  250:   52500,
  350:   73500,
  500:   105000,
  750:   157500,
  1000:  210000,
  1500:  315000,
  2500:  525000,
  5000:  1050000,
  10000: 2100000,
};

const formatPrice = (n) => n.toLocaleString("uz-UZ") + " so'm";

// ── Stars do'koni bosh sahifasi ──────────────────────────────
export const StarsShop = async (ctx) => {
  const text =
    `⭐ *Telegram Stars*\n\n` +
    `🪄 Siz qanchalik ko'p Stars olsangiz, shunchalik afzalliklarga ega bo'lasiz\\!\n\n` +
    `⚠️ *Cheklovlar*\n` +
    `▪️ Minimal: 50 ta\n` +
    `▪️ Maksimal: 2222 ta\n\n` +
    `🎯 Kerakli miqdorni tanlang yoki raqam bilan yuboring 👇`;

  await ctx.reply(text, {
    parse_mode: "MarkdownV2",
    reply_markup: starsShopMenu,
  });
};

// ── Paket tanlanganda: kim uchun so'rash ─────────────────────
export const handleBuyStars = async (ctx) => {
  const data = ctx.callbackQuery.data;             // "buy_stars_500"
  const stars = parseInt(data.split("_")[2]);
  const price = PRICES[stars];

  if (!price) return ctx.answerCbQuery("Noma'lum paket");

  ctx.session ??= {};
  ctx.session.pendingStars = stars;
  ctx.session.pendingPrice = price;

  await ctx.editMessageText(
    `⭐ *${stars} ta Stars* — ${formatPrice(price)}\n\nBu kim uchun?`,
    {
      parse_mode: "Markdown",
      reply_markup: forWhomMenu(stars, price),
    }
  );
  await ctx.answerCbQuery();
};

// ── O'zim uchun ──────────────────────────────────────────────
export const handleForSelf = async (ctx) => {
  const data  = ctx.callbackQuery.data;            // "self_500"
  const stars = parseInt(data.split("_")[1]);
  const price = PRICES[stars];

  ctx.session ??= {};
  ctx.session.targetUser = null;
  ctx.session.pendingStars = stars;
  ctx.session.pendingPrice = price;

  await ctx.editMessageText(
    `🛍 *Buyurtma tafsiloti*\n\n` +
    `⭐ Stars: *${stars} ta*\n` +
    `💰 Narx: *${formatPrice(price)}*\n` +
    `👤 Kimga: *O'zingizga*\n\n` +
    `To'lovni tasdiqlaysizmi?`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Tasdiqlash", callback_data: "confirm_stars" }],
          [{ text: "❌ Bekor qilish", callback_data: "stars_shop" }],
        ],
      },
    }
  );
  await ctx.answerCbQuery();
};

// ── Boshqa foydalanuvchi uchun ───────────────────────────────
export const handleForOther = async (ctx) => {
  const data  = ctx.callbackQuery.data;            // "other_500"
  const stars = parseInt(data.split("_")[1]);

  ctx.session ??= {};
  ctx.session.pendingStars = stars;
  ctx.session.pendingPrice = PRICES[stars];
  ctx.session.awaitingUserId = true;

  await ctx.editMessageText(
    `👤 *Foydalanuvchi ID yoki @username ni yuboring:*\n\n` +
    `_Masalan: @username yoki 123456789_`,
    { parse_mode: "Markdown" }
  );
  await ctx.answerCbQuery();
};

// ── Foydalanuvchi ID kiritganda ──────────────────────────────
export const handleUserIdInput = async (ctx) => {
  if (!ctx.session?.awaitingUserId) return;

  const target = ctx.message.text.trim();
  const { pendingStars: stars, pendingPrice: price } = ctx.session;

  ctx.session.targetUser    = target;
  ctx.session.awaitingUserId = false;

  await ctx.reply(
    `🎁 *Buyurtma tafsiloti*\n\n` +
    `⭐ Stars: *${stars} ta*\n` +
    `💰 Narx: *${formatPrice(price)}*\n` +
    `👤 Kimga: *${target}*\n\n` +
    `To'lovni tasdiqlaysizmi?`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Tasdiqlash", callback_data: "confirm_stars" }],
          [{ text: "❌ Bekor qilish", callback_data: "stars_shop" }],
        ],
      },
    }
  );
};

// ── Qo'lda raqam kiritish (50–2222 oralig'ida) ───────────────
export const handleCustomAmount = async (ctx) => {
  if (ctx.session?.awaitingUserId) return;        // boshqa kutish holati

  const amount = parseInt(ctx.message.text.trim());
  if (isNaN(amount)) return;

  if (amount < 50 || amount > 2222) {
    return ctx.reply("⚠️ Miqdor 50 dan 2222 gacha bo'lishi kerak.");
  }

  // Eng yaqin paket narxini hisoblash (210 so'm/star)
  const price = amount * 210;
  ctx.session ??= {};
  ctx.session.pendingStars = amount;
  ctx.session.pendingPrice = price;

  await ctx.reply(
    `⭐ *${amount} ta Stars* — ${formatPrice(price)}\n\nBu kim uchun?`,
    {
      parse_mode: "Markdown",
      reply_markup: forWhomMenu(amount, price),
    }
  );
};

// ── Tasdiqlash ───────────────────────────────────────────────
export const handleConfirmStars = async (ctx) => {
  const { pendingStars: stars, pendingPrice: price, targetUser } = ctx.session ?? {};

  if (!stars || !price) {
    await ctx.answerCbQuery("⚠️ Buyurtma topilmadi", { show_alert: true });
    return;
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    await ctx.answerCbQuery("⚠️ Avval ro'yxatdan o'ting", { show_alert: true });
    return;
  }

  // 1) Balans tekshirish
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

  // 2) Qabul qiluvchi username ni aniqlash
  const recipient = targetUser
    ? String(targetUser).replace("@", "")
    : ctx.from.username;

  if (!recipient) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `❌ *Username topilmadi!*\n\n` +
      `Stars yuborish uchun Telegram username kerak.\n` +
      `Sozlamalardan username o'rnating yoki boshqa foydalanuvchi uchun buyurtma bering.`,
      { parse_mode: "Markdown" }
    );
    ctx.session = {};
    return;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText("⏳ To'lov amalga oshirilmoqda, kuting...");

  // 3) Balansdan yechish + buyurtma yaratish
  user.balance -= price;
  await user.save();

  const order = await Order.create({
    telegramId: ctx.from.id,
    username: ctx.from.username || null,
    type: "stars",
    quantity: stars,
    amount: price,
    status: "processing",
    note: `recipient: @${recipient}`,
  });

  ctx.session = {};

  // 4) Fragment orqali yetkazish
  if (!isFragmentConfigured()) {
    order.status = "pending";
    await order.save();
    await notifyAdminNewOrder(ctx, "⭐ Stars", stars, price, recipient, order._id);
    await ctx.editMessageText(
      `✅ *Buyurtma qabul qilindi!*\n\n` +
      `⭐ ${stars} ta Stars — @${recipient}\n` +
      `💰 ${price.toLocaleString()} so'm balansdan yechildi.\n\n` +
      `⏳ Admin qo'lda tez orada yetkazadi.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const result = await buyStarsViaFragment(recipient, stars);

  if (result.ok) {
    order.status = "completed";
    order.note = `recipient: @${recipient}; reqId: ${result.reqId}`;
    await order.save();

    await ctx.editMessageText(
      `✅ *Muvaffaqiyatli yetkazildi!*\n\n` +
      `⭐ ${stars} ta Stars → @${recipient}\n` +
      `💰 ${price.toLocaleString()} so'm\n\n` +
      `🎉 Xaridingiz uchun rahmat!`,
      { parse_mode: "Markdown" }
    );
  } else {
    // 5) Muvaffaqiyatsiz — pulni qaytarish
    user.balance += price;
    await user.save();
    order.status = "cancelled";
    order.note = `refunded; error: ${result.error || result.reason}`;
    await order.save();

    await ctx.editMessageText(
      `❌ *Yetkazib bo'lmadi.*\n\n` +
      `💰 ${price.toLocaleString()} so'm balansingizga qaytarildi.\n\n` +
      `Sabab: ${errorText(result)}\n\n` +
      `Iltimos, username to'g'riligini tekshiring yoki keyinroq urinib ko'ring.`,
      { parse_mode: "Markdown" }
    );
    await notifyAdminFailure(ctx, "⭐ Stars", stars, recipient, result);
  }
};

const errorText = (result) => {
  if (result.reason === "no_transaction") return "Tranzaksiya yaratilmadi";
  if (result.error?.includes("Recipient not found")) return "Foydalanuvchi topilmadi";
  if (result.error?.includes("insufficient")) return "Hamyonda TON yetarli emas";
  return result.error || "Noma'lum xato";
};

const notifyAdminNewOrder = async (ctx, type, qty, price, recipient, orderId) => {
  const adminId = process.env.ADMIN_ID;
  if (!adminId) return;
  try {
    await ctx.telegram.sendMessage(
      adminId,
      `🆕 Yangi buyurtma (qo'lda)\n\n` +
      `${type}: ${qty}\n` +
      `👤 Qabul qiluvchi: @${recipient}\n` +
      `💰 ${price.toLocaleString()} so'm\n` +
      `🆔 Buyurtma: ${orderId}\n` +
      `📱 Xaridor: @${ctx.from.username || ctx.from.id}`
    );
  } catch {}
};

const notifyAdminFailure = async (ctx, type, qty, recipient, result) => {
  const adminId = process.env.ADMIN_ID;
  if (!adminId) return;
  try {
    await ctx.telegram.sendMessage(
      adminId,
      `⚠️ Fragment xatosi\n\n` +
      `${type}: ${qty}\n` +
      `👤 @${recipient}\n` +
      `❌ ${result.error || result.reason}\n` +
      `📱 Xaridor: @${ctx.from.username || ctx.from.id}\n\n` +
      `Pul avtomatik qaytarildi.`
    );
  } catch {}
};

export { notifyAdminNewOrder, notifyAdminFailure };

// ── Stars menyusiga qaytish ──────────────────────────────────
export const handleStarsBack = async (ctx) => {
  const text =
    `⭐ *Telegram Stars*\n\n` +
    `🪄 Siz qanchalik ko'p Stars olsangiz, shunchalik afzalliklarga ega bo'lasiz\\!\n\n` +
    `⚠️ *Cheklovlar*\n` +
    `▪️ Minimal: 50 ta\n` +
    `▪️ Maksimal: 2222 ta\n\n` +
    `🎯 Kerakli miqdorni tanlang yoki raqam bilan yuboring 👇`;

  await ctx.editMessageText(text, {
    parse_mode: "MarkdownV2",
    reply_markup: starsShopMenu,
  });
  await ctx.answerCbQuery();
};