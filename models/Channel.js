import mongoose from "mongoose";

const schema = new mongoose.Schema({
  username: String
});

export default mongoose.model(
  "Channel",
  schema
);