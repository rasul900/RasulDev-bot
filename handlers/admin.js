export const adminPanelHandler = async (ctx) => {

  const adminId = Number(process.env.ADMIN_ID);

  if (ctx.from.id !== adminId) {
    return ctx.reply("⛔ Siz admin emassiz");
  }

  await ctx.reply(
    "⚙️ Admin Panel",
    adminMenu
  );
};