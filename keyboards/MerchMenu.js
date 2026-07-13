import { Markup } from "telegraf";
import { successBtn, primaryBtn } from "./styledButton.js";

export const merchMenu = Markup.keyboard([
  [successBtn("👕 MERCH"), successBtn("🎮 PUBG UC")],
  [primaryBtn("⭐ Stars"), primaryBtn("👑 Premium")],
  [primaryBtn("⬅️ Orqaga")],
]).resize();

export const sendShopMenu = async (ctx, text) => {
  await ctx.reply(
    text ||
      `🛍 *Do'kon*\n\n` +
      `⭐ Stars · 👑 Premium · 🎮 PUBG UC · 👕 MERCH\n\n` +
      `Xarid uchun avval balansni to'ldiring (SMS avto to'lov).`,
    { parse_mode: "Markdown", ...merchMenu }
  );
};
