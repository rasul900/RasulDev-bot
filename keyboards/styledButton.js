/** Telegram Bot API 9.4+ rangli tugmalar */
export const successBtn = (text) => ({ text, style: "success" });
export const primaryBtn = (text) => ({ text, style: "primary" });
export const dangerBtn = (text) => ({ text, style: "danger" });

export const successCb = (text, data) => ({ text, callback_data: data, style: "success" });
export const primaryCb = (text, data) => ({ text, callback_data: data, style: "primary" });
export const dangerCb = (text, data) => ({ text, callback_data: data, style: "danger" });
