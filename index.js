import "dotenv/config";

import { Telegraf, session } from "telegraf";

import { connectDB } from "./config/db.js";

import {
  startHandler,
  registerHandler,
  contactHandler,
} from "./handlers/start.js";

import { profileHandler } from "./handlers/profile.js";
import { aboutHandler } from "./handlers/about.js";

import {
  partnershipHandler,
  partnershipCallbackHandler,
  partnershipBackHandler,
} from "./handlers/partnership.js";

import {
  adminPanelHandler,
  adminMerchAddHandler,
  adminChannelsHandler,
  adminStatsHandler,
  adminBroadcastHandler,
  handleAdminChannelActions,
  adminBackHandler,
  adminCancelHandler,
  handleAdminTextInput,
  handleAdminPhotoInput,
} from "./handlers/admin.js";

import {
  balansHandler,
  pulIshlashHandler,
  topUpHandler,
  refStatsCallback,
  topUpCardCallback,
  topUpCancelCallback,
  handleTopUpAmountInput,
  handleAdminApprove,
  handleAdminReject,
} from "./handlers/balans.js";

import { sendShopMenu } from "./keyboards/MerchMenu.js";
import { sendMainMenu } from "./keyboards/mainMenu.js";
import {
  merchShopHandler,
  handleMerchProduct,
  handleMerchCatalog,
} from "./handlers/merch.js";
import {
  payServicesHandler,
  handlePayServiceSelect,
  handleShopPaymentsBack,
} from "./handlers/shop/payServices.js";
import {
  smmShopHandler,
  handleSmmCategoryPage,
  handleSmmCategorySelect,
  handleSmmServicePage,
  handleSmmServiceSelect,
  handleSmmLinkInput,
  handleSmmQtyInput,
  handleSmmConfirm,
  handleSmmCancel,
  handleSmmBackCategories,
} from "./handlers/shop/smmShop.js";
import { checkSubscription, recheckSubscription } from "./middlewares/checkSubscription.js";

import { saveTelegramPhoto } from "./services/fileStorage.js";
import { startPaymentWebhookServer } from "./services/paymentWebhook.js";
import { startPaymentPoller } from "./services/paymentService.js";
import { isMulticardConfigured } from "./services/multicard.js";
import { isSmsPaymentEnabled } from "./services/smsPayment.js";
import { handleAdminSmsForward } from "./handlers/smsPayment.js";

// ─────────────────────────────────────────────
const bot = new Telegraf(process.env.BOT_TOKEN);

connectDB();

if (isMulticardConfigured()) {
  startPaymentPoller(bot.telegram);
  console.log("💳 Multicard polling yoqildi");
}

// JustRunMy va boshqa PaaS health-check uchun har doim HTTP server
startPaymentWebhookServer(bot.telegram);

if (isSmsPaymentEnabled()) {
  console.log("📩 SMS orqali avto to'lov yoqildi");
} else if (!isMulticardConfigured()) {
  console.log("To'lov tizimi sozlanmagan");
}

bot.use(session());

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
const fromNav = (handler) => async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  return handler(ctx);
};

bot.action("nav_shop", fromNav(async (ctx) => sendShopMenu(ctx)));
bot.action("nav_profile", fromNav(profileHandler));
bot.action("nav_partner", fromNav(partnershipHandler));
bot.action("nav_about", fromNav(aboutHandler));
bot.action("nav_balance", fromNav(balansHandler));
bot.action("nav_main", fromNav(async (ctx) => sendMainMenu(ctx, "🏠 *Asosiy menu*", { parse_mode: "Markdown" })));
bot.action("nav_merch", fromNav(merchShopHandler));
bot.action("nav_ref", fromNav(pulIshlashHandler));
bot.action("nav_topup", fromNav(topUpHandler));

bot.hears(["🛍 Do'kon", "🔴 Do'kon"], async (ctx) => sendShopMenu(ctx));
bot.hears(["👤 Profilim", "🟠 Profilim"], profileHandler);
bot.hears(["ℹ️ Bot haqida", "🟢 Bot haqida"], aboutHandler);
bot.hears(["🤝 Hamkorlik", "🟡 Hamkorlik"], partnershipHandler);
bot.hears(["💰 Balans", "🔵 Balans"], balansHandler);
bot.hears(["💸 Pul Ishlash", "🟣 Pul Ishlash"], pulIshlashHandler);
bot.hears(["💰 Balansni to'ldirish", "🟡 Balansni to'ldirish"], topUpHandler);

// ── DO'KON ────────────────────────────────────
bot.hears(["👕 MERCH", "🔴 MERCH"], merchShopHandler);
bot.hears(["📱 SMM Xizmatlar", "🟢 SMM Xizmatlar"], smmShopHandler);
bot.hears(["💳 To'lov usullari", "🟢 To'lov usullari"], payServicesHandler);

// ── ORQAGA ────────────────────────────────────
const goBackToMain = async (ctx) => {
  await sendMainMenu(ctx, "🏠 *Asosiy menu*", { parse_mode: "Markdown" });
};
bot.hears(["⬅️ Orqaga", "🔙 Orqaga", "🔵 Orqaga"], goBackToMain);

// ── HAMKORLIK CALLBACKLARI ────────────────────
bot.action(/^partner_(?!back)/, partnershipCallbackHandler);
bot.action("partner_back", partnershipBackHandler);

// ── BALANS CALLBACKLARI ───────────────────────
bot.action("ref_stats", refStatsCallback);
bot.action("topup_card", topUpCardCallback);
bot.action("topup_cancel", topUpCancelCallback);
bot.action(/^approve_\d+_\d+$/, handleAdminApprove);
bot.action(/^reject_\d+$/, handleAdminReject);

// ── NAVIGATSIYA CALLBACKLARI ──────────────────
bot.action(/^pay_svc_[a-z]+$/, handlePayServiceSelect);
bot.action("shop_payments", handleShopPaymentsBack);
bot.action(/^smm_cats_\d+$/, handleSmmCategoryPage);
bot.action(/^smm_cat_\d+$/, handleSmmCategorySelect);
bot.action(/^smm_svcs_\d+$/, handleSmmServicePage);
bot.action(/^smm_svc_\d+$/, handleSmmServiceSelect);
bot.action("smm_confirm", handleSmmConfirm);
bot.action("smm_cancel", handleSmmCancel);
bot.action("smm_back_cats", handleSmmBackCategories);
bot.action(/^merch_[a-f\d]{24}$/i, handleMerchProduct);
bot.action("merch_catalog", handleMerchCatalog);

bot.action("back_shop", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  await sendShopMenu(ctx);
});

bot.action("back_main", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  await sendMainMenu(ctx, "🏠 *Asosiy menu*", { parse_mode: "Markdown" });
});

bot.action("check_sub", recheckSubscription);

// ── RASM KIRITISH ─────────────────────────────
bot.on("photo", async (ctx) => {
  if (await handleAdminPhotoInput(ctx)) return;

  try {
    const fileId = ctx.message.photo.at(-1).file_id;
    await saveTelegramPhoto(ctx.telegram, fileId, "incoming", `user_${ctx.from.id}`);
  } catch (err) {
    console.error("Rasm saqlash xatosi:", err.message);
  }
});

// ── RASM FAYL (document) ──────────────────────
bot.on("document", async (ctx) => {
  const mime = ctx.message.document?.mime_type || "";
  if (!mime.startsWith("image/")) return;

  try {
    await saveTelegramPhoto(
      ctx.telegram,
      ctx.message.document.file_id,
      "incoming",
      `doc_${ctx.from.id}`
    );
  } catch (err) {
    console.error("Document rasm saqlash xatosi:", err.message);
  }
});

// ── MATN KIRITISH ─────────────────────────────
bot.on("text", async (ctx, next) => {
  if (await handleAdminSmsForward(ctx)) return;
  if (await handleAdminTextInput(ctx)) return;

  if (ctx.session?.awaitingTopUpAmount) return handleTopUpAmountInput(ctx);
  if (await handleSmmLinkInput(ctx)) return;
  if (await handleSmmQtyInput(ctx)) return;

  return next();
});

// ── ADMIN PANEL ───────────────────────────────
bot.command("adminpanel", adminPanelHandler);
bot.hears("🟢 Merch qo'shish", adminMerchAddHandler);
bot.hears(/Kanallar/i, adminChannelsHandler);
bot.hears("🟡 Statistika", adminStatsHandler);
bot.hears("🟣 Reklama yuborish", adminBroadcastHandler);
bot.action(/^adm_ch_(list|add|sel_[a-f0-9]{24}|del_[a-f0-9]{24}|edit_[a-f0-9]{24})$/i, handleAdminChannelActions);
bot.hears("❌ Bekor qilish", adminCancelHandler);
bot.hears("🔙 Asosiy menu", adminBackHandler);

// ── TEST ──────────────────────────────────────
bot.command("myid", async (ctx) => {
  await ctx.reply(`🆔 Sizning ID: ${ctx.from.id}`);
});

// ── BOTNI ISHGA TUSHIRISH ─────────────────────
bot.catch((err, ctx) => {
  console.error(`Bot xatosi (${ctx?.updateType}):`, err?.message || err);
});

process.on("unhandledRejection", (err) => {
  console.error("Kutilmagan promise xatosi:", err?.message || err);
});

await bot.telegram.deleteWebhook({ drop_pending_updates: true });

bot
  .launch()
  .then(() => console.log("🚀 Bot muvaffaqiyatli ishga tushdi!"))
  .catch((err) => {
    console.error("❌ Bot ishga tushmadi:", err?.message || err);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
