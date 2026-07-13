import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  telegramId: { type: Number, required: true, index: true },
  username: { type: String, default: null },
  amount: { type: Number, required: true },
  amountTiyin: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "cancelled"],
    default: "pending",
  },
  provider: { type: String, default: "multicard" },
  externalUuid: { type: String, default: null },
  checkoutUrl: { type: String, default: null },
  paidAt: { type: Date, default: null },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Payment", paymentSchema);
