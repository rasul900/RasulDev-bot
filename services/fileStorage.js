import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const UPLOAD_ROOT = path.join(PROJECT_ROOT, "uploads");

const ensureDir = async (subfolder) => {
  const dir = path.join(UPLOAD_ROOT, subfolder);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

/** Telegram rasmni qurilma xotirasiga saqlaydi. MongoDB ga emas! */
export const saveTelegramPhoto = async (telegram, fileId, subfolder, prefix = "") => {
  const dir = await ensureDir(subfolder);
  const link = await telegram.getFileLink(fileId);
  const response = await fetch(link.href);
  if (!response.ok) {
    throw new Error(`Rasm yuklab olinmadi: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = path.extname(new URL(link.href).pathname) || ".jpg";
  const safePrefix = prefix ? `${prefix}_` : "";
  const filename = `${safePrefix}${Date.now()}${ext}`;
  const fullPath = path.join(dir, filename);

  await fs.writeFile(fullPath, buffer);

  const relativePath = path.join("uploads", subfolder, filename).replace(/\\/g, "/");
  return { relativePath, fullPath };
};

export const resolveUploadPath = (relativePath) =>
  path.isAbsolute(relativePath) ? relativePath : path.join(PROJECT_ROOT, relativePath);

export const fileExists = async (relativePath) => {
  try {
    await fs.access(resolveUploadPath(relativePath));
    return true;
  } catch {
    return false;
  }
};

/** Eski Merch yozuvlari uchun: file_id yoki lokal yo'l */
export const isLocalPhoto = (photo) =>
  Boolean(photo && (photo.startsWith("uploads/") || photo.startsWith("uploads\\")));
