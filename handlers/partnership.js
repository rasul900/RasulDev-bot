import { Markup } from "telegraf";
import { primaryCb, successUrl } from "../keyboards/styledButton.js";

const partnerCategories = () => Markup.inlineKeyboard([
  [primaryCb("🛍 Savdo va Do'konlar", "partner_savdo")],
  [primaryCb("💻 IT va Texnologiya", "partner_it")],
  [primaryCb("📱 Reklama va Marketing", "partner_reklama")],
  [primaryCb("🏗 Qurilish va Dizayn", "partner_qurilish")],
  [primaryCb("🍕 Oziq-ovqat va Restoran", "partner_restoran")],
  [primaryCb("📚 Ta'lim va Kurslar", "partner_talim")],
  [primaryCb("💊 Tibbiyot va Salomatlik", "partner_tibbiyot")],
  [primaryCb("🚀 Boshqa soha", "partner_boshqa")],
]);

export const partnershipHandler = async (ctx) => {
  await ctx.reply(
    `🤝 Hamkorlik\n\n` +
    `Biznes hamkorligiga qiziqasizmi?\n` +
    `Quyida biznes turini tanlang 👇`,
    partnerCategories()
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
      [successUrl("💬 Admin bilan bog'lanish", "https://t.me/Rasul_dev_admin")],
      [primaryCb("🔙 Orqaga", "partner_back")],
    ])
  );
};

export const partnershipBackHandler = async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🤝 Hamkorlik\n\n` +
    `Biznes hamkorligiga qiziqasizmi?\n` +
    `Quyida biznes turini tanlang 👇`,
    partnerCategories()
  );
};
