import { Markup } from "telegraf";
import Channel from "../models/Channel.js";

export const checkSubscription = async (ctx, next) => {
  if (ctx.chat?.type !== "private") return next();

  const channels = await Channel.find();
  if (!channels.length) return next();

  const notSubscribed = [];

  for (const channel of channels) {
    try {
      const member = await ctx.telegram.getChatMember(channel.username, ctx.from.id);
      if (["left", "kicked", "banned"].includes(member.status)) {
        notSubscribed.push(channel);
      }
    } catch (err) {
      console.error(`Kanal tekshiruvi xatosi (${channel.username}):`, err.message);
    }
  }

  if (!notSubscribed.length) return next();

  const buttons = notSubscribed.map((ch) => {
    const username = ch.username.replace("@", "");
    return [Markup.button.url(`📢 ${ch.username}ga obuna bo'lish`, `https://t.me/${username}`)];
  });
  buttons.push([Markup.button.callback("✅ Obunani tekshirish", "check_sub")]);

  await ctx.reply(
    `❌ Botdan foydalanish uchun quyidagi kanal(lar)ga obuna bo'ling:`,
    Markup.inlineKeyboard(buttons)
  );
};

export const recheckSubscription = async (ctx) => {
  const channels = await Channel.find();
  if (!channels.length) {
    await ctx.answerCbQuery("✅ Obuna talab qilinmaydi");
    return;
  }

  for (const channel of channels) {
    try {
      const member = await ctx.telegram.getChatMember(channel.username, ctx.from.id);
      if (["left", "kicked", "banned"].includes(member.status)) {
        await ctx.answerCbQuery("❌ Hali ham obuna emassiz!", { show_alert: true });
        return;
      }
    } catch {
      await ctx.answerCbQuery("⚠️ Kanal tekshirilmadi", { show_alert: true });
      return;
    }
  }

  await ctx.answerCbQuery("✅ Obuna tasdiqlandi!");
  await ctx.deleteMessage().catch(() => {});
  await ctx.reply("✅ Rahmat! Endi botdan foydalanishingiz mumkin.");
};
