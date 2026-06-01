import User from "../models/User.js";
import { startKeyboard } from "../keyboards/main.js";
import { mainMenu } from "../keyboards/mainMenu.js";

export const profileHandler = async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      await ctx.reply("❌ Siz ro'yxatdan o'tmagansiz!", startKeyboard);
      return;
    }

    const date = new Date(user.createdAt).toLocaleDateString("uz-UZ");

    await ctx.reply(
      `👤 *Profilingiz*\n\n` +
      `🏷 Ism: *${user.firstName}*\n` +
      `📱 Username: @${user.username}\n` +
      `📞 Telefon: \`${user.phone}\`\n` +
      `🆔 Telegram ID: \`${user.telegramId}\`\n` +
      `📅 Ro'yxatdan o'tgan sana: *${date}*`,
      { parse_mode: "Markdown", ...mainMenu }
    );
  } catch (err) {
    console.error("❌ Profil xatosi:", err);
    await ctx.reply("⚠️ Xatolik yuz berdi.");
  }
};