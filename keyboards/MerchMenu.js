import { Markup } from "telegraf";
import { successBtn, primaryBtn } from "./styledButton.js";

export const merchMenu = Markup.keyboard([
  [successBtn("👕 MERCH"), successBtn("🎮 PUBG UC")],
  [primaryBtn("⭐ Stars"), primaryBtn("👑 Premium")],
  [primaryBtn("⬅️ Orqaga")],
]).resize();

export const sendShopMenu = async (ctx, text = "🛍 Do'kon bo'limiga xush kelibsiz!") => {
  await ctx.reply(text, merchMenu);
};
