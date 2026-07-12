import { Markup } from "telegraf";
import { successBtn, primaryBtn } from "./styledButton.js";

export const startKeyboard = Markup.keyboard([
  [successBtn("🚀 Botdan foydalanish uchun ro'yxatdan o'ting")],
]).resize();

export const phoneKeyboard = Markup.keyboard([
  [{ text: "📞 Raqamni yuborish", request_contact: true, style: "success" }],
]).resize();
