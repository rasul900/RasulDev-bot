export const starsShopMenu = {
  inline_keyboard: [
    [
      { text: "🔴 50 — 10,500 so'm",       callback_data: "buy_stars_50" },
      { text: "🟠 75 — 15,750 so'm",       callback_data: "buy_stars_75" },
    ],
    [
      { text: "🟡 100 — 21,000 so'm",      callback_data: "buy_stars_100" },
      { text: "🟢 150 — 31,500 so'm",      callback_data: "buy_stars_150" },
    ],
    [
      { text: "🔵 250 — 52,500 so'm",      callback_data: "buy_stars_250" },
      { text: "🟣 350 — 73,500 so'm",      callback_data: "buy_stars_350" },
    ],
    [
      { text: "🔴 500 — 105,000 so'm",     callback_data: "buy_stars_500" },
      { text: "🟠 750 — 157,500 so'm",     callback_data: "buy_stars_750" },
    ],
    [
      { text: "🟡 1,000 — 210,000 so'm",   callback_data: "buy_stars_1000" },
      { text: "🟢 1,500 — 315,000 so'm",   callback_data: "buy_stars_1500" },
    ],
    [
      { text: "🔵 2,500 — 525,000 so'm",   callback_data: "buy_stars_2500" },
      { text: "🟣 5,000 — 1,050,000 so'm", callback_data: "buy_stars_5000" },
    ],
    [
      { text: "🌟 10,000 — 2,100,000 so'm", callback_data: "buy_stars_10000" },
    ],
    [
      { text: "⬅️ Ortga", callback_data: "back_main" },
    ],
  ],
};

// Kim uchun so'rash menyusi
export const forWhomMenu = (stars, price) => ({
  inline_keyboard: [
    [{ text: "👤 O'zim uchun",                   callback_data: `self_${stars}` }],
    [{ text: "🎁 Boshqa foydalanuvchi uchun",    callback_data: `other_${stars}` }],
    [{ text: "⬅️ Orqaga",                        callback_data: "stars_shop" }],
  ],
});