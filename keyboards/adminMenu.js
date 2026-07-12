import { Markup } from "telegraf";
import { successBtn, primaryBtn, dangerBtn } from "./styledButton.js";

export const adminMenu = Markup.keyboard([
  [successBtn("🟢 Merch qo'shish"), successBtn("🔵 Kanal qo'shish")],
  [primaryBtn("🟡 Statistika"), primaryBtn("🟣 Reklama yuborish")],
  [dangerBtn("❌ Bekor qilish"), primaryBtn("🔙 Asosiy menu")],
]).resize();

export const adminCancelKeyboard = Markup.keyboard([
  [dangerBtn("❌ Bekor qilish")],
  [primaryBtn("🔙 Asosiy menu")],
]).resize();
