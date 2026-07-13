import User from "../../models/User.js";
import Order from "../../models/Order.js";
import {
  isSmmConfigured,
  getCategories,
  getServicesByCategory,
  getServiceById,
  calcPrice,
  createOrder,
} from "../../services/smmApi.js";
import { successCb, primaryCb, dangerCb } from "../../keyboards/styledButton.js";

const CATS_PER_PAGE = 8;
const SVCS_PER_PAGE = 6;

const truncate = (text, max = 40) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export const smmShopHandler = async (ctx) => {
  if (!isSmmConfigured()) {
    await ctx.reply("⚠️ SMM API sozlanmagan. Admin bilan bog'laning.");
    return;
  }

  try {
    await showCategoryPage(ctx, 0);
  } catch (err) {
    console.error("SMM shop xatosi:", err.message);
    await ctx.reply(`❌ Xizmatlar yuklanmadi: ${err.message}`);
  }
};

const showCategoryPage = async (ctx, page) => {
  const categories = await getCategories();
  const totalPages = Math.ceil(categories.length / CATS_PER_PAGE) || 1;
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = categories.slice(
    safePage * CATS_PER_PAGE,
    safePage * CATS_PER_PAGE + CATS_PER_PAGE
  );

  const buttons = slice.map((cat, i) => [
    successCb(truncate(cat, 35), `smm_cat_${safePage * CATS_PER_PAGE + i}`),
  ]);

  const nav = [];
  if (safePage > 0) nav.push(primaryCb("⬅️", `smm_cats_${safePage - 1}`));
  if (safePage < totalPages - 1) nav.push(primaryCb("➡️", `smm_cats_${safePage + 1}`));
  if (nav.length) buttons.push(nav);
  buttons.push([primaryCb("⬅️ Do'konga qaytish", "back_shop")]);

  const text =
    `📱 *SMM Xizmatlar*\n\n` +
    `Telegram, Instagram va boshqa platformalar.\n` +
    `Jami: *${categories.length}* kategoriya\n\n` +
    `👇 Kategoriyani tanlang:`;

  const opts = { parse_mode: "Markdown", reply_markup: { inline_keyboard: buttons } };

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, opts);
    await ctx.answerCbQuery();
  } else {
    await ctx.reply(text, opts);
  }
};

export const handleSmmCategoryPage = async (ctx) => {
  const page = parseInt(ctx.callbackQuery.data.replace("smm_cats_", ""), 10);
  await showCategoryPage(ctx, page);
};

export const handleSmmCategorySelect = async (ctx) => {
  const catIndex = parseInt(ctx.callbackQuery.data.replace("smm_cat_", ""), 10);
  const categories = await getCategories();
  const category = categories[catIndex];

  if (!category) {
    return ctx.answerCbQuery("Kategoriya topilmadi", { show_alert: true });
  }

  ctx.session ??= {};
  ctx.session.smmCategory = category;
  await showServicePage(ctx, category, 0);
};

const showServicePage = async (ctx, category, page) => {
  const services = await getServicesByCategory(category);
  const totalPages = Math.ceil(services.length / SVCS_PER_PAGE) || 1;
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = services.slice(
    safePage * SVCS_PER_PAGE,
    safePage * SVCS_PER_PAGE + SVCS_PER_PAGE
  );

  const buttons = slice.map((s) => {
    const price1000 = calcPrice(s, 1000);
    return [
      successCb(
        `${truncate(s.name, 28)} — ${price1000.toLocaleString()}/1k`,
        `smm_svc_${s.service}`
      ),
    ];
  });

  const nav = [];
  if (safePage > 0) nav.push(primaryCb("⬅️", `smm_svcs_${safePage - 1}`));
  if (safePage < totalPages - 1) nav.push(primaryCb("➡️", `smm_svcs_${safePage + 1}`));
  if (nav.length) buttons.push(nav);
  buttons.push([primaryCb("⬅️ Kategoriyalar", "smm_back_cats")]);

  await ctx.editMessageText(
    `📂 *${category}*\n\n` +
    `${services.length} ta xizmat. Narx — 1000 ta uchun.\n\n` +
    `👇 Xizmatni tanlang:`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons },
    }
  );
  await ctx.answerCbQuery();
};

export const handleSmmServicePage = async (ctx) => {
  const page = parseInt(ctx.callbackQuery.data.replace("smm_svcs_", ""), 10);
  const category = ctx.session?.smmCategory;
  if (!category) return ctx.answerCbQuery("Kategoriya topilmadi", { show_alert: true });
  await showServicePage(ctx, category, page);
};

export const handleSmmServiceSelect = async (ctx) => {
  const serviceId = ctx.callbackQuery.data.replace("smm_svc_", "");
  const service = await getServiceById(serviceId);

  if (!service) {
    return ctx.answerCbQuery("Xizmat topilmadi", { show_alert: true });
  }

  ctx.session ??= {};
  ctx.session.smmServiceId = service.service;
  ctx.session.awaitingSmmLink = true;
  ctx.session.awaitingSmmQty = false;

  await ctx.editMessageText(
    `📦 *${service.name}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📂 Kategoriya: ${service.category}\n` +
    `💰 Narx (1000 ta): *${calcPrice(service, 1000).toLocaleString()} so'm*\n` +
    `📌 Min: *${service.min}* · Max: *${service.max}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔗 *Havolani yuboring:*\n` +
    `_(masalan: https://t.me/kanal yoki @username)_`,
    { parse_mode: "Markdown" }
  );
  await ctx.answerCbQuery();
};

export const handleSmmLinkInput = async (ctx) => {
  if (!ctx.session?.awaitingSmmLink) return false;

  const link = ctx.message.text.trim();
  if (link.length < 3) {
    await ctx.reply("⚠️ To'g'ri havola yuboring.");
    return true;
  }

  ctx.session.smmLink = link;
  ctx.session.awaitingSmmLink = false;
  ctx.session.awaitingSmmQty = true;

  const service = await getServiceById(ctx.session.smmServiceId);
  await ctx.reply(
    `✅ Havola qabul qilindi.\n\n` +
    `📊 *Miqdorni kiriting:*\n` +
    `Min: *${service.min}* · Max: *${service.max}*`,
    { parse_mode: "Markdown" }
  );
  return true;
};

export const handleSmmQtyInput = async (ctx) => {
  if (!ctx.session?.awaitingSmmQty) return false;

  const qty = parseInt(ctx.message.text.trim().replace(/\s/g, ""), 10);
  const service = await getServiceById(ctx.session.smmServiceId);

  if (!service || isNaN(qty) || qty < service.min || qty > service.max) {
    await ctx.reply(
      `⚠️ Miqdor ${service?.min || "?"} dan ${service?.max || "?"} gacha bo'lishi kerak.`
    );
    return true;
  }

  const price = calcPrice(service, qty);
  ctx.session.smmQty = qty;
  ctx.session.smmPrice = price;
  ctx.session.awaitingSmmQty = false;

  await ctx.reply(
    `🧾 *Buyurtma tasdiqlash*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 ${service.name}\n` +
    `🔗 ${ctx.session.smmLink}\n` +
    `📊 Miqdor: *${qty.toLocaleString()}*\n` +
    `💰 Narx: *${price.toLocaleString()} so'm*\n` +
    `━━━━━━━━━━━━━━━━━━━━`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [successCb("✅ Tasdiqlash", "smm_confirm")],
          [dangerCb("❌ Bekor qilish", "smm_cancel")],
        ],
      },
    }
  );
  return true;
};

export const handleSmmConfirm = async (ctx) => {
  const { smmServiceId, smmLink, smmQty, smmPrice } = ctx.session ?? {};

  if (!smmServiceId || !smmLink || !smmQty) {
    return ctx.answerCbQuery("Buyurtma topilmadi", { show_alert: true });
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    return ctx.answerCbQuery("Avval ro'yxatdan o'ting", { show_alert: true });
  }

  if ((user.balance || 0) < smmPrice) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `❌ *Balans yetarli emas!*\n\n` +
      `Kerak: *${smmPrice.toLocaleString()} so'm*\n` +
      `Sizda: *${(user.balance || 0).toLocaleString()} so'm*`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[successCb("💰 Balansni to'ldirish", "nav_topup")]],
        },
      }
    );
    ctx.session = {};
    return;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText("⏳ Buyurtma yuborilmoqda...");

  try {
    const apiResult = await createOrder({
      serviceId: smmServiceId,
      link: smmLink,
      quantity: smmQty,
    });

    const externalOrderId = apiResult?.order || apiResult?.order_id;

    user.balance -= smmPrice;
    await user.save();

    await Order.create({
      telegramId: ctx.from.id,
      username: ctx.from.username || null,
      type: "smm",
      quantity: smmQty,
      amount: smmPrice,
      status: "processing",
      note: `smm:${externalOrderId}; link:${smmLink}; svc:${smmServiceId}`,
    });

    await ctx.editMessageText(
      `✅ *Buyurtma qabul qilindi!*\n\n` +
      `🔖 API buyurtma: \`${externalOrderId || "—"}\`\n` +
      `📊 Miqdor: *${smmQty.toLocaleString()}*\n` +
      `💰 ${smmPrice.toLocaleString()} so'm yechildi\n\n` +
      `⏳ Xizmat tez orada bajariladi.`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("SMM buyurtma xatosi:", err.message);
    await ctx.editMessageText(
      `❌ Buyurtma yuborilmadi: ${err.message}\n\nKeyinroq urinib ko'ring.`,
      { parse_mode: "Markdown" }
    );
  }

  ctx.session = {};
};

export const handleSmmCancel = async (ctx) => {
  ctx.session = {};
  await ctx.editMessageText("❌ Buyurtma bekor qilindi.");
  await ctx.answerCbQuery();
};

export const handleSmmBackCategories = async (ctx) => {
  await ctx.answerCbQuery();
  await showCategoryPage(ctx, 0);
};
