import { Markup } from "telegraf";
import Channel from "../models/Channel.js";
import Setting from "../models/Setting.js";
import { isAdmin } from "../config/admin.js";
import { primaryUrl, successCb } from "../keyboards/styledButton.js";

const esc = (text = "") =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const getForceSubEnabled = async () => {
  const setting = await Setting.findOne().lean();
  return setting?.forceSubEnabled !== false;
};

export const setForceSubEnabled = async (enabled) => {
  let setting = await Setting.findOne();
  if (!setting) setting = new Setting();
  setting.forceSubEnabled = enabled;
  setting.updatedAt = new Date();
  await setting.save();
  return setting.forceSubEnabled;
};

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

const channelRef = (channel) => channel.chatId || channel.username;

export const getSubscriptionStatus = async (telegram, userId) => {
  const channels = await Channel.find();
  if (!channels.length) return { ok: true, missing: [] };

  const missing = [];

  for (const channel of channels) {
    try {
      const member = await telegram.getChatMember(channelRef(channel), userId);
      if (["left", "kicked", "banned"].includes(member.status)) {
        missing.push(channel);
      }
    } catch (err) {
      console.error(
        `Kanal tekshiruvi xatosi (${channel.username}):`,
        err.message
      );
      missing.push(channel);
    }
  }

  return { ok: missing.length === 0, missing };
};

export const buildSubscriptionKeyboard = (channels) => {
  const buttons = channels.map((ch) => {
    const username = String(ch.username || "").replace("@", "");
    const label = ch.title ? `📢 ${ch.title}` : `📢 ${ch.username}`;
    return [primaryUrl(`${label}ga obuna bo'lish`, `https://t.me/${username}`)];
  });
  buttons.push([successCb("✅ Obunani tekshirish", "check_sub")]);
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

const sendForceSubPrompt = async (ctx, missing) => {
  await ctx.reply(
    `🔒 <b>Majburiy obuna</b>\n\n` +
      `Botdan foydalanish uchun quyidagi kanal(lar)ga obuna bo'ling.\n` +
      `Obuna bo'lmaguncha bot ishlamaydi!`,
    {
      parse_mode: "HTML",
      ...buildSubscriptionKeyboard(missing),
    }
  );
};

export const checkSubscription = async (ctx, next) => {
  if (ctx.chat?.type !== "private") return next();
  if (isAdmin(ctx.from.id)) return next();
  if (ctx.callbackQuery?.data === "check_sub") return next();

  try {
    if (!(await getForceSubEnabled())) return next();

    const { ok, missing } = await getSubscriptionStatus(
      ctx.telegram,
      ctx.from.id
    );
    if (ok) {
      if (ctx.session?.subWarningSent) ctx.session.subWarningSent = false;
      return next();
    }

    ctx.session ??= {};

    // Har safar eslatamiz — jim qolib ketmasin
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
      await sendForceSubPrompt(ctx, missing);
      ctx.session.subWarningSent = true;
    } catch (err) {
      console.error("Majburiy obuna xabari yuborilmadi:", err.message);
      ctx.session.subWarningSent = false;
    }
  } catch (err) {
    console.error("checkSubscription xatosi:", err.message);
    return next();
  }
};

export const recheckSubscription = async (ctx) => {
  try {
    if (!(await getForceSubEnabled())) {
      ctx.session ??= {};
      ctx.session.subWarningSent = false;
      await ctx.answerCbQuery("✅ Majburiy obuna o'chirilgan");
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply(
        "✅ Endi botdan foydalanishingiz mumkin.\n\n📌 /start buyrug'ini yuboring."
      );
      return;
    }

    const { ok, missing } = await getSubscriptionStatus(
      ctx.telegram,
      ctx.from.id
    );

    if (!ok) {
      await ctx.answerCbQuery("❌ Hali ham barcha kanallarga obuna emassiz!", {
        show_alert: true,
      });

      try {
        await ctx.editMessageReplyMarkup(
          buildSubscriptionKeyboard(missing).reply_markup
        );
      } catch {
        await sendForceSubPrompt(ctx, missing).catch(() => {});
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
  } catch (err) {
    console.error("recheckSubscription xatosi:", err.message);
    await ctx.answerCbQuery("Xato yuz berdi", { show_alert: true }).catch(() => {});
  }
};
