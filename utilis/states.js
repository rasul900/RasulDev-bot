export const userStates = {};

import { userStates } from "../utils/states.js";

bot.hears(
  "➕ Merch qo'shish",
  async (ctx) => {

    userStates[ctx.from.id] = {
      step: "photo"
    };

    await ctx.reply(
      "📷 Rasm yuboring"
    );
});