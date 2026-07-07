import { Markup } from "telegraf";
import Channel from "../models/Channel.js";
import User from "../models/User.js";
import Merch from "../models/Merch.js";
import Order from "../models/Order.js";
import { ADMINS } from "../config/admin.js";
import { adminMenu } from "../keyboards/adminMenu.js";
import { mainMenu } from "../keyboards/mainMenu.js";
import { clearState, getState, setState } from "../utilis/states.js";

const isAdminUser = (userId) => ADMINS.includes(userId);

export const adminPanelHandler = async (ctx) => {
  if (!isAdminUser(ctx.from.id)) {
    return ctx.reply("⛔ Siz admin emassiz");
  }

  await ctx.reply("⚙️ Admin Panel", adminMenu);
};

export const adminMerchAddHandler = async (ctx) => {
  if (!isAdminUser(ctx.from.id)) return;

  setState(ctx.from.id, { step: "merch_photo" });
  await ctx.reply("📷 Merch uchun rasm yuboring:");
};

export const adminChannelAddHandler = async (ctx) => {
  if (!isAdminUser(ctx.from.id)) return;

  setState(ctx.from.id, { step: "channel_username" });
  await ctx.reply(
    "📢 Kanal username yuboring:\n\n" +
    "_Masalan: @rasul_devlop yoki rasul_devlop_",
    { parse_mode: "Markdown" }
  );
};

export const adminStatsHandler = async (ctx) => {
  if (!isAdminUser(ctx.from.id)) return;

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
  if (!isAdminUser(ctx.from.id)) return;

  setState(ctx.from.id, { step: "broadcast_text" });
  await ctx.reply("📨 Barcha foydalanuvchilarga yuboriladigan xabarni yozing:");
};

export const adminBackHandler = async (ctx) => {
  if (!isAdminUser(ctx.from.id)) return;

  clearState(ctx.from.id);
  await ctx.reply("🏠 Asosiy menu", mainMenu);
};

export const handleAdminTextInput = async (ctx) => {
  if (!isAdminUser(ctx.from.id)) return false;

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
    await ctx.reply(`✅ Merch qo'shildi: *${state.name}* — ${price.toLocaleString()} so'm`, {
      parse_mode: "Markdown",
    });
    return true;
  }

  if (state.step === "channel_username") {
    const username = text.startsWith("@") ? text : `@${text}`;
    const exists = await Channel.findOne({ username });
    if (exists) {
      await ctx.reply("⚠️ Bu kanal allaqachon qo'shilgan.");
      clearState(ctx.from.id);
      return true;
    }

    await Channel.create({ username });
    clearState(ctx.from.id);
    await ctx.reply(`✅ Kanal qo'shildi: ${username}`);
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
  if (!isAdminUser(ctx.from.id)) return false;

  const state = getState(ctx.from.id);
  if (!state || state.step !== "merch_photo") return false;

  const photo = ctx.message.photo.at(-1).file_id;
  setState(ctx.from.id, { step: "merch_name", photo });
  await ctx.reply("📛 Mahsulot nomini yozing:");
  return true;
};
