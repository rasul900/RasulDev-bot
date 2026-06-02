import dotenv from "dotenv";
dotenv.config();

import { Telegraf } from "telegraf";

import { connectDB } from "./config/db.js";

import {
  startHandler,
  registerHandler,
  contactHandler
} from "./handlers/start.js";

import { profileHandler } from "./handlers/profile.js";
import { aboutHandler } from "./handlers/about.js";

import {
  partnershipHandler,
  partnershipCallbackHandler,
  partnershipBackHandler
} from "./handlers/partnership.js";

import { adminPanelHandler } from "./handlers/admin.js";

import { merchMenu } from "./keyboards/MerchMenu.js";
import { mainMenu } from "./keyboards/mainMenu.js";

import { checkSubscription } from "./middlewares/checkSubscription.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

// MongoDB ulash
connectDB();

// Majburiy obuna middleware
bot.use(checkSubscription);

// START
bot.start(startHandler);

// RO'YXATDAN O'TISH
bot.hears(
  "🚀 Botdan foydalanish uchun ro'yxatdan o'ting",
  registerHandler
);

bot.on("contact", contactHandler);

// MAIN MENU
bot.hears("📊 Profilim", profileHandler);

bot.hears("ℹ️ Bot haqida", aboutHandler);

bot.hears("🤝 Hamkorlik", partnershipHandler);

// DO'KON
bot.hears("👔 Do'kon", async (ctx) => {
  await ctx.reply(
    "🛍 Do'kon bo'limiga xush kelibsiz!",
    merchMenu
  );
});

// ORQAGA
bot.hears("🔙 Orqaga", async (ctx) => {
  await ctx.reply(
    "🏠 Asosiy menu",
    mainMenu
  );
});

// HAMKORLIK CALLBACKLARI
bot.action(
  /^partner_(?!back)/,
  partnershipCallbackHandler
);

bot.action(
  "partner_back",
  partnershipBackHandler
);

// ADMIN PANEL
bot.command(
  "adminpanel",
  adminPanelHandler
);

// TEST UCHUN ID KO'RISH
bot.command("myid", async (ctx) => {
  await ctx.reply(
    `🆔 Sizning ID: ${ctx.from.id}`
  );
});

// BOTNI ISHGA TUSHIRISH
bot.launch();

console.log(
  "🚀 Bot muvaffaqiyatli ishga tushdi!"
);

// STOP
process.once("SIGINT", () =>
  bot.stop("SIGINT")
);

process.once("SIGTERM", () =>
  bot.stop("SIGTERM")
);

bot.command("adminpanel", async (ctx) => {
  console.log("ADMIN COMMAND ISHLADI");
  await ctx.reply("Admin command ishladi");
});