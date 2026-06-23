// ─── group-protection.js ──────────────────────────────────────────────────────
// Telegram guruh himoya middleware va admin buyruqlari
// Telegraf v4+ bilan ishlaydi
// ─────────────────────────────────────────────────────────────────────────────

// ─── Konfiguratsiya ───────────────────────────────────────────────────────────

const CONFIG = {
  /** Taqiqlangan so'zlar (kichik harfda) */
  bannedWords: [
    "porno", "porn", "sex", "xxx", "nude", "onlyfans",
    "18+", "adult", "erotic", "nsfw", "escort",
    "casino", "betting", "stavka", "bukmeker",
    "kriptovalyuta", "bitcoin", "binance", "invest",
    "kredit", "qarz", "loan", "forex",
  ],

  /**
   * Obuna tekshiriladigan kanallar/guruhlar
   * @type {{ id: string|number, name: string, url: string }[]}
   */
  requiredChannels: [
    { id: "@mychannel1", name: "Asosiy kanal", url: "https://t.me/mychannel1" },
    // { id: -1001234567890, name: "Guruh", url: "https://t.me/mygroup" },
  ],

  slowMode: {
    /** 0 = o'chirilgan */
    seconds: 30,
  },

  flood: {
    /** Oyna (ms) */
    windowMs: 5_000,
    /** Oyna ichida max xabar */
    limit: 7,
    /** Flood uchun mute muddati (soniya) */
    muteDuration: 600,
  },

  copyPaste: {
    /** Takroriy xabar uchun minimal uzunlik */
    minLength: 15,
    /** Bir xil xabar qayta yuborilsa bloklash muddati (ms) */
    cooldownMs: 60_000,
  },

  /**
   * Ogohlantirishlar progi → ban muddati (soniya)
   * Ular kamayish tartibida tekshiriladi
   */
  warnThresholds: [
    { count: 5, duration: 86_400 },   // 5 warn → 1 kun
    { count: 3, duration: 3_600 },    // 3 warn → 1 soat
  ],

  /** Bildirish xabarlarini o'chirish kechikishi (ms) */
  noticeDeleteDelay: 5_000,
};

// ─── Holat xaritalari ─────────────────────────────────────────────────────────

const state = {
  warns:     new Map(), // userId → { count: number }
  flood:     new Map(), // userId → number[] (timestamps)
  slowMode:  new Map(), // userId → number (last message timestamp)
  copyPaste: new Map(), // `${userId}:${text}` → number (last sent timestamp)
};

// ─── Yordamchi: vaqtni formatlash ─────────────────────────────────────────────

function formatDuration(seconds) {
  if (seconds >= 86_400) return `${seconds / 86_400} kun`;
  if (seconds >= 3_600)  return `${Math.round(seconds / 3_600)} soat`;
  return `${Math.round(seconds / 60)} daqiqa`;
}

// ─── Yordamchi: xabarni o'chirish ─────────────────────────────────────────────

async function tryDelete(ctx) {
  try { await ctx.deleteMessage(); } catch { /* e'tiborsiz */ }
}

async function deleteAfter(telegram, chatId, messageId, delayMs) {
  setTimeout(() => {
    telegram.deleteMessage(chatId, messageId).catch(() => {});
  }, delayMs);
}

// ─── Yordamchi: inline-reply va o'chirib tashlash ─────────────────────────────

async function replyAndDelete(ctx, text) {
  const msg = await ctx.reply(text);
  deleteAfter(ctx.telegram, ctx.chat.id, msg.message_id, CONFIG.noticeDeleteDelay);
}

// ─── Admin tekshiruvi ─────────────────────────────────────────────────────────

async function isAdmin(ctx, userId = ctx.from?.id) {
  try {
    const m = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return ["administrator", "creator"].includes(m.status);
  } catch {
    return false;
  }
}

// ─── Ogohlantirish ────────────────────────────────────────────────────────────

function getWarnRecord(userId) {
  if (!state.warns.has(userId)) state.warns.set(userId, { count: 0 });
  return state.warns.get(userId);
}

async function warnUser(ctx, target, reason) {
  const record = getWarnRecord(target.id);
  record.count += 1;

  // Jazolash ostonasini tekshirish (kamayish tartibida)
  for (const { count: threshold, duration } of CONFIG.warnThresholds) {
    if (record.count >= threshold) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, target.id, {
          until_date: Math.floor(Date.now() / 1000) + duration,
        });
        const label = formatDuration(duration);
        record.count = 0;
        return ctx.reply(
          `🔨 ${target.first_name} ${threshold} marta ogohlantirish natijasida ${label}ga banlandi.`
        );
      } catch (err) {
        console.error("[warn] ban xatosi:", err.message);
      }
      break;
    }
  }

  return ctx.reply(
    `⚠️ ${target.first_name}, ogohlantirish ${record.count}/${CONFIG.warnThresholds.at(-1).count}.\n` +
    `Sabab: ${reason}\n` +
    `3 ta warn → 1 soat, 5 ta warn → 1 kun ban.`
  );
}

// ─── Mute ─────────────────────────────────────────────────────────────────────

async function muteUser(ctx, target, seconds, reason) {
  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
      permissions: { can_send_messages: false },
      until_date: Math.floor(Date.now() / 1000) + seconds,
    });
    return ctx.reply(
      `🔇 ${target.first_name} ${formatDuration(seconds)}ga mute qilindi. Sabab: ${reason}`
    );
  } catch (err) {
    console.error("[mute] xato:", err.message);
  }
}

// ─── Unmute ───────────────────────────────────────────────────────────────────

async function unmuteUser(ctx, target) {
  await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
    permissions: {
      can_send_messages:        true,
      can_send_media_messages:  true,
      can_send_polls:           true,
      can_send_other_messages:  true,
      can_add_web_page_previews: true,
    },
  });
}

// ─── Obuna tekshiruvi ─────────────────────────────────────────────────────────

/**
 * Foydalanuvchi kerakli kanallarga obuna bo'lganini tekshiradi.
 * @returns {typeof CONFIG.requiredChannels} obuna bo'lmagan kanallar
 */
async function getMissingSubscriptions(telegram, userId) {
  if (!CONFIG.requiredChannels.length) return [];

  const results = await Promise.allSettled(
    CONFIG.requiredChannels.map(ch =>
      telegram.getChatMember(ch.id, userId)
    )
  );

  return CONFIG.requiredChannels.filter((_, i) => {
    const result = results[i];
    if (result.status === "rejected") return false; // kanal topilmasa o'tkazib yuboriladi
    return ["left", "kicked", "banned"].includes(result.value.status);
  });
}

function buildSubscriptionKeyboard(channels) {
  return {
    inline_keyboard: channels.map(ch => ([
      { text: `📢 ${ch.name}ga obuna bo'lish`, url: ch.url },
    ])),
  };
}

/**
 * Obuna bo'lmagan foydalanuvchiga xabar yuboradi.
 * @returns {boolean} bloklash kerak bo'lsa true
 */
async function enforceSubscription(ctx) {
  const missing = await getMissingSubscriptions(ctx.telegram, ctx.from.id);
  if (!missing.length) return false;

  await tryDelete(ctx);
  await ctx.reply(
    `🔒 ${ctx.from.first_name}, xabar yuborish uchun quyidagi kanal(lar)ga obuna bo'ling:`,
    { reply_markup: buildSubscriptionKeyboard(missing) }
  );
  return true;
}

// ─── Filtr tekshiruvlari ──────────────────────────────────────────────────────

const LINK_REGEX = /(https?:\/\/|t\.me\/|telegram\.me\/|www\.)/i;
const USERNAME_REGEX = /@\w{4,}/i;

function hasBannedWord(text) {
  return CONFIG.bannedWords.some(w => text.includes(w));
}

function hasLink(text) {
  return LINK_REGEX.test(text);
}

function hasSuspiciousMentions(text, entities = []) {
  const mentionCount = entities.filter(e => e.type === "mention").length;
  return mentionCount > 2 || USERNAME_REGEX.test(text);
}

// ─── Asosiy himoya middleware ─────────────────────────────────────────────────

export const groupProtection = async (ctx, next) => {
  try {
    // Shaxsiy chat yoki xabar yo'q → o'tkazib yuborish
    if (!ctx.chat || ctx.chat.type === "private" || !ctx.message) return next();

    // Admin bo'lsa → o'tkazib yuborish
    if (await isAdmin(ctx)) return next();

    const userId = ctx.from.id;
    const now = Date.now();
    const text = (ctx.message.text || ctx.message.caption || "").toLowerCase().trim();
    const entities = ctx.message.entities || [];

    // ── 1. Obuna tekshiruvi ────────────────────────────────────────────────
    if (await enforceSubscription(ctx)) return;

    // ── 2. Taqiqlangan so'zlar ─────────────────────────────────────────────
    if (hasBannedWord(text)) {
      await tryDelete(ctx);
      return warnUser(ctx, ctx.from, "taqiqlangan so'z");
    }

    // ── 3. Havola / URL filtri ─────────────────────────────────────────────
    if (hasLink(text)) {
      await tryDelete(ctx);
      return warnUser(ctx, ctx.from, "reklama/havola");
    }

    // ── 4. @username reklama ───────────────────────────────────────────────
    if (hasSuspiciousMentions(text, entities)) {
      await tryDelete(ctx);
      return warnUser(ctx, ctx.from, "reklama username");
    }

    // ── 5. Sokin rejim (Slow mode) ─────────────────────────────────────────
    if (CONFIG.slowMode.seconds > 0) {
      const lastMsg = state.slowMode.get(userId) || 0;
      const elapsed = (now - lastMsg) / 1000;
      if (elapsed < CONFIG.slowMode.seconds) {
        const remaining = Math.ceil(CONFIG.slowMode.seconds - elapsed);
        await tryDelete(ctx);
        return replyAndDelete(ctx, `⏱ ${ctx.from.first_name}, iltimos ${remaining} soniya kuting.`);
      }
      state.slowMode.set(userId, now);
    }

    // ── 6. Copy-paste spam ─────────────────────────────────────────────────
    if (text.length > CONFIG.copyPaste.minLength) {
      const key = `${userId}:${text}`;
      const lastSent = state.copyPaste.get(key) || 0;
      if (now - lastSent < CONFIG.copyPaste.cooldownMs) {
        await tryDelete(ctx);
        return replyAndDelete(ctx, `♻️ ${ctx.from.first_name}, takroriy xabar taqiqlangan.`);
      }
      state.copyPaste.set(key, now);
    }

    // ── 7. Flood himoya ────────────────────────────────────────────────────
    const msgs = state.flood.get(userId) || [];
    const recent = msgs.filter(t => now - t < CONFIG.flood.windowMs);
    recent.push(now);
    state.flood.set(userId, recent);

    if (recent.length >= CONFIG.flood.limit) {
      const reason = `flood (${CONFIG.flood.windowMs / 1000}s ichida ${CONFIG.flood.limit}+ xabar)`;
      await tryDelete(ctx);
      return muteUser(ctx, ctx.from, CONFIG.flood.muteDuration, reason);
    }

    return next();
  } catch (err) {
    console.error("[groupProtection] xato:", err);
    return next();
  }
};

// ─── Yangi a'zo qo'shilganda ──────────────────────────────────────────────────

export const newMemberHandler = async (ctx) => {
  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;

    const missing = await getMissingSubscriptions(ctx.telegram, member.id);

    if (missing.length) {
      await ctx.reply(
        `👋 Xush kelibsiz, ${member.first_name}!\n` +
        `Guruhda faol bo'lish uchun quyidagi kanallarga obuna bo'ling:`,
        { reply_markup: buildSubscriptionKeyboard(missing) }
      );
    } else {
      await ctx.reply(`✅ Xush kelibsiz, ${member.first_name}!`);
    }
  }
};

// ─── Admin buyruqlari ─────────────────────────────────────────────────────────

/**
 * Admin buyruqlarini botga ro'yxatdan o'tkazadi.
 * @param {import("telegraf").Telegraf} bot
 */
export const registerAdminCommands = (bot) => {

  /** Faqat admin chaqira oladigan buyruqlar uchun dekorator */
  function adminOnly(handler) {
    return async (ctx) => {
      if (!(await isAdmin(ctx))) return;
      return handler(ctx);
    };
  }

  /** Reply qilingan xabar muallifini oladi */
  function getReplyTarget(ctx, errorMsg = "Javob berilgan xabarga yozing.") {
    const target = ctx.message.reply_to_message?.from;
    if (!target) { ctx.reply(errorMsg); return null; }
    return target;
  }

  // /warn — qo'lda ogohlantirish
  bot.command("warn", adminOnly(async (ctx) => {
    const target = getReplyTarget(ctx, "Javob berilgan xabarga /warn yozing.");
    if (!target) return;
    await warnUser(ctx, target, "Admin tomonidan");
  }));

  // /mute [daqiqa]
  bot.command("mute", adminOnly(async (ctx) => {
    const target = getReplyTarget(ctx, "Javob berilgan xabarga /mute yozing.");
    if (!target) return;
    const minutes = parseInt(ctx.message.text.split(" ")[1]) || 10;
    await muteUser(ctx, target, minutes * 60, "Admin buyrug'i");
  }));

  // /unmute
  bot.command("unmute", adminOnly(async (ctx) => {
    const target = getReplyTarget(ctx, "Javob berilgan xabarga /unmute yozing.");
    if (!target) return;
    await unmuteUser(ctx, target);
    ctx.reply(`✅ ${target.first_name} mutesi olib tashlandi.`);
  }));

  // /ban
  bot.command("ban", adminOnly(async (ctx) => {
    const target = getReplyTarget(ctx, "Javob berilgan xabarga /ban yozing.");
    if (!target) return;
    await ctx.telegram.banChatMember(ctx.chat.id, target.id);
    ctx.reply(`🚫 ${target.first_name} banlandi.`);
  }));

  // /unban
  bot.command("unban", adminOnly(async (ctx) => {
    const target = getReplyTarget(ctx, "Javob berilgan xabarga /unban yozing.");
    if (!target) return;
    await ctx.telegram.unbanChatMember(ctx.chat.id, target.id);
    ctx.reply(`✅ ${target.first_name} bani olib tashlandi.`);
  }));

  // /warns — ogohlantirishlarni ko'rish
  bot.command("warns", async (ctx) => {
    const target = ctx.message.reply_to_message?.from ?? ctx.from;
    const record = getWarnRecord(target.id);
    const max = CONFIG.warnThresholds.at(-1).count;
    ctx.reply(`📋 ${target.first_name}: ${record.count}/${max} ogohlantirish`);
  });

  // /resetwarns
  bot.command("resetwarns", adminOnly(async (ctx) => {
    const target = getReplyTarget(ctx, "Javob berilgan xabarga /resetwarns yozing.");
    if (!target) return;
    state.warns.delete(target.id);
    ctx.reply(`✅ ${target.first_name} ogohlantirishlari tozalandi.`);
  }));

  // /slowmode [soniya]
  bot.command("slowmode", adminOnly(async (ctx) => {
    const sec = parseInt(ctx.message.text.split(" ")[1]);
    if (isNaN(sec)) return ctx.reply("Ishlatish: /slowmode 30  (0 = o'chirish)");
    CONFIG.slowMode.seconds = sec;
    ctx.reply(sec === 0
      ? "✅ Sokin rejim o'chirildi."
      : `✅ Sokin rejim: ${sec} soniya.`
    );
  }));

  // /addchannel @username
  bot.command("addchannel", adminOnly(async (ctx) => {
    const username = ctx.message.text.split(" ")[1];
    if (!username?.startsWith("@")) return ctx.reply("Ishlatish: /addchannel @username");
    const entry = {
      id: username,
      name: username,
      url: `https://t.me/${username.slice(1)}`,
    };
    CONFIG.requiredChannels.push(entry);
    ctx.reply(`✅ ${username} obuna ro'yxatiga qo'shildi.`);
  }));

  // /removechannel @username
  bot.command("removechannel", adminOnly(async (ctx) => {
    const username = ctx.message.text.split(" ")[1];
    if (!username?.startsWith("@")) return ctx.reply("Ishlatish: /removechannel @username");
    const before = CONFIG.requiredChannels.length;
    CONFIG.requiredChannels = CONFIG.requiredChannels.filter(c => c.id !== username);
    const removed = before - CONFIG.requiredChannels.length;
    ctx.reply(removed
      ? `✅ ${username} obuna ro'yxatidan olib tashlandi.`
      : `❌ ${username} ro'yxatda topilmadi.`
    );
  }));

  // /channels — obuna kanallar ro'yxati
  bot.command("channels", async (ctx) => {
    if (!CONFIG.requiredChannels.length) return ctx.reply("Obuna kanallari yo'q.");
    const list = CONFIG.requiredChannels
      .map((c, i) => `${i + 1}. ${c.name} — ${c.url}`)
      .join("\n");
    ctx.reply(`📋 Obuna kanallar:\n\n${list}`);
  });

  // /stats — bot holati (faqat adminlar)
  bot.command("stats", adminOnly(async (ctx) => {
    ctx.reply(
      `📊 Bot holati:\n` +
      `• Ogohlantirishlar xaritasi: ${state.warns.size} foydalanuvchi\n` +
      `• Flood xaritasi: ${state.flood.size} foydalanuvchi\n` +
      `• Sokin rejim: ${CONFIG.slowMode.seconds}s\n` +
      `• Obuna kanallar: ${CONFIG.requiredChannels.length} ta`
    );
  }));
};

// ─── Eksport (qayta foydalanish uchun) ───────────────────────────────────────

export { CONFIG, getMissingSubscriptions };