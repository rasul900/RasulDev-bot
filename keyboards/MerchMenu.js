import { Markup } from "telegraf";
import { successBtn, primaryBtn, successCb, primaryCb } from "./styledButton.js";

export const shopInlineMenu = Markup.inlineKeyboard([
  [successCb("👕 MERCH", "nav_merch"), successCb("🎮 PUBG UC", "nav_uc")],
  [primaryCb("⭐ Stars", "nav_stars"), primaryCb("👑 Premium", "nav_premium")],
  [primaryCb("⬅️ Orqaga", "nav_main")],
]);

export const merchMenu = Markup.keyboard([
  [successBtn("👕 MERCH"), successBtn("🎮 PUBG UC")],
  [primaryBtn("⭐ Stars"), primaryBtn("👑 Premium")],
  [primaryBtn("⬅️ Orqaga")],
]).resize();

export const sendShopMenu = async (ctx, text = "🛍 Do'kon bo'limiga xush kelibsiz!") => {
  await ctx.reply(text, shopInlineMenu);
};
