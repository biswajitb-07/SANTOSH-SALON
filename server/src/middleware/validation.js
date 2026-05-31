const stringValue = (value) => String(value ?? "").trim();

export const cleanString = (value, maxLength = 160) =>
  stringValue(value).replace(/\s+/g, " ").slice(0, maxLength);

export const cleanPhone = (value) =>
  stringValue(value).replace(/[^\d+]/g, "").slice(0, 15);

export const cleanEmail = (value) => stringValue(value).toLowerCase().slice(0, 254);

export const requireFields = (body, fields) => {
  const missing = fields.filter((field) => !stringValue(body?.[field]));
  if (!missing.length) return null;

  return `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`;
};

export const parsePositiveAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
};

export const isDataUrlImage = (value) =>
  /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(stringValue(value));
