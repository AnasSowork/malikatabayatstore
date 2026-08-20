import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  getActiveShippingProvider,
  listSupportedShippingProviders,
  ShippingConfigError,
} from "@/lib/shipping";

export const runtime = "nodejs";

/** Admin-only: active shipping provider status (no secrets). */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const provider = getActiveShippingProvider();
      return NextResponse.json({
        provider: provider.id,
        configured: provider.isConfigured(),
        supported: listSupportedShippingProviders(),
      });
    } catch (error) {
      if (error instanceof ShippingConfigError) {
        return NextResponse.json({
          provider: null,
          configured: false,
          supported: listSupportedShippingProviders(),
          error: error.message,
          code: error.code,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("[admin/shipping]", error);
    return NextResponse.json({ error: "Failed to load shipping status" }, { status: 500 });
  }
}
