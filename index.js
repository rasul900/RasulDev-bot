import dotenv from "dotenv";
dotenv.config();
import { Telegraf } from "telegraf";
import { connectDB } from "./config/db.js";
import { startHandler, registerHandler, contactHandler } from "./handlers/start.js";
import { profileHandler } from "./handlers/profile.js";
import { aboutHandler } from "./handlers/about.js";
import { partnershipHandler, partnershipCallbackHandler, partnershipBackHandler } from "./handlers/partnership.js";
import { merchMenu } from "./keyboards/MerchMenu.js";
import { adminPanelHandler } from "./handlers/admin.js";


const bot = new Telegraf(process.env.BOT_TOKEN);
connectDB();

bot.start(startHandler);
bot.hears("🚀 Botdan foydalanish uchun ro'yxatdan o'ting", registerHandler);
bot.on("contact", contactHandler);
bot.hears("📊 Profilim", profileHandler);
bot.hears("ℹ️ Bot haqida", aboutHandler);
bot.hears("🤝 Hamkorlik", partnershipHandler);
bot.hears("👔 Do'kon", (ctx) => ctx.reply("🛍 Do'kon bo'limiga xush kelibsiz!", { ...merchMenu }));
bot.hears("🔙 Orqaga", (ctx) => ctx.reply("🔙 Asosiy menyuga qaytish uchun pastdagi tugmalardan foydalaning.", { ...mainMenu }));

bot.action(/^partner_(?!back)/, partnershipCallbackHandler);
bot.action("partner_back", partnershipBackHandler);
bot.use(checkSubscription);
bot.launch();
console.log("🚀 Bot muvaffaqiyatli ishga tushdi!");
bot.command(
  "adminpanel",
  adminPanelHandler
);

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));