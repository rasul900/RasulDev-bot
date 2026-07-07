import { Markup } from "telegraf";

export const mainMenu = Markup.keyboard([
  ["🛍️ Do'kon", "📊 Profilim", "💼 Hamkorlik"],
  ["🛡️ Bot haqida", "💎 Balans"]
]).resize().persistent();