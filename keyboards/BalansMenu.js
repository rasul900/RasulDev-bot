import { Markup } from "telegraf";
import { successBtn, primaryBtn } from "./styledButton.js";

export const balansMenu = Markup.keyboard([
  [successBtn("💸 Pul Ishlash"), successBtn("💰 balansni toldirish")],
  [primaryBtn("⬅️ Orqaga")],
]).resize();
