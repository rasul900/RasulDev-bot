import Channel from "../models/Channel.js";
import User from "../models/User.js";
import Merch from "../models/Merch.js";
import Order from "../models/Order.js";
import { isAdmin } from "../config/admin.js";
import {
  normalizeChannelUsername,
  validateChannelForBot,
} from "../middlewares/checkSubscription.js";
import { adminMenu, adminCancelKeyboard } from "../keyboards/adminMenu.js";
import { successCb, dangerCb, primaryCb } from "../keyboards/styledButton.js";
import { sendMainMenu } from "../keyboards/mainMenu.js";
import { clearState, getState, setState } from "../utilis/states.js";
import { saveTelegramPhoto } from "../services/fileStorage.js";

const CANCEL_TEXT = "❌ Bekor qilish";

const esc = (text = "") =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const adminPanelHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply(
      `⛔ Siz admin emassiz.\n\n🆔 Sizning ID: ${ctx.from.id}\n` +
      `Bu ID ni .env faylidagi ADMIN_ID ga qo'ying.`
    );
  }

  clearState(ctx.from.id);
  await ctx.reply("⚙️ Admin Panel", adminMenu);
};

export const adminCancelHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  clearState(ctx.from.id);
  await ctx.reply("❌ Bekor qilindi.\n\n⚙️ Admin Panel", adminMenu);
};

export const adminMerchAddHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  setState(ctx.from.id, { step: "merch_photo" });
  await ctx.reply(
    "📷 Merch uchun rasm yuboring:\n\n" +
    "Bekor qilish uchun ❌ Bekor qilish tugmasini bosing.",
    adminCancelKeyboard
  );
};

export const adminChannelsHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  try {
    await ctx.reply(...(await buildChannelsListMessage()));
  } catch (err) {
    console.error("adminChannelsHandler:", err.message);
    await ctx.reply(`⚠️ Kanallar paneli ochilmadi: ${err.message}`);
  }
};

const buildChannelsListMessage = async () => {
  const channels = await Channel.find().sort({ createdAt: 1 });

  const list = channels.length
    ? channels
        .map(
          (ch, i) =>
            `${i + 1}. ${esc(ch.title || ch.username)} (<code>${esc(ch.username)}</code>)`
        )
        .join("\n")
    : "<i>Hali kanal yo'q</i>";

  const buttons = [[successCb("➕ Kanal qo'shish", "adm_ch_add")]];

  for (const ch of channels) {
    const id = String(ch._id);
    const label = (ch.title || ch.username).slice(0, 35);
    buttons.push([primaryCb(`📢 ${label}`, `adm_ch_sel_${id}`)]);
  }

  buttons.push([primaryCb("🔄 Yangilash", "adm_ch_list")]);

  return [
    `📢 <b>Kanallar</b>\n\n` +
      `Bu yerda qo'shilgan kanallar majburiy obuna uchun ishlatiladi.\n` +
      `Kanalni o'chirsangiz — majburiy obunadan ham chiqadi.\n\n` +
      `<b>Ro'yxat (${channels.length}):</b>\n${list}\n\n` +
      `👉 Tahrirlash/o'chirish uchun avval kanalni tanlang.`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons },
    },
  ];
};

const buildChannelDetailMessage = async (channelId) => {
  const ch = await Channel.findById(channelId);
  if (!ch) return null;

  const url = ch.username
    ? `https://t.me/${String(ch.username).replace("@", "")}`
    : ch.inviteLink || "—";

  return [
    `📢 <b>Kanal tanlandi</b>\n\n` +
      `📛 Nom: <b>${esc(ch.title || ch.username)}</b>\n` +
      `🔗 Username: <code>${esc(ch.username)}</code>\n` +
      `🌐 URL: ${esc(url)}\n` +
      `🆔 chatId: <code>${esc(ch.chatId || "—")}</code>\n\n` +
      `Quyidagilardan birini tanlang:`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [primaryCb("✏️ Tahrirlash", `adm_ch_edit_${ch._id}`)],
          [dangerCb("🗑 O'chirish", `adm_ch_del_${ch._id}`)],
          [primaryCb("⬅️ Ro'yxatga qaytish", "adm_ch_list")],
        ],
      },
    },
  ];
};

export const handleAdminChannelActions = async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCbQuery("⛔ Faqat admin", { show_alert: true });
  }

  const data = ctx.callbackQuery.data;

  if (data === "adm_ch_list") {
    await ctx.answerCbQuery();
    return ctx.editMessageText(...(await buildChannelsListMessage()));
  }

  if (data === "adm_ch_add") {
    await ctx.answerCbQuery();
    setState(ctx.from.id, { step: "channel_username" });
    await ctx.reply(
      "➕ <b>Yangi kanal</b>\n\n" +
        "Yuboring:\n" +
        "• <code>@kanal</code>\n" +
        "• <code>https://t.me/kanal</code>\n\n" +
        "⚠️ Bot kanalda <b>admin</b> bo'lishi shart!\n" +
        "Qo'shilgan kanal majburiy obunaga avtomatik qo'shiladi.",
      { parse_mode: "HTML", ...adminCancelKeyboard }
    );
    return;
  }

  if (data.startsWith("adm_ch_sel_")) {
    const id = data.replace("adm_ch_sel_", "");
    const detail = await buildChannelDetailMessage(id);
    if (!detail) {
      await ctx.answerCbQuery("Kanal topilmadi", { show_alert: true });
      return ctx.editMessageText(...(await buildChannelsListMessage()));
    }
    await ctx.answerCbQuery("Kanal tanlandi");
    return ctx.editMessageText(...detail);
  }

  if (data.startsWith("adm_ch_del_")) {
    const id = data.replace("adm_ch_del_", "");
    const removed = await Channel.findByIdAndDelete(id);
    await ctx.answerCbQuery(
      removed
        ? `O'chirildi va majburiy obunadan olindi: ${removed.username}`
        : "Topilmadi",
      { show_alert: true }
    );
    return ctx.editMessageText(...(await buildChannelsListMessage()));
  }

  if (data.startsWith("adm_ch_edit_")) {
    const id = data.replace("adm_ch_edit_", "");
    const channel = await Channel.findById(id);
    if (!channel) {
      await ctx.answerCbQuery("Kanal topilmadi", { show_alert: true });
      return ctx.editMessageText(...(await buildChannelsListMessage()));
    }

    await ctx.answerCbQuery();
    setState(ctx.from.id, { step: "channel_edit", channelId: id });
    await ctx.reply(
      `✏️ <b>Kanalni tahrirlash</b>\n\n` +
        `Hozirgi: <code>${esc(channel.username)}</code>\n` +
        `Nom: ${esc(channel.title || "—")}\n\n` +
        `Yangi <b>@username</b> yoki <b>https://t.me/...</b> link yuboring.\n` +
        `⚠️ Bot yangi kanalda ham admin bo'lishi kerak!`,
      { parse_mode: "HTML", ...adminCancelKeyboard }
    );
  }
};

export const adminStatsHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      userCount,
      usersToday,
      usersWeek,
      usersMonth,
      merchCount,
      channelCount,
      channels,
      balanceAgg,
      referralAgg,
      orderCount,
      ordersByStatus,
      revenueAgg,
      topReferrers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Merch.countDocuments(),
      Channel.countDocuments(),
      Channel.find(),
      User.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]),
      User.aggregate([
        { $group: { _id: null, total: { $sum: { $size: { $ifNull: ["$referrals", []] } } } } },
      ]),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      User.aggregate([
        {
          $project: {
            firstName: 1,
            username: 1,
            refCount: { $size: { $ifNull: ["$referrals", []] } },
          },
        },
        { $match: { refCount: { $gt: 0 } } },
        { $sort: { refCount: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const totalBalance = balanceAgg[0]?.total || 0;
    const totalReferrals = referralAgg[0]?.total || 0;
    const totalRevenue = revenueAgg[0]?.total || 0;

    const statusMap = ordersByStatus.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    const channelList = channels.length
      ? channels.map((c) => `  • ${c.title || c.username} (${c.username})`).join("\n")
      : "  • Yo'q";

    const topList = topReferrers.length
      ? topReferrers
          .map(
            (u, i) =>
              `  ${i + 1}. ${u.firstName || "?"} (@${u.username || "yo'q"}) — ${u.refCount} ta`
          )
          .join("\n")
      : "  • Hali yo'q";

    await ctx.reply(
      `📊 STATISTIKA\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `👥 FOYDALANUVCHILAR\n` +
        `  • Jami: ${userCount}\n` +
        `  • Bugun: +${usersToday}\n` +
        `  • 7 kunda: +${usersWeek}\n` +
        `  • Bu oyda: +${usersMonth}\n\n` +
        `💰 MOLIYA\n` +
        `  • Umumiy balans: ${totalBalance.toLocaleString()} so'm\n` +
        `  • Tushum (yakunlangan): ${totalRevenue.toLocaleString()} so'm\n\n` +
        `👥 REFERAL\n` +
        `  • Jami takliflar: ${totalReferrals} ta\n\n` +
        `📦 BUYURTMALAR: ${orderCount}\n` +
        `  • ⏳ Kutilmoqda: ${statusMap.pending || 0}\n` +
        `  • 🔄 Jarayonda: ${statusMap.processing || 0}\n` +
        `  • ✅ Yakunlangan: ${statusMap.completed || 0}\n` +
        `  • ❌ Bekor: ${statusMap.cancelled || 0}\n\n` +
        `🏆 TOP REFERALLAR\n${topList}\n\n` +
        `👕 Merch: ${merchCount} ta\n` +
        `📢 Kanallar: ${channelCount} ta\n${channelList}`,
      adminMenu
    );
  } catch (err) {
    console.error("Statistika xatosi:", err.message);
    await ctx.reply("⚠️ Statistikani yuklashda xato yuz berdi.", adminMenu);
  }
};

export const adminBroadcastHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  setState(ctx.from.id, { step: "broadcast" });
  await ctx.reply(
    "📨 Barcha foydalanuvchilarga yuboriladigan xabarni yuboring:\n\n" +
    "• Matn yozing, yoki\n" +
    "• Rasm yuboring (izoh/caption qo'shishingiz mumkin)\n\n" +
    "Bekor qilish: ❌ Bekor qilish",
    adminCancelKeyboard
  );
};

const runBroadcast = async (ctx, sendToUser) => {
  const users = await User.find({}, "telegramId");
  let sent = 0;
  let blocked = 0;
  let otherErrors = 0;

  await ctx.reply(`📨 Yuborish boshlandi... (${users.length} ta foydalanuvchi)`);

  for (const user of users) {
    try {
      await sendToUser(user.telegramId);
      sent++;
    } catch (err) {
      const code = err?.response?.error_code;
      const desc = err?.response?.description || "";
      if (code === 403 || /bot was blocked|user is deactivated|chat not found/i.test(desc)) {
        blocked++;
      } else {
        otherErrors++;
      }
    }
  }

  clearState(ctx.from.id);
  await ctx.reply(
    `✅ Reklama yuborildi!\n\n` +
    `✔️ Yetkazildi: ${sent}\n` +
    `🚫 Botni bloklagan / o'chirgan: ${blocked}\n` +
    `⚠️ Boshqa xato: ${otherErrors}\n\n` +
    `Jami: ${users.length} ta foydalanuvchi`,
    adminMenu
  );
};

export const adminBackHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  clearState(ctx.from.id);
  await sendMainMenu(ctx, "🏠 *Asosiy menu*", { parse_mode: "Markdown" });
};

export const handleAdminTextInput = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return false;

  const text = ctx.message.text.trim();
  if (text === CANCEL_TEXT) {
    await adminCancelHandler(ctx);
    return true;
  }

  const state = getState(ctx.from.id);
  if (!state) return false;

  if (state.step === "merch_name") {
    setState(ctx.from.id, { ...state, step: "merch_description", name: text });
    await ctx.reply("📝 Mahsulot tavsifini yozing:", adminCancelKeyboard);
    return true;
  }

  if (state.step === "merch_description") {
    setState(ctx.from.id, { ...state, step: "merch_price", description: text });
    await ctx.reply("💰 Narxni so'mda kiriting (faqat raqam):", adminCancelKeyboard);
    return true;
  }

  if (state.step === "merch_price") {
    const price = parseInt(text.replace(/\s/g, ""), 10);
    if (isNaN(price) || price <= 0) {
      await ctx.reply("⚠️ Noto'g'ri narx. Qaytadan kiriting:", adminCancelKeyboard);
      return true;
    }

    await Merch.create({
      name: state.name,
      description: state.description,
      photo: state.photo,
      price,
    });

    clearState(ctx.from.id);
    await ctx.reply(
      `✅ Merch qo'shildi!\n\n` +
      `📛 ${state.name}\n` +
      `💰 ${price.toLocaleString()} so'm\n\n` +
      `Mahsulot Do'kon → MERCH bo'limida ko'rinadi.`,
      adminMenu
    );
    return true;
  }

  if (state.step === "channel_username" || state.step === "channel_edit") {
    const username = normalizeChannelUsername(text);
    if (!username) {
      await ctx.reply(
        "⚠️ Noto'g'ri format!\n\n" +
          "Qabul qilinadi:\n" +
          "• @kanal_nomi\n" +
          "• https://t.me/kanal_nomi",
        adminCancelKeyboard
      );
      return true;
    }

    const exists = await Channel.findOne({
      username,
      ...(state.step === "channel_edit" ? { _id: { $ne: state.channelId } } : {}),
    });
    if (exists) {
      clearState(ctx.from.id);
      await ctx.reply("⚠️ Bu kanal allaqachon qo'shilgan.", adminMenu);
      return true;
    }

    try {
      const botInfo = await ctx.telegram.getMe();
      const channelData = await validateChannelForBot(
        ctx.telegram,
        botInfo.id,
        username
      );

      if (state.step === "channel_edit") {
        await Channel.findByIdAndUpdate(state.channelId, channelData);
        clearState(ctx.from.id);
        await ctx.reply(
          `✅ Kanal yangilandi!\n\n` +
            `📢 ${channelData.title}\n` +
            `🔗 ${channelData.username}\n\n` +
            `Majburiy obuna ham shu kanalga yangilandi.`,
          adminMenu
        );
      } else {
        await Channel.create(channelData);
        clearState(ctx.from.id);
        await ctx.reply(
          `✅ Kanal qo'shildi!\n\n` +
            `📢 ${channelData.title}\n` +
            `🔗 ${channelData.username}\n\n` +
            `Majburiy obunaga avtomatik qo'shildi.`,
          adminMenu
        );
      }
    } catch (err) {
      await ctx.reply(
        `❌ Kanal saqlanmadi:\n${err.message}\n\n` +
          `Botni kanalga admin qilib qo'shing, keyin qayta urinib ko'ring.`,
        adminCancelKeyboard
      );
    }
    return true;
  }

  if (state.step === "broadcast") {
    await runBroadcast(ctx, (chatId) =>
      ctx.telegram.sendMessage(chatId, text)
    );
    return true;
  }

  return false;
};

export const handleAdminPhotoInput = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return false;

  const state = getState(ctx.from.id);
  if (!state) return false;

  const fileId = ctx.message.photo.at(-1).file_id;
  const caption = ctx.message.caption || "";

  if (state.step === "merch_photo") {
    try {
      const { relativePath } = await saveTelegramPhoto(
        ctx.telegram,
        fileId,
        "merch",
        `admin_${ctx.from.id}`
      );
      setState(ctx.from.id, { step: "merch_name", photo: relativePath });
      await ctx.reply("📛 Mahsulot nomini yozing:", adminCancelKeyboard);
    } catch (err) {
      console.error("Merch rasm saqlash xatosi:", err.message);
      await ctx.reply("⚠️ Rasm saqlanmadi. Qayta yuboring.", adminCancelKeyboard);
    }
    return true;
  }

  if (state.step === "broadcast") {
    try {
      await saveTelegramPhoto(ctx.telegram, fileId, "broadcast", `admin_${ctx.from.id}`);
      await runBroadcast(ctx, (chatId) =>
        ctx.telegram.sendPhoto(chatId, fileId, {
          caption: caption || undefined,
          parse_mode: caption ? "Markdown" : undefined,
        })
      );
    } catch (err) {
      console.error("Reklama rasm xatosi:", err.message);
      clearState(ctx.from.id);
      await ctx.reply("⚠️ Reklama yuborilmadi. Qayta urinib ko'ring.", adminMenu);
    }
    return true;
  }

  return false;
};
