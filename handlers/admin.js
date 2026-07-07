import { Markup } from "telegraf";
import Channel from "../models/Channel.js";
import User from "../models/User.js";
import Merch from "../models/Merch.js";
import Order from "../models/Order.js";
import { isAdmin } from "../config/admin.js";
import {
  normalizeChannelUsername,
  validateChannelForBot,
} from "../middlewares/checkSubscription.js";
import { adminMenu } from "../keyboards/adminMenu.js";
import { mainMenu } from "../keyboards/mainMenu.js";
import { clearState, getState, setState } from "../utilis/states.js";

export const adminPanelHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply(
      `⛔ Siz admin emassiz.\n\n🆔 Sizning ID: \`${ctx.from.id}\`\n` +
      `_Bu ID ni .env faylidagi ADMIN_ID ga qo'ying._`,
      { parse_mode: "Markdown" }
    );
  }

  await ctx.reply("⚙️ Admin Panel", adminMenu);
};

export const adminMerchAddHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  setState(ctx.from.id, { step: "merch_photo" });
  await ctx.reply("📷 Merch uchun rasm yuboring:");
};

export const adminChannelAddHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  setState(ctx.from.id, { step: "channel_username" });
  await ctx.reply(
    "📢 Kanal username yuboring:\n\n" +
    "Masalan: @rasul_devlop\n\n" +
    "⚠️ Muhim: Bot avval kanalga admin sifatida qo'shilishi kerak!"
  );
};

export const adminStatsHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const [userCount, orderCount, merchCount, channelCount] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Merch.countDocuments(),
    Channel.countDocuments(),
  ]);

  await ctx.reply(
    `📊 *Statistika*\n\n` +
    `👥 Foydalanuvchilar: *${userCount}*\n` +
    `📦 Buyurtmalar: *${orderCount}*\n` +
    `👕 Merch mahsulotlar: *${merchCount}*\n` +
    `📢 Obuna kanallar: *${channelCount}*`,
    { parse_mode: "Markdown" }
  );
};

export const adminBroadcastHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  setState(ctx.from.id, { step: "broadcast_text" });
  await ctx.reply("📨 Barcha foydalanuvchilarga yuboriladigan xabarni yozing:");
};

export const adminBackHandler = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  clearState(ctx.from.id);
  await ctx.reply("🏠 Asosiy menu", mainMenu);
};

export const handleAdminTextInput = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return false;

  const state = getState(ctx.from.id);
  if (!state) return false;

  const text = ctx.message.text.trim();

  if (state.step === "merch_name") {
    setState(ctx.from.id, { ...state, step: "merch_description", name: text });
    await ctx.reply("📝 Mahsulot tavsifini yozing:");
    return true;
  }

  if (state.step === "merch_description") {
    setState(ctx.from.id, { ...state, step: "merch_price", description: text });
    await ctx.reply("💰 Narxni so'mda kiriting (faqat raqam):");
    return true;
  }

  if (state.step === "merch_price") {
    const price = parseInt(text.replace(/\s/g, ""), 10);
    if (isNaN(price) || price <= 0) {
      await ctx.reply("⚠️ Noto'g'ri narx. Qaytadan kiriting:");
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
      `✅ *Merch qo'shildi!*\n\n` +
      `📛 ${state.name}\n` +
      `💰 ${price.toLocaleString()} so'm\n\n` +
      `_Mahsulot Do'kon → MERCH bo'limida ko'rinadi._`,
      { parse_mode: "Markdown" }
    );
    return true;
  }

  if (state.step === "channel_username") {
    const username = normalizeChannelUsername(text);
    if (!username) {
      await ctx.reply("⚠️ Noto'g'ri format. Masalan: @kanal_nomi");
      return true;
    }

    const exists = await Channel.findOne({ username });
    if (exists) {
      await ctx.reply("⚠️ Bu kanal allaqachon qo'shilgan.");
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
        `✅ *Kanal qo'shildi!*\n\n` +
        `📢 ${channelData.title}\n` +
        `🔗 ${channelData.username}\n\n` +
        `_Endi foydalanuvchilar obuna bo'lmaguncha bot ishlamaydi._\n` +
        `⚠️ Bot kanalda admin bo'lishi shart!`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      await ctx.reply(
        `❌ Kanal qo'shilmadi:\n${err.message}\n\n` +
        `📌 Botni kanalga *admin* qilib qo'shing, keyin qayta urinib ko'ring.`
      );
    }
    return true;
  }

  if (state.step === "broadcast_text") {
    const users = await User.find({}, "telegramId");
    let sent = 0;
    let failed = 0;

    await ctx.reply(`📨 Yuborish boshlandi... (${users.length} ta foydalanuvchi)`);

    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(user.telegramId, text);
        sent++;
      } catch {
        failed++;
      }
    }

    clearState(ctx.from.id);
    await ctx.reply(`✅ Reklama yuborildi!\n\n✔️ Muvaffaqiyatli: ${sent}\n❌ Xato: ${failed}`);
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
  await ctx.reply("📛 Mahsulot nomini yozing:");
  return true;
};
