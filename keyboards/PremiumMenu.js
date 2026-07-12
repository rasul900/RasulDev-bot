import { successCb, primaryCb } from "./styledButton.js";

export const premiumShopMenu = {
  inline_keyboard: [
    [successCb("👑 3 oy — 155,000 so'm", "buy_premium_3")],
    [successCb("👑 6 oy — 225,000 so'm", "buy_premium_6")],
    [successCb("👑 12 oy — 375,000 so'm", "buy_premium_12")],
    [primaryCb("⬅️ Orqaga", "back_main")],
  ],
};

export const premiumForWhomMenu = (months) => ({
  inline_keyboard: [
    [successCb("👤 O'zim uchun", `pself_${months}`)],
    [primaryCb("🎁 Boshqa foydalanuvchi uchun", `pother_${months}`)],
    [primaryCb("⬅️ Orqaga", "premium_shop")],
  ],
});
