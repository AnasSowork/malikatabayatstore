import { createHash } from "node:crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Meta CAPI: digits only with country code, no leading zeros on national part. */
export function phoneForMetaHash(moroccanPhone: string): string | null {
  const digits = moroccanPhone.replace(/\D/g, "");
  if (/^0[5-7][0-9]{8}$/.test(digits)) {
    return `212${digits.slice(1)}`;
  }
  if (/^212[5-7][0-9]{8}$/.test(digits)) {
    return digits;
  }
  return null;
}

export function hashMetaPhone(moroccanPhone: string): string | null {
  const normalized = phoneForMetaHash(moroccanPhone);
  return normalized ? sha256(normalized) : null;
}

export function hashMetaEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  return sha256(normalized);
}

export function hashMetaName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  return sha256(normalized);
}

export function hashMetaCity(city: string): string | null {
  const normalized = city.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalized) return null;
  return sha256(normalized);
}

export function hashMetaExternalId(id: string): string | null {
  const normalized = id.trim();
  if (!normalized) return null;
  return sha256(normalized);
}

export function firstNameFromFullName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}
