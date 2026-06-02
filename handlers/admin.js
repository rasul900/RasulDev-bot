import { adminMenu } from "../keyboards/adminMenu.js";

const ADMIN_ID = 20111986;

export const adminPanelHandler = async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("⛔ Siz admin emassiz");
  }

  await ctx.reply(
    "⚙️ Admin Panel",
    adminMenu
  );

};