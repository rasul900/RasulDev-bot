import { Markup } from "telegraf";
export const startKeyboard = Markup.keyboard([["🚀 Botdan foydalanish uchun ro'yxatdan o'ting"]]).resize();
export const phoneKeyboard = Markup.keyboard([[Markup.button.contactRequest("📞 Raqamni yuborish")]]).resize();