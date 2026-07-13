export const paymentCard = {
  number: process.env.PAYMENT_CARD_NUMBER || "9860 2466 0223 7355",
  holder: process.env.PAYMENT_CARD_HOLDER || "A.A",
};

export const formatPaymentCard = () =>
  `💳 *Karta:* \`${paymentCard.number}\`\n👤 *Egasi:* *${paymentCard.holder}*`;
