import { Markup } from "telegraf";

export const adminMenu = Markup.keyboard([
  ["➕ Merch qo'shish"],
  ["📢 Kanal qo'shish"],
  ["📊 Statistika"],
  ["📨 Reklama yuborish"],
  ["🔙 Asosiy menu"]
]).resize();