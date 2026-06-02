import Channel from "../models/Channel.js";

export const checkSubscription =
  async (ctx, next) => {

    const channels =
      await Channel.find();

    for (const channel of channels) {

      try {

        const member =
          await ctx.telegram.getChatMember(
            channel.username,
            ctx.from.id
          );

        if (
          member.status === "left"
        ) {

          return ctx.reply(
            `❌ ${channel.username} kanaliga obuna bo'ling`
          );
        }

      } catch {}
    }

    return next();
};