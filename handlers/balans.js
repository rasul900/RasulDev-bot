// ═══════════════════════════════════════════════════════════════════════════════
// group-protection.js  —  Mukammal Telegram guruh himoya tizimi
// Telegraf v4+  |  Node.js 18+
// ═══════════════════════════════════════════════════════════════════════════════
//
//  XUSUSIYATLAR:
//  ─────────────
//  • Taqiqlangan so'zlar filtri
//  • Havola / URL filtri
//  • @username reklama filtri
//  • Sokin rejim (slow mode)
//  • Copy-paste spam himoyasi
//  • Flood himoyasi
//  • Anti-raid (ommaviy kirish bloklash)
//  • Captcha / tasdiqlash yangi a'zolar uchun
//  • Ogohlantirish + avtomatik ban tizimi
//  • Avtomatik obuna tekshiruvi
//  • Guruhga avtomatik taklif link generatsiyasi
//  • Kanalga avtomatik obuna qildirish (bot admin bo'lsa)
//  • Referal tizimi — kim ko'p odam olib kelsa statistika
//  • /broadcast — barcha guruh a'zolariga xabar
//  • JSON-based persistent storage
//
// ═══════════════════════════════════════════════════════════════════════════════

import fs   from "fs";
import path from "path";

// ─── Konfiguratsiya ───────────────────────────────────────────────────────────

export const CONFIG = {

  // ── Taqiqlangan so'zlar (kichik harfda) ──────────────────────────────────
  bannedWords: [
    "porno","porn","sex","xxx","nude","onlyfans","18+","adult","erotic",
    "nsfw","escort","casino","betting","stavka","bukmeker","kriptovalyuta",
    "bitcoin","binance","invest","kredit","qarz","loan","forex","mlm",
    "piramida","pyramid","hack","hacker","crack","darkweb",
  ],

  // ── Obuna tekshiriladigan kanallar ───────────────────────────────────────
  // id:  @username  yoki  -100XXXXXXXXXX  (raqamli chat ID)
  requiredChannels: [
    { id: "@mychannel1", name: "Asosiy kanal",  url: "https://t.me/mychannel1" },
    // { id: "@mychannel2", name: "Kanal 2", url: "https://t.me/mychannel2" },
  ],

  // ── Avtomatik qo'shish / obuna qildirish ─────────────────────────────────
  autoJoin: {
    /**
     * true bo'lsa, yangi a'zo guruhga qo'shilishdan oldin
     * bot tomonidan yaratilgan invite link yuboriladi.
     * Bot guruhda "Invite Users" huquqiga ega bo'lishi shart.
     */
    enabled: true,

    /**
     * Bot kanalga admin bo'lsa, yangi a'zoni avtomatik subscribe qiladi.
     * (Telegram API subscribe qilishga ruxsat bermaydi — shuning uchun
     *  bot faqat kanal link va "Obuna bo'lish" tugmasini yuboradi.)
     * Haqiqiy auto-subscribe faqat bot kanalni boshqarsa va
     * `promoteChatMember` bilan mumkin, lekin bu Telegram TOS ga xilof.
     * Shu sababli bot kuchli CTA + inline button yondashuvi ishlatadi.
     */
    sendInviteOnJoin: true,
  },

  slowMode: {
    seconds: 30,   // 0 = o'chirilgan
  },

  flood: {
    windowMs:     5_000,   // tekshiruv oynasi (ms)
    limit:        7,       // max xabar soni
    muteDuration: 600,     // mute muddati (soniya)
  },

  copyPaste: {
    minLength:  15,
    cooldownMs: 60_000,
  },

  // ── Captcha ──────────────────────────────────────────────────────────────
  captcha: {
    enabled:        true,
    timeoutSeconds: 120,   // Vaqt tugasa — kick
    muteOnJoin:     true,  // Tasdiqlagunicha faqat o'qish rejimi
  },

  // ── Anti-raid ────────────────────────────────────────────────────────────
  antiRaid: {
    enabled:           true,
    windowMs:          10_000,  // 10 soniyada
    joinLimit:         10,      // X kishi kirsa raid deb hisoblash
    lockDurationMs:    60_000,  // guruh qulflash muddati
  },

  // ── Ogohlantirish → ban ostonalari ───────────────────────────────────────
  warnThresholds: [
    { count: 5, duration: 86_400 },   // 5 warn → 1 kun
    { count: 3, duration:  3_600 },   // 3 warn → 1 soat
  ],

  // ── Bildirish xabarlarini o'chirish kechikishi ────────────────────────────
  noticeDeleteDelay: 6_000,

  // ── Persistent storage fayl yo'li ─────────────────────────────────────────
  storageFile: "./bot-data.json",
};

// ─── Persistent JSON storage ──────────────────────────────────────────────────

class Storage {
  constructor(filePath) {
    this.filePath = filePath;
    this._data = { warns: {}, members: {}, referrals: {}, bannedUsers: {} };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this._data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      }
    } catch { /* korrupt fayl — sof boshla */ }
  }

  _save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this._data, null, 2));
    } catch (err) {
      console.error("[storage] saqlash xatosi:", err.message);
    }
  }

  getWarns(userId)         { return this._data.warns[userId]         ?? 0; }
  setWarns(userId, n)      { this._data.warns[userId] = n;      this._save(); }
  deleteWarns(userId)      { delete this._data.warns[userId];   this._save(); }

  getMember(userId)        { return this._data.members[userId]        ?? null; }
  setMember(userId, data)  { this._data.members[userId] = data; this._save(); }

  getReferrals(userId)     { return this._data.referrals[userId]      ?? 0; }
  addReferral(userId)      { this._data.referrals[userId] = (this._data.referrals[userId] ?? 0) + 1; this._save(); }

  getAllMembers()           { return Object.entries(this._data.members); }
  getAllReferrals()         { return Object.entries(this._data.referrals); }
}

// ─── In-memory holat ─────────────────────────────────────────────────────────

const state = {
  flood:     new Map(),   // userId → number[]
  slowMode:  new Map(),   // userId → number
  copyPaste: new Map(),   // `${uid}:${text}` → number
  captcha:   new Map(),   // userId → { messageId, timeout, chatId }
  raidJoins: [],          // timestamp[]
  raidLocked: false,
  raidLockUntil: 0,
};

export const storage = new Storage(CONFIG.storageFile);

// ─── Yordamchilar ─────────────────────────────────────────────────────────────

const formatDuration = (sec) =>
  sec >= 86_400 ? `${sec / 86_400} kun`
  : sec >= 3_600 ? `${Math.round(sec / 3_600)} soat`
  : `${Math.round(sec / 60)} daqiqa`;

const tryDelete = async (ctx) => {
  try { await ctx.deleteMessage(); } catch { /* e'tiborsiz */ }
};

const deleteAfter = (telegram, chatId, messageId, delay) => {
  setTimeout(() => telegram.deleteMessage(chatId, messageId).catch(() => {}), delay);
};

const replyAndDelete = async (ctx, text, extra = {}) => {
  const msg = await ctx.reply(text, extra);
  deleteAfter(ctx.telegram, ctx.chat.id, msg.message_id, CONFIG.noticeDeleteDelay);
  return msg;
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Admin tekshiruvi ─────────────────────────────────────────────────────────

export const isAdmin = async (ctx, userId = ctx.from?.id) => {
  try {
    const m = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return ["administrator", "creator"].includes(m.status);
  } catch { return false; }
};

// ─── Captcha ─────────────────────────────────────────────────────────────────

const CAPTCHA_ANSWER = () => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { question: `${a} + ${b} = ?`, answer: String(a + b) };
};

export const startCaptcha = async (ctx, member) => {
  if (!CONFIG.captcha.enabled) return;

  const { question, answer } = CAPTCHA_ANSWER();
  const buttons = [answer, String(Number(answer) + 1), String(Number(answer) - 1)]
    .sort(() => Math.random() - 0.5)
    .map(v => ({ text: v, callback_data: `captcha:${member.id}:${v === answer ? "ok" : "fail"}` }));

  // Vaqtinchalik mute
  if (CONFIG.captcha.muteOnJoin) {
    try {
      await ctx.telegram.restrictChatMember(ctx.chat.id, member.id, {
        permissions: { can_send_messages: false },
        until_date: Math.floor(Date.now() / 1000) + CONFIG.captcha.timeoutSeconds + 10,
      });
    } catch { /* bot huquqi yo'q bo'lishi mumkin */ }
  }

  const msg = await ctx.reply(
    `🤖 *Captcha* — ${escMd(member.first_name)}\n\n` +
    `Siz bot emasligingizni isbotlang:\n*${question}*\n\n` +
    `⏱ ${CONFIG.captcha.timeoutSeconds} soniya ichida javob bering yoki guruhdan chiqarilasiz\\.`,
    {
      parse_mode: "MarkdownV2",
      reply_markup: { inline_keyboard: [buttons] },
    }
  );

  const timeout = setTimeout(async () => {
    state.captcha.delete(member.id);
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id);
      await ctx.telegram.banChatMember(ctx.chat.id, member.id);
      await ctx.telegram.unbanChatMember(ctx.chat.id, member.id); // soft kick
      await ctx.reply(`⏰ ${member.first_name} captchadan o'tmadi — chiqarildi.`);
    } catch { /* e'tiborsiz */ }
  }, CONFIG.captcha.timeoutSeconds * 1000);

  state.captcha.set(member.id, {
    messageId: msg.message_id,
    chatId: ctx.chat.id,
    timeout,
    answer,
  });
};

export const captchaCallbackHandler = async (ctx) => {
  const [, userIdStr, result] = ctx.callbackQuery.data.split(":");
  const userId = Number(userIdStr);

  // Faqat tegishli foydalanuvchi bosishi mumkin
  if (ctx.from.id !== userId) {
    return ctx.answerCbQuery("Bu captcha siz uchun emas!", { show_alert: true });
  }

  const entry = state.captcha.get(userId);
  if (!entry) return ctx.answerCbQuery("Captcha topilmadi.", { show_alert: true });

  clearTimeout(entry.timeout);
  state.captcha.delete(userId);

  try { await ctx.telegram.deleteMessage(entry.chatId, entry.messageId); } catch { /* e'tiborsiz */ }

  if (result === "ok") {
    // Mute olib tashlash
    try {
      await ctx.telegram.restrictChatMember(entry.chatId, userId, {
        permissions: {
          can_send_messages:         true,
          can_send_media_messages:   true,
          can_send_polls:            true,
          can_send_other_messages:   true,
          can_add_web_page_previews: true,
        },
      });
    } catch { /* e'tiborsiz */ }
    await ctx.answerCbQuery("✅ Tasdiqlandi! Guruhga xush kelibsiz.");
    const m = await ctx.reply(`✅ ${escMd(ctx.from.first_name)} tasdiqlandi\\!`, { parse_mode: "MarkdownV2" });
    deleteAfter(ctx.telegram, entry.chatId, m.message_id, 5_000);
  } else {
    await ctx.answerCbQuery("❌ Noto'g'ri javob!", { show_alert: true });
    try {
      await ctx.telegram.banChatMember(entry.chatId, userId);
      await ctx.telegram.unbanChatMember(entry.chatId, userId);
    } catch { /* e'tiborsiz */ }
    const m = await ctx.reply(`❌ ${escMd(ctx.from.first_name)} noto'g'ri javob berdi — chiqarildi\\.`, { parse_mode: "MarkdownV2" });
    deleteAfter(ctx.telegram, entry.chatId, m.message_id, 5_000);
  }
};

// ─── Ogohlantirish tizimi ─────────────────────────────────────────────────────

export const warnUser = async (ctx, target, reason) => {
  const count = storage.getWarns(target.id) + 1;
  storage.setWarns(target.id, count);

  const sorted = [...CONFIG.warnThresholds].sort((a, b) => b.count - a.count);
  for (const { count: threshold, duration } of sorted) {
    if (count >= threshold) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, target.id, {
          until_date: Math.floor(Date.now() / 1000) + duration,
        });
        storage.setWarns(target.id, 0);
        return ctx.reply(
          `🔨 ${target.first_name} ${threshold} marta ogohlantirish natijasida ${formatDuration(duration)}ga banlandi.`
        );
      } catch (err) { console.error("[warn] ban xatosi:", err.message); }
      break;
    }
  }

  const max = sorted.at(-1).count;
  return ctx.reply(
    `⚠️ ${target.first_name}, ogohlantirish ${count}/${max}.\n` +
    `Sabab: ${reason}\n` +
    `3 warn → 1 soat | 5 warn → 1 kun ban.`
  );
};

// ─── Mute / Unmute ────────────────────────────────────────────────────────────

export const muteUser = async (ctx, target, seconds, reason) => {
  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
      permissions: { can_send_messages: false },
      until_date: Math.floor(Date.now() / 1000) + seconds,
    });
    return ctx.reply(`🔇 ${target.first_name} ${formatDuration(seconds)}ga mute qilindi. Sabab: ${reason}`);
  } catch (err) { console.error("[mute] xato:", err.message); }
};

export const unmuteUser = async (ctx, target) => {
  await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
    permissions: {
      can_send_messages:         true,
      can_send_media_messages:   true,
      can_send_polls:            true,
      can_send_other_messages:   true,
      can_add_web_page_previews: true,
    },
  });
};

// ─── Obuna tekshiruvi ─────────────────────────────────────────────────────────

export const getMissingSubscriptions = async (telegram, userId) => {
  if (!CONFIG.requiredChannels.length) return [];
  const results = await Promise.allSettled(
    CONFIG.requiredChannels.map(ch => telegram.getChatMember(ch.id, userId))
  );
  return CONFIG.requiredChannels.filter((_, i) => {
    const r = results[i];
    if (r.status === "rejected") return false;
    return ["left", "kicked", "banned"].includes(r.value.status);
  });
};

const buildSubscriptionKeyboard = (channels, extra = []) => ({
  inline_keyboard: [
    ...channels.map(ch => ([
      { text: `📢 ${ch.name}ga obuna bo'lish`, url: ch.url },
    ])),
    ...extra,
  ],
});

const enforceSubscription = async (ctx) => {
  const missing = await getMissingSubscriptions(ctx.telegram, ctx.from.id);
  if (!missing.length) return false;
  await tryDelete(ctx);
  await ctx.reply(
    `🔒 ${ctx.from.first_name}, xabar yuborish uchun quyidagi kanal(lar)ga obuna bo'ling:`,
    { reply_markup: buildSubscriptionKeyboard(missing) }
  );
  return true;
};

// ─── Anti-raid ────────────────────────────────────────────────────────────────

const checkRaid = () => {
  const now = Date.now();
  if (state.raidLocked && now < state.raidLockUntil) return true;
  if (state.raidLocked) { state.raidLocked = false; }

  state.raidJoins = state.raidJoins.filter(t => now - t < CONFIG.antiRaid.windowMs);
  state.raidJoins.push(now);

  if (state.raidJoins.length >= CONFIG.antiRaid.joinLimit) {
    state.raidLocked = true;
    state.raidLockUntil = now + CONFIG.antiRaid.lockDurationMs;
    return true;
  }
  return false;
};

// ─── Avtomatik taklif link ────────────────────────────────────────────────────

/**
 * Guruhga bir martalik invite link yaratadi.
 * Bot guruhda "Invite Users" admin huquqiga ega bo'lishi shart.
 */
export const createInviteLink = async (telegram, chatId, options = {}) => {
  try {
    const link = await telegram.createChatInviteLink(chatId, {
      creates_join_request: false,
      member_limit: options.memberLimit ?? 1,
      expire_date: options.expireDate,
      name: options.name ?? `Bot invite ${Date.now()}`,
    });
    return link.invite_link;
  } catch (err) {
    console.error("[inviteLink] xato:", err.message);
    return null;
  }
};

// ─── Filtrlar ─────────────────────────────────────────────────────────────────

const LINK_RE     = /(https?:\/\/|t\.me\/|telegram\.me\/|www\.)/i;
const USERNAME_RE = /@\w{4,}/i;

const hasBannedWord        = (t) => CONFIG.bannedWords.some(w => t.includes(w));
const hasLink              = (t) => LINK_RE.test(t);
const hasSuspiciousMention = (t, ents = []) =>
  ents.filter(e => e.type === "mention").length > 2 || USERNAME_RE.test(t);

// ─── MarkdownV2 escape ────────────────────────────────────────────────────────
const escMd = (str = "") =>
  String(str).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");

// ─── Asosiy himoya middleware ─────────────────────────────────────────────────

export const groupProtection = async (ctx, next) => {
  try {
    if (!ctx.chat || ctx.chat.type === "private" || !ctx.message) return next();
    if (await isAdmin(ctx)) return next();

    const userId  = ctx.from.id;
    const now     = Date.now();
    const rawText = (ctx.message.text || ctx.message.caption || "").trim();
    const text    = rawText.toLowerCase();
    const entities = ctx.message.entities || [];

    // ── 1. Obuna tekshiruvi ───────────────────────────────────────────────
    if (await enforceSubscription(ctx)) return;

    // ── 2. Captcha ochirilmagan foydalanuvchi tekshiruvi ──────────────────
    if (state.captcha.has(userId)) {
      await tryDelete(ctx);
      return replyAndDelete(ctx, `🔒 ${ctx.from.first_name}, avval captchani yechib oling.`);
    }

    // ── 3. Taqiqlangan so'zlar ────────────────────────────────────────────
    if (hasBannedWord(text)) {
      await tryDelete(ctx);
      return warnUser(ctx, ctx.from, "taqiqlangan so'z");
    }

    // ── 4. Havola / URL ───────────────────────────────────────────────────
    if (hasLink(text)) {
      await tryDelete(ctx);
      return warnUser(ctx, ctx.from, "reklama/havola");
    }

    // ── 5. @username reklama ──────────────────────────────────────────────
    if (hasSuspiciousMention(text, entities)) {
      await tryDelete(ctx);
      return warnUser(ctx, ctx.from, "reklama username");
    }

    // ── 6. Sokin rejim ────────────────────────────────────────────────────
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

    // ── 7. Copy-paste spam ────────────────────────────────────────────────
    if (text.length > CONFIG.copyPaste.minLength) {
      const key = `${userId}:${text}`;
      const lastSent = state.copyPaste.get(key) || 0;
      if (now - lastSent < CONFIG.copyPaste.cooldownMs) {
        await tryDelete(ctx);
        return replyAndDelete(ctx, `♻️ ${ctx.from.first_name}, takroriy xabar taqiqlangan.`);
      }
      state.copyPaste.set(key, now);
    }

    // ── 8. Flood himoyasi ─────────────────────────────────────────────────
    const msgs   = state.flood.get(userId) || [];
    const recent = msgs.filter(t => now - t < CONFIG.flood.windowMs);
    recent.push(now);
    state.flood.set(userId, recent);

    if (recent.length >= CONFIG.flood.limit) {
      await tryDelete(ctx);
      return muteUser(
        ctx, ctx.from, CONFIG.flood.muteDuration,
        `flood (${CONFIG.flood.windowMs / 1000}s ichida ${CONFIG.flood.limit}+ xabar)`
      );
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

    // Anti-raid tekshiruvi
    if (CONFIG.antiRaid.enabled && checkRaid()) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, member.id);
        await ctx.telegram.unbanChatMember(ctx.chat.id, member.id);
        await ctx.reply(`🛡 Raid aniqlandi! ${member.first_name} vaqtincha bloklandi.`);
      } catch { /* e'tiborsiz */ }
      continue;
    }

    // A'zo ma'lumotini saqlash
    storage.setMember(member.id, {
      id: member.id,
      name: member.first_name,
      username: member.username ?? null,
      joinedAt: Date.now(),
      chatId: ctx.chat.id,
    });

    const missing = await getMissingSubscriptions(ctx.telegram, member.id);

    // Captcha boshlash
    if (CONFIG.captcha.enabled) {
      await startCaptcha(ctx, member);
    }

    if (missing.length) {
      // Obuna talab qiluvchi xabar
      await ctx.reply(
        `👋 Xush kelibsiz, ${member.first_name}!\n\n` +
        `Guruhda faol bo'lish va xabar yozish uchun avval quyidagi kanallarga obuna bo'ling:`,
        {
          reply_markup: buildSubscriptionKeyboard(missing, [
            [{ text: "✅ Obuna bo'ldim — Tekshirish", callback_data: `checksub:${member.id}` }],
          ]),
        }
      );
    } else if (!CONFIG.captcha.enabled) {
      // Captcha yo'q va obuna to'liq — oddiy salom
      await ctx.reply(
        `✅ Xush kelibsiz, ${member.first_name}!\n` +
        `Guruh qoidalariga rioya qiling. Baxtli muloqotlar! 🎉`
      );
    }
  }
};

// ─── Callback query handler (captcha + checksub) ──────────────────────────────

export const callbackQueryHandler = async (ctx) => {
  const data = ctx.callbackQuery?.data ?? "";

  if (data.startsWith("captcha:")) {
    return captchaCallbackHandler(ctx);
  }

  if (data.startsWith("checksub:")) {
    const userId = Number(data.split(":")[1]);
    if (ctx.from.id !== userId) {
      return ctx.answerCbQuery("Bu siz uchun emas!", { show_alert: true });
    }
    const missing = await getMissingSubscriptions(ctx.telegram, userId);
    if (missing.length) {
      return ctx.answerCbQuery(
        `❌ Hali ${missing.length} ta kanalga obuna bo'lmadingiz!`,
        { show_alert: true }
      );
    }
    // Mute olib tashlash (agar captcha o'chirilgan bo'lsa)
    try {
      await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
        permissions: {
          can_send_messages:         true,
          can_send_media_messages:   true,
          can_send_polls:            true,
          can_send_other_messages:   true,
          can_add_web_page_previews: true,
        },
      });
    } catch { /* e'tiborsiz */ }
    await ctx.answerCbQuery("✅ Obuna tasdiqlandi! Endi xabar yozishingiz mumkin.");
    try { await ctx.deleteMessage(); } catch { /* e'tiborsiz */ }
  }
};

// ─── Admin buyruqlari ─────────────────────────────────────────────────────────

export const registerAdminCommands = (bot) => {

  const adminOnly = (handler) => async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    return handler(ctx);
  };

  const getTarget = (ctx, errMsg = "Javob berilgan xabarga yozing.") => {
    const t = ctx.message.reply_to_message?.from;
    if (!t) { ctx.reply(errMsg); return null; }
    return t;
  };

  // ── /warn ─────────────────────────────────────────────────────────────────
  bot.command("warn", adminOnly(async (ctx) => {
    const t = getTarget(ctx, "/warn — javob berilgan xabarga yozing.");
    if (t) await warnUser(ctx, t, "Admin tomonidan");
  }));

  // ── /mute [daqiqa] ────────────────────────────────────────────────────────
  bot.command("mute", adminOnly(async (ctx) => {
    const t = getTarget(ctx, "/mute — javob berilgan xabarga yozing.");
    if (!t) return;
    const mins = parseInt(ctx.message.text.split(" ")[1]) || 10;
    await muteUser(ctx, t, mins * 60, "Admin buyrug'i");
  }));

  // ── /unmute ───────────────────────────────────────────────────────────────
  bot.command("unmute", adminOnly(async (ctx) => {
    const t = getTarget(ctx, "/unmute — javob berilgan xabarga yozing.");
    if (!t) return;
    await unmuteUser(ctx, t);
    ctx.reply(`✅ ${t.first_name} mutesi olib tashlandi.`);
  }));

  // ── /ban ──────────────────────────────────────────────────────────────────
  bot.command("ban", adminOnly(async (ctx) => {
    const t = getTarget(ctx, "/ban — javob berilgan xabarga yozing.");
    if (!t) return;
    await ctx.telegram.banChatMember(ctx.chat.id, t.id);
    ctx.reply(`🚫 ${t.first_name} doimiy banlandi.`);
  }));

  // ── /unban ────────────────────────────────────────────────────────────────
  bot.command("unban", adminOnly(async (ctx) => {
    const t = getTarget(ctx, "/unban — javob berilgan xabarga yozing.");
    if (!t) return;
    await ctx.telegram.unbanChatMember(ctx.chat.id, t.id);
    ctx.reply(`✅ ${t.first_name} bani olib tashlandi.`);
  }));

  // ── /warns ────────────────────────────────────────────────────────────────
  bot.command("warns", async (ctx) => {
    const t = ctx.message.reply_to_message?.from ?? ctx.from;
    const count = storage.getWarns(t.id);
    const max = [...CONFIG.warnThresholds].sort((a, b) => b.count - a.count)[0].count;
    ctx.reply(`📋 ${t.first_name}: ${count}/${max} ogohlantirish`);
  });

  // ── /resetwarns ───────────────────────────────────────────────────────────
  bot.command("resetwarns", adminOnly(async (ctx) => {
    const t = getTarget(ctx, "/resetwarns — javob berilgan xabarga yozing.");
    if (!t) return;
    storage.deleteWarns(t.id);
    ctx.reply(`✅ ${t.first_name} ogohlantirishlari tozalandi.`);
  }));

  // ── /slowmode [soniya] ────────────────────────────────────────────────────
  bot.command("slowmode", adminOnly(async (ctx) => {
    const sec = parseInt(ctx.message.text.split(" ")[1]);
    if (isNaN(sec)) return ctx.reply("Ishlatish: /slowmode 30  (0 = o'chirish)");
    CONFIG.slowMode.seconds = sec;
    ctx.reply(sec === 0 ? "✅ Sokin rejim o'chirildi." : `✅ Sokin rejim: ${sec} soniya.`);
  }));

  // ── /addchannel @username ─────────────────────────────────────────────────
  bot.command("addchannel", adminOnly(async (ctx) => {
    const username = ctx.message.text.split(" ")[1];
    if (!username?.startsWith("@")) return ctx.reply("Ishlatish: /addchannel @username");
    const already = CONFIG.requiredChannels.find(c => c.id === username);
    if (already) return ctx.reply(`⚠️ ${username} allaqachon ro'yxatda.`);
    CONFIG.requiredChannels.push({
      id: username,
      name: username,
      url: `https://t.me/${username.slice(1)}`,
    });
    ctx.reply(`✅ ${username} obuna ro'yxatiga qo'shildi.`);
  }));

  // ── /removechannel @username ──────────────────────────────────────────────
  bot.command("removechannel", adminOnly(async (ctx) => {
    const username = ctx.message.text.split(" ")[1];
    if (!username?.startsWith("@")) return ctx.reply("Ishlatish: /removechannel @username");
    const before = CONFIG.requiredChannels.length;
    CONFIG.requiredChannels = CONFIG.requiredChannels.filter(c => c.id !== username);
    ctx.reply(before > CONFIG.requiredChannels.length
      ? `✅ ${username} ro'yxatdan olib tashlandi.`
      : `❌ ${username} ro'yxatda topilmadi.`
    );
  }));

  // ── /channels ─────────────────────────────────────────────────────────────
  bot.command("channels", async (ctx) => {
    if (!CONFIG.requiredChannels.length) return ctx.reply("Obuna kanallari yo'q.");
    const list = CONFIG.requiredChannels
      .map((c, i) => `${i + 1}. ${c.name} — ${c.url}`)
      .join("\n");
    ctx.reply(`📋 Obuna kanallar:\n\n${list}`);
  });

  // ── /invite — bir martalik invite link ────────────────────────────────────
  bot.command("invite", adminOnly(async (ctx) => {
    const link = await createInviteLink(ctx.telegram, ctx.chat.id, {
      memberLimit: undefined, // cheksiz
      name: "Bot invite link",
    });
    if (!link) return ctx.reply("❌ Invite link yaratib bo'lmadi. Bot admin huquqini tekshiring.");
    ctx.reply(
      `🔗 Guruh invite link:\n${link}\n\n` +
      `_Bu linkni ulashing — odam to'plash uchun!_`,
      { parse_mode: "Markdown" }
    );
  }));

  // ── /broadcast [xabar] ────────────────────────────────────────────────────
  // Barcha saqlangan a'zolarga DM yuboradi
  bot.command("broadcast", adminOnly(async (ctx) => {
    const text = ctx.message.text.split(" ").slice(1).join(" ");
    if (!text) return ctx.reply("Ishlatish: /broadcast <xabar matni>");

    const members = storage.getAllMembers();
    if (!members.length) return ctx.reply("Saqlangan a'zolar yo'q.");

    let ok = 0, fail = 0;
    const status = await ctx.reply(`📤 Yuborish boshlandi: ${members.length} ta a'zo...`);

    for (const [userId] of members) {
      try {
        await ctx.telegram.sendMessage(Number(userId), text);
        ok++;
      } catch { fail++; }
      await sleep(50); // throttle
    }

    ctx.telegram.editMessageText(
      ctx.chat.id, status.message_id, undefined,
      `📤 Broadcast tugadi:\n✅ Yuborildi: ${ok}\n❌ Bloklaganlar: ${fail}`
    ).catch(() => {});
  }));

  // ── /stats ────────────────────────────────────────────────────────────────
  bot.command("stats", adminOnly(async (ctx) => {
    const membersCount  = storage.getAllMembers().length;
    const referrals     = storage.getAllReferrals();
    const topRef        = referrals.sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topRefText    = topRef.length
      ? topRef.map(([uid, cnt], i) => `  ${i + 1}. User ${uid}: ${cnt} ta`).join("\n")
      : "  —";

    ctx.reply(
      `📊 Bot statistikasi:\n\n` +
      `👥 Jami a'zolar (DB): ${membersCount}\n` +
      `⚠️  Ogohlantirish xaritasi: ${state.warns?.size ?? 0}\n` +
      `🌊 Flood xaritasi: ${state.flood.size}\n` +
      `⏱  Sokin rejim: ${CONFIG.slowMode.seconds}s\n` +
      `📢 Obuna kanallar: ${CONFIG.requiredChannels.length} ta\n` +
      `🔒 Raid himoyasi: ${CONFIG.antiRaid.enabled ? "✅" : "❌"}\n` +
      `🤖 Captcha: ${CONFIG.captcha.enabled ? "✅" : "❌"}\n\n` +
      `🏆 Top referal:\n${topRefText}`
    );
  }));

  // ── /members ──────────────────────────────────────────────────────────────
  bot.command("members", adminOnly(async (ctx) => {
    const all = storage.getAllMembers();
    if (!all.length) return ctx.reply("Bazada a'zo yo'q.");
    const lines = all.slice(0, 30).map(([uid, m]) =>
      `• ${m.name}${m.username ? ` (@${m.username})` : ""} — ID: ${uid}`
    );
    ctx.reply(`👥 A'zolar (${all.length} ta):\n\n${lines.join("\n")}`);
  }));

  // ── /togglecaptcha ────────────────────────────────────────────────────────
  bot.command("togglecaptcha", adminOnly(async (ctx) => {
    CONFIG.captcha.enabled = !CONFIG.captcha.enabled;
    ctx.reply(`🤖 Captcha: ${CONFIG.captcha.enabled ? "✅ Yoqildi" : "❌ O'chirildi"}`);
  }));

  // ── /toggleraid ───────────────────────────────────────────────────────────
  bot.command("toggleraid", adminOnly(async (ctx) => {
    CONFIG.antiRaid.enabled = !CONFIG.antiRaid.enabled;
    ctx.reply(`🛡 Anti-raid: ${CONFIG.antiRaid.enabled ? "✅ Yoqildi" : "❌ O'chirildi"}`);
  }));

  // ── /help ─────────────────────────────────────────────────────────────────
  bot.command("help", adminOnly(async (ctx) => {
    ctx.reply(
      `📖 *Admin buyruqlari:*\n\n` +
      `*Moderatsiya:*\n` +
      `/warn — ogohlantirish (reply)\n` +
      `/mute [min] — mute (reply)\n` +
      `/unmute — mute olib tashlash (reply)\n` +
      `/ban — ban (reply)\n` +
      `/unban — ban olib tashlash (reply)\n` +
      `/warns — ogohlantirishlar (reply)\n` +
      `/resetwarns — tozalash (reply)\n\n` +
      `*Kanal:*\n` +
      `/addchannel @username — kanal qo'shish\n` +
      `/removechannel @username — kanal o'chirish\n` +
      `/channels — kanal ro'yxati\n\n` +
      `*Boshqaruv:*\n` +
      `/slowmode [sec] — sokin rejim\n` +
      `/invite — invite link yaratish\n` +
      `/broadcast <matn> — barcha a'zolarga xabar\n` +
      `/togglecaptcha — captcha on/off\n` +
      `/toggleraid — anti-raid on/off\n` +
      `/stats — statistika\n` +
      `/members — a'zolar ro'yxati`,
      { parse_mode: "Markdown" }
    );
  }));
};

// ─── Bot setup yordamchisi ────────────────────────────────────────────────────

/**
 * Barcha handler va middleware larni botga bir qatorli yozuv bilan ulash.
 *
 * @example
 * import { Telegraf } from "telegraf";
 * import { setupBot } from "./group-protection.js";
 *
 * const bot = new Telegraf(process.env.BOT_TOKEN);
 * setupBot(bot);
 * bot.launch();
 */
export const setupBot = (bot) => {
  // Callback queries (captcha + checksub)
  bot.on("callback_query", callbackQueryHandler);

  // Yangi a'zo
  bot.on("new_chat_members", newMemberHandler);

  // Guruh himoyasi middleware
  bot.use(groupProtection);

  // Admin buyruqlari
  registerAdminCommands(bot);

  console.log("✅ Bot himoya tizimi ishga tushdi.");
};

export { CONFIG as default, formatDuration, escMd };