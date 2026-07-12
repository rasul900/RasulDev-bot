import { Input } from "telegraf";
import Merch from "../models/Merch.js";
import { Markup } from "telegraf";
import { successCb, primaryCb, successUrl } from "../keyboards/styledButton.js";
import { isLocalPhoto, resolveUploadPath, fileExists } from "../services/fileStorage.js";

const ADMIN_USERNAME = "Rasul_dev_admin";

const buildOrderUrl = async (ctx, product) => {
  const botInfo = await ctx.telegram.getMe();
  const productLink = `https://t.me/${botInfo.username}?start=merch_${product._id}`;
  const text =
    `Assalomu alaykum, men shu mahsulotni sotib olmoqchiman.\n\n` +
    `Mahsulot: ${product.name}\n` +
    `Mahsulot ID: ${product._id}\n\n` +
    `Mahsulotni ko'rish: ${productLink}`;
  return `https://t.me/${ADMIN_USERNAME}?text=${encodeURIComponent(text)}`;
};

const productKeyboard = async (ctx, product) => {
  const orderUrl = await buildOrderUrl(ctx, product);
  return {
    inline_keyboard: [
      [successUrl("🛒 Buyurtma berish", orderUrl)],
      [primaryCb("⬅️ Katalogga qaytish", "merch_catalog")],
      [primaryCb("🛍 Do'konga qaytish", "back_shop")],
    ],
  };
};

const sendProductPhoto = async (ctx, product) => {
  const caption =
    `👕 *${product.name}*\n\n` +
    `${product.description}\n\n` +
    `💰 Narx: *${product.price.toLocaleString()} so'm*\n` +
    `🆔 ID: \`${product._id}\``;

  const keyboard = await productKeyboard(ctx, product);
  const opts = { caption, parse_mode: "Markdown", reply_markup: keyboard };

  if (isLocalPhoto(product.photo) && (await fileExists(product.photo))) {
    return ctx.replyWithPhoto(Input.fromLocalFile(resolveUploadPath(product.photo)), opts);
  }

  if (product.photo) {
    return ctx.replyWithPhoto(product.photo, opts);
  }

  return ctx.reply(caption, opts);
};

export const replyWithMerchProduct = async (ctx, product) => {
  await sendProductPhoto(ctx, product);
};

export const handleMerchStart = async (ctx, productId) => {
  const product = await Merch.findById(productId);
  if (!product) {
    await ctx.reply("❌ Mahsulot topilmadi yoki o'chirilgan.");
    return true;
  }
  await replyWithMerchProduct(ctx, product);
  return true;
};

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
  await replyWithMerchProduct(ctx, product);
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
