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
import { mainMenu } from "../keyboards/mainMenu.js";
import { clearState, getState, setState } from "../utilis/states.js";

const CANCEL_TEXT = "❌ Bekor qilish";

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

export const adminChannelAddHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  setState(ctx.from.id, { step: "channel_username" });
  await ctx.reply(
    "📢 Kanal ma'lumotini yuboring:\n\n" +
    "Qabul qilinadi:\n" +
    "• @kanal_nomi\n" +
    "• kanal_nomi\n" +
    "• https://t.me/kanal_nomi\n\n" +
    "⚠️ Bot avval kanalga admin qilib qo'shilishi kerak!\n\n" +
    "Bekor qilish: ❌ Bekor qilish",
    adminCancelKeyboard
  );
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
      { $project: { firstName: 1, username: 1, refCount: { $size: { $ifNull: ["$referrals", []] } } } },
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
        .map((u, i) => `  ${i + 1}. ${u.firstName || "?"} (@${u.username || "yo'q"}) — ${u.refCount} ta`)
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

  setState(ctx.from.id, { step: "broadcast_text" });
  await ctx.reply(
    "📨 Barcha foydalanuvchilarga yuboriladigan xabarni yozing:\n\n" +
    "Bekor qilish: ❌ Bekor qilish",
    adminCancelKeyboard
  );
};

export const adminBackHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  clearState(ctx.from.id);
  await ctx.reply("🏠 Asosiy menu", mainMenu);
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

  if (state.step === "channel_username") {
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

    const exists = await Channel.findOne({ username });
    if (exists) {
      await ctx.reply("⚠️ Bu kanal allaqachon qo'shilgan.", adminMenu);
      clearState(ctx.from.id);
      return true;
    }

    try {
      const botInfo = await ctx.telegram.getMe();
      const channelData = await validateChannelForBot(
        ctx.telegram,
        botInfo.id,
        username
      );

      await Channel.create(channelData);
      clearState(ctx.from.id);

      await ctx.reply(
        `✅ Kanal qo'shildi!\n\n` +
        `📢 ${channelData.title}\n` +
        `🔗 ${channelData.username}\n\n` +
        `Endi foydalanuvchilar obuna bo'lmaguncha bot ishlamaydi.`,
        adminMenu
      );
    } catch (err) {
      await ctx.reply(
        `❌ Kanal qo'shilmadi:\n${err.message}\n\n` +
        `Botni kanalga admin qilib qo'shing, keyin qayta urinib ko'ring.`,
        adminCancelKeyboard
      );
    }
    return true;
  }

  if (state.step === "broadcast_text") {
    const users = await User.find({}, "telegramId");
    let sent = 0;
    let blocked = 0;
    let otherErrors = 0;

    await ctx.reply(`📨 Yuborish boshlandi... (${users.length} ta foydalanuvchi)`);

    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(user.telegramId, text);
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
    return true;
  }

  return false;
};

export const handleAdminPhotoInput = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return false;

  const state = getState(ctx.from.id);
  if (!state || state.step !== "merch_photo") return false;

  const photo = ctx.message.photo.at(-1).file_id;
  setState(ctx.from.id, { step: "merch_name", photo });
  await ctx.reply("📛 Mahsulot nomini yozing:", adminCancelKeyboard);
  return true;
};
