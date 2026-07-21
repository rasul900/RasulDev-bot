import mongoose from "mongoose";

const schema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  title: { type: String, default: "" },
  chatId: { type: String, default: "" },
  inviteLink: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Channel", schema);
