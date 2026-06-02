import mongoose from "mongoose";

const settingSchema = new mongoose.Schema({

  forceSubEnabled: {
    type: Boolean,
    default: true
  },

  supportUsername: {
    type: String,
    default: ""
  },

  starsPrice: {
    type: Number,
    default: 0
  },

  premiumPrice: {
    type: Number,
    default: 0
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }

});

export default mongoose.model(
  "Setting",
  settingSchema
);
