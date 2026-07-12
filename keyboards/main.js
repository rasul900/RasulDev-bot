import { Markup } from "telegraf";
import { successBtn } from "./styledButton.js";

export const startKeyboard = Markup.keyboard([
  [successBtn("🚀 Botdan foydalanish uchun ro'yxatdan o'ting")],
]).resize();

export const phoneKeyboard = Markup.keyboard([
  [Markup.button.contactRequest("📞 Raqamni yuborish")],
]).resize();
