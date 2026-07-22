/** Vaqtincha o'chirilgan do'kon bo'limlari (true = tahrirlanmoqda) */
export const SHOP_MAINTENANCE = {
  stars: true,
  premium: true,
  uc: true,
};

export const maintenanceMessage = (sectionName) =>
  `🔧 *${sectionName}*\n\n` +
  `✏️ Ushbu bo'lim hozir *tahrirlanmoqda*.\n` +
  `Tez orada yangilanib qayta ochiladi. Iltimos, biroz kuting.`;

export const wrapMaintenance = (sectionKey, sectionName, handler) => async (ctx) => {
  if (SHOP_MAINTENANCE[sectionKey]) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    await ctx.reply(maintenanceMessage(sectionName), { parse_mode: "Markdown" });
    return;
  }
  return handler(ctx);
};
