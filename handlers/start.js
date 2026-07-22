import User from "../models/User.js";
import { startKeyboard, phoneKeyboard } from "../keyboards/main.js";
import { sendMainMenu, refreshKeyboard } from "../keyboards/mainMenu.js";
import { handleMerchStart } from "./merch.js";
import { handlePaymentStart } from "../services/paymentService.js";

const REFERRAL_BONUS = 5000;

const parseStartPayload = (ctx) =>
  ctx.startPayload || ctx.message?.text?.split(" ")[1] || "";

const parseReferrerId = (ctx) => {
  const payload = parseStartPayload(ctx);
  if (!payload.startsWith("ref_")) return null;
  const id = parseInt(payload.replace("ref_", ""), 10);
  return isNaN(id) ? null : id;
};

const applyReferral = async (newUserId, referrerId) => {
  if (!referrerId || referrerId === newUserId) return;

  const referrer = await User.findOne({ telegramId: referrerId });
  if (!referrer || referrer.referrals.includes(newUserId)) return;

  referrer.referrals.push(newUserId);
  referrer.balance += REFERRAL_BONUS;
  await referrer.save();

  await User.findOneAndUpdate(
    { telegramId: newUserId },
    { referredBy: referrerId }
  );
};

export const startHandler = async (ctx) => {
  try {
    const payload = parseStartPayload(ctx);

    if (payload.startsWith("merch_")) {
      const productId = payload.replace("merch_", "");
      const handled = await handleMerchStart(ctx, productId);
      if (handled) return;
    }

    if (payload.startsWith("pay_")) {
      const orderId = payload.replace("pay_", "");
      const handled = await handlePaymentStart(ctx, orderId);
      if (handled) return;
    }

    const referrerId = parseReferrerId(ctx);
    if (referrerId) {
      ctx.session ??= {};
      ctx.session.referredBy = referrerId;
    }

    const user = await User.findOne({ telegramId: ctx.from.id });

    if (user) {
      await refreshKeyboard(ctx);
      await sendMainMenu(
        ctx,
        `🏠 *Asosiy Menyu*\n\n` +
        `👋 Xush kelibsiz, *${user.firstName}*!\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👇 Pastdagi menulardan ozingizga keraklisini tanlang\n` +
        `📬 Shu yerdan siz bizning kanalarimizdagi yangi postlar haqida habar olasiz!\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 Quyidagi bo'limlardan birini tanlang:`
      );
    } else {
      await ctx.reply(
        `✨ *Assalomu alaykum!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🤖 *RasulDev* botiga xush kelibsiz!\n` +
        `🛒 Stars, Premium, UC va boshqa xizmatlar\n` +
        `💎 Tez, qulay va ishonchli xarid\n` +
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
      await refreshKeyboard(ctx);
      await sendMainMenu(
        ctx,
        `✅ *Profilingiz topildi!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Ism: *${existing.firstName}*\n` +
        `📞 Tel: \`${existing.phone}\`\n` +
        `🌟 Holat: *Faol a'zo*\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 Menyu orqali davom eting:`
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

      const referrerId = ctx.session?.referredBy;
      if (referrerId) {
        await applyReferral(ctx.from.id, referrerId);
        ctx.session.referredBy = null;
      }

      await refreshKeyboard(ctx);
      await sendMainMenu(
        ctx,
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
        `📌 Quyidagi bo'limlardan birini tanlang:`
      );
    } else {
      await refreshKeyboard(ctx);
      await sendMainMenu(
        ctx,
        `✅ *Profilingiz allaqachon mavjud!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Ism: *${user.firstName}*\n` +
        `📞 Tel: \`${user.phone}\`\n` +
        `🟢 Holat: *Faol a'zo*\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 Davom etish uchun menyuni tanlang:`
      );
    }
  } catch (err) {
    console.error("❌ Contact xatosi:", err);
    await ctx.reply("⚠️ Texnik nosozlik. Iltimos, bir ozdan so'ng qayta urinib ko'ring.");
  }
};
