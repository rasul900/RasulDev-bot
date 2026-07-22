import { Markup } from "telegraf";
import Channel from "../models/Channel.js";
import { isAdmin } from "../config/admin.js";
import { primaryUrl, successCb } from "../keyboards/styledButton.js";

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

const syncChannelMeta = async (channel, telegram) => {
  try {
    const chat = await telegram.getChat(channelRef(channel));
    const next = {
      title: chat.title || channel.title || channel.username,
      chatId: String(chat.id),
    };
    if (chat.username) next.username = `@${chat.username}`;
    const changed =
      next.title !== channel.title ||
      next.chatId !== channel.chatId ||
      (next.username && next.username !== channel.username);
    if (changed) {
      Object.assign(channel, next);
      await Channel.updateOne({ _id: channel._id }, next);
    }
  } catch (err) {
    console.error(`Kanal sync xatosi (${channel.username}):`, err.message);
  }
};

export const getSubscriptionStatus = async (telegram, userId) => {
  const channels = await Channel.find();
  if (!channels.length) return { ok: true, missing: [] };

  const missing = [];
  const active = [];

  for (const channel of channels) {
    await syncChannelMeta(channel, telegram);

    try {
      const member = await telegram.getChatMember(channelRef(channel), userId);
      active.push(channel);
      if (["left", "kicked", "banned"].includes(member.status)) {
        missing.push(channel);
      }
    } catch (err) {
      const msg = err.message || "";
      if (/chat not found|bot is not a member|CHANNEL_INVALID/i.test(msg)) {
        console.error(
          `Majburiy obuna: kanal o'tkazib yuborildi (${channel.username}): ${msg}`
        );
        continue;
      }
      console.error(`Kanal tekshiruvi xatosi (${channel.username}):`, msg);
      active.push(channel);
      missing.push(channel);
    }
  }

  if (!active.length) return { ok: true, missing: [] };
  return { ok: missing.length === 0, missing };
};

export const buildSubscriptionKeyboard = (channels) => {
  const buttons = channels.map((ch) => {
    const username = String(ch.username || "").replace("@", "");
    const label = ch.title ? `📢 ${ch.title}` : `📢 ${ch.username}`;
    const url = username
      ? `https://t.me/${username}`
      : ch.inviteLink || "https://t.me/";
    return [primaryUrl(`${label}`.slice(0, 60), url)];
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
    username: chat.username ? `@${chat.username}` : username,
    title: chat.title || username,
    chatId: String(chat.id),
    inviteLink: chat.invite_link || "",
  };
};

const sendForceSubPrompt = async (ctx, missing) => {
  const kb = buildSubscriptionKeyboard(missing);
  await ctx.reply(
    `🔒 <b>Majburiy obuna</b>\n\n` +
      `Botdan foydalanish uchun quyidagi kanal(lar)ga obuna bo'ling.\n` +
      `Obuna bo'lmaguncha bot ishlamaydi!`,
    {
      parse_mode: "HTML",
      reply_markup: kb.reply_markup,
    }
  );
};

export const checkSubscription = async (ctx, next) => {
  if (ctx.chat?.type !== "private") return next();
  if (isAdmin(ctx.from.id)) return next();
  if (ctx.callbackQuery?.data === "check_sub") return next();

  const text = ctx.message?.text || "";
  if (
    text.startsWith("/admin") ||
    /Kanallar|Merch qo'shish|Statistika|Reklama|Bekor qilish|Asosiy menu/i.test(
      text
    ) ||
    ctx.callbackQuery?.data?.startsWith("adm_ch_")
  ) {
    return next();
  }

  try {
    const { ok, missing } = await getSubscriptionStatus(
      ctx.telegram,
      ctx.from.id
    );
    if (ok) return next();

    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await sendForceSubPrompt(ctx, missing);
  } catch (err) {
    console.error("checkSubscription xatosi:", err.message);
    return next();
  }
};

export const recheckSubscription = async (ctx) => {
  try {
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

    await ctx.answerCbQuery("✅ Obuna tasdiqlandi!");
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(
      `✅ Rahmat! Endi botdan to'liq foydalanishingiz mumkin.\n\n` +
        `📌 /start buyrug'ini yuboring.`
    );
  } catch (err) {
    console.error("recheckSubscription xatosi:", err.message);
    await ctx
      .answerCbQuery("Xato yuz berdi", { show_alert: true })
      .catch(() => {});
  }
};
