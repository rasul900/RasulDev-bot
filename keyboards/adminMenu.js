import { Markup } from "telegraf";

export const adminMenu = Markup.keyboard([
  ["➕ Merch qo'shish", "📢 Kanal qo'shish"],
  ["📊 Statistika", "📨 Reklama yuborish"],
  ["❌ Bekor qilish", "🔙 Asosiy menu"],
]).resize();

export const adminCancelKeyboard = Markup.keyboard([
  ["❌ Bekor qilish"],
  ["🔙 Asosiy menu"],
]).resize();
