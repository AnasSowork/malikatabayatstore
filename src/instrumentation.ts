export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { prisma } = await import("@/lib/prisma");
  const { ensureOrderProductSnapshot, ensureProductDeliveryFeeColumn } = await import(
    "@/lib/ensure-product-schema"
  );

  try {
    await ensureProductDeliveryFeeColumn(prisma);
    await ensureOrderProductSnapshot(prisma);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message: `schema repair failed: ${message.replace(/mysql:\/\/[^@\s]+@/g, "mysql://***@")}`.slice(
          0,
          1500,
        ),
      }),
    );
  }
}
