import { NextResponse } from "next/server";
import { getMetaPixelId, isMetaCapiConfigured } from "@/lib/meta-capi-server";
import { getDbEnvDebug, prisma } from "@/lib/prisma";
import { getConfiguredShippingProviderId } from "@/lib/shipping/provider";
import { isSenditConfigured } from "@/lib/shipping/providers/sendit-client";
import { isOlivraisonConfigured } from "@/lib/olivraison";

/** Safe readiness check — no secrets, no shipment creation, no external API calls. */
export async function GET() {
  const env = getDbEnvDebug();
  const pixelId = getMetaPixelId() ?? null;
  const metaTestMode = Boolean(process.env.META_CAPI_TEST_EVENT_CODE?.trim());

  let shippingProvider: string | null = null;
  try {
    shippingProvider = getConfiguredShippingProviderId();
  } catch {
    shippingProvider = null;
  }

  const shipping = {
    provider: shippingProvider,
    senditConfigured: isSenditConfigured(),
    olivraisonConfigured: isOlivraisonConfigured(),
    webhookSecretConfigured: Boolean(process.env.SENDIT_WEBHOOK_SECRET?.trim()),
    activeConfigured:
      shippingProvider === "sendit"
        ? isSenditConfigured()
        : shippingProvider === "olivraison"
          ? isOlivraisonConfigured()
          : false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n FROM information_schema.tables
      WHERE table_schema = DATABASE()
    `;
    return NextResponse.json({
      ok: true,
      db: "connected",
      tables: Number(tables[0]?.n ?? 0),
      metaCapi: isMetaCapiConfigured(),
      meta: {
        pixelId: pixelId ? `${pixelId.slice(0, 4)}…${pixelId.slice(-4)}` : null,
        capiConfigured: isMetaCapiConfigured(),
        testMode: metaTestMode,
        publicPixelConfigured: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()),
      },
      shipping,
      env,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        message,
        metaCapi: isMetaCapiConfigured(),
        meta: {
          testMode: metaTestMode,
          publicPixelConfigured: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()),
        },
        shipping,
        env,
      },
      { status: 500 },
    );
  }
}
