export const premiumShopMenu = {
  inline_keyboard: [
    [{ text: "3 oy — 155,000 so'm",  callback_data: "buy_premium_3" }],
    [{ text: "6 oy — 225,000 so'm",  callback_data: "buy_premium_6" }],
    [{ text: "12 oy — 375,000 so'm", callback_data: "buy_premium_12" }],
    [{ text: "⬅️ Ortga",             callback_data: "back_main" }],
  ],
};

export const premiumForWhomMenu = (months) => ({
  inline_keyboard: [
    [{ text: "👤 O'zim uchun",                callback_data: `pself_${months}` }],
    [{ text: "🎁 Boshqa foydalanuvchi uchun", callback_data: `pother_${months}` }],
    [{ text: "⬅️ Orqaga",                     callback_data: "premium_shop" }],
  ],
});