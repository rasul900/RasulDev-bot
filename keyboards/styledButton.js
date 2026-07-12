/** Telegram Bot API 9.4+ rangli tugmalar */

// Reply keyboard
export const successBtn = (text) => ({ text, style: "success" });
export const primaryBtn = (text) => ({ text, style: "primary" });
export const dangerBtn = (text) => ({ text, style: "danger" });

// Inline callback
export const successCb = (text, data) => ({ text, callback_data: data, style: "success" });
export const primaryCb = (text, data) => ({ text, callback_data: data, style: "primary" });
export const dangerCb = (text, data) => ({ text, callback_data: data, style: "danger" });

// Inline URL
export const successUrl = (text, url) => ({ text, url, style: "success" });
export const primaryUrl = (text, url) => ({ text, url, style: "primary" });

/** Tasdiqlash + bekor qilish */
export const confirmCancelKb = (confirmData, cancelData) => ({
  inline_keyboard: [
    [successCb("✅ Tasdiqlash", confirmData)],
    [dangerCb("❌ Bekor qilish", cancelData)],
  ],
});

/** Orqaga tugmasi */
export const backKb = (data, label = "⬅️ Orqaga") => ({
  inline_keyboard: [[primaryCb(label, data)]],
});
