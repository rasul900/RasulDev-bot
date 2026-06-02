import mongoose from "mongoose";

const merchSchema = new mongoose.Schema({
  name: String,
  description: String,
  photo: String,
  price: Number,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model(
  "Merch",
  merchSchema
);