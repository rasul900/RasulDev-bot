import { PAYMENT_SERVICES, getPaymentService } from "../../config/paymentServices.js";
import { successCb, primaryCb } from "../../keyboards/styledButton.js";
import { isMulticardConfigured } from "../../services/multicard.js";
import { isSmsPaymentEnabled } from "../../services/smsPayment.js";
import { formatPaymentCard } from "../../config/paymentCard.js";

const buildServicesKeyboard = () => {
  const rows = [];
  for (let i = 0; i < PAYMENT_SERVICES.length; i += 2) {
    const a = PAYMENT_SERVICES[i];
    const b = PAYMENT_SERVICES[i + 1];
    const row = [successCb(`${a.emoji} ${a.name}`, `pay_svc_${a.id}`)];
    if (b) row.push(successCb(`${b.emoji} ${b.name}`, `pay_svc_${b.id}`));
    rows.push(row);
  }
  rows.push([primaryCb("⬅️ Orqaga", "back_shop")]);
  return { inline_keyboard: rows };
};

export const payServicesHandler = async (ctx) => {
  const autoPay = isMulticardConfigured() || isSmsPaymentEnabled();

  const text =
    `💳 *To'lov xizmatlari*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `API orqali ulangan to'lov usullari:\n\n` +
    PAYMENT_SERVICES.map((s) => `${s.emoji} *${s.name}* — ${s.desc}`).join("\n") +
    `\n━━━━━━━━━━━━━━━━━━━━\n\n` +
    (autoPay
      ? `✅ To'lovdan keyin balans *avtomatik* to'ldiriladi.\nKeyin do'kondan xarid qilasiz.`
      : `⚠️ To'lov tizimi sozlanmoqda.`);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: buildServicesKeyboard(),
    });
    await ctx.answerCbQuery();
    return;
  }

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: buildServicesKeyboard(),
  });
};

export const handlePayServiceSelect = async (ctx) => {
  const serviceId = ctx.callbackQuery.data.replace("pay_svc_", "");
  const service = getPaymentService(serviceId);

  if (!service) {
    return ctx.answerCbQuery("Xizmat topilmadi", { show_alert: true });
  }

  await ctx.answerCbQuery();

  const autoPay = isMulticardConfigured() || isSmsPaymentEnabled();

  await ctx.editMessageText(
    `${service.emoji} *${service.name}*\n\n` +
    `${service.desc}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    (autoPay
      ? `1️⃣ Balansni to'ldiring\n2️⃣ Do'kondan xarid qiling\n\n` +
        `Pul tushgach balans avtomatik yangilanadi.`
      : `Hozircha karta orqali to'lov mavjud.`) +
    `\n\n${formatPaymentCard()}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [successCb("💰 Balansni to'ldirish", "nav_topup")],
          [primaryCb("⬅️ Orqaga", "shop_payments")],
        ],
      },
    }
  );
};

export const handleShopPaymentsBack = async (ctx) => {
  await ctx.answerCbQuery();
  await payServicesHandler(ctx);
};
