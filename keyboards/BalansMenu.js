import { Markup } from "telegraf";
import { successCb, primaryCb } from "./styledButton.js";

export const balanceInlineMenu = Markup.inlineKeyboard([
  [successCb("💸 Pul Ishlash", "nav_ref"), successCb("💰 Balansni to'ldirish", "nav_topup")],
  [primaryCb("⬅️ Orqaga", "nav_main")],
]);

export const sendBalanceMenu = async (ctx, text, extra = {}) => {
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...balanceInlineMenu,
    ...extra,
  });
};
