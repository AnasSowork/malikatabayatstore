import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  isOlivraisonConfigured,
  OlivraisonError,
  olivraisonRequest,
} from "@/lib/olivraison";
import type {
  OlivraisonCity,
  OlivraisonClaim,
  OlivraisonDashboardData,
  OlivraisonPackage,
  OlivraisonPackageListItem,
  OlivraisonProduct,
  OlivraisonStatus,
} from "@/lib/olivraison-types";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

function errorResponse(error: unknown) {
  if (error instanceof OlivraisonError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status >= 400 && error.status < 600 ? error.status : 500 },
    );
  }
  console.error("[olivraison]", error);
  return NextResponse.json({ error: "Olivraison request failed." }, { status: 500 });
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "dashboard";

  if (!isOlivraisonConfigured()) {
    if (resource !== "dashboard") {
      return NextResponse.json(
        { error: "Olivraison credentials are not configured.", code: "NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    const empty: OlivraisonDashboardData = {
      configured: false,
      packages: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 0 },
      statuses: [],
      cities: [],
      products: [],
      claims: [],
    };
    return NextResponse.json(empty);
  }

  try {
    if (resource === "dashboard") {
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
      const packages = await olivraisonRequest<{
        data?: OlivraisonPackageListItem[];
        pagination?: OlivraisonDashboardData["pagination"];
      }>(`/package?page=${page}&limit=${limit}`);
      const statusResponse = await olivraisonRequest<{ statusList?: OlivraisonStatus[] }>(
        "/status_list/v2",
      );
      const cities = await olivraisonRequest<OlivraisonCity[]>("/cities");
      const products = await olivraisonRequest<OlivraisonProduct[]>("/products");
      const claimsResponse = await olivraisonRequest<{ data?: OlivraisonClaim[] }>("/claims");

      const result: OlivraisonDashboardData = {
        configured: true,
        packages: packages.data ?? [],
        pagination: packages.pagination ?? { total: 0, page, limit, pages: 0 },
        statuses: statusResponse.statusList ?? [],
        cities,
        products,
        claims: claimsResponse.data ?? [],
      };
      return NextResponse.json(result);
    }

    if (resource === "package") {
      const trackingID = url.searchParams.get("trackingID")?.trim();
      if (!trackingID) {
        return NextResponse.json({ error: "trackingID is required." }, { status: 400 });
      }
      return NextResponse.json(
        await olivraisonRequest<OlivraisonPackage>(
          `/package/${encodeURIComponent(trackingID)}`,
        ),
      );
    }

    if (resource === "blacklist") {
      const phone = url.searchParams.get("phone")?.trim();
      if (!phone) return NextResponse.json({ error: "phone is required." }, { status: 400 });
      return NextResponse.json(
        await olivraisonRequest(
          `/package/blacklisted-destinations/${encodeURIComponent(phone)}`,
        ),
      );
    }

    if (resource === "claim") {
      const id = url.searchParams.get("id")?.trim();
      if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
      return NextResponse.json(
        await olivraisonRequest(`/claims/${encodeURIComponent(id)}`),
      );
    }

    return NextResponse.json({ error: "Unsupported delivery resource." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as JsonObject;
    const action = typeof body.action === "string" ? body.action : "";
    const payload =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? (body.payload as JsonObject)
        : {};

    if (action === "createPackage") {
      return NextResponse.json(
        await olivraisonRequest("/package/new", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        { status: 201 },
      );
    }
    if (action === "updatePackage") {
      return NextResponse.json(
        await olivraisonRequest("/package/update", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    }
    if (action === "updatePartnerTracking") {
      const trackingID =
        typeof payload.trackingID === "string" ? payload.trackingID.trim() : "";
      const partnerTrackingID =
        typeof payload.partnerTrackingID === "string"
          ? payload.partnerTrackingID.trim()
          : "";
      if (!trackingID || !partnerTrackingID) {
        return NextResponse.json(
          { error: "trackingID and partnerTrackingID are required." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        await olivraisonRequest(`/package/${encodeURIComponent(trackingID)}`, {
          method: "PUT",
          body: JSON.stringify({ partnerTrackingID }),
        }),
      );
    }
    if (action === "updateStatus") {
      return NextResponse.json(
        await olivraisonRequest("/package/status", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    }
    if (action === "createPickup") {
      return NextResponse.json(
        await olivraisonRequest("/pickup", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    }
    if (action === "checkBlacklistBulk") {
      return NextResponse.json(
        await olivraisonRequest("/package/blacklisted-destinations/bulk", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    }
    if (action === "createClaim") {
      return NextResponse.json(
        await olivraisonRequest("/claims", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        { status: 201 },
      );
    }
    if (action === "addClaimComment") {
      const claimID = typeof payload.claimID === "string" ? payload.claimID.trim() : "";
      const content = typeof payload.content === "string" ? payload.content.trim() : "";
      if (!claimID || !content) {
        return NextResponse.json(
          { error: "claimID and content are required." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        await olivraisonRequest(`/claims/${encodeURIComponent(claimID)}/comments`, {
          method: "POST",
          body: JSON.stringify({ content, attachments: payload.attachments ?? [] }),
        }),
      );
    }

    return NextResponse.json({ error: "Unsupported delivery action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const trackingID = new URL(request.url).searchParams.get("trackingID")?.trim();
  if (!trackingID) {
    return NextResponse.json({ error: "trackingID is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await olivraisonRequest(`/package/${encodeURIComponent(trackingID)}`, {
        method: "DELETE",
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
