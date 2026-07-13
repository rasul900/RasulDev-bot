import crypto from "crypto";

const API_URL = (process.env.MULTICARD_API_URL || "https://api.multicard.uz").replace(/\/$/, "");

let cachedToken = null;
let tokenExpiresAt = 0;

const isConfigured = () =>
  Boolean(
    process.env.MULTICARD_APPLICATION_ID &&
    process.env.MULTICARD_SECRET &&
    process.env.MULTICARD_STORE_ID
  );

const apiRequest = async (path, { method = "GET", body, token } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.details || data?.error?.code || `HTTP ${res.status}`);
  }
  return data;
};

export const getMulticardToken = async () => {
  if (!isConfigured()) {
    throw new Error("Multicard sozlanmagan");
  }

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const data = await apiRequest("/auth", {
    method: "POST",
    body: {
      application_id: process.env.MULTICARD_APPLICATION_ID,
      secret: process.env.MULTICARD_SECRET,
    },
  });

  const token = data.token || data.data?.token;
  if (!token) throw new Error("Multicard token olinmadi");

  cachedToken = token;
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
  return token;
};

const buildOfd = (amountTiyin) => {
  const mxik = process.env.MULTICARD_OFD_MXIK || "85991900000000000";
  const packageCode = process.env.MULTICARD_OFD_PACKAGE_CODE || "1506113";
  const name = process.env.MULTICARD_OFD_NAME || "Balans to'ldirish";

  return [
    {
      qty: 1,
      price: amountTiyin,
      total: amountTiyin,
      mxik,
      package_code: packageCode,
      name,
    },
  ];
};

export const createInvoice = async ({
  orderId,
  amountUzs,
  callbackUrl,
  returnUrl,
  returnErrorUrl,
}) => {
  const token = await getMulticardToken();
  const amountTiyin = Math.round(amountUzs * 100);

  const payload = {
    store_id: Number(process.env.MULTICARD_STORE_ID),
    amount: amountTiyin,
    invoice_id: orderId,
    callback_url: callbackUrl,
    return_url: returnUrl,
    return_error_url: returnErrorUrl || returnUrl,
    lang: process.env.MULTICARD_LANG || "uz",
    ofd: buildOfd(amountTiyin),
  };

  const data = await apiRequest("/payment/invoice", {
    method: "POST",
    body: payload,
    token,
  });

  if (!data.success) {
    throw new Error(data.error?.details || "Invoice yaratilmadi");
  }

  return {
    uuid: data.data?.uuid,
    checkoutUrl: data.data?.checkout_url,
    shortLink: data.data?.short_link,
    amountTiyin,
  };
};

export const getInvoiceStatus = async (uuid) => {
  const token = await getMulticardToken();
  const data = await apiRequest(`/payment/invoice/${uuid}`, { token });
  return data.data || data;
};

export const verifyWebhookSign = (payload) => {
  const secret = process.env.MULTICARD_SECRET;
  if (!secret || !payload?.sign) return false;

  const raw = `${payload.store_id}${payload.invoice_id}${payload.amount}${secret}`;
  const expected = crypto.createHash("md5").update(raw).digest("hex");
  return expected === String(payload.sign).toLowerCase();
};

export { isConfigured as isMulticardConfigured };
