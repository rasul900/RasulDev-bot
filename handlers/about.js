import { mainMenu } from "../keyboards/mainMenu.js";
import { Markup } from "telegraf";

export const aboutHandler = async (ctx) => {
  const channelButtons = Markup.inlineKeyboard([
    [Markup.button.url("📣 Asosiy kanal", "https://t.me/rasul_devlop")],
    [Markup.button.url("📣 UzDevTeam", "https://t.me/UzDevTeam_Coders")],
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