/** Plaintext user fields for Meta Pixel Advanced Matching (fbq set userData). */

export type MetaPixelUserData = {
  phone?: string;
  fullName?: string;
  city?: string;
  externalId?: string;
};

export function phoneForMetaPixel(moroccanPhone: string): string | null {
  const digits = moroccanPhone.replace(/\D/g, "");
  if (/^0[5-7][0-9]{8}$/.test(digits)) {
    return `212${digits.slice(1)}`;
  }
  if (/^212[5-7][0-9]{8}$/.test(digits)) {
    return digits;
  }
  return null;
}

export function firstNameFromFullName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export function buildMetaPixelUserData(user: MetaPixelUserData): Record<string, string> {
  const data: Record<string, string> = {};

  const ph = user.phone ? phoneForMetaPixel(user.phone) : null;
  if (ph) data.ph = ph;

  const fn = user.fullName ? firstNameFromFullName(user.fullName).trim().toLowerCase() : "";
  if (fn) data.fn = fn;

  const ct = user.city?.trim().toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  if (ct) data.ct = ct;

  const externalId = user.externalId?.trim() ?? "";
  if (externalId) data.external_id = externalId;

  return data;
}
