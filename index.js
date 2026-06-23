import dotenv from "dotenv";
dotenv.config();

import { Telegraf, session } from "telegraf";

import { connectDB } from "./config/db.js";

import {
  startHandler,
  registerHandler,
  contactHandler
} from "./handlers/start.js";

import { profileHandler }     from "./handlers/profile.js";
import { aboutHandler }       from "./handlers/about.js";

import {
  partnershipHandler,
  partnershipCallbackHandler,
  partnershipBackHandler
} from "./handlers/partnership.js";

import { adminPanelHandler }  from "./handlers/admin.js";

import {
  balansHandler,
  pulIshlashHandler,
  topUpHandler,
  refStatsCallback,
  topUpCardCallback,
  topUpAdminCallback,
  quickAmountCallback,
  sendCheckCallback,
  topUpCancelCallback,
  handleTopUpAmountInput,
  handleCheckPhoto,
  handleAdminApprove,
  handleAdminReject,
} from "./handlers/balans.js";

import { merchMenu }          from "./keyboards/MerchMenu.js";
import { mainMenu }           from "./keyboards/mainMenu.js";
import { merchFutbolka }      from "./handlers/futbolka.js";
import { checkSubscription }  from "./middlewares/checkSubscription.js";

import {
  StarsShop,
  handleBuyStars,
  handleForSelf,
  handleForOther,
  handleUserIdInput,
  handleCustomAmount,
  handleConfirmStars,
  handleStarsBack,
} from "./handlers/Stars.js";

import {
  PremiumShop,
  handleBuyPremium,
  handlePremiumForSelf,
  handlePremiumForOther,
  handlePremiumUserIdInput,
  handleConfirmPremium,
  handlePremiumBack,
} from "./handlers/Premiumm.js";

import {
  ucHandler,
  handleUcPackage,
  handlePubgIdInput,
  handleUcConfirm,
  handleUcCancel,
} from "./handlers/shop/uc.js";

// ─────────────────────────────────────────────
const bot = new Telegraf(process.env.BOT_TOKEN);

// MongoDB ulash
connectDB();

// Session middleware (Stars, Premium va UC uchun zarur)
bot.use(session());

// Majburiy obuna middleware
bot.use(checkSubscription);

// ── START ─────────────────────────────────────
bot.start(startHandler);

// ── RO'YXATDAN O'TISH ─────────────────────────
bot.hears(
  "🚀 Botdan foydalanish uchun ro'yxatdan o'ting",
  registerHandler
);
bot.on("contact", contactHandler);

// ── MAIN MENU ─────────────────────────────────
bot.hears("📊 Profilim",    profileHandler);
bot.hears("ℹ️ Bot haqida", aboutHandler);
bot.hears("🤝 Hamkorlik",  partnershipHandler);
bot.hears("💲 Balans",  balansHandler);
bot.hears("💸 Pul Ishlash",         pulIshlashHandler);
bot.hears("💰 Balansni to'ldirish", topUpHandler);

// ── DO'KON ────────────────────────────────────
bot.hears("👔 Do'kon", async (ctx) => {
  await ctx.reply("🛍 Do'kon bo'limiga xush kelibsiz!", merchMenu);
});

bot.hears("👕 MERCH",   merchFutbolka);
bot.hears("⭐ Stars",   StarsShop);
bot.hears("👑 Premium", PremiumShop);
bot.hears("🎮 PUBG UC", ucHandler);

// ── ORQAGA ────────────────────────────────────
bot.hears("🔙 Orqaga", async (ctx) => {
  await ctx.reply("🏠 Asosiy menu", mainMenu);
});

bot.hears("🔙 Orqaga", async (ctx) => {
  await ctx.reply("🏠 Asosiy menu", mainMenu);
});
// ── HAMKORLIK CALLBACKLARI ────────────────────
bot.action(/^partner_(?!back)/, partnershipCallbackHandler);
bot.action("partner_back",      partnershipBackHandler);

// ── STARS CALLBACKLARI ────────────────────────
bot.action(/^buy_stars_\d+$/, handleBuyStars);
bot.action(/^self_\d+$/,      handleForSelf);
bot.action(/^other_\d+$/,     handleForOther);
bot.action("confirm_stars",   handleConfirmStars);
bot.action("stars_shop",      handleStarsBack);

// ── PREMIUM CALLBACKLARI ──────────────────────
bot.action(/^buy_premium_\d+$/, handleBuyPremium);
bot.action(/^pself_\d+$/,       handlePremiumForSelf);
bot.action(/^pother_\d+$/,      handlePremiumForOther);
bot.action("confirm_premium",   handleConfirmPremium);
bot.action("premium_shop",      handlePremiumBack);

// ── UC (PUBG) CALLBACKLARI ────────────────────
bot.action(/^uc_(60|325|660|1800|3850|8100)$/, handleUcPackage);
bot.action("uc_confirm", handleUcConfirm);
bot.action("uc_cancel",  handleUcCancel);

bot.action("ref_stats",             refStatsCallback);
bot.action("topup_card",            topUpCardCallback);
bot.action("topup_admin",           topUpAdminCallback);
bot.action(/^amount_\d+$/,          quickAmountCallback);
bot.action("send_check",            sendCheckCallback);
bot.action("topup_cancel",          topUpCancelCallback);
bot.action(/^approve_\d+_\d+$/,     handleAdminApprove);
bot.action(/^reject_\d+$/,          handleAdminReject);

// bot.on("text") ichiga:


// Rasm kelganda:
bot.on("photo", async (ctx) => {
  if (ctx.session?.awaitingCheck || ctx.session?.awaitingAdminCheck) {
    return handleCheckPhoto(ctx);
  }
});


// ── MATN KIRITISH ─────────────────────────────
bot.on("text", async (ctx, next) => {
  // 1) Stars uchun username/ID kutilayotgan bo'lsa
  if (ctx.session?.awaitingUserId) {
    return handleUserIdInput(ctx);
  }

  // 2) Premium uchun username/ID kutilayotgan bo'lsa
  if (ctx.session?.awaitingPremiumUserId) {
    return handlePremiumUserIdInput(ctx);
  }

  // 3) PUBG ID kutilayotgan bo'lsa
  if (ctx.session?.awaitingPubgId) {
    return handlePubgIdInput(ctx);
  }

  // 4) Faqat raqam kiritilsa — custom stars miqdori
  if (/^\d+$/.test(ctx.message?.text?.trim())) {
    return handleCustomAmount(ctx);
  }

  return next();
});

bot.on("text", async (ctx, next) => {
  if (ctx.session?.awaitingTopUpAmount) return handleTopUpAmountInput(ctx);
  if (ctx.session?.awaitingUserId)        return handleUserIdInput(ctx);
  if (ctx.session?.awaitingPremiumUserId) return handlePremiumUserIdInput(ctx);
  if (ctx.session?.awaitingPubgId)        return handlePubgIdInput(ctx);
  if (ctx.session?.awaitingTopUpAmount)   return handleTopUpAmountInput(ctx);
  if (/^\d+$/.test(ctx.message?.text?.trim())) return handleCustomAmount(ctx);
  return next();
});

// ── ADMIN PANEL ───────────────────────────────
bot.command("adminpanel", adminPanelHandler);

// ── TEST ──────────────────────────────────────
bot.command("myid", async (ctx) => {
  await ctx.reply(`🆔 Sizning ID: ${ctx.from.id}`);
});

// ── BOTNI ISHGA TUSHIRISH ─────────────────────
bot.launch();
console.log("🚀 Bot muvaffaqiyatli ishga tushdi!");

process.once("SIGINT",  () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));