import { Markup } from "telegraf";
import { successBtn, primaryBtn } from "./styledButton.js";

export const mainMenu = Markup.keyboard([
  [successBtn("🔴 Do'kon"), successBtn("🟠 Profilim")],
  [primaryBtn("🟡 Hamkorlik"), primaryBtn("🟢 Bot haqida")],
  [primaryBtn("🔵 Balans")],
]).resize().persistent();
