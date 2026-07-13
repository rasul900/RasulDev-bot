/** Multicard/Rahmat API orqali qo'llab-quvvatlanadigan to'lov xizmatlari */
export const PAYMENT_SERVICES = [
  { id: "click", name: "Click", emoji: "💚", desc: "Click ilovasi orqali" },
  { id: "payme", name: "Payme", emoji: "💙", desc: "Payme ilovasi orqali" },
  { id: "uzum", name: "Uzum Bank", emoji: "🟣", desc: "Uzum Bank orqali" },
  { id: "uzcard", name: "Uzcard", emoji: "💳", desc: "Uzcard kartalari" },
  { id: "humo", name: "Humo", emoji: "💳", desc: "Humo kartalari" },
  { id: "visa", name: "Visa", emoji: "💳", desc: "Visa kartalari" },
  { id: "mastercard", name: "Mastercard", emoji: "💳", desc: "Mastercard kartalari" },
  { id: "anorbank", name: "Anorbank", emoji: "🏦", desc: "Anorbank orqali" },
  { id: "oson", name: "Oson", emoji: "📱", desc: "Oson ilovasi orqali" },
  { id: "alif", name: "Alif", emoji: "📱", desc: "Alif orqali" },
  { id: "xazna", name: "Xazna", emoji: "📱", desc: "Xazna orqali" },
  { id: "beepul", name: "Beepul", emoji: "📱", desc: "Beepul orqali" },
];

export const getPaymentService = (id) =>
  PAYMENT_SERVICES.find((s) => s.id === id);
