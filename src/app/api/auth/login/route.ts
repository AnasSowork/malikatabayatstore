import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ADMIN_TOKEN_COOKIE, signAdminToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!admin.passwordHash || typeof admin.passwordHash !== "string") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await compare(password, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signAdminToken({
      sub: admin.id,
      email: admin.email,
      role: "admin",
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_TOKEN_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    const isDbAuth =
      message.includes("Authentication failed") ||
      message.includes("P1000") ||
      message.includes("P1001") ||
      message.includes("Can't reach database");
    return NextResponse.json(
      {
        error: isDbAuth
          ? "Database connection failed. Check DB_USER / DB_PASSWORD / DB_NAME in Hostinger env vars."
          : "Failed to login",
      },
      { status: 500 },
    );
  }
}
