import { Markup } from "telegraf";
import { mainMenu } from "../keyboards/mainMenu.js";

export const partnershipHandler = async (ctx) => {
  await ctx.reply(
    `🤝 Hamkorlik\n\n` +
    `Biznes hamkorligiga qiziqasizmi?\n` +
    `Quyida biznes turini tanlang 👇`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🛍 Savdo va Do'konlar", "partner_savdo")],
      [Markup.button.callback("💻 IT va Texnologiya", "partner_it")],
      [Markup.button.callback("📱 Reklama va Marketing", "partner_reklama")],
      [Markup.button.callback("🏗 Qurilish va Dizayn", "partner_qurilish")],
      [Markup.button.callback("🍕 Oziq-ovqat va Restoran", "partner_restoran")],
      [Markup.button.callback("📚 Ta'lim va Kurslar", "partner_talim")],
      [Markup.button.callback("💊 Tibbiyot va Salomatlik", "partner_tibbiyot")],
      [Markup.button.callback("🚀 Boshqa soha", "partner_boshqa")],
    ])
  );
};

export const partnershipCallbackHandler = async (ctx) => {
  const data = ctx.callbackQuery.data;
  await ctx.answerCbQuery();

  const topics = {
    partner_savdo:    "🛍 Savdo va Do'konlar",
    partner_it:       "💻 IT va Texnologiya",
    partner_reklama:  "📱 Reklama va Marketing",
    partner_qurilish: "🏗 Qurilish va Dizayn",
    partner_restoran: "🍕 Oziq-ovqat va Restoran",
    partner_talim:    "📚 Ta'lim va Kurslar",
    partner_tibbiyot: "💊 Tibbiyot va Salomatlik",
    partner_boshqa:   "🚀 Boshqa soha",
  };

  const selected = topics[data];

  await ctx.editMessageText(
    `${selected}\n\n` +
    `Hamkorlik uchun quyidagi ma'lumotlarni yuboring:\n\n` +
    `1️⃣ Ismingiz\n` +
    `2️⃣ Kompaniya/Biznes nomi\n` +
    `3️⃣ Telefon raqamingiz\n` +
    `4️⃣ Hamkorlikdan maqsadingiz\n\n` +
    `📩 Adminimiz 24 soat ichida siz bilan bog'lanadi!\n\n` +
    `👑 Admin: @Rasul_dev_admin`,
    Markup.inlineKeyboard([
      [Markup.button.url("💬 Admin bilan bog'lanish", "https://t.me/Rasul_dev_admin")],
      [Markup.button.callback("🔙 Orqaga", "partner_back")],
    ])
  );
};

export const partnershipBackHandler = async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🤝 Hamkorlik\n\n` +
    `Biznes hamkorligiga qiziqasizmi?\n` +
    `Quyida biznes turini tanlang 👇`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🛍 Savdo va Do'konlar", "partner_savdo")],
      [Markup.button.callback("💻 IT va Texnologiya", "partner_it")],
      [Markup.button.callback("📱 Reklama va Marketing", "partner_reklama")],
      [Markup.button.callback("🏗 Qurilish va Dizayn", "partner_qurilish")],
      [Markup.button.callback("🍕 Oziq-ovqat va Restoran", "partner_restoran")],
      [Markup.button.callback("📚 Ta'lim va Kurslar", "partner_talim")],
      [Markup.button.callback("💊 Tibbiyot va Salomatlik", "partner_tibbiyot")],
      [Markup.button.callback("🚀 Boshqa soha", "partner_boshqa")],
    ])
  );
};