const API_URL =
  process.env.SMM_API_URL || "https://smmsb.uz/Chaqmoqsmmuzbot/api/v2";

const getKey = () => process.env.SMM_API_KEY;

export const isSmmConfigured = () => Boolean(getKey());

const request = async (params) => {
  const key = getKey();
  if (!key) throw new Error("SMM API kaliti sozlanmagan");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key, ...params }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error("SMM API xatosi");
  if (data?.error) throw new Error(data.error);
  return data;
};

let cache = { services: [], fetchedAt: 0 };
const CACHE_MS = 15 * 60 * 1000;

export const fetchServices = async (force = false) => {
  if (!force && cache.services.length && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.services;
  }

  const data = await request({ action: "services" });
  if (!Array.isArray(data)) throw new Error("Xizmatlar ro'yxati olinmadi");

  cache = { services: data, fetchedAt: Date.now() };
  return data;
};

export const getCategories = async () => {
  const services = await fetchServices();
  return [...new Set(services.map((s) => s.category))];
};

export const getServicesByCategory = async (category) => {
  const services = await fetchServices();
  return services.filter((s) => s.category === category);
};

export const getServiceById = async (serviceId) => {
  const services = await fetchServices();
  return services.find((s) => Number(s.service) === Number(serviceId)) || null;
};

export const calcPrice = (service, quantity) => {
  const rate = parseFloat(service.rate);
  const markup = Number(process.env.SMM_MARKUP_PERCENT || 15) / 100;
  const base = (rate / 1000) * quantity;
  return Math.ceil(base * (1 + markup));
};

export const createOrder = async ({ serviceId, link, quantity }) =>
  request({
    action: "add",
    service: serviceId,
    link,
    quantity,
  });

export const getOrderStatus = async (orderId) =>
  request({ action: "status", order: orderId });

export const getBalance = async () => request({ action: "balance" });
