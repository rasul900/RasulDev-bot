import { Markup } from "telegraf";
import { successBtn, primaryBtn } from "./styledButton.js";

export const merchMenu = Markup.keyboard([
  [successBtn("📱 SMM Xizmatlar"), successBtn("👕 MERCH")],
  [primaryBtn("💳 To'lov usullari")],
  [primaryBtn("⬅️ Orqaga")],
]).resize();

export const sendShopMenu = async (ctx, text) => {
  await ctx.reply(
    text ||
      `🛍 *Do'kon*\n\n` +
      `📱 SMM xizmatlar · 👕 MERCH\n` +
      `API orqali xizmatlar mavjud.\n\n` +
      `Xarid uchun balansni to'ldiring.`,
    { parse_mode: "Markdown", ...merchMenu }
  );
};
