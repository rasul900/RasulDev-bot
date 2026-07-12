import { Markup } from "telegraf";

const UC_PACKAGES = {
  uc_60:   { label: "60 UC",   price: "13,000 so'm",  emoji: "💎" },
  uc_325:  { label: "325 UC",  price: "60,000 so'm",  emoji: "💎" },
  uc_660:  { label: "660 UC",  price: "115,000 so'm", emoji: "💎" },
  uc_1800: { label: "1800 UC", price: "290,000 so'm", emoji: "💎" },
  uc_3850: { label: "3850 UC", price: "580,000 so'm", emoji: "👑" },
  uc_8100: { label: "8100 UC", price: "1,150,000 so'm", emoji: "👑" },
};

const ucMenu = {
  inline_keyboard: [
    [
      { text: "🔴 60 UC — 13,000 so'm",   callback_data: "uc_60" },
      { text: "🟠 325 UC — 60,000 so'm",  callback_data: "uc_325" },
    ],
    [
      { text: "🟡 660 UC — 115,000 so'm",  callback_data: "uc_660" },
      { text: "🟢 1800 UC — 290,000 so'm", callback_data: "uc_1800" },
    ],
    [
      { text: "🔵 3850 UC — 580,000 so'm",   callback_data: "uc_3850" },
      { text: "🟣 8100 UC — 1,150,000 so'm", callback_data: "uc_8100" },
    ],
    [
      { text: "⬅️ Orqaga", callback_data: "back_shop" },
    ],
  ],
};

// ── Bosh sahifa ──────────────────────────────────────────────
export const ucHandler = async (ctx) => {
  await ctx.reply(
    `🎮 *PUBG MOBILE UC*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ Tezkor yetkazib berish\n` +
    `🔒 100% xavfsiz to'lov\n` +
    `🕐 Ishlash vaqti: 24/7\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👇 Kerakli paketni tanlang:`,
    {
      parse_mode: "Markdown",
      reply_markup: ucMenu,
    }
  );
};

// ── Paket tanlanganda PUBG ID so'rash ────────────────────────
export const handleUcPackage = async (ctx) => {
  const pkg = UC_PACKAGES[ctx.callbackQuery.data];
  if (!pkg) return ctx.answerCbQuery();

  ctx.session ??= {};
  ctx.session.selectedUcPackage = ctx.callbackQuery.data;
  ctx.session.awaitingPubgId    = true;

  await ctx.editMessageText(
    `${pkg.emoji} *${pkg.label}* — ${pkg.price}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 *PUBG Mobile ID ingizni kiriting:*\n\n` +
    `_ID ni qayerdan topish mumkin?_\n` +
    `PUBG Mobile → Profil → ID raqam\n` +
    `_(Masalan: 5123456789)_\n` +
    `━━━━━━━━━━━━━━━━━━━━`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Bekor qilish", callback_data: "uc_cancel" }],
        ],
      },
    }
  );
  await ctx.answerCbQuery();
};

// ── PUBG ID kiritilganda tasdiqlash ─────────────────────────
export const handlePubgIdInput = async (ctx) => {
  if (!ctx.session?.awaitingPubgId) return;

  const pubgId = ctx.message.text.trim();

  // Faqat raqam bo'lishi kerak
  if (!/^\d{6,12}$/.test(pubgId)) {
    return ctx.reply(
      `⚠️ *Noto'g'ri ID format!*\n\n` +
      `PUBG ID faqat raqamlardan iborat bo'lib,\n6-12 ta raqam bo'lishi kerak.\n\n` +
      `Qaytadan kiriting:`,
      { parse_mode: "Markdown" }
    );
  }

  const pkgKey = ctx.session.selectedUcPackage;
  const pkg    = UC_PACKAGES[pkgKey];

  ctx.session.pubgId         = pubgId;
  ctx.session.awaitingPubgId = false;

  await ctx.reply(
    `✅ *Buyurtma tafsiloti*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎮 O'yin: PUBG Mobile\n` +
    `${pkg.emoji} Paket: *${pkg.label}*\n` +
    `💰 Narx: *${pkg.price}*\n` +
    `🆔 PUBG ID: \`${pubgId}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Ma'lumotlar to'g'rimi?`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash",   callback_data: "uc_confirm" },
            { text: "✏️ ID ni o'zgartirish", callback_data: pkgKey },
          ],
          [{ text: "❌ Bekor qilish", callback_data: "uc_cancel" }],
        ],
      },
    }
  );
};

// ── Tasdiqlash ───────────────────────────────────────────────
export const handleUcConfirm = async (ctx) => {
  const { selectedUcPackage: pkgKey, pubgId } = ctx.session ?? {};
  const pkg = UC_PACKAGES[pkgKey];

  // ⬇️ Bu yerda to'lov API ga so'rov yuborasiz
  // await sendUcToPlayer(pubgId, pkg.label);

  await ctx.editMessageText(
    `🎉 *Buyurtma muvaffaqiyatli qabul qilindi!*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `${pkg.emoji} *${pkg.label}* tez orada\n` +
    `🆔 \`${pubgId}\` hisobiga tushiriladi!\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⏳ Odatda 1-5 daqiqa ichida yetkaziladi.\n` +
    `📞 Muammo bo'lsa: @support_username`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍 Do'konga qaytish", callback_data: "back_shop" }],
        ],
      },
    }
  );

  ctx.session = {};
  await ctx.answerCbQuery("✅ Buyurtma qabul qilindi!");
};

// ── Bekor qilish ─────────────────────────────────────────────
export const handleUcCancel = async (ctx) => {
  ctx.session = {};

  await ctx.editMessageText(
    `❌ *Buyurtma bekor qilindi.*\n\nBoshqa paket tanlashingiz mumkin:`,
    {
      parse_mode: "Markdown",
      reply_markup: ucMenu,
    }
  );
  await ctx.answerCbQuery("Bekor qilindi");
};