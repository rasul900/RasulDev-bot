import User from "../models/User.js";
import { startKeyboard, phoneKeyboard } from "../keyboards/main.js";
import { mainMenu } from "../keyboards/mainMenu.js";

export const startHandler = async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (user) {
      await ctx.reply(
        `🏠 *Asosiy Menyu*\n\n` +
        `👋 Xush kelibsiz, *${user.firstName}*!\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🌟 Siz bizning *maxsus a'zomiz*\n` +
        `📬 Eng so'nggi kontentlar siz uchun tayyor!\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 Quyidagi bo'limlardan birini tanlang:`,
        { parse_mode: "Markdown", ...mainMenu }
      );
    } else {
      await ctx.reply(
        `✨ *Assalomu alaykum!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🚀 Kanalimizga xush kelibsiz!\n` +
        `🎯 Bu yerda siz uchun eng qimmatli kontent\n` +
        `💎 Eksklyuziv materiallar va yangiliklar\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `👇 Davom etish uchun ro'yxatdan o'ting:`,
        { parse_mode: "Markdown", ...startKeyboard }
      );
    }
  } catch (err) {
    console.error("❌ /start xatosi:", err);
    await ctx.reply("⚠️ Texnik nosozlik. Iltimos, bir ozdan so'ng qayta urinib ko'ring.");
  }
};

export const registerHandler = async (ctx) => {
  try {
    const existing = await User.findOne({ telegramId: ctx.from.id });

    if (existing) {
      await ctx.reply(
        `✅ *Profilingiz topildi!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Ism: *${existing.firstName}*\n` +
        `📞 Tel: \`${existing.phone}\`\n` +
        `🌟 Holat: *Faol a'zo*\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 Menyu orqali davom eting:`,
        { parse_mode: "Markdown", ...mainMenu }
      );
      return;
    }

    await ctx.reply(
      `📲 *Ro'yxatdan o'tish*\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📞 Telefon raqamingizni yuboring\n\n` +
      `🔐 Ma'lumotlaringiz:\n` +
      `• Faqat siz uchun saqlanadi\n` +
      `• Uchinchi shaxslarga berilmaydi\n` +
      `• To'liq himoyalangan\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `👇 Tugmani bosing:`,
      { parse_mode: "Markdown", ...phoneKeyboard }
    );
  } catch (err) {
    console.error("❌ Register xatosi:", err);
    await ctx.reply("⚠️ Texnik nosozlik. Iltimos, bir ozdan so'ng qayta urinib ko'ring.");
  }
};

export const contactHandler = async (ctx) => {
  try {
    if (ctx.message.contact.user_id !== ctx.from.id) {
      await ctx.reply(
        `⚠️ *Xatolik!*\n\n` +
        `Iltimos, faqat *o'z* raqamingizni yuboring!\n` +
        `Boshqa raqamlar qabul qilinmaydi.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    let user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      user = new User({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        username: ctx.from.username || "Noma'lum",
        phone: ctx.message.contact.phone_number,
      });
      await user.save();

      await ctx.reply(
        `🎊 *Tabriklaymiz, ${user.firstName}!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `✅ Ro'yxatdan muvaffaqiyatli o'tdingiz!\n` +
        `🌟 Siz endi bizning a'zomiz!\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `📋 *Sizning profilingiz:*\n` +
        `👤 Ism: *${user.firstName}*\n` +
        `📞 Tel: \`${user.phone}\`\n` +
        `🆔 ID: \`${user.telegramId}\`\n` +
        `🟢 Holat: *Faol*\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🚀 Endi barcha imkoniyatlar sizga ochiq!\n` +
        `📌 Quyidagi bo'limlardan birini tanlang:`,
        { parse_mode: "Markdown", ...mainMenu }
      );
    } else {
      await ctx.reply(
        `✅ *Profilingiz allaqachon mavjud!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Ism: *${user.firstName}*\n` +
        `📞 Tel: \`${user.phone}\`\n` +
        `🟢 Holat: *Faol a'zo*\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 Davom etish uchun menyuni tanlang:`,
        { parse_mode: "Markdown", ...mainMenu }
      );
    }
  } catch (err) {
    console.error("❌ Contact xatosi:", err);
    await ctx.reply("⚠️ Texnik nosozlik. Iltimos, bir ozdan so'ng qayta urinib ko'ring.");
  }
};