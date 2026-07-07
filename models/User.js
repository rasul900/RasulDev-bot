import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true, required: true },
  firstName: String,
  username: String,
  phone: String,
  balance: { type: Number, default: 0 },
  referrals: { type: [Number], default: [] },
  referredBy: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
