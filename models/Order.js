import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({

  telegramId: {
    type: Number,
    required: true
  },

  username: {
    type: String,
    default: null
  },

  type: {
    type: String,
    enum: ["stars", "premium", "merch", "smm"],
    required: true
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  quantity: {
    type: Number,
    default: 1
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "completed",
      "cancelled"
    ],
    default: "pending"
  },

  note: {
    type: String,
    default: ""
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

export default mongoose.model(
  "Order",
  orderSchema
);