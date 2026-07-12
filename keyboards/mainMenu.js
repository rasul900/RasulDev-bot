import { Markup } from "telegraf";
import { successBtn, primaryBtn, successCb, primaryCb } from "./styledButton.js";

/** Inline menyu — ranglar ko'proq barqaror ko'rinadi (Telegram 9.4+) */
export const mainInlineMenu = Markup.inlineKeyboard([
  [successCb("🛍 Do'kon", "nav_shop"), successCb("👤 Profilim", "nav_profile")],
  [primaryCb("🤝 Hamkorlik", "nav_partner"), primaryCb("ℹ️ Bot haqida", "nav_about")],
  [primaryCb("💰 Balans", "nav_balance")],
]);

/** Reply keyboard (eski klientlar / fallback) */
export const mainMenu = Markup.keyboard([
  [successBtn("🛍 Do'kon"), successBtn("👤 Profilim")],
  [primaryBtn("🤝 Hamkorlik"), primaryBtn("ℹ️ Bot haqida")],
  [primaryBtn("💰 Balans")],
]).resize();

export const clearReplyKeyboard = Markup.removeKeyboard();

export const sendMainMenu = async (ctx, text, extra = {}) => {
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...mainInlineMenu,
    ...extra,
  });
};

export const refreshKeyboard = async (ctx) => {
  try {
    await ctx.reply("⌨️", clearReplyKeyboard);
  } catch {}
};
