/** Vaqtincha o'chirilgan do'kon bo'limlari (true = tamirlanmoqda) */
export const SHOP_MAINTENANCE = {
  stars: false,
  premium: false,
  uc: false,
};

export const maintenanceMessage = (sectionName) =>
  `🔧 *${sectionName}*\n\n` +
  `⚠️ Ushbu bo'lim hozircha *tamirlanmoqda*.\n` +
  `Tez orada qayta ochiladi. Iltimos, biroz kuting.`;

export const wrapMaintenance = (sectionKey, sectionName, handler) => async (ctx) => {
  if (SHOP_MAINTENANCE[sectionKey]) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    await ctx.reply(maintenanceMessage(sectionName), { parse_mode: "Markdown" });
    return;
  }
  return handler(ctx);
};
