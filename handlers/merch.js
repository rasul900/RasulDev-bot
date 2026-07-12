import Merch from "../models/Merch.js";
import { Markup } from "telegraf";
import { successCb, primaryCb } from "../keyboards/styledButton.js";

const buildCatalog = (products) => {
  if (!products.length) {
    return {
      text:
        `👕 *MERCH bo'limi*\n\n` +
        `Hozircha mahsulot yo'q.\n` +
        `Tez orada yangi mahsulotlar qo'shiladi! 🛍`,
      keyboard: null,
    };
  }

  return {
    text:
      `👕 *MERCH bo'limi*\n\n` +
      `📦 Jami *${products.length}* ta mahsulot mavjud.\n` +
      `Kerakli mahsulotni tanlang 👇`,
    keyboard: Markup.inlineKeyboard([
      ...products.map((p) => [
        successCb(`${p.name} — ${p.price.toLocaleString()} so'm`, `merch_${p._id}`),
      ]),
      [primaryCb("⬅️ Orqaga", "back_shop")],
    ]),
  };
};

export const merchShopHandler = async (ctx) => {
  const products = await Merch.find().sort({ createdAt: -1 });
  const { text, keyboard } = buildCatalog(products);

  if (!keyboard) {
    return ctx.reply(text, { parse_mode: "Markdown" });
  }

  await ctx.reply(text, { parse_mode: "Markdown", ...keyboard });
};

export const handleMerchProduct = async (ctx) => {
  const id = ctx.callbackQuery.data.replace("merch_", "");
  const product = await Merch.findById(id);

  if (!product) {
    return ctx.answerCbQuery("❌ Mahsulot topilmadi", { show_alert: true });
  }

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  await ctx.replyWithPhoto(product.photo, {
    caption:
      `👕 *${product.name}*\n\n` +
      `${product.description}\n\n` +
      `💰 Narx: *${product.price.toLocaleString()} so'm*`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [primaryCb("⬅️ Katalogga qaytish", "merch_catalog")],
        [primaryCb("🛍 Do'konga qaytish", "back_shop")],
      ],
    },
  });
};

export const handleMerchCatalog = async (ctx) => {
  const products = await Merch.find().sort({ createdAt: -1 });
  const { text, keyboard } = buildCatalog(products);

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  if (!keyboard) {
    return ctx.reply(text, { parse_mode: "Markdown" });
  }

  await ctx.reply(text, { parse_mode: "Markdown", ...keyboard });
};
