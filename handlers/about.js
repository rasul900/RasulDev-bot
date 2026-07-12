import { Markup } from "telegraf";
import { primaryUrl } from "../keyboards/styledButton.js";

export const aboutHandler = async (ctx) => {
  const channelButtons = Markup.inlineKeyboard([
    [primaryUrl("📣 Asosiy kanal", "https://t.me/rasul_devlop")],
    [primaryUrl("📣 UzDevTeam", "https://t.me/UzDevTeam_Coders")],
  ]);

  await ctx.reply(
    `🤖 Bot haqida\n\n` +
    `👨‍💻 Dasturchi: @khhrl\n` +
    `👑 Admin: @Rasul_dev_admin\n\n` +
    `⚡ Bot imkoniyatlari:\n` +
    `┣ 💲Hamkorlik\n` +
    `┣ 🔁Web dasturlash darsliklar kanaliga zayafka\n` +
    `┗ 🔔 Bildirishnomalar\n\n` +
    `📢 Bizning kanallar:`,
    channelButtons
  );
};
