import { Markup } from "telegraf";
import Channel from "../models/Channel.js";
import { isAdmin } from "../config/admin.js";

export const normalizeChannelUsername = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const linkMatch = trimmed.match(
    /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{4,})\/?/i
  );
  if (linkMatch) return `@${linkMatch[1]}`;

  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (/^[a-zA-Z0-9_]{4,}$/.test(withoutAt)) return `@${withoutAt}`;

  return null;
};

export const getSubscriptionStatus = async (telegram, userId) => {
  const channels = await Channel.find();
  if (!channels.length) return { ok: true, missing: [] };

  const missing = [];

  for (const channel of channels) {
    try {
      const member = await telegram.getChatMember(channel.username, userId);
      if (["left", "kicked", "banned"].includes(member.status)) {
        missing.push(channel);
      }
    } catch (err) {
      console.error(`Kanal tekshiruvi xatosi (${channel.username}):`, err.message);
      missing.push(channel);
    }
  }

  return { ok: missing.length === 0, missing };
};

export const buildSubscriptionKeyboard = (channels) => {
  const buttons = channels.map((ch) => {
    const username = ch.username.replace("@", "");
    const label = ch.title ? `📢 ${ch.title}` : `📢 ${ch.username}`;
    return [Markup.button.url(`${label}ga obuna bo'lish`, `https://t.me/${username}`)];
  });
  buttons.push([Markup.button.callback("✅ Obunani tekshirish", "check_sub")]);
  return Markup.inlineKeyboard(buttons);
};

export const validateChannelForBot = async (telegram, botId, username) => {
  const chat = await telegram.getChat(username);
  const botMember = await telegram.getChatMember(chat.id, botId);

  if (!["administrator", "creator"].includes(botMember.status)) {
    throw new Error(
      "Bot ushbu kanalda admin emas. Avval botni kanalga admin qilib qo'shing."
    );
  }

  return {
    username,
    title: chat.title || username,
    chatId: String(chat.id),
  };
};

export const checkSubscription = async (ctx, next) => {
  if (ctx.chat?.type !== "private") return next();
  if (isAdmin(ctx.from.id)) return next();
  if (ctx.callbackQuery?.data === "check_sub") return next();

  const { ok, missing } = await getSubscriptionStatus(ctx.telegram, ctx.from.id);
  if (ok) {
    if (ctx.session?.subWarningSent) ctx.session.subWarningSent = false;
    return next();
  }

  ctx.session ??= {};
  if (!ctx.session.subWarningSent) {
    ctx.session.subWarningSent = true;
    await ctx.reply(
      `🔒 *Majburiy obuna*\n\n` +
      `Botdan foydalanish uchun quyidagi kanal(lar)ga obuna bo'ling.\n` +
      `Obuna bo'lmaguncha bot ishlamaydi!`,
      { parse_mode: "Markdown", ...buildSubscriptionKeyboard(missing) }
    );
  }
};

export const recheckSubscription = async (ctx) => {
  const { ok, missing } = await getSubscriptionStatus(ctx.telegram, ctx.from.id);

  if (!ok) {
    await ctx.answerCbQuery("❌ Hali ham barcha kanallarga obuna emassiz!", {
      show_alert: true,
    });

    try {
      await ctx.editMessageReplyMarkup(buildSubscriptionKeyboard(missing).reply_markup);
    } catch {
      /* xabar o'zgarmasa ham davom etadi */
    }
    return;
  }

  ctx.session ??= {};
  ctx.session.subWarningSent = false;

  await ctx.answerCbQuery("✅ Obuna tasdiqlandi!");
  await ctx.deleteMessage().catch(() => {});
  await ctx.reply(
    `✅ Rahmat! Endi botdan to'liq foydalanishingiz mumkin.\n\n` +
    `📌 /start buyrug'ini yuboring.`
  );
};
