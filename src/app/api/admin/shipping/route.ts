import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  getConfiguredShippingProviderId,
  getShippingProviderById,
  listSupportedShippingProviders,
  ShippingConfigError,
} from "@/lib/shipping";

export const runtime = "nodejs";

/** Admin-only: shipping providers status (no secrets). */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let defaultProvider: string | null = null;
    try {
      defaultProvider = getConfiguredShippingProviderId();
    } catch (error) {
      if (!(error instanceof ShippingConfigError)) throw error;
    }

    const providers = listSupportedShippingProviders().map((id) => {
      const provider = getShippingProviderById(id);
      return {
        id,
        configured: provider.isConfigured(),
        isDefault: defaultProvider === id,
      };
    });

    const configuredProviders = providers.filter((p) => p.configured);
    const active =
      configuredProviders.find((p) => p.isDefault)?.id ??
      configuredProviders[0]?.id ??
      null;

    return NextResponse.json({
      provider: active,
      defaultProvider,
      configured: configuredProviders.length > 0,
      supported: listSupportedShippingProviders(),
      providers,
    });
  } catch (error) {
    console.error("[admin/shipping]", error);
    return NextResponse.json({ error: "Failed to load shipping status" }, { status: 500 });
  }
}
