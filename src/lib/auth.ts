import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_TOKEN_COOKIE = "malikatabayat_admin_token";

type AdminJwtPayload = {
  sub: string;
  email: string;
  role: "admin";
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "dev-jwt-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(payload: AdminJwtPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.role !== "admin" || !payload.sub || !payload.email) {
      return null;
    }
    return payload as unknown as AdminJwtPayload;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return await verifyAdminToken(token);
}

export async function isAdminAuthenticated() {
  const session = await getAdminSession();
  return Boolean(session);
}
