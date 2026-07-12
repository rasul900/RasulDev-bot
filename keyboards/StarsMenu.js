import { successCb, primaryCb } from "./styledButton.js";

export const starsShopMenu = {
  inline_keyboard: [
    [
      successCb("⭐ 50 — 10,500 so'm", "buy_stars_50"),
      successCb("⭐ 75 — 15,750 so'm", "buy_stars_75"),
    ],
    [
      successCb("⭐ 100 — 21,000 so'm", "buy_stars_100"),
      successCb("⭐ 150 — 31,500 so'm", "buy_stars_150"),
    ],
    [
      successCb("⭐ 250 — 52,500 so'm", "buy_stars_250"),
      successCb("⭐ 350 — 73,500 so'm", "buy_stars_350"),
    ],
    [
      successCb("⭐ 500 — 105,000 so'm", "buy_stars_500"),
      successCb("⭐ 750 — 157,500 so'm", "buy_stars_750"),
    ],
    [
      successCb("⭐ 1,000 — 210,000 so'm", "buy_stars_1000"),
      successCb("⭐ 1,500 — 315,000 so'm", "buy_stars_1500"),
    ],
    [
      successCb("⭐ 2,500 — 525,000 so'm", "buy_stars_2500"),
      successCb("⭐ 5,000 — 1,050,000 so'm", "buy_stars_5000"),
    ],
    [
      successCb("🌟 10,000 — 2,100,000 so'm", "buy_stars_10000"),
    ],
    [
      primaryCb("⬅️ Orqaga", "back_main"),
    ],
  ],
};

export const forWhomMenu = (stars) => ({
  inline_keyboard: [
    [successCb("👤 O'zim uchun", `self_${stars}`)],
    [primaryCb("🎁 Boshqa foydalanuvchi uchun", `other_${stars}`)],
    [primaryCb("⬅️ Orqaga", "stars_shop")],
  ],
});
