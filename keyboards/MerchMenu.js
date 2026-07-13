import { Markup } from "telegraf";
import { successBtn, primaryBtn } from "./styledButton.js";

export const merchMenu = Markup.keyboard([
  [successBtn("📱 SMM Xizmatlar"), successBtn("👕 MERCH")],
  [successBtn("🎮 PUBG UC"), primaryBtn("⭐ Stars")],
  [primaryBtn("👑 Premium"), primaryBtn("💳 To'lov usullari")],
  [primaryBtn("⬅️ Orqaga")],
]).resize();

export const sendShopMenu = async (ctx, text) => {
  await ctx.reply(
    text ||
      `🛍 *Do'kon*\n\n` +
      `📱 SMM · 👕 MERCH · 🎮 UC · ⭐ Stars · 👑 Premium\n` +
      `API orqali 166+ xizmat mavjud.\n\n` +
      `Xarid uchun balansni to'ldiring (SMS avto to'lov).`,
    { parse_mode: "Markdown", ...merchMenu }
  );
};
