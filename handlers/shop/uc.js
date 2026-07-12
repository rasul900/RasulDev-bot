import { successCb, primaryCb, dangerCb } from "../../keyboards/styledButton.js";

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
      successCb("💎 60 UC — 13,000 so'm", "uc_60"),
      successCb("💎 325 UC — 60,000 so'm", "uc_325"),
    ],
    [
      successCb("💎 660 UC — 115,000 so'm", "uc_660"),
      successCb("💎 1800 UC — 290,000 so'm", "uc_1800"),
    ],
    [
      successCb("👑 3850 UC — 580,000 so'm", "uc_3850"),
      successCb("👑 8100 UC — 1,150,000 so'm", "uc_8100"),
    ],
    [
      primaryCb("⬅️ Orqaga", "back_shop"),
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
          [dangerCb("❌ Bekor qilish", "uc_cancel")],
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
            successCb("✅ Tasdiqlash", "uc_confirm"),
            primaryCb("✏️ ID ni o'zgartirish", pkgKey),
          ],
          [dangerCb("❌ Bekor qilish", "uc_cancel")],
        ],
      },
    }
  );
};

// ── Tasdiqlash ───────────────────────────────────────────────
export const handleUcConfirm = async (ctx) => {
  const { selectedUcPackage: pkgKey, pubgId } = ctx.session ?? {};
  const pkg = UC_PACKAGES[pkgKey];

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
          [primaryCb("🛍 Do'konga qaytish", "back_shop")],
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
