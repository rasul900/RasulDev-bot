import { isAdmin } from "../config/admin.js";

export const isAdminMiddleware = (ctx) => isAdmin(ctx.from.id);
