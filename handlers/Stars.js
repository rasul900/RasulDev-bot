import { starsShopMenu, forWhomMenu } from "../keyboards/StarsMenu.js";

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

  // ⬇️ Bu yerda to'lov API siga so'rov yuborasiz
  // await processPayment(ctx.from.id, stars, price, targetUser);

  await ctx.editMessageText(
    `✅ *Buyurtmangiz qabul qilindi!*\n\n` +
    `⭐ ${stars} ta Stars ${targetUser ? `*${targetUser}*` : "sizning"} hisobingizga tez orada qo'shiladi.`,
    { parse_mode: "Markdown" }
  );

  ctx.session = {};
  await ctx.answerCbQuery("✅ Tasdiqlandi");
};

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