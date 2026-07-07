export const getAdmins = () =>
  String(process.env.ADMIN_ID || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id));

export const isAdmin = (userId) => getAdmins().includes(userId);
