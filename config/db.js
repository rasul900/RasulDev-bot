import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB ulandi");
  } catch (err) {
    console.error("MongoDB ulanish xatosi:", err.message);
    process.exit(1);
  }
};
