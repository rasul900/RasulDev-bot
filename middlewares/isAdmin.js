import { ADMINS } from "../config/admin.js";

export const isAdmin = (ctx) => {
  return ADMINS.includes(ctx.from.id);
};